import { z } from 'zod';

export interface SearchResultItem {
  id: string;
  title: string;
  text: string;
  url?: string;
  metadata?: Record<string, unknown>;
}

export const ThoughtTypeEnum = z.enum(['regular', 'revision', 'meta', 'hypothesis', 'conclusion']);
export const DepthEnum = z.enum(['fast', 'balanced', 'deep']);
export const SearchProviderEnum = z.enum(['auto', 'tavily', 'native', 'off']);
export const SearchDepthEnum = z.enum(['basic', 'advanced', 'fast', 'ultra-fast']);
export const TavilyTopicEnum = z.enum(['general', 'news', 'finance']);
export const TavilyTimeRangeEnum = z.enum(['day', 'week', 'month', 'year']);
export const SessionSearchDepthEnum = z.enum(['basic', 'advanced']);
export const TavilyAnswerModeEnum = z.union([z.boolean(), z.enum(['basic', 'advanced'])]);
export const TavilyRawContentEnum = z.union([z.boolean(), z.enum(['markdown', 'text'])]);
export const ConnectionTypeEnum = z.enum([
  'supports', 'contradicts', 'refines', 'branches', 'derives', 'associates',
  'exemplifies', 'generalizes', 'compares', 'contrasts', 'questions',
  'extends', 'analyzes', 'synthesizes', 'applies', 'evaluates', 'cites',
  'extended-by', 'analyzed-by', 'component-of', 'applied-by', 'evaluated-by', 'cited-by',
]);

const TemporalityEnum = z.enum(['before', 'after', 'during', 'concurrent']);
const CertaintyEnum = z.enum(['definite', 'high', 'moderate', 'low', 'speculative']);
const DirectionalityEnum = z.enum(['unidirectional', 'bidirectional', 'multidirectional']);
const ScopeEnum = z.enum(['broad', 'specific', 'partial', 'complete']);
const NatureEnum = z.enum(['causal', 'correlational', 'sequential', 'hierarchical', 'associative']);


const ConnectionAttributesSchema = z.object({
  temporality: TemporalityEnum.optional(),
  certainty: CertaintyEnum.optional(),
  directionality: DirectionalityEnum.optional(),
  scope: ScopeEnum.optional(),
  nature: NatureEnum.optional(),
  customAttributes: z.record(z.string(), z.string()).optional(),
});

const ConnectionSchema = z.object({
  targetId: z.string().describe('ID de la pensée cible'),
  type: ConnectionTypeEnum.describe('Type de connexion'),
  strength: z.number().min(0).max(1).describe('Force de la connexion (0 à 1)'),
  description: z.string().optional().describe('Description optionnelle de la connexion'),
  attributes: ConnectionAttributesSchema.optional(),
  inferred: z.boolean().optional().describe('Connexion inférée automatiquement'),
  inferenceConfidence: z.number().min(0).max(1).optional(),
  bidirectional: z.boolean().optional(),
});




const PlanRequestSchema = z.object({
  goal: z.string().min(1).describe('Objectif à décomposer'),
  constraints: z.array(z.string()).optional().describe('Contraintes non négociables'),
  maxSteps: z.number().int().min(2).max(20).optional().describe('Nombre maximal d\'étapes'),
}).optional();

