import OpenAI from 'openai';
import { env } from '../common/env';

let openaiInstance: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (!openaiInstance) {
    if (!env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not configured');
    openaiInstance = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return openaiInstance;
}
