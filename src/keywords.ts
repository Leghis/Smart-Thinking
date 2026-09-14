import { STOP_WORDS } from './constants';

const PUNCTUATION = /[.,/#!$%^&*;:{}=\-_`~()[\]]/g;
const WHITESPACE = /\s+/;
const MAX_KEYWORDS = 15;

export function extractKeywords(text: string): string[] {
  const processed = text.toLowerCase().replace(PUNCTUATION, '');
  const wordCounts = new Map<string, number>();

  for (const word of processed.split(WHITESPACE)) {
    if (word.length > 2 && !STOP_WORDS.has(word)) {
      wordCounts.set(word, (wordCounts.get(word) ?? 0) + 1);
    }
  }

  return Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, MAX_KEYWORDS)
    .map(([word]) => word);
}

export function extractAndWeightContextKeywords(text: string): Record<string, number> {
  const keywords = extractKeywords(text);
  const factor = 1 / (keywords.length * 2 || 1);
  const weighted: Record<string, number> = {};

  keywords.forEach((keyword, index) => {
    weighted[keyword] = 1 - index * factor;
  });

  return weighted;
}

export function computeTokenOverlap(a: string, b: string): number {
  const aTokens = new Set(extractKeywords(a));
  const bTokens = new Set(extractKeywords(b));
  if (aTokens.size === 0 || bTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  for (const token of aTokens) {
    if (bTokens.has(token)) {
      overlap += 1;
    }
  }
  return overlap / Math.min(aTokens.size, bTokens.size);
}