const HypothesisInputSchema = z.object({
  id: z.string().optional().describe('ID existant pour mise à jour'),
  statement: z.string().min(1).describe('Énoncé de l\'hypothèse'),
  parentId: z.string().optional(),
  status: z.enum(['open', 'supported', 'refuted', 'inconclusive']).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const HypothesisUpdateSchema = z.object({
  id: z.string().min(1),
  support: z.string().optional().describe('Preuve favorable à ajouter'),
  contradict: z.string().optional().describe('Preuve défavorable à ajouter'),
  confidence: z.number().min(0).max(1).optional(),
}).optional();





export const ClaimParamsSchema = z.object({
  statement: z.string().min(1).max(2000).describe('Affirmation ou résultat à certifier'),
  value: z.string().max(500).optional().describe('Valeur exacte (fraction, entier, liste…)'),
  method: z.string().max(500).optional().describe('Méthode utilisée (LP, énumération, CAS, récurrence…)'),
  evidence: z.string().max(2000).optional().describe('Preuve/certificat (sortie d\'outil, témoin, dual…)'),
  confidence: z.number().min(0).max(1).optional().default(0.8),
  sessionId: z.string().max(128).optional(),
});

export const AuditParamsSchema = z.object({
  sessionId: z.string().max(128).optional(),
  requirements: z
    .array(z.string().min(1))
    .max(30)
    .optional()
    .describe('Liste des quantités/livrables demandés par l\'énoncé : audit vérifie que chacune a un certificat.'),
});

export const ComputeParamsSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20000)
    .describe('Script Python déterministe (sympy/numpy/scipy/mpmath autorisés) qui imprime ses résultats. Pas de fichier/réseau/processus.'),
  timeoutMs: z.number().int().min(1000).max(120000).optional().describe('Délai maximal en ms (défaut 45000)'),
});

export const ProtocolParamsSchema = z.object({
  problem: z.string().min(1).max(20000).describe('Énoncé du problème complexe'),
  domain: z
    .enum(['number-theory', 'distributed', 'causal', 'optimization', 'coding', 'quantum', 'control', 'finance', 'inverse', 'agents', 'general'])
    .optional()
    .describe('Forcer le domaine (auto-détecté sinon)'),
});

export const CasParamsSchema = z.object({
  operation: z
    .enum([
      'simplify', 'expand', 'factor', 'verify_identity', 'solve', 'minimal_polynomial',
      'evalf', 'poly_roots', 'series', 'gamma', 'elliptic', 'mod_linear', 'lattice_solve',
      'weierstrass_duplication', 'compose', 'compare',
    ])
    .describe('Opération de calcul symbolique exact'),
  expr: z.string().max(2000).optional().describe('Expression (simplify/expand/factor/evalf/series…)'),
  lhs: z.string().max(2000).optional().describe('Membre gauche (verify_identity/compare)'),
  rhs: z.string().max(2000).optional().describe('Membre droit (verify_identity/compare)'),
  equation: z.string().max(2000).optional().describe('Équation (solve)'),
  value: z.string().max(2000).optional().describe('Valeur/point (minimal_polynomial, série, gamma)'),
  polynomial: z.string().max(2000).optional(),
  symbol: z.string().max(32).optional().default('x'),
  symbols: z.array(z.string().max(32)).optional(),
  precision: z.number().int().min(2).max(500).optional().default(30),
  subs: z.record(z.string(), z.number()).optional(),
  order: z.number().int().min(1).max(50).optional(),
  kind: z.string().max(10).optional().describe('sn, cn, dn ou K (elliptic)'),
  u: z.number().optional(),
  m: z.number().optional(),
  coefficient: z.number().int().optional(),
  modulus: z.number().int().min(2).max(100000).optional(),
  count: z.number().int().min(1).max(10000).optional(),
  a: z.number().int().min(-10000).max(10000).optional().describe('Partie réelle de α (lattice_solve)'),
  b: z.number().int().min(-10000).max(10000).optional().describe('Partie imaginaire de α (lattice_solve)'),
  g2: z.number().optional().describe('Invariant g2 (weierstrass_duplication)'),
  g3: z.number().optional().describe('Invariant g3 (weierstrass_duplication)'),
  rational: z.string().max(2000).optional().describe('Fraction rationnelle (compose)'),
  inner: z.string().max(2000).optional().describe('Argument interne (compose)'),
});

export const MathKnowledgeParamsSchema = z.object({
  query: z.string().max(500).optional().describe('Sujet recherché (℘, duplication, Eisenstein, lemniscate…)'),
  domain: z.enum(['complex-analysis', 'algebra', 'numerics', 'methodology']).optional(),
});

