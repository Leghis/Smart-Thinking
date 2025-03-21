import { 
  ThoughtNode,
  ThoughtType,
  Connection,
  ConnectionType,
  ThoughtMetrics,
  NextStepSuggestion,
  Hyperlink,
  ConnectionAttributes,
  CalculationVerificationResult
} from './types';
import { EmbeddingService } from './embedding-service';
import { QualityEvaluator } from './quality-evaluator';
import { EventEmitter } from 'events';

/**
 * Classe qui gère le graphe de pensées et ses opérations
 */
export class ThoughtGraph {
  private nodes: Map<string, ThoughtNode> = new Map();
  private hyperlinks: Map<string, Hyperlink> = new Map();
  private sessionId: string;
  private embeddingService?: EmbeddingService;
  private qualityEvaluator?: QualityEvaluator;
  private eventEmitter: EventEmitter;
  
  constructor(sessionId?: string, embeddingService?: EmbeddingService, qualityEvaluator?: QualityEvaluator) {
    this.sessionId = sessionId || this.generateUniqueId();
    this.embeddingService = embeddingService;
    this.qualityEvaluator = qualityEvaluator;
    this.eventEmitter = new EventEmitter();
    
    // Configurer les écouteurs d'événements
    this.setupEventListeners();
  }
  
  /**
   * Configure les écouteurs d'événements pour la vérification continue
   */
  private setupEventListeners(): void {
    // Configurer ici des écouteurs si nécessaire
  }
  
  /**
   * Vérifie les calculs dans une pensée et les annote si nécessaire
   * 
   * @param thoughtId L'identifiant de la pensée à vérifier
   * @param content Le contenu de la pensée
   */
  private async checkForCalculationsAndVerify(thoughtId: string, content: string): Promise<void> {
    if (!this.qualityEvaluator) return;
    
    // Détecter si la pensée contient des calculs avec des expressions régulières simples
    const hasSimpleCalculations = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(content);
    const hasComplexCalculations = /calcul\s*(?:complexe|avancé)?\s*:?\s*([^=]+)=\s*\d+/.test(content);
    
    if (hasSimpleCalculations || hasComplexCalculations) {
      console.error(`Smart-Thinking: Détection en temps réel de calculs dans la pensée ${thoughtId}, vérification...`);
      
      try {
        // Vérifier les calculs de manière asynchrone
        const verifiedCalculations = await this.qualityEvaluator.detectAndVerifyCalculations(content);
        
        if (verifiedCalculations.length > 0) {
          // Mettre à jour le contenu de la pensée avec les annotations
          const updatedContent = this.qualityEvaluator.annotateThoughtWithVerifications(
            content, 
            verifiedCalculations
          );
          
          // Mettre à jour la pensée sans déclencher à nouveau les vérifications
          const thought = this.nodes.get(thoughtId);
          if (thought) {
            thought.content = updatedContent;
            thought.metadata.calculationsVerified = true;
            thought.metadata.lastUpdated = new Date();
            thought.metadata.verificationTimestamp = new Date();
          }
          
          // Émettre un événement pour notifier que des calculs ont été vérifiés
          this.eventEmitter.emit('calculations-verified', {
            thoughtId,
            verifiedCalculations,
            updatedContent
          });
          
          // Journaliser le résultat de la vérification
          console.error(`Smart-Thinking: ${verifiedCalculations.length} calcul(s) vérifié(s) dans la pensée ${thoughtId}`);
        }
      } catch (error) {
        console.error(`Smart-Thinking: Erreur lors de la vérification des calculs:`, error);
      }
    }
  }
  
  /**
   * Permet d'enregistrer un écouteur d'événement externe
   * 
   * @param event Le nom de l'événement
   * @param listener La fonction de rappel à exécuter
   */
  public on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
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
    
    // Émettre un événement pour notifier de l'ajout d'une pensée
    this.eventEmitter.emit('thought-added', id, node);
    
