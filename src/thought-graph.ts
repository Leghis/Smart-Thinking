import { 
  ThoughtNode,
  ThoughtType,
  Connection,
  ConnectionType,
  ThoughtMetrics,
  NextStepSuggestion
} from './types';

/**
 * Classe qui gère le graphe de pensées et ses opérations
 */
export class ThoughtGraph {
  private nodes: Map<string, ThoughtNode> = new Map();
  private sessionId: string;
  
  constructor(sessionId?: string) {
    this.sessionId = sessionId || this.generateUniqueId();
  }
  
  /**
   * Génère un identifiant unique
   */
  private generateUniqueId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
  
  /**
   * Ajoute une nouvelle pensée au graphe
   * 
   * @param content Le contenu de la pensée
   * @param type Le type de pensée
   * @param connections Les connexions à d'autres pensées
   * @returns L'identifiant de la pensée ajoutée
   */
  addThought(
    content: string, 
    type: ThoughtType = 'regular', 
    connections: Connection[] = []
  ): string {
    const id = this.generateUniqueId();
    
    const node: ThoughtNode = {
      id,
      content,
      type,
      timestamp: new Date(),
      connections: [...connections],
      metrics: {
        confidence: 0.5,  // Valeur par défaut
        relevance: 0.5,   // Valeur par défaut
        quality: 0.5      // Valeur par défaut
      },
      metadata: {
        sessionId: this.sessionId
      }
    };
    
    this.nodes.set(id, node);
    
    // Établir les connexions bidirectionnelles
    this.establishConnections(id, connections);
    
    return id;
  }
  
  /**
   * Établit des connexions bidirectionnelles entre les pensées
   * 
   * @param sourceId L'identifiant de la pensée source
   * @param connections Les connexions à établir
   */
  private establishConnections(sourceId: string, connections: Connection[]): void {
    for (const connection of connections) {
      const targetNode = this.nodes.get(connection.targetId);
      if (targetNode) {
        targetNode.connections.push({
          targetId: sourceId,
          type: this.getReciprocalConnectionType(connection.type),
          strength: connection.strength,
          description: connection.description
        });
      }
    }
  }
  
  /**
   * Détermine le type de connexion réciproque
   * 
   * @param type Le type de connexion original
   * @returns Le type de connexion réciproque
   */
  private getReciprocalConnectionType(type: ConnectionType): ConnectionType {
    switch (type) {
      case 'supports': return 'supports';
      case 'contradicts': return 'contradicts';
      case 'refines': return 'derives';
      case 'derives': return 'refines';
      case 'branches': return 'branches';
      case 'associates': return 'associates';
      default: return 'associates';
    }
  }
  
  /**
   * Récupère une pensée par son identifiant
   * 
   * @param id L'identifiant de la pensée
   * @returns La pensée ou undefined si non trouvée
   */
  getThought(id: string): ThoughtNode | undefined {
    return this.nodes.get(id);
  }
  
  /**
   * Met à jour les métriques d'une pensée
   * 
   * @param id L'identifiant de la pensée
   * @param metrics Les nouvelles métriques
   * @returns true si la mise à jour a réussi, false sinon
   */
  updateThoughtMetrics(id: string, metrics: Partial<ThoughtMetrics>): boolean {
    const thought = this.nodes.get(id);
    if (!thought) return false;
    
    thought.metrics = {
      ...thought.metrics,
      ...metrics
    };
    
    return true;
  }
  
  /**
   * Récupère toutes les pensées
   * 
   * @returns Un tableau de toutes les pensées
   */
  getAllThoughts(): ThoughtNode[] {
    return Array.from(this.nodes.values());
  }
  
