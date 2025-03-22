import { ThoughtMetrics, ThoughtNode, VerificationStatus, VerificationResult, CalculationVerificationResult, VerificationDetailedStatus } from './types';
import { ThoughtGraph } from './thought-graph';
import { ToolIntegrator } from './tool-integrator';
import { MetricsCalculator } from './metrics-calculator';
import { VerificationMemory } from './verification-memory';
import { MathEvaluator } from './utils/math-evaluator';

/**
 * Classe qui évalue la qualité des pensées
 */
export class QualityEvaluator {
  private toolIntegrator: ToolIntegrator | null = null;
  public metricsCalculator: MetricsCalculator;
  private verificationMemory: VerificationMemory;
  
  constructor() {
    this.metricsCalculator = new MetricsCalculator();
    this.verificationMemory = VerificationMemory.getInstance();
  }
  
  /**
   * Définit l'instance de ToolIntegrator à utiliser pour les vérifications
   * 
   * @param toolIntegrator L'instance de ToolIntegrator à utiliser
   */
  public setToolIntegrator(toolIntegrator: ToolIntegrator): void {
    this.toolIntegrator = toolIntegrator;
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
   * Vérification approfondie d'une pensée
   * 
   * @param thought La pensée à vérifier
   * @param toolIntegrator L'intégrateur d'outils pour la vérification
   * @param containsCalculations Indique si la pensée contient des calculs à vérifier
   * @param forceVerification Force une nouvelle vérification même si déjà vérifiée
   * @param sessionId Identifiant de la session de conversation actuelle
   * @returns Le résultat de la vérification
   */
  public async deepVerify(
    thought: ThoughtNode, 
    toolIntegrator: ToolIntegrator, 
    containsCalculations: boolean = false,
    forceVerification: boolean = false,
    sessionId: string = 'default'
  ): Promise<VerificationResult> {
    const content = thought.content;
    
    // Vérifier si l'information a déjà été vérifiée et si on ne force pas une nouvelle vérification
    if (!forceVerification) {
      try {
        const existingVerification = await this.verificationMemory.findVerification(content, sessionId);
        
        if (existingVerification) {
          console.error(`Vérification trouvée en mémoire avec similarité: ${existingVerification.similarity}`);
          
          // Mettre à jour les métadonnées de la pensée
          thought.metadata.isVerified = existingVerification.status === 'verified' || 
                                        existingVerification.status === 'partially_verified';
          thought.metadata.verificationSource = 'memory';
          thought.metadata.verificationTimestamp = existingVerification.timestamp;
          thought.metadata.verificationSessionId = sessionId;
          thought.metadata.semanticSimilarity = existingVerification.similarity;
          
          // Retourner la vérification existante
          return {
            status: existingVerification.status,
            confidence: existingVerification.confidence,
            sources: existingVerification.sources,
            verificationSteps: [`Information déjà vérifiée précédemment avec similarité ${Math.round(existingVerification.similarity * 100)}% (${existingVerification.timestamp.toISOString()})`],
            notes: `Cette information (ou une information très similaire) a déjà été vérifiée dans cette conversation le ${existingVerification.timestamp.toLocaleString()}.`
          };
        }
      } catch (error) {
        console.error('Erreur lors de la recherche de vérification en mémoire:', error);
      }
    }
    
    // Définir temporairement le toolIntegrator pour cette opération si non déjà défini
    const previousToolIntegrator = this.toolIntegrator;
    if (!this.toolIntegrator) {
      this.toolIntegrator = toolIntegrator;
    }
    
    // Déterminer quels outils de recherche sont pertinents pour la vérification
    const verificationTools = toolIntegrator.suggestVerificationTools(content);
    
    // Déterminer si plusieurs vérifications sont nécessaires
    const verificationRequirements = this.metricsCalculator.determineVerificationRequirements(
      content, 
      thought.metrics?.confidence || 0.5
    );
    
    thought.metadata.requiresMultipleVerifications = verificationRequirements.requiresMultipleVerifications;
    thought.metadata.verificationReasons = verificationRequirements.reasons;
    thought.metadata.recommendedVerificationsCount = verificationRequirements.recommendedVerificationsCount;
    
    // Résultats de vérification pour chaque outil
    const verificationResults: any[] = [];
    
    // Nombre d'outils à utiliser, en fonction des exigences de vérification
    const toolsToUse = Math.min(
      verificationRequirements.requiresMultipleVerifications ? 
        verificationRequirements.recommendedVerificationsCount : 1,
      verificationTools.length
    );
    
    // Utiliser chaque outil pour vérifier l'information
    for (let i = 0; i < toolsToUse; i++) {
      const tool = verificationTools[i];
      try {
        console.error(`Utilisation de l'outil de vérification ${tool.name}...`);
        const result = await toolIntegrator.executeVerificationTool(tool.name, content);
        verificationResults.push({
          toolName: tool.name,
          result,
          confidence: tool.confidence
        });
      } catch (error) {
        console.error(`Erreur lors de la vérification avec l'outil ${tool.name}:`, error);
      }
    }
    
    // Si la pensée contient des calculs, les vérifier
    let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
    
    if (containsCalculations) {
      // Utiliser la nouvelle méthode optimisée
      verifiedCalculations = await this.detectAndVerifyCalculations(content);
    }
    
    // Agréger et analyser les résultats
    let status = this.aggregateVerificationStatus(verificationResults);
    let confidence = this.calculateVerificationConfidence(verificationResults);
    const sources = verificationResults.map(r => `${r.toolName}: ${r.result.source || 'Source non spécifiée'}`);
    const steps = verificationResults.map(r => `Vérifié avec ${r.toolName}`);
    
    // Si aucune vérification n'a été effectuée, s'assurer que le statut est 'unverified'
    if (verificationResults.length === 0 && !verifiedCalculations) {
      status = 'unverified';
      // Limiter la confiance maximale pour l'information non vérifiée
      confidence = Math.min(confidence, 0.6);
      console.error('Aucune vérification effectuée, statut: unverified');
    } else {
      console.error(`Vérification effectuée avec ${verificationResults.length} outils, statut: ${status}`);
    }
    
    // Fixer un seuil minimum de confiance pour considérer une information comme vérifiée
    if (status === 'verified' && confidence < 0.7) {
      status = 'partially_verified';
    }
    
    // Si plusieurs vérifications ont échoué, considérer comme non concluant
    if (status === 'unverified' && verificationResults.length >= 2) {
      status = 'inconclusive';
    }
    
    // Mettre à jour les métadonnées de la pensée
    thought.metadata.isVerified = status === 'verified' || status === 'partially_verified';
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = 'tools';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    
    // Détecter les contradictions entre les sources
    const contradictions = this.detectContradictions(verificationResults);
    
    // Restaurer l'état précédent du toolIntegrator si nécessaire
    if (!previousToolIntegrator) {
      this.toolIntegrator = null;
    }
    
    // Créer le résultat de vérification
    const verificationResult = {
      status,
      confidence,
      sources,
      verificationSteps: steps,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      notes: this.generateVerificationNotes(verificationResults),
      verifiedCalculations
    };
    
    // Enregistrer la vérification dans la mémoire sémantique
    await this.verificationMemory.addVerification(
      content,
      status,
      confidence,
      sources,
      sessionId
    );
    
    // Attacher explicitement le statut de vérification à la pensée elle-même
    thought.metadata.verificationResult = {
      status,
      confidence,
      timestamp: new Date(),
      sources
    };
    
    console.error(`Vérification complétée et enregistrée en mémoire, statut: ${status}`);
    
    return verificationResult;
  }

  /**
   * Détecte et vérifie les calculs dans un texte de manière asynchrone en utilisant
   * le nouveau MathEvaluator optimisé
   * 
   * @param content Le texte contenant potentiellement des calculs
   * @returns Une promesse résolvant vers un tableau de résultats de vérification de calculs
   */
  public async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    console.error('Smart-Thinking: Détection et vérification des calculs avec MathEvaluator');
    
    try {
      // Utiliser le nouveau MathEvaluator pour détecter et évaluer les expressions mathématiques
      const evaluationResults = MathEvaluator.detectAndEvaluate(content);
      
      console.error(`Smart-Thinking: ${evaluationResults.length} calcul(s) détecté(s)`);
      
      // Convertir les résultats au format CalculationVerificationResult
      return MathEvaluator.convertToVerificationResults(evaluationResults);
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la détection des calculs:', error);
      
      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  }
  
  /**
   * Annote une pensée avec les résultats de vérification des calculs
   * 
   * @param thought Le texte de la pensée à annoter
   * @param verifications Les résultats de vérification des calculs
   * @returns Le texte annoté avec les résultats de vérification
   */
  public annotateThoughtWithVerifications(thought: string, verifications: CalculationVerificationResult[]): string {
    let annotatedThought = thought;
    
    // Parcourir les vérifications dans l'ordre inverse pour ne pas perturber les indices
    for (let i = verifications.length - 1; i >= 0; i--) {
      const verification = verifications[i];
      const original = verification.original;
      
      // Créer une annotation selon que le calcul est correct ou non
      if (verification.isCorrect) {
        annotatedThought = annotatedThought.replace(
          original, 
          `${original} [✓ Vérifié]`
        );
      } else if (verification.verified.includes("vérifier") || verification.verified.includes("Vérification")) {
        annotatedThought = annotatedThought.replace(
          original, 
          `${original} [⏳ Vérification en cours...]`
        );
      } else {
        // Même si le calcul est incorrect, il a été vérifié
        annotatedThought = annotatedThought.replace(
          original, 
          `${original} [✗ Incorrect: ${verification.verified}]`
        );
      }
    }
    
    return annotatedThought;
  }

  /**
   * Agrège les statuts de vérification
   * 
   * @param results Les résultats de vérification
   * @returns Le statut global de vérification
   */
  private aggregateVerificationStatus(results: any[]): VerificationStatus {
    return this.metricsCalculator.determineVerificationStatus(results);
  }

  /**
   * Calcule la confiance globale dans la vérification
   * 
   * @param results Les résultats de vérification
   * @returns Le niveau de confiance global (0 à 1)
   */
  private calculateVerificationConfidence(results: any[]): number {
    return this.metricsCalculator.calculateVerificationConfidence(results);
  }

  /**
   * Détecte les contradictions entre les résultats
   * 
   * @param results Les résultats de vérification
   * @returns Un tableau de contradictions détectées
   */
  private detectContradictions(results: any[]): string[] {
    const contradictions: string[] = [];
    
    // Comparer les résultats entre eux pour détecter les incohérences
    for (let i = 0; i < results.length; i++) {
      for (let j = i + 1; j < results.length; j++) {
        const resultA = results[i].result;
        const resultB = results[j].result;
        
        // Logique de détection des contradictions
        if (resultA.isValid === true && resultB.isValid === false) {
          contradictions.push(`Contradiction entre ${results[i].toolName} et ${results[j].toolName}`);
        }
      }
    }
    
    return contradictions;
  }

  /**
   * Génère des notes sur la vérification
   * 
   * @param results Les résultats de vérification
   * @returns Une note explicative sur la vérification
   */
  private generateVerificationNotes(results: any[]): string {
    if (results.length === 0) {
      return "Aucune vérification n'a été effectuée.";
    }
    
    const toolsUsed = results.map(r => r.toolName).join(', ');
    return `Vérification effectuée avec les outils suivants : ${toolsUsed}.`;
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
    if (metrics.confidence < 0.4) {
      suggestions.push('Renforcez l\'argumentation avec des preuves ou des références précises.');
      suggestions.push('Évitez les modalisateurs d\'incertitude excessive ("peut-être", "probablement").');
    }

    // Suggestions basées sur la pertinence
    if (metrics.relevance < 0.4) {
      suggestions.push('Clarifiez le lien avec le contexte ou le sujet principal.');

      if (connectedThoughts.length > 0) {
        suggestions.push('Utilisez plus de termes ou concepts présents dans les pensées connectées.');
      }
    }

    // Suggestions basées sur la qualité
    if (metrics.quality < 0.4) {
      suggestions.push('Améliorez la structure et la clarté de cette pensée.');

      // Analyser le contenu pour des suggestions spécifiques
      const content = thought.content.toLowerCase();
      const wordCount = content.split(/\s+/).length;

      if (wordCount < 10) {
        suggestions.push('Développez davantage cette pensée, elle est trop courte pour être complète.');
      } else if (wordCount > 200) {
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