    // Vérifier automatiquement les calculs si nécessaire
    this.checkForCalculationsAndVerify(id, content);
    
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
          description: connection.description,
          // Transférer les attributs si présents
          attributes: connection.attributes,
          inferred: connection.inferred,
          inferenceConfidence: connection.inferenceConfidence,
          bidirectional: connection.bidirectional
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
      case 'exemplifies': return 'generalizes';
      case 'generalizes': return 'exemplifies';
      case 'compares': return 'compares';
      case 'contrasts': return 'contrasts';
      case 'questions': return 'questions';
      case 'extends': return 'extended-by';
      case 'analyzes': return 'analyzed-by';
      case 'synthesizes': return 'component-of';
      case 'applies': return 'applied-by';
      case 'evaluates': return 'evaluated-by';
      case 'cites': return 'cited-by';
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
  async getRelevantThoughts(context: string, limit: number = 5): Promise<ThoughtNode[]> {
    const allThoughts = Array.from(this.nodes.values());
    
    // Si pas de pensées ou pas de service d'embeddings, utiliser l'algorithme de base
    if (allThoughts.length === 0 || !this.embeddingService) {
      return this.getRelevantThoughtsWithKeywords(context, limit);
    }
    
    try {
      // Utiliser le service d'embeddings pour trouver les pensées similaires
      const thoughtTexts = allThoughts.map(thought => thought.content);
      const similarResults = await this.embeddingService.findSimilarTexts(context, thoughtTexts, limit);
      
      // Convertir les résultats en pensées
      return similarResults.map(result => {
        const matchingThought = allThoughts.find(thought => thought.content === result.text);
        if (matchingThought) {
          // Stocker le score de similarité dans les métadonnées pour référence future
          matchingThought.metadata.similarityScore = result.score;
        }
        return matchingThought!;
      }).filter(thought => thought !== undefined);
    } catch (error) {
      console.error('Erreur lors de la recherche de pensées pertinentes avec embeddings:', error);
      // En cas d'erreur, revenir à l'algorithme basé sur les mots-clés
      return this.getRelevantThoughtsWithKeywords(context, limit);
    }
  }
  
