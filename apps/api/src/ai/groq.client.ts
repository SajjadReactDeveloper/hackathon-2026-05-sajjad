import Groq from 'groq-sdk';
import { env } from '../common/env';

let groqInstance: Groq | null = null;

export function getGroqClient(): Groq {
  if (!groqInstance) {
    if (!env.GROQ_API_KEY) throw new Error('GROQ_API_KEY is not configured');
    groqInstance = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return groqInstance;
}
