/**
 * Smart-Thinking v13 — Domain types
 *
 * Single source of truth for every public contract of the reasoning engine.
 * Runtime code depends on these types; adapters (MCP, CLI, benchmark) only
 * translate them.
 */

// ---------------------------------------------------------------------------
// Core reasoning
// ---------------------------------------------------------------------------

export type ThoughtType = 'regular' | 'revision' | 'meta' | 'hypothesis' | 'conclusion';

export type ReasoningDepth = 'fast' | 'balanced' | 'deep';

export type VerificationStatus =
  | 'unverified'
  | 'partially_verified'
  | 'verified'
  | 'contradicted'
  | 'inconclusive'
  | 'absence_of_information'
  | 'uncertain'
  | 'contradictory';

export type VerificationDetailedStatus =
  | 'unverified'
  | 'verification_pending'
  | 'verification_in_progress'
  | 'partially_verified'
  | 'verified'
  | 'contradicted'
  | 'inconclusive'
  | 'absence_of_information'
  | 'uncertain'
  | 'contradictory';

export type ConnectionType =
  | 'supports'
  | 'contradicts'
  | 'refines'
  | 'branches'
  | 'derives'
  | 'associates'
  | 'exemplifies'
  | 'generalizes'
  | 'compares'
  | 'contrasts'
  | 'questions'
  | 'extends'
  | 'analyzes'
  | 'synthesizes'
  | 'applies'
  | 'evaluates'
  | 'cites'
  | 'extended-by'
  | 'analyzed-by'
  | 'component-of'
  | 'applied-by'
  | 'evaluated-by'
  | 'cited-by';

export interface ConnectionAttributes {
  temporality?: 'before' | 'after' | 'during' | 'concurrent';
  certainty?: 'definite' | 'high' | 'moderate' | 'low' | 'speculative';
  directionality?: 'unidirectional' | 'bidirectional' | 'multidirectional';
  scope?: 'broad' | 'specific' | 'partial' | 'complete';
  nature?: 'causal' | 'correlational' | 'sequential' | 'hierarchical' | 'associative';
  customAttributes?: Record<string, any>;
}

export type ReasoningStepKind =
  | 'context'
  | 'verification'
  | 'graph'
  | 'evaluation'
  | 'suggestion'
  | 'memory'
  | 'visualization'
  | 'persistence'
  | 'planning'
  | 'search'
  | 'critique';

export type ReasoningStepStatus = 'pending' | 'in_progress' | 'completed' | 'skipped' | 'failed';

export interface HeuristicTrace {
  metric: string;
  weight: number;
  score?: number;
  rationale?: string;
}

export interface ReasoningJustification {
  summary: string;
  heuristics?: HeuristicTrace[];
  references?: string[];
  timestamp?: string;
}

export interface ReasoningStep {
  id: string;
  label: string;
  kind: ReasoningStepKind;
  description: string;
  status: ReasoningStepStatus;
  timestamp: string;
  parents: string[];
  details?: Record<string, unknown>;
  justifications?: ReasoningJustification[];
  durationMs?: number;
}

export interface ThoughtNode {
  id: string;
  content: string;
  type: ThoughtType;
  timestamp: Date;
  connections: Connection[];
  metrics: ThoughtMetrics;
  metadata: Record<string, any>;
  reasoning?: {
    createdByStepId?: string;
    updatedAt?: string;
    justifications?: ReasoningJustification[];
    heuristicWeights?: HeuristicTrace[];
  };
}

export interface Connection {
  targetId: string;
  type: ConnectionType;
  strength: number;
  description?: string;
  attributes?: ConnectionAttributes;
  inferred?: boolean;
  inferenceConfidence?: number;
  bidirectional?: boolean;
  createdByStepId?: string;
  justification?: ReasoningJustification;
  heuristicWeights?: HeuristicTrace[];
}

export interface Hyperlink {
  id: string;
  nodeIds: string[];
  type: ConnectionType;
  label?: string;
  attributes?: ConnectionAttributes;
  strength: number;
  inferred: boolean;
  confidence: number;
  metadata: Record<string, any>;
}

export interface ThoughtMetrics {
  confidence: number;
  relevance: number;
  quality: number;
}

export interface MetricContribution {
  /** Stable machine-readable key (preferred over `label` for programmatic matching). */
  key?: string;
  label: string;
  weight: number;
  value: number;
  impact: number;
  rationale: string;
}

export interface MetricBreakdown {
  score: number;
  contributions: MetricContribution[];
  summary: string;
}

export interface ThoughtMetricBreakdown {
  confidence?: MetricBreakdown;
  relevance?: MetricBreakdown;
  quality?: MetricBreakdown;
}