  /**
   * Implémentation de secours basée sur les mots-clés
   * 
   * @param context Le contexte pour lequel chercher des pensées pertinentes
   * @param limit Le nombre maximum de pensées à récupérer
   * @returns Un tableau des pensées les plus pertinentes
   */
  private getRelevantThoughtsWithKeywords(context: string, limit: number = 5): ThoughtNode[] {
    // Une implémentation simple basée sur la correspondance de mots-clés
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
   * Crée un hyperlien entre plusieurs pensées
   * 
   * @param nodeIds Les identifiants des pensées à connecter
   * @param type Le type de connexion
   * @param label Une étiquette descriptive facultative
   * @param attributes Attributs sémantiques facultatifs
   * @param strength La force de la connexion (0 à 1)
   * @returns L'identifiant de l'hyperlien créé
   */
  createHyperlink(
    nodeIds: string[],
    type: ConnectionType,
    label?: string,
    attributes?: ConnectionAttributes,
    strength: number = 0.5
  ): string {
    // Vérifier que les nœuds existent
    if (nodeIds.some(id => !this.nodes.has(id))) {
      console.error('Certains nœuds spécifiés n\'existent pas');
      return '';
    }
    
    // Générer un ID unique pour l'hyperlien
    const id = this.generateUniqueId();
    
    // Créer l'hyperlien
    const hyperlink: Hyperlink = {
      id,
      nodeIds,
      type,
      label,
      attributes,
      strength,
      inferred: false,
      confidence: 1.0, // Non inféré, donc confiance maximale
      metadata: {
        createdAt: new Date(),
        sessionId: this.sessionId
      }
    };
    
    // Ajouter l'hyperlien à la collection
    this.hyperlinks.set(id, hyperlink);
    
    return id;
  }
  
  /**
   * Récupère un hyperlien par son identifiant
   * 
   * @param id L'identifiant de l'hyperlien
   * @returns L'hyperlien ou undefined si non trouvé
   */
  getHyperlink(id: string): Hyperlink | undefined {
    return this.hyperlinks.get(id);
  }
  
  /**
   * Récupère tous les hyperliens
   * 
   * @returns Un tableau de tous les hyperliens
   */
  getAllHyperlinks(): Hyperlink[] {
    return Array.from(this.hyperlinks.values());
  }
  
  /**
   * Récupère les hyperliens impliquant une pensée spécifique
   * 
   * @param thoughtId L'identifiant de la pensée
   * @returns Un tableau des hyperliens impliquant cette pensée
   */
  getHyperlinksForThought(thoughtId: string): Hyperlink[] {
    return Array.from(this.hyperlinks.values())
      .filter(hyperlink => hyperlink.nodeIds.includes(thoughtId));
  }
  
  /**
   * Infère des relations entre pensées basées sur l'analyse de contenu et de contexte
   * 
   * @param confidenceThreshold Seuil de confiance minimum pour les relations inférées (0 à 1)
   * @returns Le nombre de nouvelles relations inférées
   */
  async inferRelations(confidenceThreshold: number = 0.7): Promise<number> {
    if (!this.embeddingService) {
      console.error('Service d\'embeddings non disponible pour l\'inférence de relations');
      return 0;
    }
    
    const thoughts = this.getAllThoughts();
    let newRelationsCount = 0;
    
    // Inférence basée sur la similarité sémantique
    const similarityCount = await this.inferRelationsBySimilarity(thoughts, confidenceThreshold);
    
    // Inférence basée sur la transitivité des relations
    const transitivityCount = this.inferRelationsByTransitivity(confidenceThreshold);
    
    // Inférence basée sur des patterns dans le graphe
    const patternsCount = this.inferRelationsByPatterns(confidenceThreshold);
    
    newRelationsCount = similarityCount + transitivityCount + patternsCount;
    
    return newRelationsCount;
  }
  
  /**
   * Infère des relations basées sur la similarité sémantique
   * 
   * @param thoughts Les pensées à analyser
   * @param confidenceThreshold Seuil de confiance minimum
   * @returns Le nombre de nouvelles relations inférées
   */
  private async inferRelationsBySimilarity(
    thoughts: ThoughtNode[],
    confidenceThreshold: number
  ): Promise<number> {
    if (thoughts.length < 2 || !this.embeddingService) return 0;
    
    let newRelationsCount = 0;
    const thoughtTexts = thoughts.map(t => t.content);
    
    // Calculer les similarités entre toutes les paires de pensées
    for (let i = 0; i < thoughts.length; i++) {
      const sourceThought = thoughts[i];
      
      // Trouver les pensées similaires
      const similarResults = await this.embeddingService.findSimilarTexts(
        sourceThought.content,
        thoughtTexts.filter((_, index) => index !== i),
        10
      );
      
      // Créer des connexions pour les pensées suffisamment similaires
      for (const result of similarResults) {
        if (result.score < confidenceThreshold) continue;
        
        const targetThought = thoughts.find(t => t.content === result.text);
        if (!targetThought) continue;
        
        // Éviter les doublons
        const hasConnection = sourceThought.connections.some(
          conn => conn.targetId === targetThought.id
        );
        
        if (!hasConnection) {
          // Déterminer le type de connexion en fonction du contexte
          const connectionType = this.inferConnectionType(sourceThought, targetThought);
          
          // Ajouter la nouvelle connexion
          this.addInferredConnection(
            sourceThought.id,
            targetThought.id,
            connectionType,
            result.score
          );
          
          newRelationsCount++;
        }
      }
    }
    
    return newRelationsCount;
  }
  
  /**
   * Infère des relations basées sur la transitivité
   * 
   * @param confidenceThreshold Seuil de confiance minimum
   * @returns Le nombre de nouvelles relations inférées
   */
  private inferRelationsByTransitivity(confidenceThreshold: number): number {
    let newRelationsCount = 0;
    const thoughts = this.getAllThoughts();
    
    // Règles de transitivité pour certains types de connexions
    const transitivityRules: {
      [key: string]: {
        firstType: ConnectionType,
        secondType: ConnectionType,
        resultType: ConnectionType,
        confidenceMultiplier: number
      }[]
    } = {
      // Si A supporte B et B supporte C, alors A supporte C (transitivité affaiblie)
      'supports': [
        {
          firstType: 'supports',
          secondType: 'supports',
          resultType: 'supports',
          confidenceMultiplier: 0.8
        }
      ],
      // Si A contredit B et B supporte C, alors A contredit C (transitivité inversée)
      'contradicts': [
        {
          firstType: 'contradicts',
          secondType: 'supports',
          resultType: 'contradicts',
          confidenceMultiplier: 0.7
        }
      ],
      // Autres règles...
    };
    
    // Appliquer les règles de transitivité
    for (const thought of thoughts) {
      for (const conn1 of thought.connections) {
        const secondThought = this.getThought(conn1.targetId);
        if (!secondThought) continue;
        
        const rules = transitivityRules[conn1.type] || [];
        
        for (const rule of rules) {
          if (conn1.type !== rule.firstType) continue;
          
          for (const conn2 of secondThought.connections) {
            if (conn2.type !== rule.secondType) continue;
            
            const thirdThought = this.getThought(conn2.targetId);
            if (!thirdThought || thirdThought.id === thought.id) continue;
            
            // Éviter les cycles et les doublons
            const hasConnection = thought.connections.some(
              c => c.targetId === thirdThought.id
            );
            
            if (!hasConnection) {
              // Calculer la confiance basée sur les connexions existantes
              const confidence = conn1.strength * conn2.strength * rule.confidenceMultiplier;
              
              if (confidence >= confidenceThreshold) {
                this.addInferredConnection(
                  thought.id,
                  thirdThought.id,
                  rule.resultType,
                  confidence
                );
                
                newRelationsCount++;
              }
            }
          }
        }
      }
    }
    
    return newRelationsCount;
  }
  
  /**
   * Infère des relations basées sur des patterns dans le graphe
   * 
   * @param confidenceThreshold Seuil de confiance minimum
   * @returns Le nombre de nouvelles relations inférées
   */
  private inferRelationsByPatterns(confidenceThreshold: number): number {
    let newRelationsCount = 0;
    
    // Détecter les clusters de pensées fortement connectées
    const clusters = this.detectClusters();
    
    // Pour chaque cluster, créer des hyperliens entre les membres
    for (const cluster of clusters) {
      if (cluster.nodeIds.length >= 3) {
        // Créer un hyperlien pour le groupe si la confiance est suffisante
        if (cluster.cohesion >= confidenceThreshold) {
          this.createHyperlink(
            cluster.nodeIds,
            'associates', // Type par défaut, pourrait être affiné
            `Cluster: ${cluster.label || 'Sans nom'}`,
            { 
              nature: 'associative',
              scope: 'broad'
            },
            cluster.cohesion
          );
          
          newRelationsCount++;
        }
        
        // Également, inférer des relations individuelles entre les membres du cluster
        for (let i = 0; i < cluster.nodeIds.length; i++) {
          for (let j = i + 1; j < cluster.nodeIds.length; j++) {
            const thought1 = this.getThought(cluster.nodeIds[i]);
            const thought2 = this.getThought(cluster.nodeIds[j]);
            
            if (!thought1 || !thought2) continue;
            
            // Vérifier si une connexion existe déjà
            const hasConnection = thought1.connections.some(
              conn => conn.targetId === thought2.id
            );
            
            if (!hasConnection) {
              // La confiance est basée sur la cohésion du cluster
              const confidence = cluster.cohesion * 0.9;
              
              if (confidence >= confidenceThreshold) {
                this.addInferredConnection(
                  thought1.id,
                  thought2.id,
                  'associates',
                  confidence
                );
                
                newRelationsCount++;
              }
            }
          }
        }
      }
    }
    
    return newRelationsCount;
  }
  
  /**
   * Détecte des clusters (groupes) de pensées fortement connectées
   * 
   * @returns Un tableau de clusters détectés
   */
  private detectClusters(): {
    nodeIds: string[],
    label?: string,
    cohesion: number // Force de cohésion du cluster (0 à 1)
  }[] {
    const clusters: {
      nodeIds: string[],
      label?: string,
      cohesion: number
    }[] = [];
    
    // Algorithme simple de clustering basé sur la connectivité
    const thoughts = this.getAllThoughts();
    const visited = new Set<string>();
    
    for (const thought of thoughts) {
      if (visited.has(thought.id)) continue;
      
      // Parcourir le graphe à partir de cette pensée
      const cluster = this.exploreCommunity(thought.id, visited);
      
      // Seulement considérer les clusters avec au moins 2 nœuds
      if (cluster.nodeIds.length >= 2) {
        clusters.push(cluster);
      }
    }
    
    return clusters;
  }
  
  /**
   * Explore une communauté connectée à partir d'un nœud de départ
   * 
   * @param startNodeId ID du nœud de départ
   * @param visited Ensemble des nœuds déjà visités
   * @returns Un cluster de nœuds connectés
   */
  private exploreCommunity(
    startNodeId: string,
    visited: Set<string>
  ): {
    nodeIds: string[],
    label?: string,
    cohesion: number
  } {
    const communityNodes: string[] = [];
    const queue: string[] = [startNodeId];
    const connectivityScores: number[] = [];
    
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      
      visited.add(currentId);
      communityNodes.push(currentId);
      
      const thought = this.getThought(currentId);
      if (!thought) continue;
      
      // Évaluer les connexions
      for (const conn of thought.connections) {
        if (!visited.has(conn.targetId) && conn.strength > 0.5) {
          queue.push(conn.targetId);
          connectivityScores.push(conn.strength);
        }
      }
    }
    
    // Calculer la cohésion du cluster basée sur la force moyenne des connexions
    const avgConnectivity = connectivityScores.length > 0
      ? connectivityScores.reduce((sum, score) => sum + score, 0) / connectivityScores.length
      : 0;
    
    return {
      nodeIds: communityNodes,
      cohesion: avgConnectivity
    };
  }
  
