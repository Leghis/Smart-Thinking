import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SmartThinkingEnvironment } from '../environment';
import {
  SERVER_DOCS_RESOURCE_URI,
  SERVER_RUNTIME_RESOURCE_URI,
} from '../server-metadata';
import { LIMITS } from '../../constants';

function buildAboutDocument(version: string): string {
  return [
    '# Smart-Thinking',
    '',
    `Version: ${version}`,
    '',
    'Serveur MCP local-first pour le raisonnement structuré, la vérification honnête,',
    'la mémoire de session et la recherche web (Tavily ou délégation native).',
    '',
    '## Outils',
    '- calculate : calcul déterministe d\'expressions.',
    '- solve_logic / solve_math : solveurs exacts (ordre, équations).',
    '- research : recherche web multi-hop sourcée.',
    '- critique : revue adversariale assistée.',
    '- smartthinking : graphe de pensées, métriques, vérification, plan, hypothèses.',
    '- plan : décomposition d\'objectif en étapes testables.',
    '- verify : vérification calculs + cohérence + sources web.',
    '- web_search : Tavily si configuré (topic, fraîcheur, domaines), sinon délégation au client natif.',
    '- web_crawl : exploration de site (contenu ou carte des URLs) via Tavily.',
    '- search / fetch : mémoires locales et contenus web (compatibles connecteurs).',
    '- session : état, export, configuration Tavily, mise à jour du plan.',
    '',
    '## Principes',
    '- Zéro clé API obligatoire : Tavily est optionnel par utilisateur.',
    '- Aucune vérification fabriquée : sans preuve, le statut reste "unverified".',
    '- Session persistante et reprise déterministe.',
  ].join('\n');
}

function buildRuntimeStatus(env: SmartThinkingEnvironment): string {
  const sessions = env.sessionStore.list();
  return JSON.stringify({
    server: 'smart-thinking-mcp',
    version: env.version,
    timestamp: new Date().toISOString(),
    search: {
      provider: env.runtime.search.provider,
      tavilyConfigured: Boolean(env.runtime.search.tavilyApiKey),
      webVerification: env.runtime.search.provider !== 'off',
    },
    persistence: env.runtime.persistence.disabled ? 'disabled' : 'enabled',
    sessions: sessions.length,
    capabilities: {
      prompts: true,
      resources: true,
      tools: ['protocol', 'compute', 'calculate', 'cas', 'math_knowledge', 'solve_logic', 'solve_math', 'research', 'critique', 'smartthinking', 'plan', 'verify', 'web_search', 'web_crawl', 'search', 'fetch', 'session'],
    },
  }, null, 2);
}

export function registerServerResources(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerResource(
    'smartthinking-about',
    SERVER_DOCS_RESOURCE_URI,
    {
      title: 'Smart-Thinking Overview',
      description: 'Documentation concise du serveur et de ses principes opérationnels.',
      mimeType: 'text/markdown',
    },
    async () => ({
      contents: [
        {
          uri: SERVER_DOCS_RESOURCE_URI,
          mimeType: 'text/markdown',
          text: buildAboutDocument(env.version),
        },
      ],
    }),
  );

  server.registerResource(
    'smartthinking-runtime-status',
    SERVER_RUNTIME_RESOURCE_URI,
    {
      title: 'Runtime Status',
      description: 'État runtime du serveur Smart-Thinking.',
      mimeType: 'application/json',
    },
    async () => ({
      contents: [
        {
          uri: SERVER_RUNTIME_RESOURCE_URI,
          mimeType: 'application/json',
          text: buildRuntimeStatus(env),
        },
      ],
    }),
  );

  server.registerResource(
    'smartthinking-session-recent',
    new ResourceTemplate('smart-thinking://sessions/{sessionId}/recent', { list: undefined }),
    {
      title: 'Session Recent Memories',
      description: 'Mémoires récentes d\'une session donnée.',
      mimeType: 'application/json',
    },
    async (uri, { sessionId }) => {
      const resolvedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
      const memories = env.memoryManager.getRecentMemories(10, resolvedSessionId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify({ sessionId: resolvedSessionId, count: memories.length, memories }, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'smartthinking-memory-by-id',
    new ResourceTemplate('smart-thinking://memories/{memoryId}', { list: undefined }),
    {
      title: 'Memory By ID',
      description: 'Récupération d\'une mémoire unique par identifiant.',
      mimeType: 'application/json',
    },
    async (uri, { memoryId }) => {
      const resolvedMemoryId = Array.isArray(memoryId) ? memoryId[0] : memoryId;
      const memory = env.memoryManager.getMemory(resolvedMemoryId);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(memory ?? { error: 'Memory not found', memoryId: resolvedMemoryId }, null, 2),
          },
        ],
      };
    },
  );

  server.registerResource(
    'smartthinking-session-state',
    new ResourceTemplate('smart-thinking://sessions/{sessionId}/state', { list: undefined }),
    {
      title: 'Session State',
      description: 'Plan, hypothèses et preuves d\'une session.',
      mimeType: 'application/json',
    },
    async (uri, { sessionId }) => {
      const resolvedSessionId = Array.isArray(sessionId) ? sessionId[0] : sessionId;
      const state = await env.sessionStore.get(resolvedSessionId ?? LIMITS.DEFAULT_SESSION_ID);
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(state, null, 2),
          },
        ],
      };
    },
  );
}
