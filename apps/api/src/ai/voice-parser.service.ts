import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { toFile } from 'openai';
import { getOpenAIClient } from './openai.client';
import { getGroqClient } from './groq.client';
import type { ParsedOrderItem } from '../orders/orders.service';
import { z } from 'zod';

const ParsedOrderSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().optional(),
    }),
  ),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
});

export type ParsedOrder = z.infer<typeof ParsedOrderSchema>;

@Injectable()
export class VoiceParserService {
  constructor(
    @InjectPinoLogger(VoiceParserService.name) private readonly logger: PinoLogger,
  ) {}

  async transcribe(audioBuffer: Buffer, mimeType: string): Promise<string> {
    const openai = getOpenAIClient();
    const ext = mimeType.includes('ogg') ? 'ogg' : mimeType.includes('mp4') ? 'mp4' : 'mp3';
    const file = await toFile(audioBuffer, `audio.${ext}`, { type: mimeType });

    const result = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file,
      language: 'ur',
    });

    this.logger.debug({ chars: result.text.length }, 'Voice transcribed');
    return result.text;
  }

  async parseToOrder(transcript: string): Promise<ParsedOrder> {
    const groq = getGroqClient();

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an order parser for a Pakistani e-commerce store. Extract order details from customer voice messages (Urdu, Roman Urdu, or English). Return valid JSON only.

Schema:
{
  "items": [{"name": "item name", "quantity": 1, "unitPriceCents": null}],
  "deliveryAddress": "address or null",
  "notes": "any extra info or null"
}

Rules:
- unitPriceCents is null if customer didn't mention price
- quantity defaults to 1 if not mentioned
- Extract full address including city/area if mentioned`,
        },
        {
          role: 'user',
          content: `Parse this order: "${transcript}"`,
        },
      ],
      max_tokens: 400,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message.content ?? '{}';

    try {
      const raw = JSON.parse(content) as unknown;
      const parsed = ParsedOrderSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
    } catch {
      // fall through to fallback
    }

    this.logger.warn({ transcript, content }, 'Groq parse fallback triggered');
    return {
      items: [{ name: transcript.slice(0, 100), quantity: 1 }],
    };
  }

  buildItemsFromParsed(items: ParsedOrderItem[]): ParsedOrderItem[] {
    return items.map((item) => ({
      name: item.name,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    }));
  }
}
