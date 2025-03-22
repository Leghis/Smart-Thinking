import { ThoughtMetrics, ThoughtNode, VerificationStatus, VerificationResult } from './types';
import { ThoughtGraph } from './thought-graph';
import { MetricsCalculator } from './metrics-calculator';
import { VerificationConfig, SystemConfig } from './config';
import { IVerificationService } from './services/verification-service.interface';
import { ServiceContainer } from './services/service-container';

/**
 * Classe qui évalue la qualité des pensées
 * Utilise le service de vérification centralisé pour toutes les fonctionnalités de vérification
 */
export class QualityEvaluator {
  private verificationService!: IVerificationService; // L'opérateur ! indique que la propriété sera initialisée après la construction
  public metricsCalculator: MetricsCalculator;
  
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
   */
  private getVerificationService(): IVerificationService {
    if (!this.verificationService) {
      this.verificationService = ServiceContainer.getInstance().getVerificationService();
    }
    return this.verificationService;
  }
  
  /**
   * Évalue la qualité d'une pensée
   * 
   * @param thoughtId L'identifiant de la pensée à évaluer
   * @param thoughtGraph Le graphe de pensées contenant la pensée
   * @returns Les métriques de qualité évaluées
   */
  evaluate(thoughtId: string, thoughtGraph: ThoughtGraph): ThoughtMetrics {
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
    
    return {
      confidence,
      relevance,
      quality
    };
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
   * Détecte les biais potentiels dans une pensée
   * 
   * @param thought La pensée à analyser
   * @returns Un tableau de biais détectés, vide si aucun
   */
  detectBiases(thought: ThoughtNode): string[] {
    return this.metricsCalculator.detectBiases(thought);
  }
  
  /**
   * Suggère des améliorations pour une pensée
   * 
   * @param thought La pensée à améliorer
   * @param thoughtGraph Le graphe de pensées
   * @returns Un tableau de suggestions d'amélioration
   */
  suggestImprovements(thought: ThoughtNode, thoughtGraph: ThoughtGraph): string[] {
    const metrics = this.evaluate(thought.id, thoughtGraph);
    const connectedThoughts = thoughtGraph.getConnectedThoughts(thought.id);
    
    const suggestions: string[] = [];

    // Suggestions basées sur la confiance
    if (metrics.confidence < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE) {
      suggestions.push('Renforcez l\'argumentation avec des preuves ou des références précises.');
      suggestions.push('Évitez les modalisateurs d\'incertitude excessive ("peut-être", "probablement").');
    }

    // Suggestions basées sur la pertinence
    if (metrics.relevance < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE) {
      suggestions.push('Clarifiez le lien avec le contexte ou le sujet principal.');

      if (connectedThoughts.length > 0) {
        suggestions.push('Utilisez plus de termes ou concepts présents dans les pensées connectées.');
      }
    }

    // Suggestions basées sur la qualité
    if (metrics.quality < VerificationConfig.CONFIDENCE.LOW_CONFIDENCE) {
      suggestions.push('Améliorez la structure et la clarté de cette pensée.');

      // Analyser le contenu pour des suggestions spécifiques
      const content = thought.content.toLowerCase();
      const wordCount = content.split(/\s+/).length;

      if (wordCount < 10) {
        suggestions.push('Développez davantage cette pensée, elle est trop courte pour être complète.');
      } else if (wordCount > SystemConfig.MAX_THOUGHT_LENGTH / 50) {
        suggestions.push('Considérez diviser cette pensée en plusieurs parties plus ciblées.');
      }
    }

    // Vérifier la présence de biais
    const biases = this.detectBiases(thought);
    if (biases.length > 0) {
      suggestions.push(`Attention aux biais potentiels: ${biases.join(', ')}.`);
    }

    // Suggestions spécifiques au type de pensée
    if (thought.type === 'hypothesis' && !thought.content.toLowerCase().includes('si')) {
      suggestions.push('Formulez l\'hypothèse sous forme conditionnelle (si... alors...).');
    }

    if (thought.type === 'conclusion' && thought.connections.length < 2) {
      suggestions.push('Une conclusion devrait synthétiser plusieurs pensées précédentes.');
    }

    // Vérifier les contradictions
    const contradictions = connectedThoughts.filter(t =>
        thought.connections.some(conn =>
            conn.targetId === t.id && conn.type === 'contradicts'
        )
    );

    if (contradictions.length > 0) {
      suggestions.push('Résolvez ou clarifiez les contradictions avec d\'autres pensées.');
    }

    return suggestions;
  }
}