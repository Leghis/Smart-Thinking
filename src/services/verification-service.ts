import { ThoughtNode, VerificationStatus, VerificationResult, CalculationVerificationResult, VerificationDetailedStatus } from '../types';
import { VerificationMemory, VerificationSearchResult } from '../verification-memory';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { MathEvaluator } from '../utils/math-evaluator'; // Utiliser l'évaluateur standard (pas avec le suffixe -improved)
import { VerificationConfig, SystemConfig } from '../config';
import { IVerificationService, PreliminaryVerificationResult, PreviousVerificationResult } from './verification-service.interface';

/**
 * Service amélioré pour la vérification des informations
 * Utilise l'évaluateur mathématique amélioré et améliore la détection des contextes spécifiques
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
    
    // AMÉLIORÉ: Détection plus robuste des calculs potentiels
    const hasSimpleCalculations = /\d+\s*[\+\-\*\/]\s*\d+\s*=/.test(content);
    const hasComplexCalculations = /calcul\s*(?:complexe|avancé)?\s*:?\s*([^=]+)=\s*\d+/.test(content);
    const hasMathNotation = /\d+(?:[\³\²\¹])/.test(content); // Détecter les exposants Unicode
    const hasSequentialCalculations = /=\s*[\d\-+]+\s*=\s*[\d\-+]+/.test(content); // Détecter les calculs séquentiels
    
    // Si des calculs sont présents ou explicitement demandé
    if (explicitlyRequested || hasSimpleCalculations || hasComplexCalculations || hasMathNotation || hasSequentialCalculations) {
      console.error('Smart-Thinking: Détection préliminaire de calculs, vérification immédiate...');
      verificationInProgress = true; // Indiquer que la vérification est en cours
      
      try {
        // Utiliser la méthode unifiée pour détecter et vérifier les calculs
        verifiedCalculations = await this.detectAndVerifyCalculations(content);
        
        // Marquer comme vérifié dès que des calculs ont été traités, qu'ils soient corrects ou non
        initialVerification = verifiedCalculations.length > 0;
        
        // Si des calculs ont été détectés, annoter la pensée
        if (verifiedCalculations.length > 0) {
          preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
          console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs détectés et vérifiés préalablement`);
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
      // Rechercher une vérification similaire dans la mémoire
      const previousVerification = await this.verificationMemory.findVerification(
        content,
        sessionId,
        VerificationConfig.SIMILARITY.HIGH_SIMILARITY
      );
      
      if (previousVerification) {
        console.error(`Vérification précédente trouvée avec similarité: ${previousVerification.similarity}`);
        
        // Préparer la réponse avec les informations de vérification précédente
        return {
          previousVerification,
          isVerified: ['verified', 'partially_verified'].includes(previousVerification.status),
          verificationStatus: previousVerification.status as VerificationDetailedStatus,
          certaintySummary: `Information vérifiée précédemment avec ${Math.round(previousVerification.similarity * 100)}% de similarité. Niveau de confiance: ${Math.round(previousVerification.confidence * 100)}%.`,
          verification: {
            status: previousVerification.status,
            confidence: previousVerification.confidence,
            sources: previousVerification.sources || [],
            verificationSteps: ['Information vérifiée dans une étape précédente du raisonnement'],
            notes: `Cette information est très similaire (${Math.round(previousVerification.similarity * 100)}%) à une information déjà vérifiée précédemment.`
          }
        };
      }
    } catch (error) {
      console.error('Erreur lors de la vérification avec la mémoire:', error);
    }
    
    // Aucune vérification précédente n'a été trouvée
    return result;
  }

  /**
   * Vérification approfondie d'une pensée
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
    
    // Vérifier si l'information a déjà été vérifiée et si on ne force pas une nouvelle vérification
    if (!forceVerification) {
      const previousCheckResult = await this.checkPreviousVerification(content, sessionId);
      
      if (previousCheckResult.previousVerification) {
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
    
    // Déterminer quels outils de recherche sont pertinents pour la vérification
    const verificationTools = this.toolIntegrator.suggestVerificationTools(content);
    
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
    
    // Utiliser chaque outil pour vérifier l'information en parallèle avec Promise.all
    const verificationPromises = verificationTools.slice(0, toolsToUse).map(async (tool) => {
      try {
        console.error(`Utilisation de l'outil de vérification ${tool.name}...`);
        const result = await this.toolIntegrator.executeVerificationTool(tool.name, content);
        return {
          toolName: tool.name,
          result,
          confidence: tool.confidence
        };
      } catch (error) {
        console.error(`Erreur lors de la vérification avec l'outil ${tool.name}:`, error);
        return null;
      }
    });
    
    // Attendre que toutes les vérifications soient terminées
    const results = await Promise.all(verificationPromises);
    // Filtrer les résultats nuls (en cas d'erreur)
    verificationResults.push(...results.filter(r => r !== null));
    
    // Si la pensée contient des calculs, les vérifier
    let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
    
    if (containsCalculations) {
      // Utiliser la méthode unifiée (identique à celle utilisée dans la vérification préliminaire)
      verifiedCalculations = await this.detectAndVerifyCalculations(content);
    }
    
    // Agréger et analyser les résultats
    let status = this.metricsCalculator.determineVerificationStatus(verificationResults);
    let confidence = this.metricsCalculator.calculateVerificationConfidence(verificationResults);
    const sources = verificationResults.map(r => `${r.toolName}: ${r.result.source || 'Source non spécifiée'}`);
    const steps = verificationResults.map(r => `Vérifié avec ${r.toolName}`);
    
    // Si aucune vérification n'a été effectuée, s'assurer que le statut est 'unverified'
    if (verificationResults.length === 0 && !verifiedCalculations) {
      status = 'unverified';
      // Limiter la confiance maximale pour l'information non vérifiée
      confidence = Math.min(confidence, VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED);
      console.error('Aucune vérification effectuée, statut: unverified');
    } else {
      console.error(`Vérification effectuée avec ${verificationResults.length} outils, statut: ${status}`);
    }
    
    // Fixer un seuil minimum de confiance pour considérer une information comme vérifiée
    if (status === 'verified' && confidence < VerificationConfig.CONFIDENCE.MINIMUM_THRESHOLD) {
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
    
    console.error(`Vérification complétée et enregistrée en mémoire, statut: ${status}`);
    
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
   * Utilise l'évaluateur amélioré pour une meilleure détection
   * 
   * @param content Le texte contenant potentiellement des calculs
   * @returns Une promesse résolvant vers un tableau de résultats de vérification de calculs
   */
  public async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    console.error('Smart-Thinking: Détection et vérification des calculs avec MathEvaluator amélioré');
    
    try {
      // AMÉLIORÉ: Utiliser l'évaluateur mathématique amélioré
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
   * AMÉLIORÉ: Gestion améliorée des notations de fonctions
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
}