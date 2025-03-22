import { ThoughtNode, VerificationStatus, VerificationResult, CalculationVerificationResult, VerificationDetailedStatus, SuggestedTool } from '../types';
import { VerificationMemory, VerificationSearchResult } from '../verification-memory';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { MathEvaluator } from '../utils/math-evaluator';
import { VerificationConfig, SystemConfig } from '../config';
import { IVerificationService, PreliminaryVerificationResult, PreviousVerificationResult } from './verification-service.interface';

/**
 * Service amélioré pour la vérification des informations
 * Utilise l'évaluateur mathématique amélioré et améliore la détection des contextes spécifiques
 * Privilégie les outils externes pour les vérifications
 */
export class VerificationService implements IVerificationService {
  private toolIntegrator: ToolIntegrator;
  private metricsCalculator: MetricsCalculator;
  private verificationMemory: VerificationMemory;

  /**
   * Constructeur du service de vérification
   * 
   * @param toolIntegrator L'intégrateur d'outils pour les vérifications externes
   * @param metricsCalculator Le calculateur de métriques pour évaluer la fiabilité
   * @param verificationMemory La mémoire de vérification pour la persistance
   */
  constructor(
    toolIntegrator: ToolIntegrator,
    metricsCalculator: MetricsCalculator,
    verificationMemory: VerificationMemory
  ) {
    this.toolIntegrator = toolIntegrator;
    this.metricsCalculator = metricsCalculator;
    this.verificationMemory = verificationMemory;
  }

