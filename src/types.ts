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

// Interface pour les clusters dans la visualisation
export interface VisualizationCluster {
  id: string;
  label: string;
  nodeIds: string[];  // IDs des nœuds dans ce cluster
  color?: string;
  expanded?: boolean; // Si le cluster est développé ou replié
  level: number;      // Niveau dans la hiérarchie
  parentClusterId?: string; // Pour l'imbrication de clusters
}

// Options d'interactivité pour la visualisation
export interface InteractivityOptions {
  zoomable: boolean;
  draggable: boolean;
  selectable: boolean;
  tooltips: boolean;
  expandableNodes: boolean;
  initialZoom?: number;
  zoomRange?: [number, number]; // [min, max]
  highlightOnHover?: boolean;
}

// Options de filtrage pour la visualisation
export interface FilterOptions {
  nodeTypes?: ThoughtType[];
  connectionTypes?: ConnectionType[];
  metricThresholds?: {
    confidence?: [number, number]; // [min, max]
    relevance?: [number, number];
    quality?: [number, number];
  };
  textSearch?: string;
  dateRange?: [Date, Date]; // [start, end]
  customFilters?: Record<string, any>;
}

// Options de mise en page pour la visualisation
export interface LayoutOptions {
  type: 'force' | 'hierarchical' | 'radial' | 'chronological' | 'thematic';
  direction?: 'LR' | 'RL' | 'TB' | 'BT'; // Pour hiérarchique
  forceStrength?: number;   // Pour les layouts force-directed
  spacing?: number;         // Espacement entre nœuds
  centerNode?: string;      // ID du nœud central
  levelSeparation?: number; // Pour hiérarchique
}

// Interface pour une visualisation
export interface Visualization {
  nodes: VisualizationNode[];
  links: VisualizationLink[];
  clusters?: VisualizationCluster[];  // Nouveau: pour regroupements
  interactivity?: InteractivityOptions; // Nouveau: options d'interactivité
  filters?: FilterOptions;  // Nouveau: état des filtres appliqués
  layout?: LayoutOptions;   // Nouveau: paramètres de disposition
  metadata?: Record<string, any>;
}

// Nœud dans la visualisation
export interface VisualizationNode {
  id: string;
  label: string;
  type: ThoughtType;
  metrics: ThoughtMetrics;
  // Propriétés visuelles existantes
  size?: number;
  color?: string;
  // Nouvelles propriétés
  clusterId?: string;       // ID du cluster auquel appartient le nœud
  collapsed?: boolean;      // Si les détails sont repliés
  level?: number;           // Niveau hiérarchique
  icon?: string;            // Icône optionnelle
  tooltip?: string;         // Texte info-bulle
  hoverContent?: string;    // Contenu à afficher au survol
  expandedContent?: string; // Contenu détaillé
  position?: { x: number, y: number }; // Position fixe
  highlighted?: boolean;    // Mise en évidence
  selected?: boolean;       // État de sélection
  metadata?: Record<string, any>; // Métadonnées supplémentaires
}

// Lien dans la visualisation
export interface VisualizationLink {
  source: string;
  target: string;
  type: ConnectionType;
  strength: number;
  // Propriétés visuelles existantes
  width?: number;
  color?: string;
  // Nouvelles propriétés
  dashed?: boolean;         // Style de ligne
  bidirectional?: boolean;  // Flèche bidirectionnelle
  animated?: boolean;       // Animation
  weight?: number;          // Poids pour algorithmes force-directed
  highlighted?: boolean;    // Mise en évidence
  tooltip?: string;         // Texte info-bulle
  hidden?: boolean;         // Lien caché mais existant
}

// Élément de mémoire
export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
  timestamp: Date;
  relevanceScore?: number; // Calculé dynamiquement
  metadata?: Record<string, any>; // Métadonnées optionnelles (sessionId, etc.)
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
  visualizationType?: 'graph' | 'chronological' | 'thematic' | 'hierarchical' | 'force' | 'radial';
  help?: boolean;
  
  // Nouvelles options de visualisation avancée
  visualizationOptions?: {
    clusterBy?: 'type' | 'theme' | 'metric' | 'connectivity';
    direction?: 'LR' | 'RL' | 'TB' | 'BT';
    centerNode?: string;
    maxDepth?: number;
    filters?: FilterOptions;
    interactivity?: Partial<InteractivityOptions>;
  };
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