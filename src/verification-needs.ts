import type { BiasFinding, ThoughtNode, VerificationStatus } from './types';
import { BIAS_PATTERNS, PATTERNS, UNCERTAINTY_MODIFIERS } from './constants';

export interface HeuristicVerificationResult {
  status: VerificationStatus;
  confidence: number;
  notes: string;
  keyFactors: string[];
}

export interface VerificationRequirements {
  needsFactCheck: boolean;
  needsMathCheck: boolean;
  needsSourceCheck: boolean;
  priority: 'low' | 'medium' | 'high';
  suggestedTools: string[];
  requiresMultipleVerifications: boolean;
  reasons: string[];
  recommendedVerificationsCount: number;
}

function matches(text: string, pattern: RegExp): boolean {
  return text.match(pattern) !== null;
}

export function detectBiases(thought: ThoughtNode): BiasFinding[] {
  const content = thought.content.toLowerCase();
  const findings: BiasFinding[] = [];

  for (const bias of BIAS_PATTERNS) {
    const found = content.match(bias.regex) ?? [];
    if (found.length === 0) {
      continue;
    }
    const score = Math.min((found.length / bias.patterns.length) * 1.5, 1);
    if (score > 0.2) {
      findings.push({
        type: bias.type,
        score,
        description: bias.description,
        examples: found.map(example => example.trim()),
      });
    }
  }

  if (matches(content, PATTERNS.STRONG_EMOTION)) {
    findings.push({
      type: 'emotional_bias',
      score: 0.7,
      description: 'Jugement influencé par une forte charge émotionnelle',
    });
  }

  return findings;
}

export function evaluateVerificationHeuristics(thought: ThoughtNode): HeuristicVerificationResult {
  const content = thought.content.toLowerCase();
  const keyFactors: string[] = [];
  let status: VerificationStatus = 'unverified';
  let confidence = 0.45;

  const hasNumbers = matches(content, PATTERNS.NUMBERS);
  const hasFactualClaim = matches(content, PATTERNS.FACTUAL_CLAIM);
  if (hasNumbers || hasFactualClaim) {
    keyFactors.push("Présence d'éléments factuels nécessitant une confirmation.");
    confidence = Math.max(confidence, 0.5);
  }

  const hasSpeculation = UNCERTAINTY_MODIFIERS.some(term =>
    new RegExp(`(?:^|[^a-zàâäéèêëîïôöùûüç])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^a-zàâäéèêëîïôöùûüç])`, 'i').test(content)
  );
  const hasAbsolute = matches(content, PATTERNS.ABSOLUTE_ASSERTION);
  const hasStrongEmotion = matches(content, PATTERNS.STRONG_EMOTION);

  if (hasAbsolute && hasSpeculation) {
    status = 'contradicted';
    confidence = Math.max(confidence, 0.55);
    keyFactors.push('Combinaison de certitudes absolues et de formulations spéculatives.');
  } else if (hasAbsolute && !hasSpeculation && !hasStrongEmotion) {
    confidence = Math.max(confidence, 0.5);
    keyFactors.push(
      'Affirmations catégoriques sans donnée vérifiable : le langage catégorique seul ne prouve rien.'
    );
  } else if (!hasNumbers && hasSpeculation) {
    status = 'uncertain';
    confidence = Math.min(confidence, 0.48);
    keyFactors.push('Énoncé spéculatif sans soutien factuel explicite.');
  }

  if (hasStrongEmotion) {
    keyFactors.push('Langage émotionnel détecté, à vérifier avec prudence.');
    confidence = Math.min(confidence, 0.5);
  }

  if (keyFactors.length === 0) {
    keyFactors.push('Aucun indice heuristique fort détecté.');
  }

  return {
    status,
    confidence: Math.max(0.2, Math.min(confidence, 0.75)),
    notes: keyFactors.join(' '),
    keyFactors,
  };
}

