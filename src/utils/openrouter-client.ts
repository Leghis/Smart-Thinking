import { FeatureFlags } from '../feature-flags';

const UNCERTAINTY_WORDS = [
  'peut-être', 'probablement', 'semble', 'pourrait', 'possible', 'potentiellement', 'hypothèse', 'suppose',
  'incertain', 'doute', 'question', 'éventuellement'
];

const CERTAINTY_WORDS = [
  'certainement', 'clairement', 'évidemment', 'sans doute', 'démontré', 'prouvé', 'assurément', 'indiscutable'
];

const BIAS_WORDS = [
  'toujours', 'jamais', 'tous', 'aucun', 'absolument', 'horrible', 'fantastique', 'déteste', 'adore'
];

const FACTUAL_MARKERS = [
  'selon', 'données', 'étude', 'rapport', 'source', 'statistique', '%.', 'figure', 'graphique'
];

const NEUTRAL_RETURN = { status: 'unverified' as const, confidence: 0.4, notes: 'Analyse heuristique : informations insuffisantes', key_factors: [] as string[] };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôûùüÿñæœ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

const containsAny = (text: string, list: string[]): boolean =>
  list.some(word => text.includes(word));

let warnedExternalLlm = false;

function warnExternalDisabled(): void {
  if (!FeatureFlags.externalLlmEnabled && !warnedExternalLlm) {
    console.warn('Les intégrations LLM externes sont désactivées (FeatureFlags.externalLlmEnabled=false). Utilisation des heuristiques internes.');
    warnedExternalLlm = true;
  }
  if (FeatureFlags.externalLlmEnabled && !warnedExternalLlm) {
    console.warn('FeatureFlags.externalLlmEnabled est à true mais aucun fournisseur externe n\'est configuré. L\'analyse heuristique sera utilisée.');
    warnedExternalLlm = true;
  }
}

export async function callInternalLlm(
  _systemPrompt: string,
  _userPrompt: string,
  _maxTokens: number = 3000
): Promise<string | null> {
  warnExternalDisabled();
  return null;
}

function heuristicConfidence(text: string, context?: { previousThoughtContent?: string; connectionType?: string }): number {
  const lower = text.toLowerCase();
  const tokens = tokenize(text);
  let score = 0.6;

  if (containsAny(lower, UNCERTAINTY_WORDS)) {
    score -= 0.2;
  }
  if (containsAny(lower, CERTAINTY_WORDS)) {
    score += 0.1;
  }
  if (/\d/.test(lower)) {
    score += 0.05;
  }
  if (containsAny(lower, FACTUAL_MARKERS)) {
    score += 0.05;
  }

  if (context?.connectionType === 'contradicts' || context?.connectionType === 'questions') {
    score -= 0.1;
  }

  if (context?.previousThoughtContent) {
    const prevTokens = new Set(tokenize(context.previousThoughtContent));
    const overlap = tokens.filter(token => prevTokens.has(token)).length;
    if (prevTokens.size > 0) {
      score += clamp(overlap / prevTokens.size, 0, 0.15);
    }
  }

  return clamp(score, 0, 1);
}

function heuristicRelevance(text: string, context?: { previousThoughtContent?: string; connectionType?: string }): number {
  if (!context?.previousThoughtContent) {
    return clamp(text.length / 200, 0.2, 0.7);
  }

  const current = tokenize(text);
  const previous = tokenize(context.previousThoughtContent);
  const prevSet = new Set(previous);
  const overlap = current.filter(token => prevSet.has(token)).length;
  if (current.length === 0 || previous.length === 0) {
    return 0.3;
  }
  const ratio = overlap / Math.min(current.length, previous.length);
  let score = 0.4 + ratio * 0.5;

  if (context.connectionType === 'supports' || context.connectionType === 'derives') {
    score += 0.1;
  }

  return clamp(score, 0, 1);
}

function heuristicQuality(text: string, context?: { previousThoughtContent?: string; connectionType?: string }): number {
  const sentences = text.split(/[.!?]+/).filter(Boolean);
  const hasStructure = /[:,;]/.test(text) || sentences.length > 1;
  let score = clamp(text.length / 250, 0.2, 0.7);

  if (hasStructure) {
    score += 0.1;
  }
  if (/\b(premièrement|deuxièmement|ensuite|en conclusion)\b/i.test(text)) {
    score += 0.1;
  }
  if (context?.connectionType === 'conclusion') {
    score += 0.05;
  }

  return clamp(score, 0, 1);
}

