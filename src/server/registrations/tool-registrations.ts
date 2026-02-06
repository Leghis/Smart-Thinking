import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { ToolAnnotations } from '@modelcontextprotocol/sdk/types.js';
import type { MemoryItem, SmartThinkingParams, SmartThinkingResponse } from '../../types';
import type { SmartThinkingEnvironment } from '../environment';
import {
  SearchParamsSchema,
  SmartThinkingParamsSchema,
  FetchParamsSchema,
  type SearchResultItem,
  type SearchToolParams,
  type SmartThinkingToolParams,
  type FetchToolParams,
} from '../contracts';

interface ToolRegistrationOptions {
  includeSmartThinkingTool: boolean;
}

const MEMORY_URI_PREFIX = 'smart-thinking://memories';

const SMART_THINKING_ANNOTATIONS: ToolAnnotations = {
  title: 'Smart-Thinking Reasoning',
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};

const SEARCH_TOOL_ANNOTATIONS: ToolAnnotations = {
  title: 'Search Local Memories',
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

const FETCH_TOOL_ANNOTATIONS: ToolAnnotations = {
  title: 'Fetch Memory Details',
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
};

function asTextResult(payload: Record<string, unknown>) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload,
  };
}

function buildMemoryUri(memoryId: string): string {
  return `${MEMORY_URI_PREFIX}/${encodeURIComponent(memoryId)}`;
}

function formatMemoryTitle(memory: MemoryItem): string {
  if (memory.metadata?.title) {
    return memory.metadata.title;
  }

  if (memory.tags.length > 0) {
    return memory.tags.join(' · ');
  }

  return `Memoire ${memory.id.slice(0, 8)}`;
}

function buildHelpText(): string {
  return [
    '# Smart-Thinking - Guide d\'utilisation',
    '',
    'Smart-Thinking est un outil de raisonnement multi-dimensionnel local et deterministe.',
    '',
    '## Parametres principaux',
    '- thought (obligatoire hors mode help): pensee a analyser',
    '- thoughtType: regular | revision | meta | hypothesis | conclusion',
    '- connections: [{ targetId, type, strength }]',
    '- requestSuggestions: active les recommandations',
    '- requestVerification: active la verification',
    '- containsCalculations: renforce la verification mathematique',
    '- generateVisualization: genere une visualisation',
    '',
    '## Types de visualisation',
    '- graph, chronological, thematic, hierarchical, force, radial',
    '',
    '## Exemple minimal',
    'thought: "L\'IA transformera le marche du travail"',
    'thoughtType: "hypothesis"',
    'generateVisualization: true',
  ].join('\n');
}

function registerSmartThinkingTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'smartthinking',
    {
      title: 'Smart-Thinking',
      description: 'Use this when you need graph-based multi-step reasoning with local verification and persistent memory.',
      inputSchema: SmartThinkingParamsSchema.shape,
      annotations: SMART_THINKING_ANNOTATIONS,
    },
    async (params: SmartThinkingToolParams) => {
      if (params.help) {
        return {
          content: [{ type: 'text', text: buildHelpText() }],
        };
      }

      if (!params.thought?.trim()) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: JSON.stringify({
              error: "Le parametre 'thought' est obligatoire.",
              message: 'Fournissez une pensee non vide a analyser.',
            }, null, 2),
          }],
        };
      }

      const safeParams: SmartThinkingParams = {
        ...params,
        thought: params.thought.trim(),
      };

      const { response, sessionId } = await env.orchestrator.run(safeParams);
      const payload: SmartThinkingResponse & { sessionId?: string } = {
        ...response,
        sessionId,
      };

      return asTextResult(payload as unknown as Record<string, unknown>);
    },
  );
}

function registerSearchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'search',
    {
      title: 'Search',
      description: 'Use this when you need to find relevant Smart-Thinking memories for a query.',
      inputSchema: SearchParamsSchema.shape,
      annotations: SEARCH_TOOL_ANNOTATIONS,
    },
    async ({ query, limit = 5, sessionId }: SearchToolParams) => {
      const matches = await env.memoryManager.getRelevantMemories(query, limit, sessionId);
      const results: SearchResultItem[] = matches.map(memory => {
        const snippet = memory.content.length > 240
          ? `${memory.content.slice(0, 240)}...`
          : memory.content;

        const metadata: Record<string, unknown> = {};
        if (memory.relevanceScore !== undefined) {
          metadata.score = memory.relevanceScore;
        }
        if (memory.tags.length > 0) {
          metadata.tags = memory.tags;
        }
        const memorySessionId = memory.metadata?.sessionId ?? null;
        if (memorySessionId) {
          metadata.sessionId = memorySessionId;
        }
        const timestamp = memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp;
        if (timestamp) {
          metadata.timestamp = timestamp;
        }

        const sourceUrl = memory.metadata?.source;

        const result: SearchResultItem = {
          id: memory.id,
          title: formatMemoryTitle(memory),
          text: snippet,
          url: typeof sourceUrl === 'string' && sourceUrl.trim().length > 0
            ? sourceUrl
            : buildMemoryUri(memory.id),
        };

        if (Object.keys(metadata).length > 0) {
          result.metadata = metadata;
        }

        return result;
      });

      return asTextResult({ results });
    },
  );
}

function registerFetchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.registerTool(
    'fetch',
    {
      title: 'Fetch',
      description: 'Use this when you need the full content of one search result item by id.',
      inputSchema: FetchParamsSchema.shape,
      annotations: FETCH_TOOL_ANNOTATIONS,
    },
    async ({ id }: FetchToolParams) => {
      const memory = env.memoryManager.getMemory(id);
      if (!memory) {
        return {
          isError: true,
          content: [{
            type: 'text',
            text: JSON.stringify({ error: 'Memoire introuvable', id }, null, 2),
          }],
        };
      }

      const timestamp = memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp;
      const metadata: Record<string, unknown> = { tags: memory.tags };

      if (memory.metadata?.sessionId) {
        metadata.sessionId = memory.metadata.sessionId;
      }
      if (timestamp) {
        metadata.timestamp = timestamp;
      }
      if (memory.relevanceScore !== undefined) {
        metadata.score = memory.relevanceScore;
      }

      const additionalMetadata = { ...memory.metadata };
      delete (additionalMetadata as Record<string, unknown>).source;
      if (Object.keys(additionalMetadata).length > 0) {
        metadata.additional = additionalMetadata;
      }

      const sourceUrl = memory.metadata?.source;

      const payload: Record<string, unknown> = {
        id: memory.id,
        title: formatMemoryTitle(memory),
        text: memory.content,
        metadata,
        url: typeof sourceUrl === 'string' && sourceUrl.trim().length > 0
          ? sourceUrl
          : buildMemoryUri(memory.id),
      };

      return asTextResult(payload);
    },
  );
}

export function registerCoreTools(
  server: McpServer,
  env: SmartThinkingEnvironment,
  options: ToolRegistrationOptions,
): void {
  if (options.includeSmartThinkingTool) {
    registerSmartThinkingTool(server, env);
  }

  registerSearchTool(server, env);
  registerFetchTool(server, env);
}