  /**
   * Infère le type de connexion approprié entre deux pensées
   * 
   * @param sourceThought La pensée source
   * @param targetThought La pensée cible
   * @returns Le type de connexion inféré
   */
  private inferConnectionType(
    sourceThought: ThoughtNode,
    targetThought: ThoughtNode
  ): ConnectionType {
    // Analyse simple basée sur le contenu et le type des pensées
    
    const sourceContent = sourceThought.content.toLowerCase();
    const targetContent = targetThought.content.toLowerCase();
    
    // Recherche de mots-clés indiquant des contradictions
    const contradictionMarkers = [
      'cependant', 'mais', 'toutefois', 'contrairement', 'oppose', 
      'contredit', 'différent', 'désaccord', 'conteste'
    ];
    
    if (contradictionMarkers.some(marker => 
      sourceContent.includes(marker) || targetContent.includes(marker)
    )) {
      return 'contradicts';
    }
    
    // Recherche de mots-clés indiquant un support
    const supportMarkers = [
      'confirme', 'soutient', 'renforce', 'valide', 'appuie',
      'corrobore', 'accord', 'similaire'
    ];
    
    if (supportMarkers.some(marker => 
      sourceContent.includes(marker) || targetContent.includes(marker)
    )) {
      return 'supports';
    }
    
    // Inférence basée sur les types de pensées
    if (sourceThought.type === 'conclusion' && targetThought.type !== 'conclusion') {
      return 'synthesizes';
    }
    
    if (sourceThought.type === 'hypothesis' && targetThought.type === 'regular') {
      return 'generalizes';
    }
    
    if (sourceThought.type === 'regular' && targetThought.type === 'hypothesis') {
      return 'exemplifies';
    }
    
    if (sourceThought.type === 'meta') {
      return 'analyzes';
    }
    
    if (sourceThought.type === 'revision') {
      return 'refines';
    }
    
    // Par défaut, type d'association générique
    return 'associates';
  }
  
