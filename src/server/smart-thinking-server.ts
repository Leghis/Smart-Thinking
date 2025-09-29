import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { SmartThinkingEnvironment, getSmartThinkingEnvironment } from './environment';
import { SmartThinkingParams, SmartThinkingResponse, MemoryItem } from '../types';

interface SearchResultItem {
  id: string;
  title: string;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

interface SmartThinkingServerOptions {
  includeSmartThinkingTool?: boolean;
}

const ThoughtTypeEnum = z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']);
const ConnectionTypeEnum = z.enum([
  'supports', 'contradicts', 'refines', 'branches', 'derives', 'associates',
  'exemplifies', 'generalizes', 'compares', 'contrasts', 'questions',
  'extends', 'analyzes', 'synthesizes', 'applies', 'evaluates', 'cites',
  'extended-by', 'analyzed-by', 'component-of', 'applied-by', 'evaluated-by', 'cited-by'
]);
const TemporalityEnum = z.enum(['before', 'after', 'during', 'concurrent']);
const CertaintyEnum = z.enum(['definite', 'high', 'moderate', 'low', 'speculative']);
const DirectionalityEnum = z.enum(['unidirectional', 'bidirectional', 'multidirectional']);
const ScopeEnum = z.enum(['broad', 'specific', 'partial', 'complete']);
const NatureEnum = z.enum(['causal', 'correlational', 'sequential', 'hierarchical', 'associative']);
const VisualizationTypeEnum = z.enum(['graph', 'chronological', 'thematic', 'hierarchical', 'force', 'radial']);
const ClusterByEnum = z.enum(['type', 'theme', 'metric', 'connectivity']);
const DirectionEnum = z.enum(['LR', 'RL', 'TB', 'BT']);

const ConnectionAttributesSchema = z.object({
  temporality: TemporalityEnum.optional(),
  certainty: CertaintyEnum.optional(),
  directionality: DirectionalityEnum.optional(),
  scope: ScopeEnum.optional(),
  nature: NatureEnum.optional(),
  customAttributes: z.record(z.string()).optional()
});

const ConnectionSchema = z.object({
  targetId: z.string().describe('ID de la pensée cible'),
  type: ConnectionTypeEnum.describe('Type de connexion'),
  strength: z.number().min(0).max(1).describe('Force de la connexion (0 à 1)'),
  description: z.string().optional().describe('Description optionnelle de la connexion'),
  attributes: ConnectionAttributesSchema.optional(),
  inferred: z.boolean().optional().describe('Si la connexion a été inférée automatiquement'),
  inferenceConfidence: z.number().min(0).max(1).optional().describe('Confiance dans l\'inférence (0 à 1)'),
  bidirectional: z.boolean().optional().describe('Si la relation est intrinsèquement bidirectionnelle')
});

const MetricThresholdsSchema = z.object({
  confidence: z.tuple([z.number(), z.number()]).optional(),
  relevance: z.tuple([z.number(), z.number()]).optional(),
  quality: z.tuple([z.number(), z.number()]).optional()
});

const FilterOptionsSchema = z.object({
  nodeTypes: z.array(ThoughtTypeEnum).optional(),
  connectionTypes: z.array(ConnectionTypeEnum).optional(),
  metricThresholds: MetricThresholdsSchema.optional(),
  textSearch: z.string().optional(),
  dateRange: z.tuple([z.date(), z.date()]).optional(),
  customFilters: z.record(z.unknown()).optional()
}).optional();

const InteractivityOptionsSchema = z.object({
  zoomable: z.boolean().optional(),
  draggable: z.boolean().optional(),
  selectable: z.boolean().optional(),
  tooltips: z.boolean().optional(),
  expandableNodes: z.boolean().optional(),
  initialZoom: z.number().optional(),
  zoomRange: z.tuple([z.number(), z.number()]).optional(),
  highlightOnHover: z.boolean().optional()
}).optional();

const VisualizationOptionsSchema = z.object({
  clusterBy: ClusterByEnum.optional().describe('Critère de regroupement des nœuds en clusters'),
  direction: DirectionEnum.optional().default('TB').describe('Direction de la disposition hiérarchique'),
  centerNode: z.string().optional().describe('ID du nœud central pour les visualisations radiales ou hiérarchiques'),
  maxDepth: z.number().optional().describe('Profondeur maximale pour les visualisations hiérarchiques ou radiales'),
  filters: FilterOptionsSchema.describe('Options de filtrage des nœuds et des liens'),
  interactivity: InteractivityOptionsSchema.describe('Options d\'interactivité pour la visualisation')
}).optional();

export const SmartThinkingParamsSchema = z.object({
  thought: z.string().describe('Le contenu de la pensée à analyser - PARAMÈTRE OBLIGATOIRE'),
  thoughtType: ThoughtTypeEnum.default('regular').describe('Type de pensée dans le graphe de raisonnement'),
  connections: z.array(ConnectionSchema).default([]).describe('Connexions à d\'autres pensées'),
  requestSuggestions: z.boolean().default(false).describe('Demander des suggestions d\'amélioration du raisonnement'),
  generateVisualization: z.boolean().default(false).describe('Générer une visualisation du graphe de pensée'),
  visualizationType: VisualizationTypeEnum.default('graph').describe('Type de visualisation à générer'),
  suggestTools: z.boolean().default(true).describe('Suggérer des outils MCP pertinents pour cette étape du raisonnement'),
  sessionId: z.string().optional().describe('Identifiant de session pour maintenir l\'état'),
  userId: z.string().optional().describe('Identifiant de l\'utilisateur pour la personnalisation'),
  help: z.boolean().default(true).describe('Afficher le guide d\'utilisation complet'),
  requestVerification: z.boolean().default(false).describe('Demander explicitement une vérification des informations'),
  containsCalculations: z.boolean().default(false).describe('Indique si la pensée contient des calculs à vérifier'),
  visualizationOptions: VisualizationOptionsSchema.describe('Options avancées pour la visualisation')
});

const SearchParamsSchema = z.object({
  query: z.string().min(1, 'La requête de recherche est obligatoire'),
  limit: z.number().int().min(1).max(20).optional().default(5),
  sessionId: z.string().optional()
});

const FetchParamsSchema = z.object({
  id: z.string().min(1, 'Identifiant requis'),
  sessionId: z.string().optional()
});

function formatMemoryTitle(memory: MemoryItem): string {
  if (memory.metadata?.title) {
    return memory.metadata.title;
  }
  if (memory.tags.length > 0) {
    return memory.tags.join(' · ');
  }
  return `Mémoire ${memory.id.slice(0, 8)}`;
}

function createSmartThinkingTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.tool(
    'smartthinking',
    SmartThinkingParamsSchema.shape,
    async (params: SmartThinkingParams) => {
      if (params.help && !params.thought) {
        return {
          content: [
            {
              type: 'text',
              text: `# Smart-Thinking - Guide d'utilisation

Smart-Thinking est un outil de raisonnement multi-dimensionnel qui organise les pensées en graphe plutôt qu'en séquence linéaire, permettant une analyse plus riche et interconnectée des problèmes complexes.

## Paramètres principaux
- thought (obligatoire) : pensée à analyser
- thoughtType : regular | revision | meta | hypothesis | conclusion
- connections : [{ targetId, type, strength }]
- requestSuggestions : activer les recommandations
- generateVisualization : produire un graphe
- requestVerification : lancer une vérification explicite
- containsCalculations : vérifier les calculs mathématiques

## Types de visualisation
- graph, chronological, thematic, hierarchical, force, radial

## Exemple d'utilisation
thought: "L'intelligence artificielle transformera le marché du travail"
thoughtType: "hypothesis"
generateVisualization: true`
            }
          ]
        };
      }

      if (!params.thought) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: "Le paramètre 'thought' est obligatoire.",
                message: "Vous devez fournir une pensée à analyser."
              }, null, 2)
            }
          ]
        };
      }

      const { response, sessionId } = await env.orchestrator.run(params);
      const payload: SmartThinkingResponse & { sessionId?: string } = {
        ...response,
        sessionId
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2)
          }
        ],
        structuredContent: payload as unknown as Record<string, unknown>
      };
    }
  );
}

function createSearchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.tool(
    'search',
    'Recherche les pensées et mémoires Smart-Thinking pertinentes pour la requête',
    SearchParamsSchema.shape,
    async ({ query, limit = 5, sessionId }) => {
      const matches = await env.memoryManager.getRelevantMemories(query, limit, sessionId);
      const results: SearchResultItem[] = matches.map(memory => {
        const snippet = memory.content.length > 240 ? `${memory.content.slice(0, 240)}...` : memory.content;
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

        const result: SearchResultItem = {
          id: memory.id,
          title: formatMemoryTitle(memory),
          text: snippet,
        };

        const sourceUrl = memory.metadata?.source;
        if (typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
          result.url = sourceUrl;
        }

        if (Object.keys(metadata).length > 0) {
          result.metadata = metadata;
        }

        return result;
      });

      const payload = { results };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2)
          }
        ],
        structuredContent: payload as unknown as Record<string, unknown>
      };
    }
  );
}

function createFetchTool(server: McpServer, env: SmartThinkingEnvironment): void {
  server.tool(
    'fetch',
    'Récupère le contenu complet d\'une mémoire Smart-Thinking par identifiant',
    FetchParamsSchema.shape,
    async ({ id }) => {
      const memory = env.memoryManager.getMemory(id);

      if (!memory) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: 'Mémoire introuvable',
                id
              }, null, 2)
            }
          ]
        };
      }

      const timestamp = memory.timestamp instanceof Date ? memory.timestamp.toISOString() : memory.timestamp;
      const metadata: Record<string, unknown> = {
        tags: memory.tags,
      };

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
      if (additionalMetadata) {
        delete (additionalMetadata as Record<string, unknown>).source;
      }
      if (additionalMetadata && Object.keys(additionalMetadata).length > 0) {
        metadata.additional = additionalMetadata;
      }

      const payload = {
        id: memory.id,
        title: formatMemoryTitle(memory),
        text: memory.content,
        metadata
      };

      const sourceUrl = memory.metadata?.source;
      if (typeof sourceUrl === 'string' && sourceUrl.trim().length > 0) {
        (payload as { url?: string }).url = sourceUrl;
      }

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2)
          }
        ],
        structuredContent: payload as unknown as Record<string, unknown>
      };
    }
  );
}

export function createSmartThinkingServer(
  env?: SmartThinkingEnvironment,
  options?: SmartThinkingServerOptions
): { server: McpServer; env: SmartThinkingEnvironment } {
  const environment = env ?? getSmartThinkingEnvironment();
  const server = new McpServer({
    name: 'smart-thinking-mcp',
    version: environment.version
  }, { capabilities: {} });

  const { includeSmartThinkingTool = true } = options ?? {};

  if (includeSmartThinkingTool) {
    createSmartThinkingTool(server, environment);
  }
  createSearchTool(server, environment);
  createFetchTool(server, environment);

  return { server, env: environment };
}

export const SearchSchema = SearchParamsSchema;
export const FetchSchema = FetchParamsSchema;
export type { SmartThinkingServerOptions };
