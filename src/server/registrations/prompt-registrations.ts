import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

export function registerServerPrompts(server: McpServer): void {
  server.registerPrompt(
    'smartthinking-reasoning-plan',
    {
      title: 'Reasoning Plan',
      description: 'Build a high-quality reasoning plan before calling smartthinking.',
      argsSchema: {
        objective: z.string().min(1).describe('Objectif principal a atteindre'),
        constraints: z.string().optional().describe('Contraintes non negociables'),
        depth: z.enum(['fast', 'balanced', 'deep']).optional().describe('Niveau de profondeur attendu'),
      },
    },
    ({ objective, constraints, depth }) => {
      const lines = [
        'Construit un plan de raisonnement en etapes numerotees et testables.',
        `Objectif: ${objective}`,
      ];

      if (constraints) {
        lines.push(`Contraintes: ${constraints}`);
      }

      if (depth) {
        lines.push(`Profondeur demandee: ${depth}`);
      }

      lines.push('Pour chaque etape: objectif, hypothese, verification attendue, sortie.');

      return {
        messages: [
          {
            role: 'user' as const,
            content: {
              type: 'text' as const,
              text: lines.join('\n'),
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
      description: 'Generate a deterministic verification checklist for a factual claim.',
      argsSchema: {
        claim: z.string().min(1).describe('Affirmation a verifier'),
      },
    },
    ({ claim }) => ({
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: [
              'Genere une checklist de verification factuelle en 5 etapes maximum.',
              `Affirmation: ${claim}`,
              'Chaque etape doit specifier: donnee attendue, source, critere de validation.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
