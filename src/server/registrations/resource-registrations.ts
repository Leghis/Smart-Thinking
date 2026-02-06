import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { SmartThinkingEnvironment } from '../environment';
import {
  SERVER_DOCS_RESOURCE_URI,
  SERVER_RUNTIME_RESOURCE_URI,
} from '../server-metadata';

function buildAboutDocument(version: string): string {
  return [
    '# Smart-Thinking',
    '',
    `Version: ${version}`,
    '',
    'Smart-Thinking est un serveur MCP local-first pour le raisonnement graphe,',
    'la verification deterministe et la persistance de sessions.',
    '',
    'Principes:',
    '- Zero cle API obligatoire par defaut',
    '- Pipeline de raisonnement reproductible',
    '- Compatibilite MCP multi-transports (stdio/http/sse)',
  ].join('\n');
}

function buildRuntimeStatus(env: SmartThinkingEnvironment): string {
  const recentCount = env.memoryManager.getRecentMemories(50).length;
  const externalToolsEnabled = process.env.SMART_THINKING_ENABLE_EXTERNAL_TOOLS === 'true';

  return JSON.stringify({
    server: 'smart-thinking-mcp',
    version: env.version,
    timestamp: new Date().toISOString(),
    mode: externalToolsEnabled ? 'hybrid' : 'local-only',
    recentMemories: recentCount,
    capabilities: {
      prompts: true,
      resources: true,
      tools: ['smartthinking', 'search', 'fetch'],
    },
  }, null, 2);
}

export function registerServerResources(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerResource(
    'smartthinking-about',
    SERVER_DOCS_RESOURCE_URI,
    {
      title: 'Smart-Thinking Overview',
      description: 'Documentation concise du serveur et de ses principes operationnels.',
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
      description: 'Etat runtime minimal du serveur Smart-Thinking.',
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
      description: 'Memoires recentes d\'une session donnee.',
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
      description: 'Recuperation d\'une memoire unique par identifiant.',
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
}