export function generateCertaintySummary(
  status: VerificationStatus,
  confidence: number = 0.5
): string {
  const percentage = Math.round(confidence * 100);
  const statusDescriptions: Record<VerificationStatus, string> = {
    verified: `Information vérifiée avec un niveau de confiance de ${percentage}%. Plusieurs sources fiables confirment cette information.`,
    partially_verified: `Information partiellement vérifiée avec un niveau de confiance de ${percentage}%. Certains éléments sont confirmés par des sources fiables.`,
    unverified: `Information non vérifiée. Niveau de confiance: ${percentage}%. Aucune source ne confirme ou n'infirme cette information.`,
    contradicted: `Information contredite. Niveau de confiance: ${percentage}%. Des sources fiables contredisent cette information.`,
    contradictory: `Information contradictoire. Niveau de confiance: ${percentage}%. Des sources crédibles se contredisent sur ce sujet.`,
    absence_of_information: `Aucune information trouvée sur ce sujet. Niveau de confiance: ${percentage}%. Cette absence d'information est elle-même une information pertinente.`,
    uncertain: `Information incertaine. Niveau de confiance: ${percentage}%. Les sources disponibles ne permettent pas de conclure avec certitude.`,
    inconclusive: `Résultat non concluant. Niveau de confiance: ${percentage}%. Les données sont insuffisantes ou ambiguës pour tirer une conclusion définitive.`,
  };

  let summary = statusDescriptions[status] ?? `Niveau de confiance: ${percentage}%.`;
  if (confidence < 0.3) {
    summary += ' Cette information doit être considérée comme hautement spéculative.';
  } else if (confidence > 0.85) {
    summary += ' Cette information peut être considérée comme fiable.';
  }
  return summary;
}

export function determineVerificationRequirements(content: string): VerificationRequirements {
  const lower = content.toLowerCase();
  const result: VerificationRequirements = {
    needsFactCheck: false,
    needsMathCheck: false,
    needsSourceCheck: false,
    priority: 'low',
    suggestedTools: [],
    requiresMultipleVerifications: false,
    reasons: [],
    recommendedVerificationsCount: 1,
  };
  const addTool = (tool: string): void => {
    if (!result.suggestedTools.includes(tool)) {
      result.suggestedTools.push(tool);
    }
  };
  let score = 0;

  if (matches(lower, PATTERNS.NUMBERS)) {
    result.needsFactCheck = true;
    result.reasons.push('Présence de données chiffrées.');
    addTool('web_search');
    score += 2;
  }

  if (matches(content, PATTERNS.FACTUAL_CLAIM)) {
    result.needsFactCheck = true;
    addTool('web_search');
    result.reasons.push('Contient des affirmations factuelles');
    score += 1;
  }

  if (matches(content, PATTERNS.MATH_CALCULATION) || matches(content, PATTERNS.MATHEMATICAL_PROOF)) {
    result.needsMathCheck = true;
    addTool('calculator');
    result.reasons.push('Contient des calculs ou preuves mathématiques');
  }

  if (matches(content, PATTERNS.SOURCE_REFERENCE)) {
    result.needsSourceCheck = true;
    addTool('source_check');
    result.reasons.push('Contient des références à des sources');
  }

  if (matches(lower, PATTERNS.STRONG_ASSERTION)) {
    score += 2;
    result.reasons.push('Contient des affirmations fortes');
  }

  if (matches(lower, PATTERNS.STATISTICS)) {
    score += 2;
    result.reasons.push('Contient des statistiques ou chiffres précis');
    result.needsFactCheck = true;
    addTool('web_search');
  }

  if (matches(lower, PATTERNS.RECENCY)) {
    score += 1;
    result.reasons.push('Contient des références temporelles récentes');
  }

  result.priority = score >= 4 ? 'high' : score >= 2 ? 'medium' : 'low';
  result.requiresMultipleVerifications =
    (result.needsFactCheck && (result.needsMathCheck || result.needsSourceCheck)) ||
    result.priority === 'high';

  if (result.requiresMultipleVerifications) {
    result.recommendedVerificationsCount =
      result.needsFactCheck && result.needsMathCheck && result.needsSourceCheck ? 3 : 2;
  }

  return result;
}