function heuristicBias(text: string): number {
  const lower = text.toLowerCase();
  let score = 0.1;

  if (containsAny(lower, BIAS_WORDS)) {
    score += 0.5;
  }
  if (/[!?]{2,}/.test(lower)) {
    score += 0.2;
  }
  if (/(toujours|jamais|tout le monde|personne)/i.test(lower)) {
    score += 0.2;
  }

  return clamp(score, 0, 1);
}

function heuristicVerificationNeed(text: string): number {
  const lower = text.toLowerCase();
  let score = 0.2;

  if (/\d/.test(lower)) {
    score += 0.3;
  }
  if (containsAny(lower, FACTUAL_MARKERS)) {
    score += 0.2;
  }
  if (/\bselon\b|\bd'après\b|\brecherches?\b/.test(lower)) {
    score += 0.2;
  }

  return clamp(score, 0, 1);
}

export async function analyzeForMetric(
  textToAnalyze: string,
  metricType: 'confidence' | 'relevance' | 'quality' | 'bias' | 'verification_need',
  context?: {
    previousThoughtContent?: string;
    connectionType?: string;
  }
): Promise<number | null> {
  warnExternalDisabled();

  switch (metricType) {
    case 'confidence':
      return heuristicConfidence(textToAnalyze, context);
    case 'relevance':
      return heuristicRelevance(textToAnalyze, context);
    case 'quality':
      return heuristicQuality(textToAnalyze, context);
    case 'bias':
      return heuristicBias(textToAnalyze);
    case 'verification_need':
      return heuristicVerificationNeed(textToAnalyze);
    default:
      return null;
  }
}

export async function suggestLlmImprovements(thoughtContent: string): Promise<string[] | null> {
  warnExternalDisabled();
  const suggestions: string[] = [];
  const lower = thoughtContent.toLowerCase();

  if (thoughtContent.trim().length < 60) {
    suggestions.push('Développez davantage la pensée pour fournir un contexte suffisant.');
  }
  if (!/[.!?]$/.test(thoughtContent.trim())) {
    suggestions.push('Terminez la pensée par une phrase complète pour plus de clarté.');
  }
  if (containsAny(lower, UNCERTAINTY_WORDS)) {
    suggestions.push('Clarifiez les affirmations et réduisez les expressions d\'incertitude superflues.');
  }
  if (!/[0-9]/.test(lower) && !containsAny(lower, FACTUAL_MARKERS)) {
    suggestions.push('Ajoutez des faits ou des références pour renforcer la crédibilité.');
  }
  if (suggestions.length === 0) {
    suggestions.push('Relisez pour vérifier la cohérence logique et la structure générale.');
  }

  return suggestions;
}

export async function verifyWithLlm(statement: string): Promise<{ status: 'verified' | 'contradicted' | 'unverified'; confidence: number; notes: string; key_factors?: string[] } | null> {
  warnExternalDisabled();
  const lower = statement.toLowerCase();
  const keyFactors: string[] = [];
  let status: 'verified' | 'contradicted' | 'unverified' = 'unverified';
  let confidence = 0.4;

  const hasNumbers = /\d/.test(lower);
  const hasSpeculation = containsAny(lower, UNCERTAINTY_WORDS);
  const hasAbsolute = /(toujours|jamais|impossible|certainement)/.test(lower);

  if (hasNumbers || containsAny(lower, FACTUAL_MARKERS)) {
    keyFactors.push('Présence de données factuelles ou chiffres.');
    status = 'unverified';
    confidence = 0.5;
  }

  if (hasAbsolute && hasSpeculation) {
    keyFactors.push('Combinaison de certitudes absolues et d\'expressions spéculatives.');
    status = 'contradicted';
    confidence = 0.6;
  }

  if (hasAbsolute && !hasSpeculation && !containsAny(lower, BIAS_WORDS)) {
    keyFactors.push('Langage affirmatif sans détection de biais majeurs.');
    status = 'verified';
    confidence = 0.55;
  }

  if (!hasNumbers && !hasAbsolute && hasSpeculation) {
    keyFactors.push('Enoncé spéculatif sans support factuel.');
    status = 'unverified';
    confidence = 0.45;
  }

  return { status, confidence: clamp(confidence, 0, 1), notes: 'Analyse heuristique locale.', key_factors: keyFactors };
}
