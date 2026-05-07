import { z } from 'zod';

export const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  phoneNumberId: z.string().optional(),
  wabaId: z.string().optional(),
});
export type CreateWorkspaceDto = z.infer<typeof CreateWorkspaceSchema>;

export const PaginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});
export type PaginationDto = z.infer<typeof PaginationSchema>;
