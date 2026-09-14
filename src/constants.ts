/**
 * Smart-Thinking v13 — Consolidated constants.
 *
 * Every lexicon, threshold, weight and pattern lives here so heuristics stay
 * auditable and testable (no duplicated word lists across modules).
 */

import type { ConnectionType, ReasoningDepth, ThoughtType, VerificationStatus } from './types';

// ---------------------------------------------------------------------------
// Language lexicons (French + English markers)
// ---------------------------------------------------------------------------

export const UNCERTAINTY_MODIFIERS: readonly string[] = [
  'peut-être', 'possible', 'probablement', 'semble', 'pourrait', 'hypothèse',
  'suppose', 'doute', 'éventuellement', 'potentiellement', 'apparemment',
  'suggère', 'might', 'maybe', 'possibly', 'uncertain', 'hypothesis',
];

export const CERTAINTY_MODIFIERS: readonly string[] = [
  'certainement', 'clairement', 'évidemment', 'sans doute', 'indiscutablement',
  'nécessairement', 'démontré', 'prouvé', 'assurément', 'incontestablement',
  'manifestement', 'définitivement', 'inévitablement', 'certainly', 'clearly',
  'proven', 'definitely',
];

export const POSITIVE_WORDS: readonly string[] = [
  'précis', 'clair', 'cohérent', 'logique', 'détaillé', 'rigoureux', 'méthodique',
  'analytique', 'systématique', 'fondé', 'approfondi', 'équilibré', 'objectif',
  'exact', 'raisonnable', 'valide', 'pertinent', 'significatif',
];

export const NEGATIVE_WORDS: readonly string[] = [
  'vague', 'confus', 'incohérent', 'illogique', 'superficiel', 'flou', 'ambigu',
  'subjectif', 'inexact', 'imprécis', 'douteux', 'spéculatif', 'non pertinent',
  'biaisé', 'contradictoire', 'simpliste', 'circulaire',
];

export const QUALITY_INDICATORS: Record<ThoughtType, { positive: readonly string[]; negative: readonly string[] }> = {
  regular: {
    positive: ['clairement formulé', 'bien structuré', 'idée développée'],
    negative: ['incomplet', 'hors sujet', 'mal structuré'],
  },
  meta: {
    positive: ['auto-critique', 'réflexif', 'évaluatif', 'conscient'],
    negative: ['superficiel', 'non réflexif', 'auto-complaisant'],
  },
  hypothesis: {
    positive: ['testable', 'falsifiable', 'précis', 'fondé sur', 'prédictif'],
    negative: ['vague', 'non testable', 'infalsifiable', 'sans fondement'],
  },
  conclusion: {
    positive: ['synthétise', 'résume', 'découle de', 'cohérent avec'],
    negative: ['déconnecté', 'sans rapport', 'non justifié', 'contradictoire'],
  },
  revision: {
    positive: ['améliore', 'corrige', 'précise', 'clarifie', 'nuance'],
    negative: ['répétitif', 'redondant', 'contredit sans justification'],
  },
};

export const STOP_WORDS: ReadonlySet<string> = new Set([
  'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
  'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui',
  'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
  'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
  'est', 'sont', 'être', 'avoir', 'fait', 'faire',
  'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup',
]);

// ---------------------------------------------------------------------------
// Metric weights & thresholds
// ---------------------------------------------------------------------------

export const METRIC_THRESHOLDS = {
  MIN_CONFIDENCE: 0.1,
  MAX_CONFIDENCE: 0.95,
  MIN_RELEVANCE: 0.1,
  MAX_RELEVANCE: 0.95,
  MIN_QUALITY: 0.1,
  MAX_QUALITY: 0.95,
  MIN_RELIABILITY: 0.1,
  MAX_RELIABILITY: 0.95,
  HIGH_CONFIDENCE: 0.8,
  PARTIALLY_VERIFIED_THRESHOLD: 0.45,
  ABSENCE_THRESHOLD: 0.65,
  UNCERTAIN_THRESHOLD: 0.5,
  CONTRADICTION_THRESHOLD: 0.3,
  WEIGHT_TOLERANCE: 0.001,
} as const;

export const CONFIDENCE_WEIGHTS = {
  modifierAnalysis: 0.4,
  thoughtType: 0.2,
  structuralIndicators: 0.2,
  sentimentBalance: 0.2,
} as const;

export const RELEVANCE_WEIGHTS = {
  keywordOverlap: 0.5,
  connectionStrength: 0.5,
} as const;