export const SolveLogicParamsSchema = z.object({
  problem: z.string().min(1).describe('Énoncé avec des relations d\'ordre ou de comparaison'),
  entities: z.array(z.string()).optional().describe('Liste explicite des entités à ordonner'),
  relations: z
    .array(z.object({ before: z.string(), after: z.string() }))
    .optional()
    .describe('Contraintes structurées (prioritaires sur le texte)'),
  question: z.string().optional().describe('Question posée (facultatif)'),
});

export const SolveMathParamsSchema = z.object({
  problem: z.string().optional().describe('Énoncé contenant des équations'),
  equations: z.array(z.string()).optional().describe('Équations explicites, ex: ["2x + y = 10", "x - y = 2"]'),
  variable: z.string().optional().describe('Inconnue recherchée'),
});

export const ResearchParamsSchema = z.object({
  question: z.string().min(1).describe('Question ou sujet à instruire en profondeur'),
  provider: z
    .enum(['auto', 'tavily', 'internal'])
    .optional()
    .default('auto')
    .describe('auto: agent Research Tavily si configuré, sinon multi-hop interne; internal: multi-hop interne uniquement'),
  model: z.enum(['mini', 'pro', 'auto']).optional().default('auto').describe('Effort de l\'agent Research Tavily'),
  outputLength: z.enum(['short', 'standard', 'long']).optional().default('standard'),
  maxHops: z.number().int().min(1).max(4).optional().default(2),
  maxSources: z.number().int().min(1).max(20).optional().default(8),
  includeAnswer: TavilyAnswerModeEnum.optional().default('basic'),
  sessionId: z.string().max(128).optional(),
  tavilyApiKey: z.string().min(1).optional(),
});

export const CritiqueParamsSchema = z.object({
  problem: z.string().min(1).describe('Question ou problème initial'),
  draft: z.string().min(1).describe('Réponse ou raisonnement à critiquer'),
  sessionId: z.string().max(128).optional(),
});

export const SmartThinkingParamsSchema = z.object({
  thought: z.string().min(1).optional().describe('Contenu de la pensée à analyser (obligatoire sauf en mode help)'),
  thoughtType: ThoughtTypeEnum.default('regular').describe('Type de pensée dans le graphe'),
  connections: z.array(ConnectionSchema).default([]).describe('Connexions vers des pensées existantes'),
  requestSuggestions: z.boolean().default(false).describe('Demander des suggestions d\'amélioration'),
  suggestTools: z.boolean().default(true).describe('Suggérer les outils pertinents pour l\'étape suivante'),
  sessionId: z.string().max(128).optional().describe('Identifiant de session pour l\'état persistant'),
  depth: DepthEnum.default('balanced').describe('Profondeur de raisonnement: fast, balanced ou deep'),
  help: z.boolean().default(false).describe('Afficher le guide d\'utilisation sans exécuter le pipeline'),
  requestVerification: z.boolean().default(false).describe('Forcer la vérification des affirmations'),
  containsCalculations: z.boolean().default(false).describe('Indiquer la présence de calculs à vérifier'),
  responseDetail: z
    .enum(['compact', 'full'])
    .optional()
    .default('compact')
    .describe('compact (défaut) retire chronologie et score composite ; full renvoie l\'enveloppe complète'),
  plan: PlanRequestSchema.describe('Créer ou remplacer le plan de session'),
  hypotheses: z.array(HypothesisInputSchema).optional().describe('Créer ou mettre à jour des hypothèses'),
  hypothesisUpdate: HypothesisUpdateSchema.describe('Ajouter une preuve à une hypothèse'),
});

export const SearchParamsSchema = z.object({
  query: z.string().min(1, 'La requête de recherche est obligatoire').describe('Requête de recherche'),
  limit: z.number().int().min(1).max(20).optional().default(5).describe('Nombre maximal de résultats (1-20)'),
  sessionId: z.string().max(128).optional().describe('Filtre optionnel de session'),
  includeWeb: z.boolean().optional().default(true).describe('Inclure la recherche web quand un provider est configuré'),
  includeMemory: z.boolean().optional().default(true).describe('Inclure les mémoires locales'),
  provider: SearchProviderEnum.optional().describe('Provider de recherche: auto, tavily, native ou off'),
});

