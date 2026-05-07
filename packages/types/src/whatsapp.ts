import { z } from 'zod';

export const WhatsAppMessageTypeSchema = z.enum(['text', 'audio', 'image', 'video', 'document', 'sticker', 'location', 'contacts', 'interactive', 'button', 'order', 'system', 'unknown']);
export type WhatsAppMessageType = z.infer<typeof WhatsAppMessageTypeSchema>;

export const InboundMessageSchema = z.object({
  messageId: z.string(),
  from: z.string(),
  type: WhatsAppMessageTypeSchema,
  timestamp: z.number(),
  text: z.object({ body: z.string() }).optional(),
  audio: z.object({ id: z.string(), mimeType: z.string() }).optional(),
  image: z.object({ id: z.string(), mimeType: z.string(), caption: z.string().optional() }).optional(),
});
export type InboundMessage = z.infer<typeof InboundMessageSchema>;
