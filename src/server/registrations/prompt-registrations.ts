import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { buildScienceProtocol } from '../../reasoning/protocol';

export function registerServerPrompts(server: McpServer): void {
  server.registerPrompt(
    'smartthinking-deep-reasoning',
    {
      title: 'Deep Reasoning Playbook',
      description: 'Full workflow to solve a complex problem with the Smart-Thinking toolset (plan, reasoning graph, verification, web search).',
      argsSchema: {
        problem: z.string().min(1).describe('Le problème ou la question à résoudre'),
        constraints: z.string().optional().describe('Contraintes, données connues, format attendu'),
      },
    },
    ({ problem, constraints }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Tu disposes du serveur MCP Smart-Thinking. Applique ce protocole strictement.',
              '',
              `PROBLÈME: ${problem}`,
              constraints ? `CONTRAINTES: ${constraints}` : '',
              '',
              'PROTOCOLE:',
              '1. Appelle plan(goal, constraints) pour décomposer le problème en étapes testables.',
              '2. Pour chaque étape: raisonne, puis consigne l\'étape avec smartthinking (thoughtType adapté, depth="balanced" ou "deep", connections vers les pensées précédentes).',
              '3. Toute affirmation factuelle, chiffrée ou récente doit être soutenue par web_search (Tavily) puis verify. Si web_search renvoie provider="native", exécute la recherche avec ton outil natif et cite les URL.',
              '4. Ne présente JAMAIS une conclusion dont le statut de vérification est "unverified", "uncertain" ou "absence_of_information" comme un fait établi. Signale explicitement les incertitudes.',
              '5. Utilise hypotheses / hypothesisUpdate pour tester les hypothèses concurrentes et éliminer les plus faibles avec des preuves.',
              '6. Termine par une conclusion qui: répond directement, liste les preuves avec sources, explicite les hypothèses et le niveau de confiance.',
            ].filter(Boolean).join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'smartthinking-reasoning-plan',
    {
      title: 'Reasoning Plan',
      description: 'Build a testable reasoning plan before executing a task.',
      argsSchema: {
        objective: z.string().min(1).describe('Objectif principal à atteindre'),
        constraints: z.string().optional().describe('Contraintes non négociables'),
        depth: z.enum(['fast', 'balanced', 'deep']).optional().describe('Niveau de profondeur attendu'),
      },
    },
    ({ objective, constraints, depth }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Appelle l\'outil plan pour cet objectif, puis exécute le plan étape par étape.',
              `Objectif: ${objective}`,
              constraints ? `Contraintes: ${constraints}` : '',
              depth ? `Profondeur demandée: ${depth}` : '',
              'Pour chaque étape: consigne la pensée avec smartthinking, indique la preuve attendue et le critère de succès.',
              'Si le plan évolue, mets à jour les statuts avec session(action="set_plan_step").',
            ].filter(Boolean).join('\n'),
          },
        },
      ],
    }),
  );


  server.registerPrompt(
    'smartthinking-science-protocol',
    {
      title: 'Science Protocol (standard)',
      description:
        'Standard workflow for research-level problems: domain classification, exact compute, certificates, trap checklist, required answer format. Use it before solving any hard challenge.',
      argsSchema: {
        problem: z.string().min(1).describe('Énoncé du problème complexe'),
      },
    },
    ({ problem }) => {
      const protocol = buildScienceProtocol(problem);
      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: [
                `Domaine détecté: ${protocol.domain}`,
                '',
                'ÉTAPES:',
                ...protocol.steps,
                '',
                'PIÈGES À TRAITER:',
                ...protocol.checklist.map(item => `- ${item}`),
                '',
                'OUTILS RECOMMANDÉS:',
                ...protocol.toolHints.map(item => `- ${item}`),
                '',
                'FORMAT DE RÉPONSE:',
                ...protocol.answerFormat,
                '',
                'PROBLÈME:',
                problem,
              ].join('\n'),
            },
          },
        ],
      };
    },
  );

  server.registerPrompt(
    'smartthinking-verify-claim',
    {
      title: 'Verification Checklist',
      description: 'Generate and execute a deterministic verification checklist for a factual claim.',
      argsSchema: {
        claim: z.string().min(1).describe('Affirmation à vérifier'),
      },
    },
    ({ claim }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'Vérifie cette affirmation avec l\'outil verify.',
              `Affirmation: ${claim}`,
              'Démarche:',
              '1. verify(claim) avec checkMath=true, checkConsistency=true, checkWeb=true.',
              '   - Si un contrôle déterministe exact tranche (calcul, solveur), le statut est verified/contradicted et la couche web est ignorée : ne la relance pas pour « confirmer » un calcul.',
              '   - Sinon, verified exige ≥ 2 domaines sources indépendants ; un seul domaine donne partially_verified ; les extraits hors sujet sont écartés (discardedNeutral).',
              '2. Si rien n\'est exploitable, web_agent pour une boucle multi-sources ou web_search ciblé sur chaque composante chiffrée.',
              '3. Reprends le vocabulaire renvoyé (verificationBasis) : déterministe / web / mixte / aucune.',
              '4. Cite chaque source (URL + date) et liste explicitement ce qui reste non vérifiable (methodsUnavailable).',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
