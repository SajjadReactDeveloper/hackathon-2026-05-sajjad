import type { DetectedLanguage } from '@repo/types';

const URDU_RANGE = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const ROMAN_URDU_TOKENS = new Set([
  'kya', 'hai', 'hain', 'mujhe', 'chahiye', 'karo', 'karna', 'bhai',
  'yaar', 'theek', 'acha', 'nahi', 'nahin', 'haan', 'bilkul', 'zaroor',
  'kitna', 'kitne', 'kahan', 'kab', 'kyun', 'kaisa', 'kaisi', 'ap',
  'aap', 'mein', 'main', 'se', 'ko', 'ka', 'ki', 'ke', 'ne',
  'salaam', 'shukriya', 'meherbani', 'please', 'price', 'order',
]);

export function detectLanguage(text: string): DetectedLanguage {
  if (URDU_RANGE.test(text)) return 'urdu';

  const lower = text.toLowerCase();
  const words = lower.match(/\b\w+\b/g) ?? [];
  const romanMatches = words.filter((w) => ROMAN_URDU_TOKENS.has(w)).length;

  if (romanMatches >= 2) return 'roman_urdu';
  if (romanMatches === 1 && words.length <= 6) return 'roman_urdu';

  return 'english';
}