  /**
   * Ajoute une connexion inférée entre deux pensées
   * 
   * @param sourceId ID de la pensée source
   * @param targetId ID de la pensée cible
   * @param type Type de connexion
   * @param confidence Niveau de confiance dans l'inférence
   * @returns true si l'ajout a réussi, false sinon
   */
  private addInferredConnection(
    sourceId: string,
    targetId: string,
    type: ConnectionType,
    confidence: number
  ): boolean {
    const sourceThought = this.getThought(sourceId);
    const targetThought = this.getThought(targetId);
    
    if (!sourceThought || !targetThought) {
      return false;
    }
    
    // Créer la connexion avec marquage d'inférence
    const connection: Connection = {
      targetId,
      type,
      strength: confidence,
      inferred: true,
      inferenceConfidence: confidence,
      attributes: {
        certainty: this.mapConfidenceToCertainty(confidence)
      }
    };
    
    // Ajouter la connexion à la pensée source
    sourceThought.connections.push(connection);
    
    // Créer une connexion réciproque si nécessaire
    if (this.shouldCreateReciprocalConnection(type)) {
      const reciprocalType = this.getReciprocalConnectionType(type);
      
      targetThought.connections.push({
        targetId: sourceId,
        type: reciprocalType,
        strength: confidence,
        inferred: true,
        inferenceConfidence: confidence,
        attributes: {
          certainty: this.mapConfidenceToCertainty(confidence)
        }
      });
    }
    
    return true;
  }
  