// ---------------------------------------------------------------------------
// Verification (truthful by construction — no simulated provider results)
// ---------------------------------------------------------------------------

export interface CalculationVerificationResult {
  original: string;
  verified: string;
  isCorrect: boolean;
  confidence: number;
  reason?: string;
}

export type EvidenceSourceType = 'web' | 'memory' | 'internal' | 'user';
export type EvidenceStance = 'supports' | 'contradicts' | 'neutral';

export interface EvidenceItem {
  id: string;
  claim?: string;
  quote: string;
  sourceType: EvidenceSourceType;
  source: string;
  title?: string;
  stance: EvidenceStance;
  confidence: number;
  retrievedAt: string;
}

export type VerificationCheckName =
  | 'calculation'
  | 'consistency'
  | 'web'
  | 'heuristics'
  | 'source_quality';

export type VerificationCheckOutcome = 'passed' | 'failed' | 'inconclusive' | 'unavailable';

export interface VerificationCheck {
  name: VerificationCheckName;
  outcome: VerificationCheckOutcome;
  summary: string;
  details?: string[];
  evidenceIds?: string[];
  durationMs?: number;
}

export interface VerificationResult {
  status: VerificationStatus;
  confidence: number;
  sources: string[];
  verificationSteps: string[];
  contradictions?: string[];
  notes?: string;
  verifiedCalculations?: CalculationVerificationResult[];
  checks?: VerificationCheck[];
  evidence?: EvidenceItem[];
  methodsUnavailable?: string[];
}

export interface SuggestedTool {
  name: string;
  confidence: number;
  reason: string;
  priority?: number;
}

// ---------------------------------------------------------------------------
// Plans, hypotheses, critique
// ---------------------------------------------------------------------------

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

export interface PlanStep {
  id: string;
  index: number;
  description: string;
  successCriteria: string;
  status: PlanStepStatus;
  dependsOn: string[];
  evidenceIds?: string[];
}

export interface Plan {
  id: string;
  goal: string;
  constraints: string[];
  steps: PlanStep[];
  depth: ReasoningDepth;
  createdAt: string;
  updatedAt: string;
}

export type HypothesisStatus = 'open' | 'supported' | 'refuted' | 'inconclusive';