export const QUALITY_WEIGHTS = {
  wordIndicators: 0.25,
  typeSpecificIndicators: 0.25,
  structuralBalance: 0.2,
  coherence: 0.3,
} as const;

export const TYPE_SCORES: Record<ThoughtType, number> = {
  conclusion: 0.8,
  hypothesis: 0.6,
  meta: 0.7,
  revision: 0.75,
  regular: 0.65,
};

export const TYPE_ADJUSTMENTS: Record<ThoughtType, { confidence: number; quality: number; coherence: number }> = {
  hypothesis: { confidence: 0.9, quality: 1.0, coherence: 1.1 },
  conclusion: { confidence: 1.1, quality: 1.2, coherence: 1.2 },
  meta: { confidence: 1.0, quality: 1.1, coherence: 0.9 },
  revision: { confidence: 1.05, quality: 1.1, coherence: 1.05 },
  regular: { confidence: 1.0, quality: 1.0, coherence: 1.0 },
};

export const CONNECTION_WEIGHTS: Record<ConnectionType, number> = {
  supports: 0.9,
  contradicts: 0.7,
  refines: 0.8,
  branches: 0.6,
  derives: 0.75,
  associates: 0.5,
  exemplifies: 0.7,
  generalizes: 0.75,
  compares: 0.6,
  contrasts: 0.65,
  questions: 0.5,
  extends: 0.7,
  analyzes: 0.8,
  synthesizes: 0.85,
  applies: 0.7,
  evaluates: 0.8,
  cites: 0.9,
  'extended-by': 0.7,
  'analyzed-by': 0.8,
  'component-of': 0.7,
  'applied-by': 0.7,
  'evaluated-by': 0.8,
  'cited-by': 0.9,
};

export const VERIFICATION_SCORE: Record<VerificationStatus, number> = {
  verified: 0.95,
  partially_verified: 0.75,
  contradicted: 0.3,
  contradictory: 0.2,
  uncertain: 0.4,
  absence_of_information: 0.65,
  unverified: 0.45,
  inconclusive: 0.55,
};

export const RELIABILITY_WEIGHTS = {
  withCalculations: { confidence: 0.25, relevance: 0.1, quality: 0.1, verification: 0.55 },
  withoutCalculations: { confidence: 0.35, relevance: 0.15, quality: 0.15, verification: 0.35 },
} as const;

// ---------------------------------------------------------------------------
// Shared regex patterns (no `g` flag: safe with `.test()`)
// ---------------------------------------------------------------------------

