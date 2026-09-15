import { extractKeywords } from '../keywords';
import type { EvidenceStance } from '../types';

const NEGATION_PATTERN =
  /(?:n'est pas|ne sont pas|faux|fausse|erroné|incorrect|contredit|dément|démenti|refut|réfut|debunk|not true|false|no evidence)/i;
const SUPPORT_PATTERN =
  /(?:confirme|confirment|selon|indique|révèle|montre|démontre|rapporte|à raison|true|correct|validé)/i;
const NEUTRAL_OVERLAP = 0.2;
const SUPPORT_OVERLAP = 0.45;

/** Share of the claim keywords present in a snippet (0..1). */
export function keywordOverlapRatio(claimKeywords: Set<string>, text: string): number {
  if (claimKeywords.size === 0) {
    return 0;
  }
  const snippetKeywords = extractKeywords(text);
  return snippetKeywords.filter(keyword => claimKeywords.has(keyword)).length / claimKeywords.size;
}

/**
 * Shared stance classifier (verification + web agent). Below the overlap floor
 * the snippet is *neutral* — the caller must discard it rather than count it as
 * corroboration.
 */
export function classifyStanceFromKeywords(
  claimKeywords: Set<string>,
  text: string,
): EvidenceStance {
  if (claimKeywords.size === 0) {
    return 'neutral';
  }
  const overlap = keywordOverlapRatio(claimKeywords, text);
  if (overlap < NEUTRAL_OVERLAP) {
    return 'neutral';
  }
  const negation = NEGATION_PATTERN.test(text);
  const support = SUPPORT_PATTERN.test(text);
  if (negation && !support) {
    return 'contradicts';
  }
  if (support || overlap >= SUPPORT_OVERLAP) {
    return 'supports';
  }
  return 'neutral';
}