  /**
   * Détermine si une connexion réciproque doit être créée
   * 
   * @param type Le type de connexion
   * @returns true si une connexion réciproque doit être créée
   */
  private shouldCreateReciprocalConnection(type: ConnectionType): boolean {
    // Certains types de connexion sont intrinsèquement bidirectionnels
    const bidirectionalTypes: ConnectionType[] = [
      'associates', 'compares', 'contrasts'
    ];
    
    return bidirectionalTypes.includes(type);
  }
  
  /**
   * Convertit un niveau de confiance en niveau de certitude
   * 
   * @param confidence Le niveau de confiance (0 à 1)
   * @returns Le niveau de certitude correspondant
   */
  private mapConfidenceToCertainty(confidence: number): 
    'definite' | 'high' | 'moderate' | 'low' | 'speculative' {
    if (confidence >= 0.9) return 'definite';
    if (confidence >= 0.75) return 'high';
    if (confidence >= 0.5) return 'moderate';
    if (confidence >= 0.3) return 'low';
    return 'speculative';
  }
  
  /**
   * Enrichit une pensée existante avec des attributs sémantiques pour ses connexions
   * 
   * @param thoughtId L'ID de la pensée à enrichir
   * @returns Le nombre de connexions enrichies
   */
  enrichThoughtConnections(thoughtId: string): number {
    const thought = this.getThought(thoughtId);
    if (!thought) return 0;
    
    let enrichedCount = 0;
    
    for (const connection of thought.connections) {
      // Ignorer les connexions déjà enrichies
      if (connection.attributes) continue;
      
      const targetThought = this.getThought(connection.targetId);
      if (!targetThought) continue;
      
      // Enrichir avec des attributs sémantiques inférés du contexte
      connection.attributes = this.inferConnectionAttributes(thought, targetThought, connection.type);
      enrichedCount++;
    }
    
    return enrichedCount;
  }
  