export const PATTERNS = {
  REFERENCES: /\(([^)]+)\)|\[[^\]]+\]/g,
  NUMBERS: /\d+([.,]\d+)?%?/g,
  SENTENCES: /[.!?]+/,
  MATH_CALCULATION:
    /(?:\d+(?:[.,]\d+)?)\s*(?:[+\-*/^=]|plus|moins|divisé|fois|multiplié)\s*(?:\d+(?:[.,]\d+)?)/i,
  MATHEMATICAL_PROOF: /(?:prouvons|démontrons|supposons|soit|démonstration|preuve|CQFD|théorème|lemme|corollaire)/i,
  FACTUAL_CLAIM: /(?:est|sont|était|étaient|a été|ont été|sera|seront)\s+(?:un|une|des|le|la|les|du|de la)/i,
  STRONG_EMOTION: /(?:!{2,}|incroyable|fantastique|horrible|déteste|adore|absolument|totalement|complètement|extrêmement)/i,
  ABSOLUTE_ASSERTION: /(?:toujours|jamais|impossible|certainement|indiscutablement|absolument)/i,
  SOURCE_REFERENCE: /(?:selon|d'après|source|cité|référence|étude|recherche|publication)/i,
  STATISTICS: /\d+\s?%|\d+\.\d+|millions?|milliards?/i,
  RECENCY: /(?:récemment|cette année|ce mois|cette semaine|aujourd'hui|actuellement)/i,
  STRONG_ASSERTION: /(?:certainement|absolument|sans aucun doute|clairement|évidemment|forcément)/i,
  ORDERED_MARKERS: /(?:premièrement|deuxièmement|en conclusion|pour commencer)/i,
} as const;

// ---------------------------------------------------------------------------
// Cognitive bias patterns
// ---------------------------------------------------------------------------

export interface BiasPattern {
  type: string;
  regex: RegExp;
  patterns: readonly string[];
  description: string;
}

export const BIAS_PATTERNS: readonly BiasPattern[] = [
  {
    type: 'confirmation_bias',
    regex: /je savais déjà|comme prévu|confirme que|toujours été|évidemment/gi,
    patterns: ['je savais déjà', 'comme prévu', 'confirme que', 'toujours été', 'évidemment'],
    description: 'Tendance à favoriser les informations qui confirment des croyances préexistantes',
  },
  {
    type: 'recency_bias',
    regex: /récemment|dernièrement|ces jours-ci|tendance actuelle|de nos jours/gi,
    patterns: ['récemment', 'dernièrement', 'ces jours-ci', 'tendance actuelle', 'de nos jours'],
    description: 'Tendance à donner plus d\'importance aux événements récents',
  },
  {
    type: 'availability_heuristic',
    regex: /souvent|fréquemment|généralement|habituellement|couramment/gi,
    patterns: ['souvent', 'fréquemment', 'généralement', 'habituellement', 'couramment'],
    description: 'Jugement basé sur des exemples qui viennent facilement à l\'esprit',
  },
  {
    type: 'black_white_thinking',
    regex: /toujours|jamais|impossible|absolument|parfaitement|totalement/gi,
    patterns: ['toujours', 'jamais', 'impossible', 'absolument', 'parfaitement', 'totalement'],
    description: 'Tendance à voir les choses en termes absolus sans nuances',
  },
  {
    type: 'authority_bias',
    regex: /expert dit|selon les experts|études montrent|scientifiquement prouvé/gi,
    patterns: ['expert dit', 'selon les experts', 'études montrent', 'scientifiquement prouvé'],
    description: 'Tendance à attribuer plus de poids aux opinions des figures d\'autorité',
  },
];

// ---------------------------------------------------------------------------
// Reasoning depth profiles
// ---------------------------------------------------------------------------

export interface DepthProfile {
  depth: ReasoningDepth;
  runInference: boolean;
  verificationLevel: 'minimal' | 'standard' | 'thorough';
  maxSuggestions: number;
  maxSearchQueries: number;
  includeVisualizationByDefault: boolean;
  maxPlanSteps: number;
  evidenceLookback: number;
}

export const DEPTH_PROFILES: Record<ReasoningDepth, DepthProfile> = {
  fast: {
    depth: 'fast',
    runInference: false,
    verificationLevel: 'minimal',
    maxSuggestions: 2,
    maxSearchQueries: 0,
    includeVisualizationByDefault: false,
    maxPlanSteps: 4,
    evidenceLookback: 5,
  },
  balanced: {
    depth: 'balanced',
    runInference: true,
    verificationLevel: 'standard',
    maxSuggestions: 4,
    maxSearchQueries: 2,
    includeVisualizationByDefault: false,
    maxPlanSteps: 7,
    evidenceLookback: 10,
  },
  deep: {
    depth: 'deep',
    runInference: true,
    verificationLevel: 'thorough',
    maxSuggestions: 6,
    maxSearchQueries: 4,
    includeVisualizationByDefault: true,
    maxPlanSteps: 12,
    evidenceLookback: 25,
  },
};

// ---------------------------------------------------------------------------
// Runtime limits
// ---------------------------------------------------------------------------

export const LIMITS = {
  DEFAULT_SESSION_ID: 'default',
  MAX_THOUGHT_LENGTH: 20_000,
  MAX_CONNECTIONS_PER_THOUGHT: 50,
  MAX_MEMORY_ITEMS_PER_SESSION: 5_000,
  MAX_GRAPH_NODES_PER_SESSION: 2_000,
  MAX_VERIFICATION_ENTRIES_PER_SESSION: 2_000,
  MAX_SEARCH_RESULTS: 10,
  MAX_FETCH_CHARS: 50_000,
  MAX_TOKEN_CACHE_ENTRIES: 2_000,
  WEB_REQUEST_TIMEOUT_MS: 15_000,
  VERIFICATION_TIMEOUT_MS: 10_000,
} as const;

export const SIMILARITY_THRESHOLDS = {
  EXACT_MATCH: 0.95,
  HIGH: 0.8,
  MEDIUM: 0.65,
  LOW: 0.55,
} as const;

export const CACHE_TTL_MS = {
  SIMILARITY: 3600_000,
  TOKEN: 3600_000,
  SEARCH: 600_000,
  SESSION: 86_400_000,
} as const;
