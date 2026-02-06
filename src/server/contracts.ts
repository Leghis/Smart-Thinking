import { z } from 'zod';

export interface SearchResultItem {
  id: string;
  title: string;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export const ThoughtTypeEnum = z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']);
export const ConnectionTypeEnum = z.enum([
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

export const VisualizationTypeEnum = z.enum(['graph', 'chronological', 'thematic', 'hierarchical', 'force', 'radial']);
const ClusterByEnum = z.enum(['type', 'theme', 'metric', 'connectivity']);
const DirectionEnum = z.enum(['LR', 'RL', 'TB', 'BT']);

const ConnectionAttributesSchema = z.object({
  temporality: TemporalityEnum.optional(),
  certainty: CertaintyEnum.optional(),
  directionality: DirectionalityEnum.optional(),
  scope: ScopeEnum.optional(),
  nature: NatureEnum.optional(),
  customAttributes: z.record(z.string(), z.string()).optional()
});

const ConnectionSchema = z.object({
  targetId: z.string().describe('ID de la pensee cible'),
  type: ConnectionTypeEnum.describe('Type de connexion'),
  strength: z.number().min(0).max(1).describe('Force de la connexion (0 a 1)'),
  description: z.string().optional().describe('Description optionnelle de la connexion'),
  attributes: ConnectionAttributesSchema.optional(),
  inferred: z.boolean().optional().describe('Si la connexion a ete inferee automatiquement'),
  inferenceConfidence: z.number().min(0).max(1).optional().describe('Confiance dans l\'inference (0 a 1)'),
  bidirectional: z.boolean().optional().describe('Si la relation est intrinsequement bidirectionnelle')
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
  customFilters: z.record(z.string(), z.unknown()).optional()
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
  clusterBy: ClusterByEnum.optional().describe('Critere de regroupement des noeuds en clusters'),
  direction: DirectionEnum.optional().default('TB').describe('Direction de la disposition hierarchique'),
  centerNode: z.string().optional().describe('ID du noeud central pour les visualisations radiales ou hierarchiques'),
  maxDepth: z.number().optional().describe('Profondeur maximale pour les visualisations hierarchiques ou radiales'),
  filters: FilterOptionsSchema.describe('Options de filtrage des noeuds et des liens'),
  interactivity: InteractivityOptionsSchema.describe('Options d\'interactivite pour la visualisation')
}).optional();

export const SmartThinkingParamsSchema = z.object({
  thought: z.string().min(1).optional().describe('Le contenu de la pensee a analyser; optionnel en mode help'),
  thoughtType: ThoughtTypeEnum.default('regular').describe('Type de pensee dans le graphe de raisonnement'),
  connections: z.array(ConnectionSchema).default([]).describe('Connexions a d\'autres pensees'),
  requestSuggestions: z.boolean().default(false).describe('Demander des suggestions d\'amelioration du raisonnement'),
  generateVisualization: z.boolean().default(false).describe('Generer une visualisation du graphe de pensee'),
  visualizationType: VisualizationTypeEnum.default('graph').describe('Type de visualisation a generer'),
  suggestTools: z.boolean().default(true).describe('Suggere des outils MCP pertinents pour cette etape du raisonnement'),
  sessionId: z.string().optional().describe('Identifiant de session pour maintenir l\'etat'),
  userId: z.string().optional().describe('Identifiant de l\'utilisateur pour la personnalisation'),
  help: z.boolean().default(false).describe('Afficher le guide d\'utilisation sans execution du pipeline'),
  requestVerification: z.boolean().default(false).describe('Demander explicitement une verification des informations'),
  containsCalculations: z.boolean().default(false).describe('Indique si la pensee contient des calculs a verifier'),
  visualizationOptions: VisualizationOptionsSchema.describe('Options avancees pour la visualisation')
});

export const SearchParamsSchema = z.object({
  query: z.string().min(1, 'La requete de recherche est obligatoire').describe('Requete de recherche semantique sur les memoires locales'),
  limit: z.number().int().min(1).max(20).optional().default(5).describe('Nombre maximal de resultats (1-20)'),
  sessionId: z.string().optional().describe('Filtre optionnel de session')
});

export const FetchParamsSchema = z.object({
  id: z.string().min(1, 'Identifiant requis').describe('Identifiant de la memoire a recuperer'),
  sessionId: z.string().optional().describe('Contexte de session optionnel')
});

export type SmartThinkingToolParams = z.infer<typeof SmartThinkingParamsSchema>;
export type SearchToolParams = z.infer<typeof SearchParamsSchema>;
export type FetchToolParams = z.infer<typeof FetchParamsSchema>;
