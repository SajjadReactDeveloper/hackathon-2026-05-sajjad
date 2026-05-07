import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { getOpenAIClient } from './openai.client';
import type { ParsedOrder } from './voice-parser.service';
import { z } from 'zod';

const ImageOrderSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      quantity: z.number().int().positive(),
      unitPriceCents: z.number().int().optional(),
    }),
  ),
  notes: z.string().optional(),
});

@Injectable()
export class ImageOrderService {
  constructor(
    @InjectPinoLogger(ImageOrderService.name) private readonly logger: PinoLogger,
  ) {}

  async parseImageToOrder(imageUrl: string): Promise<ParsedOrder> {
    const openai = getOpenAIClient();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an order parser for a Pakistani clothing/textile e-commerce store.
The customer sends a photo of products they want to order.
Extract the items visible in the image and return a JSON order.

Return format:
{
  "items": [{"name": "item description", "quantity": 1, "unitPriceCents": null}],
  "notes": "any relevant notes"
}

Rules:
- Use descriptive names (e.g., "Blue lawn suit", "White embroidered kameez")
- Default quantity to 1 unless obvious multiples are shown
- unitPriceCents is null (you can't infer price from photo)
- If image is unclear, return best guess`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: imageUrl, detail: 'low' },
            },
            {
              type: 'text',
              text: 'What items are shown? Extract them as an order.',
            },
          ],
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message.content ?? '{}';

    try {
      const raw = JSON.parse(content) as unknown;
      const parsed = ImageOrderSchema.safeParse(raw);
      if (parsed.success) {
        this.logger.debug({ items: parsed.data.items.length }, 'Image order parsed');
        return parsed.data;
      }
    } catch {
      // fall through to fallback
    }

    this.logger.warn({ content }, 'Image order parse fallback');
    return { items: [{ name: 'Product from photo', quantity: 1 }] };
  }
}
