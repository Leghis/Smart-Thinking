import { ThoughtMetrics, ThoughtNode, VerificationStatus, VerificationResult } from './types';
import { ThoughtGraph } from './thought-graph';
import { MetricsCalculator } from './metrics-calculator';
import { VerificationConfig, SystemConfig } from './config';
import { IVerificationService } from './services/verification-service.interface';
import { ServiceContainer } from './services/service-container';

/**
 * Classe qui évalue la qualité des pensées
 * Utilise le service de vérification centralisé pour toutes les fonctionnalités de vérification
 * Version optimisée avec mise en cache et structures de données efficaces
 */
export class QualityEvaluator {
  private verificationService!: IVerificationService; // L'opérateur ! indique que la propriété sera initialisée après la construction
  public metricsCalculator: MetricsCalculator;
  
  // Caches pour les résultats d'évaluation et les détections de biais
  private evaluationCache: Map<string, ThoughtMetrics> = new Map();
  private biasCache: Map<string, Array<{type: string, score: number, description: string}>> = new Map();
  private suggestionCache: Map<string, string[]> = new Map();
  
  // Expressions régulières pré-compilées pour la détection de biais
  private readonly biasPatterns = [
    {
      regex: /\b(comme je l'ai dit|comme je le pensais|tel que mentionné)\b/i,
      type: "confirmation_bias",
      score: 0.7,
      description: "Tend à confirmer des croyances existantes"
    },
    {
      regex: /\b(récemment|dernièrement|ces derniers temps)\b/i,
      type: "recency_bias",
      score: 0.6,
      description: "Accorde trop d'importance aux événements récents"
    },
    {
      regex: /\b(tous|toujours|jamais|aucun|systématiquement|sans exception)\b/i,
      type: "absolutism_bias",
      score: 0.65,
      description: "Utilise des généralisations absolues"
    },
    {
      regex: /\b(évident|évidemment|clairement|bien sûr|naturellement|sans doute)\b/i,
      type: "certainty_bias",
      score: 0.6,
      description: "Présente comme certain ce qui est discutable"
    }
  ];
  
  // Mappage pour les suggestions d'amélioration
  private readonly suggestionMappings = [
    {
      condition: (metrics: ThoughtMetrics) => metrics.confidence < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE,
      suggestions: [
        'Renforcez l\'argumentation avec des preuves ou des références précises.',
        'Évitez les modalisateurs d\'incertitude excessive ("peut-être", "probablement").'
      ]
    },
    {
      condition: (metrics: ThoughtMetrics) => metrics.relevance < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE,
      suggestions: [
        'Clarifiez le lien avec le contexte ou le sujet principal.'
      ]
    },
    {
      condition: (metrics: ThoughtMetrics) => metrics.quality < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE,
      suggestions: [
        'Améliorez la structure et la clarté de cette pensée.'
      ]
    }
  ];
  
  // Mappage pour les suggestions spécifiques au type de pensée
  private readonly typeSuggestionMap: Record<string, Array<{ condition: (thought: ThoughtNode, connectedThoughts: ThoughtNode[]) => boolean, suggestion: string }>> = {
    'hypothesis': [
      {
        condition: (thought) => !thought.content.toLowerCase().includes('si'),
        suggestion: 'Formulez l\'hypothèse sous forme conditionnelle (si... alors...).'
      }
    ],
    'conclusion': [
      {
        condition: (thought, connectedThoughts) => connectedThoughts.length < 2,
        suggestion: 'Une conclusion devrait synthétiser plusieurs pensées précédentes.'
      }
    ],
    'revision': [
      {
        condition: (thought, connectedThoughts) => !connectedThoughts.some(t => 
          thought.connections.some(conn => conn.targetId === t.id && 
          ['refines', 'contradicts', 'supports'].includes(conn.type))),
        suggestion: 'Une révision devrait clairement indiquer ce qu\'elle raffine ou corrige.'
      }
    ]
  };
  
  constructor() {
    this.metricsCalculator = new MetricsCalculator();
    // L'initialisation du verificationService se fera via setVerificationService
  }
  
  /**
   * Définit le service de vérification à utiliser
   * 
   * @param verificationService Le service de vérification
   */
  public setVerificationService(verificationService: IVerificationService): void {
    this.verificationService = verificationService;
  }
  
  /**
   * Obtient le service de vérification depuis le conteneur si nécessaire
   * @returns Le service de vérification
   */
  private getVerificationService(): IVerificationService {
    if (!this.verificationService) {
      this.verificationService = ServiceContainer.getInstance().getVerificationService();
    }
    return this.verificationService;
  }
  
  /**
   * Crée une clé unique pour le cache
   * 
   * @param thoughtId L'identifiant de la pensée
   * @param contextId Un identifiant supplémentaire pour le contexte (comme l'ID de graphe)
   * @returns Une clé unique pour le cache
   */
  private createCacheKey(thoughtId: string, contextId?: string): string {
    return contextId ? `${thoughtId}:${contextId}` : thoughtId;
  }
  
  /**
   * Évalue la qualité d'une pensée avec mise en cache pour améliorer les performances
   * 
   * @param thoughtId L'identifiant de la pensée à évaluer
   * @param thoughtGraph Le graphe de pensées contenant la pensée
   * @returns Les métriques de qualité évaluées
   */
  evaluate(thoughtId: string, thoughtGraph: ThoughtGraph): ThoughtMetrics {
    // Créer une clé de cache unique basée sur l'ID de la pensée et une représentation unique du graphe
    // Utilisons l'ID de la pensée comme identifiant primaire puisque c'est unique par graphe
    const cacheKey = this.createCacheKey(thoughtId);
    
    // Vérifier si le résultat est déjà en cache
    const cachedMetrics = this.evaluationCache.get(cacheKey);
    if (cachedMetrics) {
      return { ...cachedMetrics };  // Retourner une copie pour éviter la mutation
    }
    
    const thought = thoughtGraph.getThought(thoughtId);
    
    if (!thought) {
      return {
        confidence: 0.5,
        relevance: 0.5,
        quality: 0.5
      };
    }
    
    // Récupérer les pensées connectées pour le contexte
    const connectedThoughts = thoughtGraph.getConnectedThoughts(thoughtId);
    
    // Utiliser le calculateur de métriques pour obtenir des valeurs plus précises
    const confidence = this.metricsCalculator.calculateConfidence(thought);
    const relevance = this.metricsCalculator.calculateRelevance(thought, connectedThoughts);
    const quality = this.metricsCalculator.calculateQuality(thought, connectedThoughts);
    
    const metrics = {
      confidence,
      relevance,
      quality
    };
    
    // Mettre en cache le résultat
    this.evaluationCache.set(cacheKey, { ...metrics });
    
    return metrics;
  }

  /**
   * Méthode de délégation pour performPreliminaryVerification
   */
  public async performPreliminaryVerification(thought: string, explicitlyRequested: boolean = false) {
    return this.getVerificationService().performPreliminaryVerification(thought, explicitlyRequested);
  }
  
  /**
   * Méthode de délégation pour checkPreviousVerification
   */
  public async checkPreviousVerification(thoughtContent: string, sessionId: string = SystemConfig.DEFAULT_SESSION_ID) {
    return this.getVerificationService().checkPreviousVerification(thoughtContent, sessionId);
  }
  
  /**
   * Méthode de délégation pour deepVerify
   */
  public async deepVerify(
    thought: ThoughtNode, 
    toolIntegrator: any, 
    containsCalculations: boolean = false,
    forceVerification: boolean = false,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID
  ): Promise<VerificationResult> {
    return this.getVerificationService().deepVerify(
      thought,
      containsCalculations,
      forceVerification,
      sessionId
    );
  }

  /**
   * Méthode de délégation pour detectAndVerifyCalculations
   */
  public async detectAndVerifyCalculations(content: string) {
    return this.getVerificationService().detectAndVerifyCalculations(content);
  }
  
  /**
   * Méthode de délégation pour annotateThoughtWithVerifications
   */
  public annotateThoughtWithVerifications(thought: string, verifications: any[]): string {
    return this.getVerificationService().annotateThoughtWithVerifications(thought, verifications);
  }

  /**
   * Détecte les biais potentiels dans une pensée avec mise en cache des résultats
   * et utilisation d'expressions régulières optimisées
   * 
   * @param thought La pensée à analyser
   * @returns Un tableau de biais détectés, vide si aucun
   */
  detectBiases(thought: ThoughtNode): Array<{type: string, score: number, description: string}> {
    // Vérifier d'abord le cache
    if (this.biasCache.has(thought.id)) {
      // Retourner une copie pour éviter la mutation des données en cache
      return [...this.biasCache.get(thought.id)!];
    }
    
    // Si pas en cache, effectuer l'analyse
    const biases: Array<{type: string, score: number, description: string}> = [];
    const content = thought.content.toLowerCase();
    
    // Utiliser les expressions régulières pré-compilées
    for (const pattern of this.biasPatterns) {
      if (pattern.regex.test(content)) {
        biases.push({
          type: pattern.type,
          score: pattern.score,
          description: pattern.description
        });
      }
    }
    
    // Ajouter les biais spécifiques basés sur les métriques si disponibles
    if (thought.metrics) {
      // Biais d'excès de confiance
      if (thought.metrics.confidence > 0.85 && 
          (/\bcertain(ement)?\b|\bsans doute\b|\babsolument\b/i.test(content))) {
        biases.push({
          type: "overconfidence_bias",
          score: 0.8,
          description: "Exprime une confiance excessive non justifiée"
        });
      }
    }
    
    // Mettre le résultat en cache
    this.biasCache.set(thought.id, [...biases]);
    
    return biases;
  }
  
  /**
   * Suggère des améliorations pour une pensée avec mise en cache des résultats
   * et structure optimisée pour réduire les calculs redondants
   * 
   * @param thought La pensée à améliorer
   * @param thoughtGraph Le graphe de pensées
   * @returns Un tableau de suggestions d'amélioration
   */
  suggestImprovements(thought: ThoughtNode, thoughtGraph: ThoughtGraph): string[] {
    // Créer une clé de cache basée sur l'ID de la pensée et une représentation unique du graphe
    // Utilisons l'ID de la pensée comme identifiant primaire puisque c'est unique par graphe
    const cacheKey = this.createCacheKey(thought.id);
    
    // Vérifier si les suggestions sont déjà en cache
    if (this.suggestionCache.has(cacheKey)) {
      return [...this.suggestionCache.get(cacheKey)!];
    }
    
    // Obtenir les métriques et les pensées connectées
    const metrics = this.evaluate(thought.id, thoughtGraph);
    const connectedThoughts = thoughtGraph.getConnectedThoughts(thought.id);
    
    const suggestions: string[] = [];

    // Appliquer les mappages de suggestions basées sur les métriques
    for (const mapping of this.suggestionMappings) {
      if (mapping.condition(metrics)) {
        suggestions.push(...mapping.suggestions);
      }
    }

    // Analyse du contenu pour des suggestions spécifiques
    const content = thought.content.toLowerCase();
    const wordCount = content.split(/\s+/).length;

    if (wordCount < 10) {
      suggestions.push('Développez davantage cette pensée, elle est trop courte pour être complète.');
    } else if (wordCount > SystemConfig.MAX_THOUGHT_LENGTH / 50) {
      suggestions.push('Considérez diviser cette pensée en plusieurs parties plus ciblées.');
    }

    // Vérifier la présence de biais
    const biases = this.detectBiases(thought);
    if (biases.length > 0) {
      suggestions.push(`Attention aux biais potentiels: ${biases.map(bias => bias.type).join(', ')}.`);
    }

    // Appliquer les suggestions spécifiques au type de pensée
    if (thought.type in this.typeSuggestionMap) {
      for (const mapping of this.typeSuggestionMap[thought.type]) {
        if (mapping.condition(thought, connectedThoughts)) {
          suggestions.push(mapping.suggestion);
        }
      }
    }

    // Vérifier les contradictions de manière optimisée
    const hasContradictions = connectedThoughts.some(t =>
      thought.connections.some(conn => conn.targetId === t.id && conn.type === 'contradicts')
    );

    if (hasContradictions) {
      suggestions.push('Résolvez ou clarifiez les contradictions avec d\'autres pensées.');
    }
    
    // Mettre en cache les suggestions
    this.suggestionCache.set(cacheKey, [...suggestions]);

    return suggestions;
  }
  
  /**
   * Efface les caches pour forcer une réévaluation complète
   * Utile lorsque des pensées sont modifiées
   */
  public clearCaches(): void {
    this.evaluationCache.clear();
    this.biasCache.clear();
    this.suggestionCache.clear();
  }
  
  /**
   * Supprime une entrée spécifique des caches
   * 
   * @param thoughtId L'identifiant de la pensée à supprimer des caches
   */
  public invalidateCacheForThought(thoughtId: string): void {
    // Supprimer toutes les entrées liées à cette pensée
    for (const key of this.evaluationCache.keys()) {
      if (key.startsWith(thoughtId)) {
        this.evaluationCache.delete(key);
      }
    }
    
    this.biasCache.delete(thoughtId);
    
    for (const key of this.suggestionCache.keys()) {
      if (key.startsWith(thoughtId)) {
        this.suggestionCache.delete(key);
      }
    }
  }
}