export const FetchParamsSchema = z.object({
  id: z.string().min(1, 'Identifiant requis').describe('ID de mémoire ou URL à récupérer'),
  sessionId: z.string().max(128).optional().describe('Contexte de session optionnel'),
  maxChars: z.number().int().min(500).max(200_000).optional().describe('Longueur maximale du contenu récupéré'),
});

export const WebSearchParamsSchema = z.object({
  query: z.string().min(1).describe('Requête web'),
  maxResults: z.number().int().min(1).max(10).optional().default(5),
  searchDepth: SearchDepthEnum.optional().default('basic').describe('basic, advanced (2 crédits), fast ou ultra-fast'),
  provider: SearchProviderEnum.optional().describe('auto (défaut), tavily, native ou off'),
  tavilyApiKey: z.string().min(1).optional().describe('Clé Tavily ponctuelle (non persistée)'),
  includeAnswer: TavilyAnswerModeEnum.optional().default(false).describe('Réponse synthétique Tavily (true, basic ou advanced)'),
  topic: TavilyTopicEnum.optional().describe('general, news ou finance'),
  timeRange: TavilyTimeRangeEnum.optional().describe('Filtrer par ancienneté de publication'),
  includeDomains: z.array(z.string()).optional().describe('Domaines à privilégier'),
  excludeDomains: z.array(z.string()).optional().describe('Domaines à exclure'),
  includeRawContent: TavilyRawContentEnum.optional().describe('Inclure le contenu brut (true, markdown ou text)'),
  chunksPerSource: z.number().int().min(1).max(3).optional(),
  country: z.string().optional().describe('Pays à privilégier (topic=general)'),
  safeSearch: z.boolean().optional(),
  sessionId: z.string().max(128).optional(),
});

export const WebAgentParamsSchema = z.object({
  question: z.string().min(1).max(20000).describe('Question à instruire par l\'agent web autonome'),
  sessionId: z.string().max(128).optional(),
  maxSources: z.number().int().min(1).max(20).optional().describe('Nombre maximal de sources retenues (défaut 8)'),
  maxRounds: z.number().int().min(1).max(4).optional().describe('Nombre de sous-questions/recherches (défaut 2)'),
  maxCredits: z.number().int().min(1).max(200).optional().describe('Crédits web maximaux pour cet appel'),
  includeDomains: z.array(z.string()).optional().describe('Domaines à privilégier'),
  excludeDomains: z.array(z.string()).optional().describe('Domaines à exclure'),
  timeRange: TavilyTimeRangeEnum.optional().describe('Filtrer par ancienneté de publication'),
  provider: SearchProviderEnum.optional().describe('Provider web: auto, tavily, native ou off'),
  tavilyApiKey: z.string().min(1).optional(),
});

export const WebCrawlParamsSchema = z.object({
  url: z.string().min(1).describe('URL racine à explorer'),
  mode: z.enum(['crawl', 'map']).optional().default('crawl').describe('crawl = contenu des pages, map = liste des URLs'),
  instructions: z.string().optional().describe('Instructions naturelles pour guider l\'exploration'),
  maxDepth: z.number().int().min(1).max(5).optional().default(1),
  maxBreadth: z.number().int().min(1).max(500).optional(),
  limit: z.number().int().min(1).max(100).optional().default(20),
  selectPaths: z.array(z.string()).optional().describe('Regex de chemins à inclure'),
  excludePaths: z.array(z.string()).optional().describe('Regex de chemins à exclure'),
  allowExternal: z.boolean().optional().default(false),
  extractDepth: z.enum(['basic', 'advanced']).optional().default('basic'),
  format: z.enum(['markdown', 'text']).optional().default('markdown'),
  tavilyApiKey: z.string().min(1).optional(),
  sessionId: z.string().max(128).optional(),
});

