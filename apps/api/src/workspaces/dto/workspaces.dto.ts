import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
});
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;

export const UpdateBusinessInfoSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
});
export type UpdateBusinessInfoDto = z.infer<typeof UpdateBusinessInfoSchema>;

export const UpdateWhatsAppSettingsSchema = z.object({
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
  accessToken: z.string().optional(),
  webhookVerifyToken: z.string().optional(),
  appSecret: z.string().optional(),
});
export type UpdateWhatsAppSettingsDto = z.infer<typeof UpdateWhatsAppSettingsSchema>;

export const UpdateAIConfigSchema = z.object({
  autoReplyEnabled: z.boolean().optional(),
  systemPromptOverride: z.string().optional(),
  ttsEnabled: z.boolean().optional(),
  ttsProvider: z.enum(['openai', 'elevenlabs']).optional(),
  ttsVoice: z.string().optional(),
  businessHours: z.object({
    enabled: z.boolean(),
    start: z.string(),
    end: z.string(),
    timezone: z.string(),
  }).optional(),
});
export type UpdateAIConfigDto = z.infer<typeof UpdateAIConfigSchema>;
