import type { Hyperlink, NextStepSuggestion, ThoughtNode } from './types';
import { detectClusters } from './connection-inference';

export interface SuggestionOutcome {
  suggestions: NextStepSuggestion[];
  structureSummary: string;
}

export interface SuggestionContext {
  thoughts: ThoughtNode[];
  earliest?: ThoughtNode;
  latest?: ThoughtNode;
  recent: ThoughtNode[];
  structureSummary: string;
}

const FACT_CHECK_TERMS = [
  'vérifier', 'confirmer', 'source', 'preuve', 'statistique', 'données', 'affirme', 'selon',
] as const;
const CALCULATION_TERMS = [
  'calculer', 'calcul', 'équation', 'résoudre', 'chiffre', 'formule', 'mathématique',
] as const;
const EXTERNAL_INFO_TERMS = [
  'chercher', 'information', 'recherche', 'trouver', 'données', 'référence', 'source', 'actualité',
] as const;
const UNCERTAINTY_TERMS = [
  'peut-être', 'probablement', 'semble', 'possible', 'hypothèse', 'incertain', 'pourrait',
] as const;
const URL_PATTERN = /https?:\/\/[^\s]+/;

function compareTimestamps(a: ThoughtNode, b: ThoughtNode): number {
  const diff = a.timestamp.getTime() - b.timestamp.getTime();
  if (diff !== 0) return diff;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function pickEarliestThought(thoughts: ThoughtNode[]): ThoughtNode | undefined {
  return thoughts.reduce<ThoughtNode | undefined>((earliest, thought) => {
    if (!earliest) return thought;
    return compareTimestamps(thought, earliest) < 0 ? thought : earliest;
  }, undefined);
}

export function pickLatestThought(thoughts: ThoughtNode[]): ThoughtNode | undefined {
  return thoughts.reduce<ThoughtNode | undefined>((latest, thought) => {
    if (!latest) return thought;
    return compareTimestamps(thought, latest) > 0 ? thought : latest;
  }, undefined);
}

export function summarizeStructure(thoughts: ThoughtNode[]): string {
  if (thoughts.length === 0) return 'Aucune pensée';
  if (thoughts.length <= 3) return 'Exploration initiale';

  const isLinear = thoughts.every((thought) => thought.connections.length <= 2);
  const hasClusters = detectClusters(thoughts).length > 1;
  const avgConnections = thoughts.reduce((sum, thought) => sum + thought.connections.length, 0)
    / thoughts.length;

  if (isLinear) return 'Progression principalement linéaire';
  if (hasClusters) return 'Plusieurs clusters de pensées identifiés';
  if (avgConnections > 3) return 'Structure en réseau avec nombreuses connexions';
  return 'Structure mixte avec quelques branches';
}

export function buildSuggestionContext(thoughts: ThoughtNode[], recentLimit = 3): SuggestionContext {
  return {
    thoughts,
    earliest: pickEarliestThought(thoughts),
    latest: pickLatestThought(thoughts),
    recent: [...thoughts].sort((a, b) => compareTimestamps(b, a)).slice(0, recentLimit),
    structureSummary: summarizeStructure(thoughts),
  };
}

export function containsAny(text: string, terms: readonly string[]): boolean {
  if (terms.length === 0) return false;
  const pattern = terms
    .map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  return new RegExp(`\\b(?:${pattern})\\b`, 'i').test(text);
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}...`;
}

export function suggestNextStepsHeuristic(
  thoughts: ThoughtNode[],
  hyperlinks: Hyperlink[] = [],
  limit = 3,
  context: SuggestionContext = buildSuggestionContext(thoughts),
): NextStepSuggestion[] {
  const suggestions: NextStepSuggestion[] = [];
  const sessionNodeIds = new Set(thoughts.map((thought) => thought.id));
  const recentContent = context.recent.map((thought) => thought.content).join(' ');
  const normalizedRecent = recentContent.toLowerCase();

  const needsFactChecking = containsAny(normalizedRecent, FACT_CHECK_TERMS);
  const needsCalculation = containsAny(normalizedRecent, CALCULATION_TERMS);
  const needsExternalInfo = containsAny(normalizedRecent, EXTERNAL_INFO_TERMS);
  const containsUncertainty = containsAny(normalizedRecent, UNCERTAINTY_TERMS);

  if (needsFactChecking) {
    suggestions.push({
      description: 'Vérifiez les informations avec une recherche web',
      type: 'regular',
      confidence: 0.9,
      reasoning: "Utilisez l'outil perplexity_search_web ou tavily-search pour confirmer les faits mentionnés",
    });
  }

  if (needsCalculation) {
    suggestions.push({
      description: 'Exécutez du code pour effectuer les calculs nécessaires',
      type: 'regular',
      confidence: 0.85,
      reasoning: "Utilisez l'outil executePython ou executeJavaScript pour résoudre les calculs ou équations",
    });
  }

  if (needsExternalInfo) {
    suggestions.push({
      description: 'Recherchez des informations supplémentaires en ligne',
      type: 'regular',
      confidence: 0.9,
      reasoning: "Utilisez les outils de recherche web pour enrichir votre analyse avec des données pertinentes",
    });
  }

  const hasContradictions = thoughts.some((thought) =>
    thought.connections.some(
      (connection) => connection.type === 'contradicts' && sessionNodeIds.has(connection.targetId),
    ),
  );

  if (hasContradictions) {
    suggestions.push({
      description: 'Résolvez les contradictions en consultant des sources fiables',
      type: 'meta',
      confidence: 0.85,
      reasoning: 'Utilisez tavily-search ou perplexity_search_web pour vérifier quelle position est correcte',
    });
  }

  if (URL_PATTERN.test(recentContent)) {
    suggestions.push({
      description: "Extrayez et analysez le contenu des URL mentionnées",
      type: 'regular',
      confidence: 0.85,
      reasoning: "Utilisez l'outil tavily-extract pour analyser en profondeur le contenu des pages web",
    });
  }

  const hasMeta = thoughts.some((thought) => thought.type === 'meta');
  if (thoughts.length >= 5 && !hasMeta && suggestions.length < limit) {
    suggestions.push({
      description: 'Faites une méta-réflexion sur votre approche dans cette session',
      type: 'meta',
      confidence: 0.7,
      reasoning: `La méta-cognition peut améliorer la qualité du raisonnement (structure: ${context.structureSummary.toLowerCase()})`,
    });
  }

  const hasHypothesis = thoughts.some((thought) => thought.type === 'hypothesis');
  if (((thoughts.length >= 3 && !hasHypothesis) || containsUncertainty) && suggestions.length < limit) {
    suggestions.push({
      description: 'Formulez une hypothèse basée sur vos observations dans cette session',
      type: 'hypothesis',
      confidence: 0.75,
      reasoning: 'Une hypothèse claire peut guider la suite de votre raisonnement',
    });
  }

  const hasConclusion = thoughts.some((thought) => thought.type === 'conclusion');
  if (thoughts.length >= 7 && !hasConclusion && suggestions.length < limit) {
    const origin = context.earliest
      ? ` depuis « ${truncate(context.earliest.content, 60)} »`
      : '';
    suggestions.push({
      description: 'Rédigez une conclusion provisoire basée sur votre analyse dans cette session',
      type: 'conclusion',
      confidence: 0.8,
      reasoning: `Même provisoire, une conclusion peut aider à synthétiser votre réflexion${origin}.`,
    });
  }

  if (hyperlinks.length > 0 && suggestions.length < limit) {
    suggestions.push({
      description: 'Explorez les relations complexes identifiées dans les clusters de pensées de cette session',
      type: 'meta',
      confidence: 0.8,
      reasoning: "L'analyse des relations multi-nœuds peut révéler des insights cachés",
    });
  }

  return suggestions.slice(0, limit);
}

export function analyzeNextSteps(
  thoughts: ThoughtNode[],
  hyperlinks: Hyperlink[] = [],
  limit = 3,
): SuggestionOutcome {
  const context = buildSuggestionContext(thoughts);
  return {
    suggestions: suggestNextStepsHeuristic(thoughts, hyperlinks, limit, context),
    structureSummary: context.structureSummary,
  };
}

export function suggestNextSteps(
  thoughts: ThoughtNode[],
  hyperlinks: Hyperlink[] = [],
  limit = 3,
): NextStepSuggestion[] {
  return suggestNextStepsHeuristic(thoughts, hyperlinks, limit);
}
