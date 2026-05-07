import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { PrismaService } from '../prisma/prisma.service';
import { SupabaseStorageService } from '../storage/supabase-storage.service';
import { ExternalAPIError } from '../common/errors';
import { env } from '../common/env';

@Injectable()
export class VoiceCloneService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: SupabaseStorageService,
    @InjectPinoLogger(VoiceCloneService.name) private readonly logger: PinoLogger,
  ) {}

  async createClone(workspaceId: string, audioBuffer: Buffer, mimeType: string): Promise<string> {
    const apiKey = env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new ExternalAPIError('ElevenLabs', 'ELEVENLABS_API_KEY not configured');

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { name: true },
    });

    const form = new FormData();
    form.append('name', `${workspace?.name ?? workspaceId} Voice Clone`);
    form.append('description', 'Cloned seller voice for WhatsApp AI replies');
    form.append(
      'files',
      new Blob([audioBuffer], { type: mimeType }),
      'voice_sample.mp3',
    );
    form.append('labels', JSON.stringify({ language: 'ur', source: 'flowehat-clone' }));

    const response = await fetch('https://api.elevenlabs.io/v1/voices/add', {
      method: 'POST',
      headers: { 'xi-api-key': apiKey },
      body: form,
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error({ workspaceId, status: response.status, body }, 'ElevenLabs clone creation failed');
      throw new ExternalAPIError('ElevenLabs', `Clone creation failed: ${response.status}`);
    }

    const data = (await response.json()) as { voice_id: string };
    const voiceId = data.voice_id;

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: {
        voiceCloneId: voiceId,
        voiceCloneStatus: 'ready',
      },
    });

    this.logger.info({ workspaceId, voiceId }, 'Voice clone created');
    return voiceId;
  }

  async deleteClone(workspaceId: string): Promise<void> {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { voiceCloneId: true },
    });

    if (workspace?.voiceCloneId) {
      const apiKey = env.ELEVENLABS_API_KEY;
      if (apiKey) {
        await fetch(`https://api.elevenlabs.io/v1/voices/${workspace.voiceCloneId}`, {
          method: 'DELETE',
          headers: { 'xi-api-key': apiKey },
        }).catch(() => undefined);
      }
    }

    await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { voiceCloneId: null, voiceCloneStatus: 'none' },
    });

    this.logger.info({ workspaceId }, 'Voice clone deleted');
  }

  async uploadSampleToStorage(workspaceId: string, buffer: Buffer, mimeType: string): Promise<string> {
    const path = `${workspaceId}/voice_sample.mp3`;
    return this.storage.uploadAndSign('voice-samples', path, buffer, mimeType, 3600);
  }
}
