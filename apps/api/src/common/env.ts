import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_TTS: z.string().default('tts'),
  SUPABASE_STORAGE_BUCKET_KB: z.string().default('kb'),
  SUPABASE_STORAGE_BUCKET_PRODUCTS: z.string().default('products'),
  WHATSAPP_APP_SECRET: z.string().optional(),
  WHATSAPP_TOKEN_ENC_KEY: z.string().length(64),
  GROQ_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ELEVENLABS_API_KEY: z.string().optional(),
  SENTRY_DSN: z.string().optional(),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
});

export type Env = z.infer<typeof EnvSchema>;

function validateEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    console.error('Invalid environment variables:');
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}

export const env = validateEnv();
