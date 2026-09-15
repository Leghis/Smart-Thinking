import { randomUUID } from 'node:crypto';
import type { Plan, PlanStep, PlanTemplateId, ReasoningDepth } from './types';
import { DEPTH_PROFILES } from './constants';
import { extractKeywords } from './keywords';

interface GoalSignal {
  pattern: RegExp;
  /** Signal name reported back to the caller. */
  label: string;
  /** 3 = decisive on its own, 2 = meaningful, 1 = weak hint. */
  weight: number;
}

interface GoalTemplate {
  id: PlanTemplateId;
  signals: GoalSignal[];
  steps: Array<{ description: string; successCriteria: string }>;
}

/**
 * Structured templates. A template is selected from *distinct weighted signals*
 * (not from the first matching keyword): one decisive signal, or at least two
 * meaningful ones. Without that evidence the generic problem-solving template
 * is used — a literature-review plan is never produced by accident.
 */
const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: 'math',
    signals: [
      { pattern: /\b(calcule[rz]?|calculer|résous|résoudre|démontre[rz]?|prouve[rz]?)\b/i, label: 'verbe de calcul ou de preuve', weight: 3 },
      { pattern: /\b(combien|équation|inéquation|système d'équations|intégrale|dérivée|probabilité)\b/i, label: 'objet mathématique explicite', weight: 3 },
      { pattern: /\b(nombre|montant|coût|prix|total|pourcentage|taux|surface|distance|vitesse|durée|somme|produit|moyenne|écart)\b/i, label: 'grandeur quantifiée', weight: 2 },
    ],
    steps: [
      {
        description: 'Identifier les grandeurs connues, les unités et l\'inconnue recherchée',
        successCriteria: 'Toutes les données numériques et leurs unités sont listées explicitement.',
      },
      {
        description: 'Poser l\'expression mathématique ou la formule reliant les grandeurs',
        successCriteria: 'La formule est écrite avant tout calcul numérique.',
      },
      {
        description: 'Calculer le résultat étape par étape en gardant la précision intermédiaire',
        successCriteria: 'Chaque étape de calcul est explicite et reproductible.',
      },
      {
        description: 'Vérifier le résultat avec un outil déterministe (calculate, solve_math, cas) et contrôler l\'ordre de grandeur',
        successCriteria: 'Le calcul est confirmé par un outil exact et l\'ordre de grandeur est plausible.',
      },
      {
        description: 'Formuler la conclusion avec l\'unité correcte et les hypothèses retenues',
        successCriteria: 'La réponse finale est univoque et les hypothèses sont mentionnées.',
      },
    ],
  },
  {
    id: 'decision',
    signals: [
      { pattern: /\b(décide[rz]?|décision|choisis|choisir|arbitrage|tranche[rz]?)\b/i, label: 'verbe de décision', weight: 3 },
      { pattern: /\b(compare[rz]?|meilleur|option|stratégie|alternative|critère|priorité|compromis)\b/i, label: 'comparaison d\'options', weight: 2 },
    ],
    steps: [
      {
        description: 'Expliciter les critères de décision et leur poids relatif',
        successCriteria: 'Chaque critère est mesurable et son poids est justifié.',
      },
      {
        description: 'Lister les options candidates sans en éliminer prématurément',
        successCriteria: 'Au moins deux options distinctes sont décrites.',
      },
      {
        description: 'Évaluer chaque option sur chaque critère avec des éléments de preuve',
        successCriteria: 'Chaque score est relié à une donnée ou une source.',
      },
      {
        description: 'Tester la robustesse : sensibilité aux hypothèses et scénarios défavorables',
        successCriteria: 'Au moins un scénario adverse est analysé.',
      },
      {
        description: 'Conclure en explicitant le compromis et les risques résiduels',
        successCriteria: 'La recommandation inclut les conditions dans lesquelles elle serait remise en cause.',
      },
    ],
  },
  {
    id: 'causal',
    signals: [
      { pattern: /\b(pourquoi|explique[rz]?|comment fonctionne)\b/i, label: 'demande d\'explication', weight: 3 },
      { pattern: /\b(cause|conséquence|mécanisme|impact|effet|corrélation|causalité)\b/i, label: 'vocabulaire causal', weight: 2 },
    ],
    steps: [
      {
        description: 'Formuler le phénomène à expliquer et ses limites précises',
        successCriteria: 'Le périmètre de l\'explication est explicite.',
      },
      {
        description: 'Énoncer le mécanisme causal principal avec ses variables',
        successCriteria: 'La relation de cause à effet est falsifiable.',
      },
      {
        description: 'Rechercher les preuves favorables et les contre-exemples',
        successCriteria: 'Au moins une preuve et un contre-exemple potentiel sont identifiés.',
      },
      {
        description: 'Distinguer corrélation et causalité, lister les variables confondantes',
        successCriteria: 'Les confusions possibles sont explicitement écartées ou documentées.',
      },
      {
        description: 'Synthétiser en indiquant le niveau de confiance et les incertitudes',
        successCriteria: 'La conclusion distingue clairement les faits établis des hypothèses.',
      },
    ],
  },
  {
    id: 'research',
    signals: [
      {
        pattern: /\b((?:fais|faire|effectue[rz]?|mène[rz]?|lance[rz]?)\s+(?:une\s+)?recherche|recherche[rz]?\s+(?:les|des|la|le|un|une|sur|dans)|cherche[rz]?\s+(?:les|des|la|le|un|une|sur|dans)|état de l'art|revue de (?:la )?littérature|quelles? sont les (?:dernières|récentes)|trouve[rz]? des sources|veille)\b/i,
        label: 'intention de recherche explicite',
        weight: 3,
      },
      { pattern: /\b(sources?|publications?|articles?|études? récentes?|actualité)\b/i, label: 'attente de sources externes', weight: 2 },
    ],
    steps: [
      {
        description: 'Formuler 2 à 4 requêtes de recherche ciblées et complémentaires',
        successCriteria: 'Chaque requête vise un aspect distinct de la question.',
      },
      {
        description: 'Collecter des sources primaires et secondaires récentes (web_search, web_agent, web_crawl)',
        successCriteria: 'Au moins deux sources indépendantes sont citées avec leur date.',
      },
      {
        description: 'Comparer les sources et identifier les désaccords',
        successCriteria: 'Les affirmations contradictoires sont listées explicitement.',
      },
      {
        description: 'Vérifier les affirmations clés avec verify (calculs, cohérence, sources)',
        successCriteria: 'Le statut de vérification et les preuves sont enregistrés.',
      },
      {
        description: 'Synthétiser avec citations et niveau de confiance',
        successCriteria: 'Chaque affirmation importante est reliée à une source.',
      },
    ],
  },
  {
    id: 'code',
    signals: [
      { pattern: /\b(implémente[rz]?|développe[rz]?|écris (?:le|du) code|corrige[rz]? le bug|refactor(?:ise[rz]?)?|débogue[rz]?)\b/i, label: 'verbe d\'implémentation', weight: 3 },
      { pattern: /\b(code|fonction|api|architecture|module|tests? unitaires?|performance|régression)\b/i, label: 'vocabulaire technique', weight: 2 },
    ],
    steps: [
      {
        description: 'Spécifier les entrées, sorties et contraintes du problème technique',
        successCriteria: 'Un exemple d\'entrée/sortie attendu est fourni.',
      },
      {
        description: 'Décomposer en sous-problèmes indépendants et testables',
        successCriteria: 'Chaque sous-problème a un test associé.',
      },
      {
        description: 'Implémenter puis vérifier chaque sous-problème avant intégration',
        successCriteria: 'Les tests passent pour chaque unité.',
      },
      {
        description: 'Analyser les cas limites, erreurs et performances',
        successCriteria: 'Au moins trois cas limites sont testés.',
      },
      {
        description: 'Documenter les décisions et les compromis techniques',
        successCriteria: 'Les alternatives rejetées sont justifiées.',
      },
    ],
  },
];

const GENERIC_TEMPLATE: GoalTemplate = {
  id: 'generic',
  signals: [],
  steps: [
    {
      description: 'Reformuler l\'objectif en une question précise et mesurable',
      successCriteria: 'L\'objectif reformulé permet de dire sans ambiguïté quand il est atteint.',
    },
    {
      description: 'Lister les faits connus, les hypothèses et les inconnues',
      successCriteria: 'Faits, hypothèses et inconnues sont clairement séparés.',
    },
    {
      description: 'Décomposer le problème en sous-problèmes ordonnés',
      successCriteria: 'Chaque sous-problème est résoluble indépendamment.',
    },
    {
      description: 'Traiter chaque sous-problème en consignant les méthodes et les preuves',
      successCriteria: 'Chaque conclusion intermédiaire est reliée à une preuve ou un calcul.',
    },
    {
      description: 'Croiser les résultats et rechercher les contradictions',
      successCriteria: 'Aucune contradiction non expliquée ne subsiste.',
    },
    {
      description: 'Conclure avec le niveau de confiance et les limites',
      successCriteria: 'Les incertitudes restantes sont explicitées.',
    },
  ],
};

interface TemplateSelection {
  template: GoalTemplate;
  confidence: number;
  signals: string[];
  score: number;
}

function selectTemplate(goal: string): TemplateSelection {
  const scored = GOAL_TEMPLATES.map(template => {
    const matched = template.signals.filter(signal => signal.pattern.test(goal));
    return {
      template,
      matched,
      score: matched.reduce((total, signal) => total + signal.weight, 0),
      hasDecisive: matched.some(signal => signal.weight >= 3),
    };
  })
    .filter(candidate => candidate.matched.length > 0)
    .filter(candidate => candidate.hasDecisive || candidate.matched.length >= 2)
    .sort((a, b) => b.score - a.score || b.matched.length - a.matched.length);

  const best = scored[0];
  if (!best) {
    return { template: GENERIC_TEMPLATE, confidence: 0.5, signals: [], score: 0 };
  }

  const signals = best.matched.map(signal => signal.label);
  const confidence = best.hasDecisive
    ? Math.min(0.9, 0.75 + 0.05 * (signals.length - 1))
    : Math.min(0.7, 0.45 + 0.15 * signals.length);

  return { template: best.template, confidence, signals, score: best.score };
}

const SUBJECT_DIGEST_LENGTH = 70;

function subjectDigest(goal: string): string {
  const compact = goal.replace(/\s+/g, ' ').trim();
  return compact.length <= SUBJECT_DIGEST_LENGTH
    ? compact
    : `${compact.slice(0, SUBJECT_DIGEST_LENGTH)}…`;
}

export interface CreatePlanOptions {
  depth?: ReasoningDepth;
  maxSteps?: number;
  /** Force a template instead of relying on signal detection. */
  template?: PlanTemplateId;
}

const FORCED_TEMPLATES: Record<PlanTemplateId, GoalTemplate> = {
  math: GOAL_TEMPLATES[0],
  decision: GOAL_TEMPLATES[1],
  causal: GOAL_TEMPLATES[2],
  research: GOAL_TEMPLATES[3],
  code: GOAL_TEMPLATES[4],
  generic: GENERIC_TEMPLATE,
};

export function createPlan(
  goal: string,
  constraints: string[] = [],
  depth: ReasoningDepth = 'balanced',
  maxSteps?: number,
  templateId?: PlanTemplateId,
): Plan {
  const selection = templateId
    ? { template: FORCED_TEMPLATES[templateId], confidence: 1, signals: ['template forcé'], score: 3 }
    : selectTemplate(goal);
  const limit = Math.max(2, maxSteps ?? DEPTH_PROFILES[depth].maxPlanSteps);
  const now = new Date().toISOString();
  const digest = subjectDigest(goal);
  const steps: PlanStep[] = selection.template.steps.slice(0, limit).map((step, index) => ({
    id: `step-${index + 1}`,
    index: index + 1,
    description:
      index === 0 ? `${step.description} — sujet exact : « ${digest} »` : step.description,
    successCriteria: step.successCriteria,
    status: 'pending',
    dependsOn: index === 0 ? [] : [`step-${index}`],
  }));

  return {
    id: `plan-${randomUUID()}`,
    goal: goal.trim(),
    constraints: constraints.map(constraint => constraint.trim()).filter(Boolean),
    steps,
    depth,
    createdAt: now,
    updatedAt: now,
    template: selection.template.id,
    matchConfidence: selection.confidence,
    signals: selection.signals,
  };
}

export function updatePlanStep(
  plan: Plan,
  stepId: string,
  status: PlanStep['status'],
  evidenceIds?: string[],
): Plan {
  return {
    ...plan,
    steps: plan.steps.map(step =>
      step.id === stepId
        ? { ...step, status, evidenceIds: evidenceIds ?? step.evidenceIds }
        : step,
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function suggestPlanQueries(goal: string, maxQueries = 3): string[] {
  const keywords = extractKeywords(goal);
  if (keywords.length === 0) {
    return [];
  }
  const queries = new Set<string>();
  queries.add(keywords.slice(0, 5).join(' '));
  if (keywords.length >= 4) {
    queries.add(keywords.slice(0, 8).join(' '));
  }
  if (maxQueries >= 3 && keywords.length >= 2) {
    queries.add(`${keywords[0]} ${keywords[1]} données récentes`);
  }
  return Array.from(queries).slice(0, Math.max(maxQueries, 1));
}