  /**
   * Infère des attributs sémantiques pour une connexion
   * 
   * @param sourceThought La pensée source
   * @param targetThought La pensée cible
   * @param type Le type de connexion
   * @returns Les attributs sémantiques inférés
   */
  private inferConnectionAttributes(
    sourceThought: ThoughtNode,
    targetThought: ThoughtNode,
    type: ConnectionType
  ): ConnectionAttributes {
    const attributes: ConnectionAttributes = {};
    
    // Inférer la temporalité
    if (sourceThought.timestamp < targetThought.timestamp) {
      attributes.temporality = 'before';
    } else {
      attributes.temporality = 'after';
    }
    
    // Inférer la nature
    switch (type) {
      case 'supports':
      case 'contradicts':
        attributes.nature = 'associative';
        break;
      case 'derives':
      case 'refines':
        attributes.nature = 'hierarchical';
        break;
      case 'branches':
        attributes.nature = 'sequential';
        break;
      case 'analyzes':
      case 'evaluates':
        attributes.nature = 'causal';
        break;
      case 'exemplifies':
      case 'generalizes':
        attributes.nature = 'hierarchical';
        break;
      default:
        attributes.nature = 'associative';
    }
    
    // Inférer la directionnalité
    if (['associates', 'compares', 'contrasts'].includes(type)) {
      attributes.directionality = 'bidirectional';
    } else {
      attributes.directionality = 'unidirectional';
    }
    
    return attributes;
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
    
    // Vérifier si des hyperliens ont été créés
    const hasHyperlinks = this.hyperlinks.size > 0;
    if (hasHyperlinks) {
      suggestions.push({
        description: "Explorez les relations complexes identifiées dans les clusters de pensées",
        type: 'meta',
        confidence: 0.8,
        reasoning: "L'analyse des relations multi-nœuds peut révéler des insights cachés"
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
   * Met à jour le contenu d'une pensée existante
   * 
   * @param id L'identifiant de la pensée à mettre à jour
   * @param newContent Le nouveau contenu de la pensée
   * @returns true si la mise à jour a réussi, false sinon
   */
  updateThoughtContent(id: string, newContent: string): boolean {
    const thought = this.nodes.get(id);
    if (!thought) return false;
    
    const oldContent = thought.content;
    thought.content = newContent;
    thought.metadata.lastUpdated = new Date();
    
    // Émettre un événement pour notifier de la mise à jour d'une pensée
    this.eventEmitter.emit('thought-updated', id, thought, { oldContent });
    
    // Vérifier automatiquement les calculs si nécessaire
    this.checkForCalculationsAndVerify(id, newContent);
    
    return true;
  }
  
  /**
   * Efface toutes les pensées du graphe
   */
  clear(): void {
    this.nodes.clear();
    this.hyperlinks.clear();
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
   * Exporte le graphe enrichi (nœuds et hyperliens) sous forme de JSON
   * 
   * @returns Une représentation JSON du graphe enrichi
   */
  exportEnrichedGraph(): string {
    const exportData = {
      nodes: Array.from(this.nodes.values()),
      hyperlinks: Array.from(this.hyperlinks.values())
    };
    
    return JSON.stringify(exportData);
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
  
  /**
   * Importe un graphe enrichi depuis un JSON
   * 
   * @param json Le JSON à importer
   * @returns true si l'importation a réussi, false sinon
   */
  importEnrichedGraph(json: string): boolean {
    try {
      const data = JSON.parse(json);
      
      // Importer les nœuds
      if (Array.isArray(data.nodes)) {
        this.clear();
        
        for (const node of data.nodes) {
          this.nodes.set(node.id, {
            ...node,
            timestamp: new Date(node.timestamp)
          });
        }
      }
      
      // Importer les hyperliens
      if (Array.isArray(data.hyperlinks)) {
        this.hyperlinks.clear();
        
        for (const hyperlink of data.hyperlinks) {
          this.hyperlinks.set(hyperlink.id, hyperlink);
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erreur lors de l\'importation du graphe enrichi:', error);
      return false;
    }
  }
}