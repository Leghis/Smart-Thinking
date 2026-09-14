import { randomUUID } from 'node:crypto';
import type { Plan, PlanStep, ReasoningDepth } from './types';
import { DEPTH_PROFILES } from './constants';
import { extractKeywords } from './keywords';

interface GoalTemplate {
  matcher: RegExp;
  steps: Array<{ description: string; successCriteria: string }>;
}

const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    matcher: /(calcul|combien|nombre|montant|coût|prix|total|pourcentage|taux|surface|distance|vitesse|durée)/i,
    steps: [
      {
        description: 'Identifier les grandeurs connues, les unités et l\'inconnue recherchée.',
        successCriteria: 'Toutes les données numériques et leurs unités sont listées explicitement.',
      },
      {
        description: 'Poser l\'expression mathématique ou la formule reliant les grandeurs.',
        successCriteria: 'La formule est écrite avant tout calcul numérique.',
      },
      {
        description: 'Calculer le résultat étape par étape en gardant la précision intermédiaire.',
        successCriteria: 'Chaque étape de calcul est explicite et reproductible.',
      },
      {
        description: 'Vérifier le calcul avec l\'outil smartthinking (containsCalculations=true) et contrôler l\'ordre de grandeur.',
        successCriteria: 'Le calcul est marqué correct par la vérification et l\'ordre de grandeur est plausible.',
      },
      {
        description: 'Formuler la conclusion avec l\'unité correcte et les hypothèses retenues.',
        successCriteria: 'La réponse finale est univoque et les hypothèses sont mentionnées.',
      },
    ],
  },
  {
    matcher: /(choisir|décider|compare|meilleur|option|stratégie|alternative|arbitrage)/i,
    steps: [
      {
        description: 'Expliciter les critères de décision et leur poids relatif.',
        successCriteria: 'Chaque critère est mesurable et son poids est justifié.',
      },
      {
        description: 'Lister les options candidates sans en éliminer prématurément.',
        successCriteria: 'Au moins deux options distinctes sont décrites.',
      },
      {
        description: 'Évaluer chaque option sur chaque critère avec des éléments de preuve.',
        successCriteria: 'Chaque score est relié à une donnée ou une source.',
      },
      {
        description: 'Tester la robustesse : sensibilité aux hypothèses et scénarios défavorables.',
        successCriteria: 'Au moins un scénario adverse est analysé.',
      },
      {
        description: 'Conclure en explicitant le compromis et les risques résiduels.',
        successCriteria: 'La recommandation inclut les conditions dans lesquelles elle serait remise en cause.',
      },
    ],
  },
  {
    matcher: /(pourquoi|explique|comment fonctionne|cause|conséquence|mécanisme|impact|effet)/i,
    steps: [
      {
        description: 'Formuler le phénomène à expliquer et ses limites précises.',
        successCriteria: 'Le périmètre de l\'explication est explicite.',
      },
      {
        description: 'Énoncer le mécanisme causal principal avec ses variables.',
        successCriteria: 'La relation de cause à effet est falsifiable.',
      },
      {
        description: 'Rechercher les preuves favorables et les contre-exemples.',
        successCriteria: 'Au moins une preuve et un contre-exemple potentiel sont identifiés.',
      },
      {
        description: 'Distinguer corrélation et causalité, lister les variables confondantes.',
        successCriteria: 'Les confusions possibles sont explicitement écartées ou documentées.',
      },
      {
        description: 'Synthétiser en indiquant le niveau de confiance et les incertitudes.',
        successCriteria: 'La conclusion distingue clairement les faits établis des hypothèses.',
      },
    ],
  },
  {
    matcher: /(recherche|actualité|récent|source|vérifie|prouve|est-ce vrai|info)/i,
    steps: [
      {
        description: 'Formuler 2 à 4 requêtes de recherche ciblées et complémentaires.',
        successCriteria: 'Chaque requête vise un aspect distinct de la question.',
      },
      {
        description: 'Collecter des sources primaires et secondaires récentes.',
        successCriteria: 'Au moins deux sources indépendantes sont citées avec leur date.',
      },
      {
        description: 'Comparer les sources et identifier les désaccords.',
        successCriteria: 'Les affirmations contradictoires sont listées explicitement.',
      },
      {
        description: 'Vérifier les affirmations clés avec smartthinking (requestVerification=true).',
        successCriteria: 'Le statut de vérification et les preuves sont enregistrés.',
      },
      {
        description: 'Synthétiser avec citations et niveau de confiance.',
        successCriteria: 'Chaque affirmation importante est reliée à une source.',
      },
    ],
  },
  {
    matcher: /(code|implémente|développe|programme|bug|fonction|architecture|refactor)/i,
    steps: [
      {
        description: 'Spécifier les entrées, sorties et contraintes du problème technique.',
        successCriteria: 'Un exemple d\'entrée/sortie attendu est fourni.',
      },
      {
        description: 'Décomposer en sous-problèmes indépendants et testables.',
        successCriteria: 'Chaque sous-problème a un test associé.',
      },
      {
        description: 'Implémenter puis vérifier chaque sous-problème avant intégration.',
        successCriteria: 'Les tests passent pour chaque unité.',
      },
      {
        description: 'Analyser les cas limites, erreurs et performances.',
        successCriteria: 'Au moins trois cas limites sont testés.',
      },
      {
        description: 'Documenter les décisions et les compromis techniques.',
        successCriteria: 'Les alternatives rejetées sont justifiées.',
      },
    ],
  },
];

const DEFAULT_TEMPLATE: GoalTemplate = {
  matcher: /.*/,
  steps: [
    {
      description: 'Reformuler l\'objectif en une question précise et mesurable.',
      successCriteria: 'L\'objectif reformulé permet de dire sans ambiguïté quand il est atteint.',
    },
    {
      description: 'Lister les faits connus, les hypothèses et les inconnues.',
      successCriteria: 'Faits, hypothèses et inconnues sont clairement séparés.',
    },
    {
      description: 'Décomposer le problème en sous-problèmes ordonnés.',
      successCriteria: 'Chaque sous-problème est résoluble indépendamment.',
    },
    {
      description: 'Traiter chaque sous-problème en consignant les preuves.',
      successCriteria: 'Chaque conclusion intermédiaire est reliée à une preuve ou un calcul.',
    },
    {
      description: 'Croiser les résultats et rechercher les contradictions.',
      successCriteria: 'Aucune contradiction non expliquée ne subsiste.',
    },
    {
      description: 'Conclure avec le niveau de confiance et les limites.',
      successCriteria: 'Les incertitudes restantes sont explicitées.',
    },
  ],
};

function selectTemplate(goal: string): GoalTemplate {
  return GOAL_TEMPLATES.find(template => template.matcher.test(goal)) ?? DEFAULT_TEMPLATE;
}

export function createPlan(
  goal: string,
  constraints: string[] = [],
  depth: ReasoningDepth = 'balanced',
  maxSteps?: number,
): Plan {
  const template = selectTemplate(goal);
  const limit = Math.max(2, maxSteps ?? DEPTH_PROFILES[depth].maxPlanSteps);
  const now = new Date().toISOString();
  const steps: PlanStep[] = template.steps.slice(0, limit).map((step, index) => ({
    id: `step-${index + 1}`,
    index: index + 1,
    description: step.description,
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