export const CalculateParamsSchema = z.object({
  expression: z.string().min(1).max(500).describe('Expression à calculer, ex: "(120*0.45)" ou "250*0.8*1.1" ou "Math.sqrt(144)". Un suffixe "= résultat" permet de vérifier une valeur.'),
});

export const VerifyClaimParamsSchema = z.object({
  claim: z.string().min(1).describe('Affirmation à vérifier'),
  sessionId: z.string().max(128).optional(),
  checkMath: z.boolean().optional().default(true).describe('Vérifier les calculs présents'),
  checkConsistency: z.boolean().optional().default(true).describe('Chercher des contradictions dans la session'),
  checkWeb: z.boolean().optional().default(true).describe('Croiser avec des sources web quand disponible'),
  provider: SearchProviderEnum.optional().describe('Provider web: auto, tavily, native ou off'),
  tavilyApiKey: z.string().min(1).optional(),
});

export const PlanParamsSchema = z.object({
  goal: z.string().min(1).describe('Objectif à décomposer en étapes testables'),
  constraints: z.array(z.string()).optional().default([]),
  sessionId: z.string().max(128).optional(),
  depth: DepthEnum.optional().default('balanced'),
  maxSteps: z.number().int().min(2).max(20).optional(),
  template: z
    .enum(['math', 'decision', 'causal', 'research', 'code', 'generic'])
    .optional()
    .describe('Forcer le gabarit d\'étapes au lieu de la détection par signaux (auto sinon)'),
});

export const SessionParamsSchema = z.object({
  action: z.enum(['status', 'summary', 'export', 'reset', 'configure_search', 'set_plan_step']).describe('Action de session'),
  sessionId: z.string().max(128).optional(),
  provider: SearchProviderEnum.optional().describe('Provider de recherche pour configure_search'),
  tavilyApiKey: z.string().min(1).optional().describe('Clé Tavily (conservée en mémoire uniquement)'),
  searchDepth: SessionSearchDepthEnum.optional(),
  stepId: z.string().min(1).optional().describe('Étape du plan à mettre à jour'),
  stepStatus: z.enum(['pending', 'in_progress', 'completed', 'blocked', 'skipped']).optional(),
});

export type SmartThinkingToolParams = z.infer<typeof SmartThinkingParamsSchema>;
export type SearchToolParams = z.infer<typeof SearchParamsSchema>;
export type FetchToolParams = z.infer<typeof FetchParamsSchema>;
export type WebSearchToolParams = z.infer<typeof WebSearchParamsSchema>;
export type WebCrawlToolParams = z.infer<typeof WebCrawlParamsSchema>;
export type WebAgentToolParams = z.infer<typeof WebAgentParamsSchema>;
export type CalculateToolParams = z.infer<typeof CalculateParamsSchema>;
export type ClaimToolParams = z.infer<typeof ClaimParamsSchema>;
export type AuditToolParams = z.infer<typeof AuditParamsSchema>;
export type ComputeToolParams = z.infer<typeof ComputeParamsSchema>;
export type ProtocolToolParams = z.infer<typeof ProtocolParamsSchema>;
export type CasToolParams = z.infer<typeof CasParamsSchema>;
export type MathKnowledgeToolParams = z.infer<typeof MathKnowledgeParamsSchema>;
export type SolveLogicToolParams = z.infer<typeof SolveLogicParamsSchema>;
export type SolveMathToolParams = z.infer<typeof SolveMathParamsSchema>;
export type ResearchToolParams = z.infer<typeof ResearchParamsSchema>;
export type CritiqueToolParams = z.infer<typeof CritiqueParamsSchema>;
export type VerifyClaimToolParams = z.infer<typeof VerifyClaimParamsSchema>;
export type PlanToolParams = z.infer<typeof PlanParamsSchema>;
export type SessionToolParams = z.infer<typeof SessionParamsSchema>;