  /**
   * Effectue une vérification préliminaire d'une pensée pour détecter des calculs
   * 
   * @param content Le contenu de la pensée à vérifier
   * @param explicitlyRequested Si la vérification est explicitement demandée
   * @returns Résultat de la vérification préliminaire
   */
  public async performPreliminaryVerification(
    content: string,
    explicitlyRequested: boolean = false
  ): Promise<PreliminaryVerificationResult> {
    let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
    let initialVerification = false;
    let verificationInProgress = false;
    let preverifiedThought = content;
    
    // AMÉLIORÉ: Détection des calculs pour orienter vers les outils appropriés
    const hasSimpleCalculations = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(content);
    const hasComplexCalculations = /calcul\s*(?:complexe|avancé)?\s*:?\s*([^=]+)=\s*\d+/.test(content);
    const hasMathNotation = /\d+(?:[\³\²\¹])/.test(content);
    const hasSequentialCalculations = /=\s*[\d\-+]+\s*=\s*[\d\-+]+/.test(content);
    
    // Essayer d'utiliser d'abord des outils externes pour la vérification
    const hasCalculations = hasSimpleCalculations || hasComplexCalculations || hasMathNotation || hasSequentialCalculations;
    
    if (explicitlyRequested || hasCalculations) {
      console.error('Smart-Thinking: Détection de calculs, recherche d\'outils de vérification externe...');
      verificationInProgress = true;
      
      // Vérifier s'il existe des outils de vérification adaptés
      const calculationTools = this.toolIntegrator.suggestVerificationTools(content)
        .filter(tool => tool.name.toLowerCase().includes('calc') || 
               tool.name.toLowerCase().includes('math') || 
               tool.name.toLowerCase().includes('python') || 
               tool.name.toLowerCase().includes('javascript'));
      
      if (calculationTools.length > 0) {
        console.error(`Smart-Thinking: Utilisation de l'outil externe ${calculationTools[0].name} pour vérifier les calculs`);
        try {
          // Tenter d'utiliser l'outil externe en priorité
          const result = await this.toolIntegrator.executeVerificationTool(calculationTools[0].name, content);
          if (result && result.verifiedCalculations) {
            verifiedCalculations = result.verifiedCalculations;
            initialVerification = true;
            
            if (verifiedCalculations && verifiedCalculations.length > 0) {
              preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
              console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs vérifiés via outil externe`);
            }
            
            // Retourner immédiatement le résultat de l'outil externe
            return {
              verifiedCalculations,
              initialVerification,
              verificationInProgress,
              preverifiedThought
            };
          }
        } catch (error) {
          console.error(`Smart-Thinking: Erreur lors de l'utilisation de l'outil externe:`, error);
          // Continuer avec la vérification interne en cas d'échec
        }
      }
      
      // Seulement si aucun outil externe n'est disponible ou a échoué, utiliser la vérification interne
      console.error('Smart-Thinking: Aucun outil externe disponible, utilisation de la vérification interne...');
      
      try {
        verifiedCalculations = await this.detectAndVerifyCalculations(content);
        initialVerification = verifiedCalculations.length > 0;
        
        if (verifiedCalculations.length > 0) {
          preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
          console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs détectés et vérifiés par mécanisme interne`);
        }
      } catch (error) {
        console.error('Smart-Thinking: Erreur lors de la vérification préliminaire des calculs:', error);
        verificationInProgress = true;
        initialVerification = false;
      }
    }
    
    return {
      verifiedCalculations,
      initialVerification,
      verificationInProgress,
      preverifiedThought
    };
  }

  /**
   * Vérifie si une pensée similaire a déjà été vérifiée
   * AMÉLIORÉ: Recherche plus efficace et critères de similarité ajustés
   * 
   * @param content Le contenu de la pensée à vérifier
   * @param sessionId ID de session
   * @returns Résultat de la vérification précédente si trouvée
   */
  public async checkPreviousVerification(
    content: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID
  ): Promise<PreviousVerificationResult> {
    // Valeurs par défaut
    const result: PreviousVerificationResult = {
      previousVerification: null,
      isVerified: false,
      verificationStatus: 'unverified' as VerificationDetailedStatus,
      certaintySummary: 'Information non vérifiée'
    };
    
    try {
      // AMÉLIORÉ: Réduire le seuil de similarité pour une meilleure correspondance
      const similarityThreshold = VerificationConfig.SIMILARITY.MEDIUM_SIMILARITY;
      
      // Rechercher une vérification similaire dans la mémoire avec un seuil de similarité plus bas
      console.error(`Smart-Thinking: Recherche de vérifications précédentes avec seuil ${similarityThreshold}...`);
      
      const previousVerification = await this.verificationMemory.findVerification(
        content,
        sessionId,
        similarityThreshold
      );
      
      if (previousVerification) {
        console.error(`Smart-Thinking: Vérification précédente trouvée avec similarité: ${previousVerification.similarity}`);
        
        // AMÉLIORÉ: Toujours marquer comme vérifié si une correspondance est trouvée
        const isVerified = ['verified', 'partially_verified'].includes(previousVerification.status);
        
        // Préparer la réponse avec les informations de vérification précédente
        return {
          previousVerification,
          isVerified,
          verificationStatus: previousVerification.status as VerificationDetailedStatus,
          certaintySummary: `Information vérifiée précédemment avec ${Math.round(previousVerification.similarity * 100)}% de similarité. Niveau de confiance: ${Math.round(previousVerification.confidence * 100)}%.`,
          verification: {
            status: previousVerification.status,
            confidence: previousVerification.confidence,
            sources: previousVerification.sources || [],
            verificationSteps: ['Information vérifiée dans une étape précédente du raisonnement'],
            notes: `Cette information est similaire (${Math.round(previousVerification.similarity * 100)}%) à une information déjà vérifiée.`
          }
        };
      } else {
        console.error('Smart-Thinking: Aucune vérification précédente trouvée.');
      }
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la vérification avec la mémoire:', error);
    }
    
    // Aucune vérification précédente n'a été trouvée
    return result;
  }

  /**
   * Vérification approfondie d'une pensée
   * AMÉLIORÉ: Priorité aux outils externes et meilleure persistance
   * 
   * @param thought La pensée à vérifier
   * @param containsCalculations Indique si la pensée contient des calculs à vérifier
   * @param forceVerification Force une nouvelle vérification même si déjà vérifiée
   * @param sessionId Identifiant de la session de conversation actuelle
   * @returns Le résultat de la vérification
   */
  public async deepVerify(
    thought: ThoughtNode, 
    containsCalculations: boolean = false,
    forceVerification: boolean = false,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID
  ): Promise<VerificationResult> {
    const content = thought.content;
    
    // Vérifier si l'information a déjà été vérifiée
    if (!forceVerification) {
      const previousCheckResult = await this.checkPreviousVerification(content, sessionId);
      
      if (previousCheckResult.previousVerification) {
        console.error('Smart-Thinking: Utilisation d\'une vérification précédente trouvée en mémoire');
        
        // Mettre à jour les métadonnées de la pensée
        thought.metadata.isVerified = previousCheckResult.isVerified;
        thought.metadata.verificationSource = 'memory';
        thought.metadata.verificationTimestamp = previousCheckResult.previousVerification.timestamp;
        thought.metadata.verificationSessionId = sessionId;
        thought.metadata.semanticSimilarity = previousCheckResult.previousVerification.similarity;
        
        // Retourner la vérification existante
        return previousCheckResult.verification!;
      }
    }
    
    // AMÉLIORÉ: Obtenir TOUS les outils de vérification disponibles, pas seulement ceux qui semblent pertinents
    // Utiliser directement suggestVerificationTools car getAllVerificationTools n'existe pas
    const verificationTools = this.toolIntegrator.suggestVerificationTools(content);
    
    if (verificationTools.length === 0) {
      console.error('Smart-Thinking: Aucun outil de vérification disponible');
    } else {
      console.error(`Smart-Thinking: ${verificationTools.length} outils de vérification disponibles`);
    }
    
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
    
    // AMÉLIORÉ: Utiliser tous les outils disponibles si nécessaire
    const toolsToUse = Math.min(
      verificationRequirements.requiresMultipleVerifications ? 
        verificationRequirements.recommendedVerificationsCount : 1,
      Math.max(1, verificationTools.length) // Utiliser au moins un outil si disponible
    );
    
    console.error(`Smart-Thinking: Utilisation de ${toolsToUse} outil(s) externe(s) pour la vérification`);
    
    // Utiliser chaque outil pour vérifier l'information en parallèle avec Promise.all
    const verificationPromises = verificationTools.slice(0, toolsToUse).map(async (tool: SuggestedTool) => {
      try {
        console.error(`Smart-Thinking: Utilisation de l'outil de vérification "${tool.name}"...`);
        const result = await this.toolIntegrator.executeVerificationTool(tool.name, content);
        console.error(`Smart-Thinking: Vérification avec "${tool.name}" terminée avec succès`);
        return {
          toolName: tool.name,
          result,
          confidence: tool.confidence
        };
      } catch (error) {
        console.error(`Smart-Thinking: Erreur lors de la vérification avec l'outil "${tool.name}":`, error);
        return null;
      }
    });
    
    // Attendre que toutes les vérifications soient terminées
    const results = await Promise.all(verificationPromises);
    // Filtrer les résultats nuls (en cas d'erreur)
    const validResults = results.filter((r: any) => r !== null);
    verificationResults.push(...validResults);
    
    console.error(`Smart-Thinking: ${validResults.length}/${results.length} vérifications externes réussies`);
    
    // Si aucun outil externe n'a réussi et que la pensée contient des calculs, utiliser la vérification interne
    let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
    
    if (validResults.length === 0 && containsCalculations) {
      console.error('Smart-Thinking: Aucun outil externe n\'a réussi, utilisation de la vérification interne pour les calculs');
      verifiedCalculations = await this.detectAndVerifyCalculations(content);
      console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs vérifiés en interne`);
    } else if (validResults.length > 0) {
      // Si des outils externes ont réussi, utiliser leurs résultats de vérification de calculs si disponibles
      for (const result of validResults) {
        if (result && result.result && result.result.verifiedCalculations) {
          verifiedCalculations = result.result.verifiedCalculations;
          console.error(`Smart-Thinking: Utilisation des calculs vérifiés par l'outil "${result.toolName}"`);
          break;
        }
      }
    }
    