export interface HypothesisNode {
  id: string;
  statement: string;
  status: HypothesisStatus;
  confidence: number;
  parentId?: string;
  evidenceFor: string[];
  evidenceAgainst: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BiasFinding {
  type: string;
  score: number;
  description: string;
  examples?: string[];
}

export interface CritiqueReport {
  biases: BiasFinding[];
  improvements: string[];
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Web search & fetch (Tavily or client-native delegation)
// ---------------------------------------------------------------------------

export type SearchProviderPreference = 'auto' | 'tavily' | 'native' | 'off';
export type SearchProviderName = 'tavily' | 'native' | 'none' | 'memory' | 'mixed';
export type SearchDepth = 'basic' | 'advanced';

export interface SearchConfig {
  provider: SearchProviderPreference;
  tavilyApiKey?: string;
  searchDepth?: SearchDepth;
}

export interface WebSearchResult {
  id: string;
  title: string;
  url: string;
  text: string;
  score?: number;
  publishedDate?: string;
  source: 'tavily' | 'native' | 'direct_fetch' | 'memory';
}

export interface WebSearchResponse {
  provider: SearchProviderName;
  query: string;
  results: WebSearchResult[];
  answer?: string;
  requiresClientAction?: boolean;
  instruction?: string;
  searchQueries?: string[];
  cached?: boolean;
}

export interface UrlContent {
  url: string;
  title?: string;
  text: string;
  truncated: boolean;
  retrievedAt: string;
}

// ---------------------------------------------------------------------------
// Graph persistence & sessions
// ---------------------------------------------------------------------------

export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  timestamp: Date;
  relevanceScore?: number;
  metadata?: Record<string, any>;
}

export interface NextStepSuggestion {
  description: string;
  type: ThoughtType;
  confidence: number;
  reasoning: string;
}

export interface SessionState {
  sessionId: string;
  plan?: Plan;
  hypotheses: HypothesisNode[];
  evidence: EvidenceItem[];
  searchConfig?: Omit<SearchConfig, 'tavilyApiKey'> & { hasApiKey?: boolean };
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Visualization (unchanged public surface)
// ---------------------------------------------------------------------------

export interface VisualizationCluster {
  id: string;
  label: string;
  nodeIds: string[];
  color?: string;
  expanded?: boolean;
  level: number;
  parentClusterId?: string;
}

export interface InteractivityOptions {
  zoomable: boolean;
  draggable: boolean;
  selectable: boolean;
  tooltips: boolean;
  expandableNodes: boolean;
  initialZoom?: number;
  zoomRange?: [number, number];
  highlightOnHover?: boolean;
}

export interface FilterOptions {
  nodeTypes?: ThoughtType[];
  connectionTypes?: ConnectionType[];
  metricThresholds?: {
    confidence?: [number, number];
    relevance?: [number, number];
    quality?: [number, number];
  };
  textSearch?: string;
  dateRange?: [Date, Date];
  customFilters?: Record<string, any>;
}

export interface LayoutOptions {
  type: 'force' | 'hierarchical' | 'radial' | 'chronological' | 'thematic';
  direction?: 'LR' | 'RL' | 'TB' | 'BT';
  forceStrength?: number;
  spacing?: number;
  centerNode?: string;
  levelSeparation?: number;
}

export interface Visualization {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
  clusters?: VisualizationCluster[];
  interactivity?: InteractivityOptions;
  filters?: FilterOptions;
  layout?: LayoutOptions;
  metadata?: Record<string, any>;
}

export interface VisualizationNode {
  id: string;
  label: string;
  type: ThoughtType;
  metrics: ThoughtMetrics;
  size?: number;
  color?: string;
  clusterId?: string;
  collapsed?: boolean;
  level?: number;
  icon?: string;
  tooltip?: string;
  hoverContent?: string;
  expandedContent?: string;
  position?: { x: number; y: number };
  highlighted?: boolean;
  selected?: boolean;
  metadata?: Record<string, any>;
}

export interface VisualizationLink {
  source: string;
  target: string;
  type: ConnectionType;
  strength: number;
  width?: number;
  color?: string;
  dashed?: boolean;
  bidirectional?: boolean;
  animated?: boolean;
  weight?: number;
  highlighted?: boolean;
  tooltip?: string;
  hidden?: boolean;
  justifications?: ReasoningJustification[];
}

// ---------------------------------------------------------------------------
// MCP tool parameters & response
// ---------------------------------------------------------------------------

export interface SmartThinkingParams {
  thought: string;
  thoughtType?: ThoughtType;
  connections?: Connection[];
  requestSuggestions?: boolean;
  generateVisualization?: boolean;
  suggestTools?: boolean;
  sessionId?: string;
  userId?: string;
  visualizationType?: 'graph' | 'chronological' | 'thematic' | 'hierarchical' | 'force' | 'radial';
  help?: boolean;
  depth?: ReasoningDepth;

  requestVerification?: boolean;
  containsCalculations?: boolean;

  /** Update the session plan (goal decomposition) in the same call. */
  plan?: {
    goal: string;
    constraints?: string[];
    maxSteps?: number;
  };

  /** Register or update hypotheses tracked across the session. */
  hypotheses?: Array<{
    id?: string;
    statement: string;
    parentId?: string;
    status?: HypothesisStatus;
    confidence?: number;
  }>;

  /** Mark an existing hypothesis with new evidence. */
  hypothesisUpdate?: {
    id: string;
    support?: string;
    contradict?: string;
    confidence?: number;
  };

  visualizationOptions?: {
    clusterBy?: 'type' | 'theme' | 'metric' | 'connectivity';
    direction?: 'LR' | 'RL' | 'TB' | 'BT';
    centerNode?: string;
    maxDepth?: number;
    filters?: FilterOptions;
    interactivity?: Partial<InteractivityOptions>;
  };
}

export interface SmartThinkingResponse {
  thoughtId: string;
  thought: string;
  thoughtType: ThoughtType;
  qualityMetrics: ThoughtMetrics;
  sessionId?: string;
  suggestedTools?: SuggestedTool[];
  visualization?: Visualization;
  relevantMemories?: MemoryItem[];
  suggestedNextSteps?: NextStepSuggestion[];

  verification?: VerificationResult;
  isVerified: boolean;
  verificationStatus?: VerificationDetailedStatus;
  certaintySummary: string;
  reliabilityScore: number;
  reasoningTrace?: ReasoningStep[];
  reasoningTimeline?: Array<{
    stepId: string;
    label: string;
    status: ReasoningStepStatus;
    timestamp: string;
  }>;

  // v13 additions
  depth?: ReasoningDepth;
  plan?: Plan;
  hypotheses?: HypothesisNode[];
  evidence?: EvidenceItem[];
  searchQueries?: string[];
  critique?: CritiqueReport;
  hypothesisWarnings?: string[];
  memoryId?: string;
}
