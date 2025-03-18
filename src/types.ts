/**
 * Types communs pour le projet Smart-Thinking
 */

// Types de pensée
export type ThoughtType = 'regular' | 'revision' | 'meta' | 'hypothesis' | 'conclusion';

// Types de connexion entre les pensées
export type ConnectionType = 'supports' | 'contradicts' | 'refines' | 'branches' | 'derives' | 'associates';

// Interface pour un nœud dans le graphe de pensées
export interface ThoughtNode {
  id: string;
  content: string;
  type: ThoughtType;
  timestamp: Date;
  connections: Connection[];
  metrics: ThoughtMetrics;
  metadata: Record<string, any>;
}

// Interface pour une connexion entre des nœuds de pensée
export interface Connection {
  targetId: string;
  type: ConnectionType;
  strength: number; // De 0 à 1, indiquant la force de la connexion
  description?: string;
}

// Métriques de qualité pour une pensée
export interface ThoughtMetrics {
  confidence: number; // De 0 à 1
  relevance: number; // De 0 à 1
  quality: number; // De 0 à 1
  // Peut être étendu avec d'autres métriques
}

// Interface pour un outil suggéré
export interface SuggestedTool {
  name: string;
  confidence: number; // De 0 à 1
  reason: string;
  priority?: number; // Plus petit = plus prioritaire
}

// Interface pour une visualisation
export interface Visualization {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
  // Autres métadonnées pour la visualisation
  metadata?: Record<string, any>;
}

// Nœud dans la visualisation
export interface VisualizationNode {
  id: string;
  label: string;
  type: ThoughtType;
  metrics: ThoughtMetrics;
  // Propriétés visuelles
  size?: number;
  color?: string;
}

// Lien dans la visualisation
export interface VisualizationLink {
  source: string;
  target: string;
  type: ConnectionType;
  strength: number;
  // Propriétés visuelles
  width?: number;
  color?: string;
}

// Élément de mémoire
export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  timestamp: Date;
  relevanceScore?: number; // Calculé dynamiquement
}

// Suggestion pour la prochaine étape
export interface NextStepSuggestion {
  description: string;
  type: ThoughtType;
  confidence: number;
  reasoning: string;
}

// Paramètres pour l'outil Smart-Thinking
export interface SmartThinkingParams {
  thought: string;
  thoughtType?: ThoughtType;
  connections?: Connection[];
  requestSuggestions?: boolean;
  generateVisualization?: boolean;
  suggestTools?: boolean;
  sessionId?: string;
  userId?: string;
  visualizationType?: 'graph' | 'chronological' | 'thematic';
}

// Réponse de l'outil Smart-Thinking
export interface SmartThinkingResponse {
  thoughtId: string;
  thought: string;
  thoughtType: ThoughtType;
  qualityMetrics: ThoughtMetrics;
  suggestedTools?: SuggestedTool[];
  visualization?: Visualization;
  relevantMemories?: MemoryItem[];
  suggestedNextSteps?: NextStepSuggestion[];
}
