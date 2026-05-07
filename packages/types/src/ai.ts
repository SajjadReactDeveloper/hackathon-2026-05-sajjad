import { z } from 'zod';

export const DetectedLanguageSchema = z.enum(['urdu', 'english', 'roman_urdu', 'unknown']);
export type DetectedLanguage = z.infer<typeof DetectedLanguageSchema>;

export const ParsedOrderItemSchema = z.object({
  name: z.string(),
  quantity: z.number().int().positive(),
  unitPriceCents: z.number().int().nonnegative().optional(),
  notes: z.string().optional(),
});
export type ParsedOrderItem = z.infer<typeof ParsedOrderItemSchema>;

export const ParsedOrderSchema = z.object({
  items: z.array(ParsedOrderItemSchema),
  deliveryAddress: z.string().optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1),
});
export type ParsedOrder = z.infer<typeof ParsedOrderSchema>;

export const ContactFactSchema = z.object({
  factType: z.enum(['name', 'address', 'preference', 'size', 'allergy', 'payment_method', 'other']),
  value: z.string(),
  confidence: z.number().min(0).max(1),
});
export type ContactFact = z.infer<typeof ContactFactSchema>;

export const LostSaleReasonSchema = z.object({
  reason: z.string().min(1).max(500),
  suggestion: z.string().min(1).max(500),
});
export type LostSaleReason = z.infer<typeof LostSaleReasonSchema>;
