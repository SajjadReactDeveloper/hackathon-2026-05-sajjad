import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { randomUUID } from 'crypto';
import { getOpenAIClient } from './openai.client';
import { getGroqClient } from './groq.client';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { env } from '../common/env';
import type { DetectedLanguage } from '@repo/types';

@Injectable()
export class VoiceReplyService {
  constructor(
    private readonly storage: SupabaseStorageService,
    private readonly prisma: PrismaService,
    @InjectPinoLogger(VoiceReplyService.name) private readonly logger: PinoLogger,
  ) {}

  async synthesize(text: string, language: DetectedLanguage, workspaceId: string): Promise<string> {
    const ttsText = language === 'roman_urdu' ? await this.transliterateToUrdu(text) : text;
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { voiceCloneStatus: true, voiceCloneId: true, aiConfig: { select: { ttsProvider: true, ttsVoice: true } } },
    });

    const useElevenLabs =
      workspace?.voiceCloneStatus === 'ready' &&
      workspace?.aiConfig?.ttsProvider === 'elevenlabs' &&
      workspace?.voiceCloneId;

    let audioBuffer: Buffer;
    if (useElevenLabs && workspace.voiceCloneId) {
      audioBuffer = await this.synthesizeElevenLabs(ttsText, workspace.voiceCloneId);
    } else {
      audioBuffer = await this.synthesizeOpenAI(ttsText, workspace?.aiConfig?.ttsVoice ?? 'alloy');
    }

    const path = `${workspaceId}/${randomUUID()}.mp3`;
    const signedUrl = await this.storage.uploadAndSign(
      env.SUPABASE_STORAGE_BUCKET_TTS,
      path,
      audioBuffer,
      'audio/mpeg',
      604800,
    );

    this.logger.info({ workspaceId, language, chars: ttsText.length }, 'TTS audio synthesized');
    return signedUrl;
  }

  private async transliterateToUrdu(romanUrdu: string): Promise<string> {
    const groq = getGroqClient();
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'Translate the following Roman Urdu text to Urdu script (Nastaliq). Return only the Urdu text, nothing else.',
        },
        { role: 'user', content: romanUrdu },
      ],
      max_tokens: 300,
      temperature: 0.1,
    });
    return response.choices[0]?.message.content ?? romanUrdu;
  }

  private async synthesizeOpenAI(text: string, voice: string): Promise<Buffer> {
    const openai = getOpenAIClient();
    const validVoices = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'] as const;
    type Voice = typeof validVoices[number];
    const safeVoice: Voice = validVoices.includes(voice as Voice) ? (voice as Voice) : 'alloy';

    const response = await openai.audio.speech.create({
      model: 'tts-1',
      voice: safeVoice,
      input: text,
      response_format: 'mp3',
    });

    return Buffer.from(await response.arrayBuffer());
  }

  private async synthesizeElevenLabs(text: string, voiceId: string): Promise<Buffer> {
    const apiKey = env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ELEVENLABS_API_KEY not configured');

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_multilingual_v2',
          voice_settings: { stability: 0.5, similarity_boost: 0.75 },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS failed: ${response.status}`);
    }

    return Buffer.from(await response.arrayBuffer());
  }
}
