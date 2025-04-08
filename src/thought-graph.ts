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
import { callInternalLlm } from './utils/openrouter-client'; // Import LLM utility

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
      connections: [...connections], // Ensure a copy is made
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

    // Vérifier automatiquement les calculs si nécessaire (async, but don't wait for it)
    this.checkForCalculationsAndVerify(id, content).catch(err => {
        console.error("Error during background calculation check:", err);
    });

    // Calculate metrics asynchronously after adding the thought (don't block return)
    this.updateMetricsForThought(id).catch(err => {
        console.error(`Error during background metric calculation for ${id}:`, err);
    });


    return id;
  }

  /**
   * Met à jour les métriques pour une pensée spécifique (maintenant asynchrone)
   * @param thoughtId L'ID de la pensée
   */
  async updateMetricsForThought(thoughtId: string): Promise<void> {
      if (!this.qualityEvaluator) {
          console.warn("QualityEvaluator not available for metric update.");
          return;
      }
      const thought = this.getThought(thoughtId);
      if (!thought) return;

      try {
          const metrics = await this.qualityEvaluator.evaluate(thoughtId, this);
          this.updateThoughtMetrics(thoughtId, metrics);
          this.eventEmitter.emit('metrics-updated', thoughtId, metrics);
      } catch (error) {
          console.error(`Failed to update metrics for thought ${thoughtId}:`, error);
      }
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
        // Avoid adding duplicate reciprocal connections if one already exists
        const existingReciprocal = targetNode.connections.find(conn => conn.targetId === sourceId);
        if (!existingReciprocal) {
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
  }

  /**
   * Détermine le type de connexion réciproque
   *
   * @param type Le type de connexion original
   * @returns Le type de connexion réciproque
   */
  private getReciprocalConnectionType(type: ConnectionType): ConnectionType {
    // Mapping for reciprocal types
    const reciprocalMap: Partial<Record<ConnectionType, ConnectionType>> = {
        supports: 'supports',
        contradicts: 'contradicts',
        refines: 'derives', // If A refines B, B derives from A
        derives: 'refines', // If A derives from B, B refines A
        branches: 'branches',
        associates: 'associates',
        exemplifies: 'generalizes', // If A exemplifies B, B generalizes A
        generalizes: 'exemplifies', // If A generalizes B, B exemplifies A
        compares: 'compares',
        contrasts: 'contrasts',
        questions: 'questions', // Questioning can be reciprocal
        extends: 'extended-by',
        analyzes: 'analyzed-by',
        synthesizes: 'component-of', // If A synthesizes B, B is a component of A
        applies: 'applied-by',
        evaluates: 'evaluated-by',
        cites: 'cited-by',
        'extended-by': 'extends',
        'analyzed-by': 'analyzes',
        'component-of': 'synthesizes',
        'applied-by': 'applies',
        'evaluated-by': 'evaluates',
        'cited-by': 'cites'
    };
    return reciprocalMap[type] || 'associates'; // Default to 'associates'
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

    // Ensure metrics object exists
    if (!thought.metrics) {
        thought.metrics = { confidence: 0.5, relevance: 0.5, quality: 0.5 };
    }

    thought.metrics = {
      ...thought.metrics,
      ...metrics
    };

    return true;
  }

  /**
   * Récupère toutes les pensées
   *
   * @param sessionId L'identifiant de session facultatif pour filtrer les pensées
   * @returns Un tableau de toutes les pensées (filtrées par session si sessionId est fourni)
   */
  getAllThoughts(sessionId?: string): ThoughtNode[] {
    const allNodes = Array.from(this.nodes.values());
    if (!sessionId) {
        // Maybe return only thoughts from the graph's default session? Or all?
        // For now, let's return all if no session specified, but log a warning.
        // console.warn("getAllThoughts called without sessionId, returning all thoughts.");
        return allNodes;
    }
    return allNodes.filter(node => node.metadata?.sessionId === sessionId);
  }

  /**
   * Récupère les pensées les plus récentes
   *
   * @param limit Le nombre maximum de pensées à récupérer
   * @param sessionId L'identifiant de session facultatif pour filtrer les pensées
   * @returns Un tableau des pensées les plus récentes (filtrées par session)
   */
  getRecentThoughts(limit: number = 5, sessionId?: string): ThoughtNode[] {
    const thoughts = this.getAllThoughts(sessionId); // Use the session-filtered list
    return thoughts
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
   * @param sessionId L'identifiant de session facultatif pour filtrer les pensées
   * @returns Un tableau des pensées les plus pertinentes (filtrées par session)
   */
  async getRelevantThoughts(context: string, limit: number = 5, sessionId?: string): Promise<ThoughtNode[]> {
    const allThoughts = this.getAllThoughts(sessionId); // Use the session-filtered list

    // Si pas de pensées ou pas de service d'embeddings, utiliser l'algorithme de base
    if (allThoughts.length === 0 || !this.embeddingService) {
      console.warn("Embedding service not available or no thoughts in graph. Falling back to keyword relevance.");
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
    if (contextWords.length === 0) return []; // Avoid division by zero if context is empty

    return Array.from(this.nodes.values())
      .map(thought => {
        const thoughtWords = thought.content.toLowerCase().split(/\W+/).filter(word => word.length > 3);

        // Calculer un score simple basé sur le nombre de mots partagés
        const matchingWords = contextWords.filter(word => thoughtWords.includes(word));
        const score = matchingWords.length / contextWords.length; // Normalize by context length

        return {
          thought,
          score
        };
      })
      .filter(item => item.score > 0) // Only keep thoughts with some relevance
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
    const id = `hl-${this.generateUniqueId()}`; // Prefix for clarity

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
   * @param sessionId L'identifiant de session facultatif pour filtrer les hyperliens
   * @returns Un tableau de tous les hyperliens (filtrés par session)
   */
  getAllHyperlinks(sessionId?: string): Hyperlink[] {
    const allLinks = Array.from(this.hyperlinks.values());
     if (!sessionId) {
        // console.warn("getAllHyperlinks called without sessionId, returning all hyperlinks.");
        return allLinks;
    }
    return allLinks.filter(link => link.metadata?.sessionId === sessionId);
  }

  /**
   * Récupère les hyperliens impliquant une pensée spécifique
   *
   * @param thoughtId L'identifiant de la pensée
   * @param sessionId L'identifiant de session facultatif pour filtrer les hyperliens
   * @returns Un tableau des hyperliens impliquant cette pensée (filtrés par session)
   */
  getHyperlinksForThought(thoughtId: string, sessionId?: string): Hyperlink[] {
    const thought = this.getThought(thoughtId);
    // Ensure the thought itself belongs to the requested session if provided
    if (!thought || (sessionId && thought.metadata?.sessionId !== sessionId)) {
        return [];
    }

    const allLinks = this.getAllHyperlinks(sessionId); // Get session-filtered links
    return allLinks.filter(hyperlink => hyperlink.nodeIds.includes(thoughtId));
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
    const thoughtIds = thoughts.map(t => t.id);

    // Get embeddings for all thoughts (potentially batch this if service supports it)
    let embeddings: number[][] = [];
    try {
        embeddings = await this.embeddingService.getEmbeddings(thoughtTexts);
        if (embeddings.length !== thoughts.length) {
             console.error("Mismatch between number of thoughts and embeddings received.");
             return 0;
        }
    } catch (error) {
        console.error("Failed to get embeddings for similarity inference:", error);
        return 0;
    }


    // Calculer les similarités entre toutes les paires de pensées
    for (let i = 0; i < thoughts.length; i++) {
      const sourceThought = thoughts[i];
      const sourceEmbedding = embeddings[i];

      for (let j = i + 1; j < thoughts.length; j++) {
          const targetThought = thoughts[j];
          const targetEmbedding = embeddings[j];

          const similarityScore = this.embeddingService.calculateCosineSimilarity(sourceEmbedding, targetEmbedding);

          if (similarityScore >= confidenceThreshold) {
              // Éviter les doublons
              const hasConnection = sourceThought.connections.some(
                conn => conn.targetId === targetThought.id
              );
              const hasReciprocalConnection = targetThought.connections.some(
                  conn => conn.targetId === sourceThought.id
              );

              if (!hasConnection && !hasReciprocalConnection) {
                // Déterminer le type de connexion en fonction du contexte
                const connectionType = this.inferConnectionType(sourceThought, targetThought);

                // Ajouter la nouvelle connexion
                this.addInferredConnection(
                  sourceThought.id,
                  targetThought.id,
                  connectionType,
                  similarityScore // Use the calculated similarity as confidence
                );

                newRelationsCount++;
              }
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
      // Si A dérive de B et B dérive de C, alors A dérive de C
      'derives': [
          {
              firstType: 'derives',
              secondType: 'derives',
              resultType: 'derives',
              confidenceMultiplier: 0.9
          }
      ]
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
             const hasReciprocalConnection = thirdThought.connections.some(
                 c => c.targetId === thought.id
             );

            if (!hasConnection && !hasReciprocalConnection) {
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
          // Check if hyperlink already exists for this cluster
          const existingHyperlink = Array.from(this.hyperlinks.values()).find(hl =>
              hl.nodeIds.length === cluster.nodeIds.length &&
              hl.nodeIds.every(id => cluster.nodeIds.includes(id))
          );

          if (!existingHyperlink) {
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
              newRelationsCount++; // Count hyperlink creation
          }
        }

        // Également, inférer des relations individuelles entre les membres du cluster
        for (let i = 0; i < cluster.nodeIds.length; i++) {
          for (let j = i + 1; j < cluster.nodeIds.length; j++) {
            const thought1 = this.getThought(cluster.nodeIds[i]);
            const thought2 = this.getThought(cluster.nodeIds[j]);

            if (!thought1 || !thought2) continue;

            // Vérifier si une connexion existe déjà dans les deux sens
            const hasConnection = thought1.connections.some(
              conn => conn.targetId === thought2.id
            );
             const hasReciprocalConnection = thought2.connections.some(
                 conn => conn.targetId === thought1.id
             );

            if (!hasConnection && !hasReciprocalConnection) {
              // La confiance est basée sur la cohésion du cluster
              const confidence = cluster.cohesion * 0.9; // Slightly lower confidence than cluster itself

              if (confidence >= confidenceThreshold) {
                this.addInferredConnection(
                  thought1.id,
                  thought2.id,
                  'associates', // Assume association within cluster
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
    const internalEdges = new Set<string>(); // Track internal edges to calculate cohesion

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      communityNodes.push(currentId);

      const thought = this.getThought(currentId);
      if (!thought) continue;

      // Évaluer les connexions
      for (const conn of thought.connections) {
        // Check if the target is part of the potential community (already visited or in queue)
        const targetInCommunity = visited.has(conn.targetId) || queue.includes(conn.targetId);

        if (!visited.has(conn.targetId) && conn.strength > 0.5) { // Threshold for exploring
          queue.push(conn.targetId);
        }
        // If the connection is internal to the community being explored
        if (targetInCommunity) {
             const edgeId = [currentId, conn.targetId].sort().join('-'); // Unique ID for undirected edge
             if (!internalEdges.has(edgeId)) {
                 connectivityScores.push(conn.strength);
                 internalEdges.add(edgeId);
             }
        }
      }
    }

    // Calculer la cohésion du cluster basée sur la force moyenne des connexions internes
    const avgConnectivity = connectivityScores.length > 0
      ? connectivityScores.reduce((sum, score) => sum + score, 0) / connectivityScores.length
      : 0;

    // Basic labeling (e.g., based on most frequent keywords in the cluster) - can be enhanced
    let label: string | undefined = undefined;
    if (communityNodes.length > 0) {
        const clusterContent = communityNodes.map(id => this.getThought(id)?.content || "").join(" ");
        // Simple keyword extraction for label (replace with more sophisticated method if needed)
        const words = clusterContent.toLowerCase().split(/\W+/).filter(w => w.length > 4);
        const wordCounts: { [key: string]: number } = {};
        words.forEach(w => { wordCounts[w] = (wordCounts[w] || 0) + 1; });
        const sortedWords = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]);
        if (sortedWords.length > 0) {
            label = sortedWords[0][0];
        }
    }


    return {
      nodeIds: communityNodes,
      label: label,
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
      'contredit', 'différent', 'désaccord', 'conteste', 'au contraire', 'inversement'
    ];

    if (contradictionMarkers.some(marker =>
      sourceContent.includes(marker) || targetContent.includes(marker)
    )) {
      return 'contradicts';
    }

    // Recherche de mots-clés indiquant un support
    const supportMarkers = [
      'confirme', 'soutient', 'renforce', 'valide', 'appuie',
      'corrobore', 'accord', 'similaire', 'également', 'aussi', 'de même'
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
      strength: confidence, // Use confidence as strength for inferred connections
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
      'associates', 'compares', 'contrasts', 'supports', 'contradicts' // Added supports/contradicts as often reciprocal
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
      // Ignorer les connexions déjà enrichies ou inférées (qui ont déjà des attributs)
      if (connection.attributes || connection.inferred) continue;

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
    } else if (sourceThought.timestamp > targetThought.timestamp) {
      attributes.temporality = 'after';
    } else {
        attributes.temporality = 'concurrent';
    }


    // Inférer la nature
    switch (type) {
      case 'supports':
      case 'contradicts':
        attributes.nature = 'associative'; // Could be causal/correlational depending on content
        break;
      case 'derives':
      case 'refines':
      case 'generalizes':
      case 'exemplifies':
      case 'component-of':
      case 'synthesizes':
        attributes.nature = 'hierarchical';
        break;
      case 'branches':
        attributes.nature = 'sequential';
        break;
      case 'analyzes':
      case 'evaluates':
      case 'applies':
        attributes.nature = 'causal'; // Often implies causality or application
        break;
      default:
        attributes.nature = 'associative';
    }

    // Inférer la directionnalité
    if (this.shouldCreateReciprocalConnection(type)) {
      attributes.directionality = 'bidirectional';
    } else {
      attributes.directionality = 'unidirectional';
    }

    // Inférer la portée (simple heuristic)
    const sourceLength = sourceThought.content.length;
    const targetLength = targetThought.content.length;
    if (Math.abs(sourceLength - targetLength) < 50) {
        attributes.scope = 'specific';
    } else if (sourceLength > targetLength * 1.5 || targetLength > sourceLength * 1.5) {
        attributes.scope = 'broad'; // One thought is much broader/narrower
    } else {
        attributes.scope = 'partial';
    }


    return attributes;
  }

  /**
   * Suggère les prochaines étapes de raisonnement, potentiellement en utilisant le LLM.
   *
   * @param limit Le nombre maximum de suggestions
   * @param sessionId L'identifiant de session facultatif pour filtrer le contexte
   * @returns Une promesse résolvant vers un tableau de suggestions pour les prochaines étapes
   */
  async suggestNextSteps(limit: number = 3, sessionId?: string): Promise<NextStepSuggestion[]> {
    // Use session-specific thoughts for context
    const sessionThoughts = this.getAllThoughts(sessionId);
    if (sessionThoughts.length === 0) {
      // Suggest starting only if the specific session is empty
      return [{
        description: "Commencez par définir le problème ou la question à explorer dans cette session",
        type: 'regular',
        confidence: 0.9,
        reasoning: "Une définition claire du problème est essentielle pour un raisonnement efficace"
      }];
    }

    // Use session-specific recent thoughts
    const recentThoughts = this.getRecentThoughts(5, sessionId);
    const recentThoughtsSummary = recentThoughts.map(t => `[${t.type}] ${t.content.substring(0, 100)}...`).join('\n');
    const graphStateSummary = `Session thoughts: ${sessionThoughts.length}. Recent session thoughts:\n${recentThoughtsSummary}`;

    // --- Tentative de suggestion via LLM ---
    let llmSuggestions: NextStepSuggestion[] | null = null;
    try {
        const systemPrompt = `You are an AI assistant guiding a reasoning process. Based on the current state of the thought graph (summary provided), suggest ${limit} logical and relevant next steps. Focus on actions that advance the reasoning, resolve issues, or explore new angles. Suggest concrete actions like 'Formulate a hypothesis', 'Verify claim X', 'Analyze contradiction Y', 'Synthesize findings', 'Explore alternative Z', 'Refine thought ID W'. Respond ONLY with a valid JSON array of objects, each object having "description" (string, the suggested step) and "type" (string, one of: regular, meta, hypothesis, conclusion, revision).`;
        const userPrompt = `Current graph state:\n${graphStateSummary}\n\nSuggest the top ${limit} next steps in JSON array format:`;

        const llmResponse = await callInternalLlm(systemPrompt, userPrompt, 250);

        if (llmResponse) {
             // Tentative de nettoyage de la réponse LLM pour extraire le JSON
            const jsonMatch = llmResponse.match(/\[\s*\{[\s\S]*\}\s*\]/);
             if (jsonMatch) {
                const jsonString = jsonMatch[0];
                try {
                    const parsedSuggestions = JSON.parse(jsonString);
                    if (Array.isArray(parsedSuggestions) && parsedSuggestions.length > 0) {
                        const validatedSuggestions: NextStepSuggestion[] = [];
                        for (const suggestion of parsedSuggestions) {
                            if (suggestion && typeof suggestion.description === 'string' && typeof suggestion.type === 'string' &&
                                ['regular', 'meta', 'hypothesis', 'conclusion', 'revision'].includes(suggestion.type)) {
                                validatedSuggestions.push({
                                    description: suggestion.description,
                                    type: suggestion.type as ThoughtType,
                                    confidence: 0.8, // Assign a default high confidence for LLM suggestions
                                    reasoning: "Suggested by internal LLM based on graph state."
                                });
                                if (validatedSuggestions.length >= limit) break;
                            } else {
                                console.warn(`LLM next step suggestion item has invalid format: ${JSON.stringify(suggestion)}`);
                            }
                        }
                         if (validatedSuggestions.length > 0) {
                            console.error(`Smart-Thinking: Suggestions de prochaines étapes fournies par le LLM interne.`);
                            llmSuggestions = validatedSuggestions;
                         }
                    }
                } catch (parseError) {
                    console.warn(`LLM next step suggestion response was not valid JSON: ${llmResponse}`, parseError);
                }
            } else {
                 console.warn(`Could not extract JSON array from LLM response for next steps: ${llmResponse}`);
            }
        }
    } catch (llmError) {
        console.error('Error calling LLM for next step suggestion:', llmError);
    }

     // Si le LLM a fourni des suggestions valides, les retourner
    if (llmSuggestions && llmSuggestions.length > 0) {
        return llmSuggestions;
    }

    // --- Repli (Fallback) vers l'heuristique si le LLM échoue ---
    console.warn("LLM next step suggestion failed or returned no valid suggestions. Falling back to heuristic method.");
    return this.suggestNextStepsHeuristic(limit);
  }


  /**
   * Méthode heuristique originale pour suggérer les prochaines étapes (filtrée par session).
   */
  private suggestNextStepsHeuristic(limit: number = 3, sessionId?: string): NextStepSuggestion[] {
     // Use session-specific thoughts
     const sessionThoughts = this.getAllThoughts(sessionId);
     if (sessionThoughts.length === 0) {
       return [{
         description: "Commencez par définir le problème ou la question à explorer dans cette session",
         type: 'regular',
         confidence: 0.9,
         reasoning: "Une définition claire du problème est essentielle pour un raisonnement efficace"
       }];
     }

     const suggestions: NextStepSuggestion[] = [];
     // Use session-specific recent thoughts
     const recentThoughts = this.getRecentThoughts(3, sessionId);
     const recentContent = recentThoughts.map(t => t.content).join(' ');

     // Analyser le contenu récent pour détecter des besoins spécifiques
     const needsFactChecking = this.containsAny(recentContent.toLowerCase(),
       ['vérifier', 'confirmer', 'source', 'preuve', 'statistique', 'données', 'affirme', 'selon'])
     const needsCalculation = this.containsAny(recentContent.toLowerCase(),
       ['calculer', 'calcul', 'équation', 'résoudre', 'chiffre', 'formule', 'mathématique'])
     const needsExternalInfo = this.containsAny(recentContent.toLowerCase(),
       ['chercher', 'information', 'recherche', 'trouver', 'données', 'référence', 'source', 'actualité'])
     const containsUncertainty = this.containsAny(recentContent.toLowerCase(),
       ['peut-être', 'probablement', 'semble', 'possible', 'hypothèse', 'incertain', 'pourrait'])

     // Suggestions basées sur les besoins détectés
     if (needsFactChecking) {
       suggestions.push({
         description: "Vérifiez les informations avec une recherche web",
         type: 'regular',
         confidence: 0.9,
         reasoning: "Utilisez l'outil perplexity_search_web ou tavily-search pour confirmer les faits mentionnés"
       });
     }

     if (needsCalculation) {
       suggestions.push({
         description: "Exécutez du code pour effectuer les calculs nécessaires",
         type: 'regular',
         confidence: 0.85,
         reasoning: "Utilisez l'outil executePython ou executeJavaScript pour résoudre les calculs ou équations"
       });
     }

     if (needsExternalInfo) {
       suggestions.push({
         description: "Recherchez des informations supplémentaires en ligne",
         type: 'regular',
         confidence: 0.9,
         reasoning: "Utilisez les outils de recherche web pour enrichir votre analyse avec des données pertinentes"
       });
     }

     // Check for contradictions within the session
     const hasContradictions = sessionThoughts.some(thought =>
       thought.connections.some(conn => {
           // Check if the connected thought also belongs to the session
           const targetThought = this.getThought(conn.targetId);
           return conn.type === 'contradicts' && targetThought?.metadata?.sessionId === sessionId;
       })
     );

     if (hasContradictions) {
       suggestions.push({
         description: "Résolvez les contradictions en consultant des sources fiables",
         type: 'meta',
         confidence: 0.85,
         reasoning: "Utilisez tavily-search ou perplexity_search_web pour vérifier quelle position est correcte"
       });
     }

     // Suggestion pour extraire du contenu web si des URL sont mentionnées
     const containsUrl = /https?:\/\/[^\s]+/.test(recentContent);
     if (containsUrl) {
       suggestions.push({
         description: "Extrayez et analysez le contenu des URL mentionnées",
         type: 'regular',
         confidence: 0.85,
         reasoning: "Utilisez l'outil tavily-extract pour analyser en profondeur le contenu des pages web"
       });
     }

     // Check for meta thoughts within the session
     const hasMeta = sessionThoughts.some(thought => thought.type === 'meta');
     if (sessionThoughts.length >= 5 && !hasMeta && suggestions.length < limit) {
       suggestions.push({
         description: "Faites une méta-réflexion sur votre approche dans cette session",
         type: 'meta',
         confidence: 0.7,
         reasoning: "La méta-cognition peut améliorer la qualité du raisonnement"
       });
     }

     // Check for hypothesis within the session
     const hasHypothesis = sessionThoughts.some(thought => thought.type === 'hypothesis');
     if (((sessionThoughts.length >= 3 && !hasHypothesis) || containsUncertainty) && suggestions.length < limit) {
       suggestions.push({
         description: "Formulez une hypothèse basée sur vos observations dans cette session",
         type: 'hypothesis',
         confidence: 0.75,
         reasoning: "Une hypothèse claire peut guider la suite de votre raisonnement"
       });
     }

     // Check for conclusion within the session
     const hasConclusion = sessionThoughts.some(thought => thought.type === 'conclusion');
     if (sessionThoughts.length >= 7 && !hasConclusion && suggestions.length < limit) {
       suggestions.push({
         description: "Rédigez une conclusion provisoire basée sur votre analyse dans cette session",
         type: 'conclusion',
         confidence: 0.8,
         reasoning: "Même provisoire, une conclusion peut aider à synthétiser votre réflexion"
       });
     }

     // Check for hyperlinks within the session
     const sessionHyperlinks = this.getAllHyperlinks(sessionId);
     if (sessionHyperlinks.length > 0 && suggestions.length < limit) {
       suggestions.push({
         description: "Explorez les relations complexes identifiées dans les clusters de pensées de cette session",
         type: 'meta',
         confidence: 0.8,
         reasoning: "L'analyse des relations multi-nœuds peut révéler des insights cachés"
       });
     }

     // Si aucune suggestion spécifique n'a été faite, proposer une continuation simple
     if (suggestions.length === 0) {
       suggestions.push({
         description: "Continuez votre raisonnement en développant vos idées actuelles",
         type: 'regular',
         confidence: 0.6,
         reasoning: "Approfondir les pensées existantes peut révéler de nouvelles perspectives"
       });
     }

     // Assurer de ne pas dépasser la limite
     return suggestions.slice(0, limit);
  }


  /**
   * Vérifie si un texte contient l'un des termes donnés
   *
   * @param text Le texte à vérifier
   * @param terms Les termes à rechercher
   * @returns true si le texte contient au moins un des termes, false sinon
   */
  private containsAny(text: string, terms: string[]): boolean {
    // Optimisation: créer une regex unique pour tous les termes
    const regex = new RegExp(`\\b(${terms.join('|')})\\b`, 'i');
    return regex.test(text);
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
    // Reset verification status on content update? Maybe optional.
    // thought.metadata.isVerified = false;
    // thought.metadata.verificationSource = undefined;
    // thought.metadata.verificationTimestamp = undefined;

    // Émettre un événement pour notifier de la mise à jour d'une pensée
    this.eventEmitter.emit('thought-updated', id, thought, { oldContent });

    // Vérifier automatiquement les calculs si nécessaire (async, but don't wait)
    this.checkForCalculationsAndVerify(id, newContent).catch(err => {
        console.error("Error during background calculation check:", err);
    });
     // Recalculate metrics asynchronously (don't wait)
    this.updateMetricsForThought(id).catch(err => {
        console.error(`Error during background metric calculation for ${id}:`, err);
    });


    return true;
  }

  /**
   * Efface toutes les pensées du graphe
   */
  clear(): void {
    this.nodes.clear();
    this.hyperlinks.clear();
    // Peut-être aussi effacer les caches associés si nécessaire
  }

  /**
   * Exporte le graphe de pensées sous forme de JSON
   *
   * @returns Une représentation JSON du graphe
   */
  exportToJson(): string {
    // Convert Map values to array for JSON stringification
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

    // Use replacer function to handle Date objects correctly
    return JSON.stringify(exportData, (key, value) => {
        if (value instanceof Date) {
            return value.toISOString();
        }
        return value;
    });
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
        // Rehydrate Date objects
        if (node.timestamp) node.timestamp = new Date(node.timestamp);
        if (node.metadata?.lastUpdated) node.metadata.lastUpdated = new Date(node.metadata.lastUpdated);
        if (node.metadata?.verificationTimestamp) node.metadata.verificationTimestamp = new Date(node.metadata.verificationTimestamp);

        this.nodes.set(node.id, node);
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
        this.clear(); // Clear existing graph data

        for (const node of data.nodes) {
           // Rehydrate Date objects
           if (node.timestamp) node.timestamp = new Date(node.timestamp);
           if (node.metadata?.lastUpdated) node.metadata.lastUpdated = new Date(node.metadata.lastUpdated);
           if (node.metadata?.verificationTimestamp) node.metadata.verificationTimestamp = new Date(node.metadata.verificationTimestamp);
           if (node.metadata?.createdAt) node.metadata.createdAt = new Date(node.metadata.createdAt); // For hyperlinks metadata

          this.nodes.set(node.id, node);
        }
      }

      // Importer les hyperliens
      if (Array.isArray(data.hyperlinks)) {
        this.hyperlinks.clear();

        for (const hyperlink of data.hyperlinks) {
           // Rehydrate Date objects in metadata
           if (hyperlink.metadata?.createdAt) hyperlink.metadata.createdAt = new Date(hyperlink.metadata.createdAt);

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
