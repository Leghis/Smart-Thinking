import type { ReasoningDepth, SuggestedTool, VerificationResult } from './types';
import { determineVerificationRequirements } from './verification-needs';
import { PATTERNS } from './constants';

export interface ToolSuggestionContext {
  content: string;
  depth: ReasoningDepth;
  verification?: VerificationResult;
  hasPlan: boolean;
  openHypotheses: number;
  evidenceCount: number;
}

export function suggestTools(context: ToolSuggestionContext): SuggestedTool[] {
  const requirements = determineVerificationRequirements(context.content);
  const suggestions: SuggestedTool[] = [];
  const status = context.verification?.status;

  if (requirements.needsFactCheck && context.evidenceCount === 0) {
    suggestions.push({
      name: 'web_search',
      confidence: 0.85,
      reason: 'Des faits ou chiffres nécessitent des sources externes.',
      priority: 1,
    });
  }

  if (!context.hasPlan && requirements.priority !== 'low') {
    suggestions.push({
      name: 'plan',
      confidence: 0.7,
      reason: 'Décomposer l\'objectif en étapes testables avant de conclure.',
      priority: 2,
    });
  }

  if (status === 'unverified' || status === 'uncertain' || status === 'contradictory') {
    suggestions.push({
      name: 'verify',
      confidence: 0.8,
      reason: 'Le statut de vérification invite à croiser la pensée avec des sources.',
      priority: 1,
    });
  }

  if (context.openHypotheses > 0) {
    suggestions.push({
      name: 'smartthinking',
      confidence: 0.75,
      reason: `${context.openHypotheses} hypothèse(s) ouverte(s) à tester avec de nouvelles preuves.`,
      priority: 2,
    });
  }

  if (context.depth === 'deep' && context.evidenceCount > 0) {
    suggestions.push({
      name: 'smartthinking',
      confidence: 0.65,
      reason: 'Consolider les preuves collectées dans le graphe de session.',
      priority: 3,
    });
  }

  if (PATTERNS.MATH_CALCULATION.test(context.content)) {
    suggestions.push({
      name: 'verify',
      confidence: 0.9,
      reason: 'Des calculs sont présents et doivent être validés.',
      priority: 0,
    });
  }

  const deduped = new Map<string, SuggestedTool>();
  for (const suggestion of suggestions) {
    const existing = deduped.get(suggestion.name);
    if (!existing || (existing.priority ?? 99) > (suggestion.priority ?? 99)) {
      deduped.set(suggestion.name, suggestion);
    }
  }

  return Array.from(deduped.values()).sort(
    (a, b) => (a.priority ?? 99) - (b.priority ?? 99) || b.confidence - a.confidence,
  );
}