    // Agréger et analyser les résultats
    let status = this.metricsCalculator.determineVerificationStatus(verificationResults);
    let confidence = this.metricsCalculator.calculateVerificationConfidence(verificationResults);
    const sources = verificationResults.map(r => `${r.toolName}: ${r.result.source || 'Source non spécifiée'}`);
    const steps = verificationResults.map(r => `Vérifié avec ${r.toolName}`);
    
    // Si aucune vérification n'a été effectuée, s'assurer que le statut est 'unverified'
    if (verificationResults.length === 0 && !verifiedCalculations) {
      status = 'unverified';
      confidence = Math.min(confidence, VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED);
      console.error('Smart-Thinking: Aucune vérification effectuée, statut: unverified');
    } else {
      console.error(`Smart-Thinking: Vérification effectuée avec ${verificationResults.length} outils, statut: ${status}`);
    }
    
    // AMÉLIORÉ: Si des calculs ont été vérifiés, considérer comme au moins partiellement vérifié
    if (verifiedCalculations && verifiedCalculations.length > 0) {
      if (status === 'unverified') {
        status = 'partially_verified';
        console.error('Smart-Thinking: Statut mis à jour vers partially_verified en raison des calculs vérifiés');
      }
      
      // Augmenter la confiance en fonction du nombre de calculs corrects
      const correctCalculations = verifiedCalculations.filter(calc => calc.isCorrect).length;
      if (correctCalculations > 0) {
        const calculationAccuracy = correctCalculations / verifiedCalculations.length;
        confidence = Math.max(confidence, calculationAccuracy * 0.7);
        console.error(`Smart-Thinking: Confiance ajustée à ${confidence.toFixed(2)} basée sur la précision des calculs`);
      }
    }
    
    // Fixer un seuil minimum de confiance pour considérer une information comme vérifiée
    if (status === 'verified' && confidence < VerificationConfig.CONFIDENCE.MINIMUM_THRESHOLD) {
      status = 'partially_verified';
    }
    
    // Si plusieurs vérifications ont échoué, considérer comme non concluant
    if (status === 'unverified' && verificationResults.length >= 2) {
      status = 'inconclusive';
    }
    