  /**
   * Récupère les pensées les plus récentes
   * 
   * @param limit Le nombre maximum de pensées à récupérer
   * @returns Un tableau des pensées les plus récentes
   */
  getRecentThoughts(limit: number = 5): ThoughtNode[] {
    return Array.from(this.nodes.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
  
  /**
   * Récupère les pensées connectées à une pensée spécifique
   * 
   * @param thoughtId L'identifiant de la pensée
   * @returns Un tableau des pensées connectées
   */
  getConnectedThoughts(thoughtId: string): ThoughtNode[] {
    const thought = this.nodes.get(thoughtId);
    if (!thought) return [];
    
    return thought.connections
      .map(conn => this.nodes.get(conn.targetId))
      .filter((node): node is ThoughtNode => node !== undefined);
  }
  
  /**
   * Récupère les pensées les plus pertinentes pour un contexte donné
   * 
   * @param context Le contexte pour lequel chercher des pensées pertinentes
   * @param limit Le nombre maximum de pensées à récupérer
   * @returns Un tableau des pensées les plus pertinentes
   */
  getRelevantThoughts(context: string, limit: number = 5): ThoughtNode[] {
    // Une implémentation simple basée sur la correspondance de mots-clés
    // Dans une version plus avancée, utiliser NLP ou des embeddings
    const contextWords = context.toLowerCase().split(/\W+/).filter(word => word.length > 3);
    
    return Array.from(this.nodes.values())
      .map(thought => {
        const thoughtWords = thought.content.toLowerCase().split(/\W+/).filter(word => word.length > 3);
        
        // Calculer un score simple basé sur le nombre de mots partagés
        const matchingWords = contextWords.filter(word => thoughtWords.includes(word));
        const score = matchingWords.length / Math.max(contextWords.length, 1);
        
        return {
          thought,
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.thought);
  }
  
  /**
   * Suggère les prochaines étapes de raisonnement
   * 
   * @param limit Le nombre maximum de suggestions
   * @returns Un tableau de suggestions pour les prochaines étapes
   */
  suggestNextSteps(limit: number = 3): NextStepSuggestion[] {
    if (this.nodes.size === 0) {
      return [{
        description: "Commencez par définir le problème ou la question à explorer",
        type: 'regular',
        confidence: 0.9,
        reasoning: "Une définition claire du problème est essentielle pour un raisonnement efficace"
      }];
    }
    
    const suggestions: NextStepSuggestion[] = [];
    const recentThoughts = this.getRecentThoughts(3);
    const allThoughts = this.getAllThoughts();
    
    // Vérifier s'il y a des contradictions à résoudre
    const hasContradictions = allThoughts.some(thought => 
      thought.connections.some(conn => conn.type === 'contradicts')
    );
    
    if (hasContradictions) {
      suggestions.push({
        description: "Résolvez les contradictions identifiées dans votre raisonnement",
        type: 'meta',
        confidence: 0.85,
        reasoning: "Des contradictions non résolues peuvent affaiblir votre analyse"
      });
    }
    
    // Vérifier si une méta-réflexion serait utile
    const hasMeta = allThoughts.some(thought => thought.type === 'meta');
    if (allThoughts.length >= 5 && !hasMeta) {
      suggestions.push({
        description: "Faites une méta-réflexion sur votre approche jusqu'à présent",
        type: 'meta',
        confidence: 0.7,
        reasoning: "La méta-cognition peut améliorer la qualité du raisonnement"
      });
    }
    
    // Vérifier s'il est temps de former une hypothèse
    const hasHypothesis = allThoughts.some(thought => thought.type === 'hypothesis');
    if (allThoughts.length >= 3 && !hasHypothesis) {
      suggestions.push({
        description: "Formulez une hypothèse basée sur vos observations",
        type: 'hypothesis',
        confidence: 0.75,
        reasoning: "Une hypothèse claire peut guider la suite de votre raisonnement"
      });
    }
    
    // Vérifier s'il est temps de conclure
    const hasConclusion = allThoughts.some(thought => thought.type === 'conclusion');
    if (allThoughts.length >= 7 && !hasConclusion) {
      suggestions.push({
        description: "Rédigez une conclusion provisoire basée sur votre analyse",
        type: 'conclusion',
        confidence: 0.8,
        reasoning: "Même provisoire, une conclusion peut aider à synthétiser votre réflexion"
      });
    }
    
    // Si aucune suggestion n'a été faite, proposer une continuation simple
    if (suggestions.length === 0) {
      suggestions.push({
        description: "Continuez votre raisonnement en développant vos idées actuelles",
        type: 'regular',
        confidence: 0.6,
        reasoning: "Approfondir les pensées existantes peut révéler de nouvelles perspectives"
      });
    }
    
    return suggestions.slice(0, limit);
  }
  
  /**
   * Efface toutes les pensées du graphe
   */
  clear(): void {
    this.nodes.clear();
  }
  
  /**
   * Exporte le graphe de pensées sous forme de JSON
   * 
   * @returns Une représentation JSON du graphe
   */
  exportToJson(): string {
    return JSON.stringify(Array.from(this.nodes.values()));
  }
  
  /**
   * Importe un graphe de pensées depuis un JSON
   * 
   * @param json Le JSON à importer
   * @returns true si l'importation a réussi, false sinon
   */
  importFromJson(json: string): boolean {
    try {
      const nodes = JSON.parse(json) as ThoughtNode[];
      this.clear();
      
      for (const node of nodes) {
        this.nodes.set(node.id, {
          ...node,
          timestamp: new Date(node.timestamp)
        });
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'importation du graphe:', error);
      return false;
    }
  }
}