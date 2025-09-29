import { SimilarityEngine } from '../similarity-engine';

export const UNCERTAINTY_WORDS = [
  'peut-être', 'probablement', 'semble', 'pourrait', 'possible', 'potentiellement', 'hypothèse', 'suppose',
  'incertain', 'doute', 'question', 'éventuellement'
];

export const CERTAINTY_WORDS = [
  'certainement', 'clairement', 'évidemment', 'sans doute', 'démontré', 'prouvé', 'assurément', 'indiscutable'
];

export const BIAS_WORDS = [
  'toujours', 'jamais', 'tous', 'aucun', 'absolument', 'horrible', 'fantastique', 'déteste', 'adore'
];

export const FACTUAL_MARKERS = [
  'selon', 'données', 'étude', 'rapport', 'source', 'statistique', '%.', 'figure', 'graphique'
];

export const PERSUASIVE_PHRASES = [
  'il est évident que',
  'sans aucun doute',
  'il est clair que',
  'la vérité est que',
  'nous savons tous que'
];

export const STRUCTURAL_MARKERS = [
  'premièrement',
  'deuxièmement',
  'ensuite',
  'en conclusion',
  'en résumé',
  'pour commencer'
];

export const SENTIMENT_AMPLIFIERS = [
  'incroyablement',
  'totalement',
  'extrêmement',
  'absolument',
  'complètement'
];

export const DEFAULT_SIMILARITY_ENGINE = new SimilarityEngine();

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .replace(/[^a-zàâçéèêëîïôûùüÿñæœ0-9\s]/gi, ' ')
    .split(/\s+/)
    .filter(Boolean);

export const containsAny = (text: string, list: string[]): boolean =>
  list.some(word => text.includes(word));

export const sentenceSplit = (text: string): string[] =>
  text.split(/[.!?]+/).map(sentence => sentence.trim()).filter(Boolean);

export const normalizeWhitespace = (text: string): string => text.replace(/\s+/g, ' ').trim();