    // IMPORTANT: Mettre à jour les métadonnées de la pensée
    thought.metadata.isVerified = status === 'verified' || status === 'partially_verified';
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = verificationResults.length > 0 ? 'tools' : 'internal';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    
    // Détecter les contradictions entre les sources
    const contradictions = this.detectContradictions(verificationResults);
    
    // Créer le résultat de vérification
    const verificationResult = {
      status,
      confidence,
      sources,
      verificationSteps: steps,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      notes: this.generateVerificationNotes(verificationResults, verifiedCalculations),
      verifiedCalculations
    };
    
    // AMÉLIORÉ: Toujours stocker le résultat dans la mémoire pour les futures vérifications
    console.error(`Smart-Thinking: Enregistrement de la vérification en mémoire avec statut: ${status}`);
    await this.storeVerification(
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
    
    console.error(`Smart-Thinking: Vérification complétée, statut final: ${status}, confiance: ${confidence.toFixed(2)}`);
    
    return verificationResult;
  }

  /**
   * Stocke une vérification dans la mémoire
   * 
   * @param content Le contenu vérifié
   * @param status Le statut de vérification
   * @param confidence Le niveau de confiance
   * @param sources Les sources utilisées
   * @param sessionId L'identifiant de la session
   * @returns L'identifiant de la vérification stockée
   */
  public async storeVerification(
    content: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[] = [],
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID
  ): Promise<string> {
    return this.verificationMemory.addVerification(
      content,
      status,
      confidence,
      sources,
      sessionId
    );
  }

  /**
   * Détecte et vérifie les calculs dans un texte de manière asynchrone
   * Méthode unifiée utilisée à la fois pour les vérifications préliminaires et approfondies
   * 
   * @param content Le texte contenant potentiellement des calculs
   * @returns Une promesse résolvant vers un tableau de résultats de vérification de calculs
   */
  public async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    console.error('Smart-Thinking: Détection et vérification des calculs avec MathEvaluator');
    
    try {
      const evaluationResults = MathEvaluator.detectAndEvaluate(content);
      
      console.error(`Smart-Thinking: ${evaluationResults.length} calcul(s) détecté(s)`);
      
      // Filtrer les évaluations vides ou les notations de fonctions si nécessaire
      const filteredResults = evaluationResults.filter((result: any) => 
        !isNaN(result.result) || 
        (result.context === "notation_fonction")
      );
      
      // Convertir les résultats au format CalculationVerificationResult
      return MathEvaluator.convertToVerificationResults(filteredResults);
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la détection des calculs:', error);
      
      // En cas d'erreur, retourner un tableau vide
      return [];
    }
  }
  
  /**
   * Annote une pensée avec les résultats de vérification des calculs
   * 
   * @param content Le texte de la pensée à annoter
   * @param verifications Les résultats de vérification des calculs
   * @returns Le texte annoté avec les résultats de vérification
   */
  public annotateThoughtWithVerifications(content: string, verifications: CalculationVerificationResult[]): string {
    let annotatedThought = content;
    
    // Extraire les notations de fonctions pour les traiter différemment
    const notationVerifications = verifications.filter(v => 
      v.verified.includes("Notation de fonction")
    );
    
    // Extraire les calculs standards
    const calcVerifications = verifications.filter(v => 
      !v.verified.includes("Notation de fonction")
    );
    
    // Ne pas annoter les notations de fonctions, elles ne sont pas des calculs à vérifier
    // mais traiter uniquement les calculs réels
    
    // Parcourir les vérifications de calculs dans l'ordre inverse pour ne pas perturber les indices
    for (let i = calcVerifications.length - 1; i >= 0; i--) {
      const verification = calcVerifications[i];
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
   * AMÉLIORÉ: Inclut les informations sur les calculs vérifiés
   * 
   * @param results Les résultats de vérification
   * @param calculations Les calculs vérifiés
   * @returns Une note explicative sur la vérification
   */
  private generateVerificationNotes(results: any[], calculations?: CalculationVerificationResult[]): string {
    let notes = "";
    
    if (results.length === 0 && (!calculations || calculations.length === 0)) {
      return "Aucune vérification n'a été effectuée.";
    }
    
    if (results.length > 0) {
      const toolsUsed = results.map(r => r.toolName).join(', ');
      notes += `Vérification effectuée avec les outils externes suivants : ${toolsUsed}. `;
    }
    
    if (calculations && calculations.length > 0) {
      const correctCount = calculations.filter(c => c.isCorrect).length;
      notes += `${calculations.length} calcul(s) mathématique(s) vérifié(s), dont ${correctCount} correct(s).`;
    }
    
    return notes.trim();
  }
}