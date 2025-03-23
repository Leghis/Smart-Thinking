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
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    thoughtType: string = 'regular', // Nouveau paramètre pour le type de pensée
    connectedThoughtIds: string[] = [] // Nouveau paramètre pour les pensées connectées
  ): Promise<PreviousVerificationResult> {
    // Valeurs par défaut
    const result: PreviousVerificationResult = {
      previousVerification: null,
      isVerified: false,
      verificationStatus: 'unverified' as VerificationDetailedStatus,
      certaintySummary: 'Information non vérifiée'
    };
    
    try {
      // CORRECTION: Augmenter le seuil de similarité pour éviter les fausses correspondances
      const similarityThreshold = VerificationConfig.SIMILARITY.HIGH_SIMILARITY;
      
      // Rechercher une vérification similaire dans la mémoire avec un seuil de similarité plus élevé
      console.error(`Smart-Thinking: Recherche de vérifications précédentes avec seuil ${similarityThreshold}...`);
      
      const previousVerification = await this.verificationMemory.findVerification(
        content,
        sessionId,
        similarityThreshold
      );
      
      if (previousVerification) {
        console.error(`Smart-Thinking: Vérification précédente trouvée avec similarité: ${previousVerification.similarity}`);
        
        // CORRECTION: Ne marquer comme vérifié que si le niveau de similarité est vraiment élevé
        // et si les sources sont valides
        const isValidSource = previousVerification.sources && 
                              previousVerification.sources.length > 0 && 
                              !previousVerification.sources.includes("Information non vérifiable");
        
        const isVerified = ['verified', 'partially_verified'].includes(previousVerification.status) && 
                           previousVerification.similarity >= VerificationConfig.SIMILARITY.HIGH_SIMILARITY &&
                           isValidSource;
        
        // CORRECTION: Ajuster le niveau de confiance en fonction de la similarité
        const adjustedConfidence = Math.min(previousVerification.confidence, previousVerification.similarity);
        
        // Préparer la réponse avec les informations de vérification précédente
        return {
          previousVerification,
          isVerified,
          verificationStatus: isVerified ? previousVerification.status as VerificationDetailedStatus : 'uncertain',
          certaintySummary: isVerified 
            ? `Information vérifiée précédemment avec ${Math.round(previousVerification.similarity * 100)}% de similarité. Niveau de confiance: ${Math.round(adjustedConfidence * 100)}%.`
            : `Information partiellement similaire (${Math.round(previousVerification.similarity * 100)}%) à une vérification précédente, mais nécessite une nouvelle vérification.`,
          verification: isVerified ? {
            status: previousVerification.status,
            confidence: adjustedConfidence,
            sources: previousVerification.sources || [],
            verificationSteps: ['Information vérifiée dans une étape précédente du raisonnement'],
            notes: `Cette information est similaire (${Math.round(previousVerification.similarity * 100)}%) à une information déjà vérifiée.`
          } : undefined
        };
      } 
      // Nouveau: propagation du statut pour les pensées de type conclusion ou revision
      else if ((thoughtType === 'conclusion' || thoughtType === 'revision') && connectedThoughtIds.length > 0) {
        // Chercher les statuts de vérification des pensées connectées
        const connectedStatuses = await this.getConnectedThoughtsVerificationStatus(connectedThoughtIds);
        
        // Si au moins une pensée connectée est vérifiée ou partiellement vérifiée
        if (connectedStatuses.some(s => s === 'verified' || s === 'partially_verified')) {
          result.isVerified = true;
          result.verificationStatus = 'partially_verified';
          result.certaintySummary = `${thoughtType === 'conclusion' ? 'Conclusion' : 'Révision'} basée sur des informations partiellement vérifiées.`;
          
          // Construire un résultat de vérification simulé
          result.verification = {
            status: 'partially_verified',
            confidence: 0.7, // Valeur par défaut raisonnable
            sources: ['Propagation depuis pensées connectées'],
            verificationSteps: [`Héritage du statut de vérification des pensées ${thoughtType === 'conclusion' ? 'précédentes' : 'associées'}`]
          };
        }
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
   * AMÉLIORÉ: Processus de vérification multi-étapes et validation plus stricte
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
    
    // Ajouter un log pour tracer le début de la vérification
    console.error(`Smart-Thinking: Début de la vérification approfondie pour une pensée de ${content.length} caractères`);
    
    // Vérifier si l'information a déjà été vérifiée
    if (!forceVerification) {
      const previousCheckResult = await this.checkPreviousVerification(content, sessionId, thought.type, 
        thought.connections.map(c => c.targetId));
      
      if (previousCheckResult.previousVerification && previousCheckResult.isVerified) {
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
    
    // ÉTAPE 1: Déterminer les besoins de vérification spécifiques
    console.error('Smart-Thinking: Étape 1 - Analyse des besoins de vérification');
    
    // Détecter les catégories de vérification nécessaires
    const containsFactualClaims = this.containsFactualClaims(content);
    const containsOpinions = this.containsOpinions(content);
    const containsStatistics = this.containsStatistics(content);
    const containsExternalRefs = this.containsExternalReferences(content);
    
    // Catégoriser le contenu pour déterminer la stratégie de vérification
    const contentCategories = [];
    if (containsFactualClaims) contentCategories.push('claims');
    if (containsCalculations) contentCategories.push('calculations');
    if (containsOpinions) contentCategories.push('opinions');
    if (containsStatistics) contentCategories.push('statistics');
    if (containsExternalRefs) contentCategories.push('references');
    
    console.error(`Smart-Thinking: Catégories de contenu détectées: ${contentCategories.join(', ') || 'aucune spécifique'}`);
    
    // ÉTAPE 2: Sélectionner les bons outils de vérification en fonction des catégories
    console.error('Smart-Thinking: Étape 2 - Sélection des outils de vérification');
    
    const verificationTools = this.toolIntegrator.suggestVerificationTools(content);
    
    if (verificationTools.length === 0) {
      console.error('Smart-Thinking: Aucun outil de vérification disponible');
    } else {
      console.error(`Smart-Thinking: ${verificationTools.length} outils de vérification disponibles`);
    }
    
    // Déterminer si plusieurs vérifications sont nécessaires
    const verificationRequirements = this.metricsCalculator.determineVerificationRequirements(
      content
    );
    
    thought.metadata.requiresMultipleVerifications = verificationRequirements.requiresMultipleVerifications;
    thought.metadata.verificationReasons = verificationRequirements.reasons;
    thought.metadata.recommendedVerificationsCount = verificationRequirements.recommendedVerificationsCount;
    
    // ÉTAPE 3: Exécuter les vérifications avec les outils appropriés
    console.error('Smart-Thinking: Étape 3 - Exécution des vérifications');
    
    // Calculer le nombre optimal d'outils à utiliser en fonction de la complexité et des besoins
    const baseToolCount = Math.min(
      verificationRequirements.requiresMultipleVerifications ? 
        verificationRequirements.recommendedVerificationsCount : 1,
      Math.max(1, verificationTools.length) // Utiliser au moins un outil si disponible
    );
    
    // Ajuster le nombre d'outils en fonction des catégories de contenu
    let toolsToUse = baseToolCount;
    if (contentCategories.length > 2) {
      // Si le contenu est complexe (plusieurs catégories), utiliser plus d'outils
      toolsToUse = Math.min(baseToolCount + 1, verificationTools.length);
    }
    
    console.error(`Smart-Thinking: Utilisation de ${toolsToUse} outil(s) externe(s) pour la vérification`);
    
    // Vérification sous forme de processus multi-étapes
    const verificationStages = [];
    const verificationResults: any[] = [];
    
    // Étape 3.1: Vérification principale avec les outils sélectionnés
    console.error('Smart-Thinking: Étape 3.1 - Vérification principale');
    verificationStages.push('vérification principale');
    
    // Utiliser chaque outil pour vérifier l'information en parallèle avec Promise.all
    const primaryVerificationPromises = verificationTools.slice(0, toolsToUse).map(async (tool: SuggestedTool) => {
      try {
        console.error(`Smart-Thinking: Utilisation de l'outil de vérification "${tool.name}"...`);
        const result = await this.toolIntegrator.executeVerificationTool(tool.name, content);
        console.error(`Smart-Thinking: Vérification avec "${tool.name}" terminée avec succès`);
        
        // Vérifier si l'outil a retourné un résultat exploitable
        const isValidResult = result && 
          (result.isValid !== undefined || 
           result.verifiedCalculations || 
           result.sources || 
           result.details);
        
        if (isValidResult) {
          return {
            toolName: tool.name,
            result,
            confidence: tool.confidence,
            stage: 'primary'
          };
        } else {
          console.error(`Smart-Thinking: Résultat de ${tool.name} incomplet ou invalide`);
          return null;
        }
      } catch (error) {
        console.error(`Smart-Thinking: Erreur lors de la vérification avec l'outil "${tool.name}":`, error);
        return null;
      }
    });
    
    // Attendre que toutes les vérifications principales soient terminées
    const primaryResults = await Promise.all(primaryVerificationPromises);
    // Filtrer les résultats nuls (en cas d'erreur)
    const validPrimaryResults = primaryResults.filter((r: any) => r !== null);
    verificationResults.push(...validPrimaryResults);
    
    console.error(`Smart-Thinking: ${validPrimaryResults.length}/${primaryResults.length} vérifications principales réussies`);
    
    // Étape 3.2: Vérification des calculs si nécessaire
    let verifiedCalculations: CalculationVerificationResult[] | undefined = undefined;
    
    if (containsCalculations) {
      console.error('Smart-Thinking: Étape 3.2 - Vérification des calculs');
      verificationStages.push('vérification des calculs');
      
      // Vérifier si des calculs ont déjà été vérifiés par les outils principaux
      let calculationsVerifiedExternally = false;
      
      for (const result of validPrimaryResults) {
        if (result && result.result && result.result.verifiedCalculations) {
          verifiedCalculations = result.result.verifiedCalculations;
          calculationsVerifiedExternally = true;
          console.error(`Smart-Thinking: Calculs vérifiés par l'outil externe "${result.toolName}": ${verifiedCalculations ? verifiedCalculations.length : 0} calcul(s)`);
          break;
        }
      }
      
      // Si aucun outil n'a vérifié les calculs, utiliser la vérification interne
      if (!calculationsVerifiedExternally) {
        console.error('Smart-Thinking: Aucun outil externe n\'a vérifié les calculs, utilisation de la vérification interne');
        verifiedCalculations = await this.detectAndVerifyCalculations(content);
        console.error(`Smart-Thinking: ${verifiedCalculations ? verifiedCalculations.length : 0} calcul(s) vérifié(s) en interne`);
      }
    }
    
    // Étape 3.3: Vérification complémentaire si les résultats sont contradictoires ou insuffisants
    if (validPrimaryResults.length < 2 && verificationRequirements.requiresMultipleVerifications) {
      console.error('Smart-Thinking: Étape 3.3 - Vérification complémentaire nécessaire');
      verificationStages.push('vérification complémentaire');
      
      // Utiliser un outil différent des premiers outils
      const usedToolNames = validPrimaryResults.filter(r => r !== null).map(r => r.toolName);
      const complementaryTools = verificationTools.filter(tool => !usedToolNames.includes(tool.name));
      
      if (complementaryTools.length > 0) {
        const complementaryTool = complementaryTools[0];
        console.error(`Smart-Thinking: Utilisation de l'outil complémentaire "${complementaryTool.name}"`);
        
        try {
          const result = await this.toolIntegrator.executeVerificationTool(complementaryTool.name, content);
          if (result) {
            verificationResults.push({
              toolName: complementaryTool.name,
              result,
              confidence: complementaryTool.confidence,
              stage: 'complementary'
            });
            console.error(`Smart-Thinking: Vérification complémentaire réussie avec "${complementaryTool.name}"`);
          }
        } catch (error) {
          console.error(`Smart-Thinking: Erreur lors de la vérification complémentaire:`, error);
        }
      } else {
        console.error('Smart-Thinking: Aucun outil complémentaire disponible');
      }
    }
    
    // ÉTAPE 4: Agréger et analyser les résultats
    console.error('Smart-Thinking: Étape 4 - Analyse des résultats de vérification');
    
    // Agréger et analyser les résultats
    let status = this.metricsCalculator.determineVerificationStatus(verificationResults);
    let confidence = this.metricsCalculator.calculateVerificationConfidence(verificationResults);
    
    // CORRECTION: S'assurer que le niveau de confiance est cohérent avec le statut
    const minConfidenceByStatus: Record<string, number> = {
      'verified': 0.6,
      'partially_verified': 0.4,
      'unverified': 0.0,
      'contradictory': 0.0,
      'absence_of_information': 0.0,
      'uncertain': 0.0
    };
    
    // Appliquer un plancher de confiance minimum pour les statuts vérifiés
    if (minConfidenceByStatus[status] && confidence < minConfidenceByStatus[status]) {
      console.error(`Smart-Thinking: Ajustement de la confiance pour le statut ${status} de ${confidence.toFixed(2)} à ${minConfidenceByStatus[status].toFixed(2)}`);
      confidence = minConfidenceByStatus[status];
    }
    
    // Construire la liste des sources et des étapes de vérification
    const sources = verificationResults.map(r => {
      const source = r.result.source || `${r.toolName} (source non spécifiée)`;
      return `${r.toolName}: ${source}`;
    });
    
    const steps = [
      ...verificationStages.map(stage => `Étape de ${stage}`),
      ...verificationResults.map(r => `Vérifié avec ${r.toolName} (${r.stage})`)
    ];
    
    // Si aucune vérification n'a été effectuée, s'assurer que le statut est 'unverified'
    if (verificationResults.length === 0 && !verifiedCalculations) {
      status = 'unverified';
      confidence = Math.min(confidence, VerificationConfig.CONFIDENCE.VERIFICATION_REQUIRED);
      console.error('Smart-Thinking: Aucune vérification effectuée, statut: unverified');
    } else {
      console.error(`Smart-Thinking: Vérification effectuée avec ${verificationResults.length} outil(s), statut préliminaire: ${status}`);
    }
    
    // IMPORTANT: Mettre à jour les métadonnées de la pensée
    thought.metadata.isVerified = status === 'verified' || status === 'partially_verified';
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = verificationResults.length > 0 ? 'tools' : 'internal';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    thought.metadata.verificationStages = verificationStages;
    
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
      sources,
      stages: verificationStages
    };
    
    console.error(`Smart-Thinking: Vérification complétée, statut final: ${status}, confiance: ${confidence.toFixed(2)}`);
    
    // ÉTAPE 5: Analyse finale et évaluation de certitude
    console.error('Smart-Thinking: Étape 5 - Analyse finale et évaluation de certitude');
    
    // CORRECTION: Améliorer la détection des "non-résultats" (aucune information trouvée)
    const noInformationFound = validPrimaryResults.length > 0 && validPrimaryResults.every(r => {
      if (!r || !r.result) return false;
      const content = r.result.details ? r.result.details.toLowerCase() : '';
      // Amélioration avec une détection plus précise des phrases indiquant l'absence d'information
      return content.includes("pas d'information") || 
             content.includes("aucune information") || 
             content.includes("no information") ||
             content.includes("not found") ||
             content.includes("couldn't find") ||
             content.includes("no specific information") ||
             content.includes("no details") ||
             (content.includes("information spécifique") && content.includes("pas")) ||
             content.includes("i don't have") ||
             content.includes("je n'ai pas trouvé") ||
             content.includes("not available") ||
             content.includes("no results") ||
             content.includes("aucun résultat") ||
             content.includes("no relevant") ||
             content.includes("no data available");
    });
    
    // CORRECTION: Si aucune information n'a été trouvée sur le sujet
    if ((noInformationFound && validPrimaryResults.length > 0) || 
        (content.toLowerCase().includes("qui est") && (noInformationFound || validPrimaryResults.length === 0)) || 
        ((content.match(/\?$/) || content.includes("what is") || content.includes("qu'est-ce que")) && (noInformationFound || validPrimaryResults.length === 0))) {
      // C'est un résultat "absence d'information" qui est valide mais différent d'une information vérifiée
      status = 'absence_of_information' as VerificationStatus;
      // Ajuster le niveau de confiance en fonction du nombre de sources concordantes
      confidence = Math.min(0.7 + (validPrimaryResults.length * 0.05), 0.9);
      console.error(`Smart-Thinking: Aucune information trouvée sur le sujet avec ${validPrimaryResults.length} sources, confiance: ${confidence}`);
      
      // Marquer explicitement que les résultats des outils indiquent une absence d'information
      validPrimaryResults.forEach(r => {
        if (r && r.result) {
          r.result.isValid = 'absence_of_information';
        }
      });
    }
    // Si au moins un outil a confirmé l'information et aucun ne l'a contredite
    else if (validPrimaryResults.some(r => r && r.result && r.result.isValid === true) && 
        !validPrimaryResults.some(r => r && r.result && r.result.isValid === false)) {
      status = 'verified';
      
      // Calculer le score de confiance basé sur le nombre de confirmations et leur niveau de confiance
      const confirmedResults = validPrimaryResults.filter(r => r && r.result && r.result.isValid === true);
      const averageConfidence = confirmedResults.reduce((sum, r) => sum + (r ? r.confidence : 0), 0) / 
                               (confirmedResults.length || 1);
      
      // Ajuster en fonction du nombre de confirmations (bonus pour les confirmations multiples)
      confidence = Math.min(averageConfidence + (confirmedResults.length * 0.05), 0.95);
      console.error(`Smart-Thinking: Information vérifiée avec ${confirmedResults.length} confirmations, confiance: ${confidence}`);
    }
    // Si au moins un outil a confirmé partiellement l'information
    else if (validPrimaryResults.some(r => r && r.result && r.result.isValid === 'partial')) {
      status = 'partially_verified';
      
      // Calculer le score de confiance pour une vérification partielle
      const partialResults = validPrimaryResults.filter(r => r && r.result && r.result.isValid === 'partial');
      confidence = Math.min(
        partialResults.reduce((sum, r) => sum + (r ? r.confidence : 0), 0) / 
        (partialResults.length || 1),
        0.75
      );
      console.error(`Smart-Thinking: Information partiellement vérifiée, confiance: ${confidence}`);
    }
    // Si les outils sont en désaccord (certains confirment, d'autres contredisent)
    else if (validPrimaryResults.some(r => r && r.result && r.result.isValid === true) && 
             validPrimaryResults.some(r => r && r.result && r.result.isValid === false)) {
      status = 'contradictory';
      
      // Calculer un score de confiance réduit en cas de contradiction
      confidence = 0.4;
      console.error(`Smart-Thinking: Informations contradictoires détectées, confiance réduite: ${confidence}`);
    }
    // Si on a détecté une absence d'information
    else if (validPrimaryResults.some(r => r && r.result && 
             (r.result.isValid === 'absence_of_information' || 
              (typeof r.result.isValid === 'string' && r.result.isValid.includes('absence'))))) {
      status = 'absence_of_information' as VerificationStatus;
      
      // Calculer un score de confiance adapté pour l'absence d'information
      const absenceResults = validPrimaryResults.filter(r => r && r.result && 
                           (r.result.isValid === 'absence_of_information' || 
                            (typeof r.result.isValid === 'string' && r.result.isValid.includes('absence'))));
      confidence = Math.min(0.6 + (absenceResults.length * 0.05), 0.8);
      console.error(`Smart-Thinking: Absence d'information confirmée par ${absenceResults.length} sources, confiance: ${confidence}`);
    }
    // Si les outils n'ont pas pu déterminer la validité de manière claire
    else if (validPrimaryResults.some(r => r && r.result && (r.result.isValid === null || r.result.isValid === undefined))) {
      status = 'uncertain';
      
      // Attribuer un score de confiance faible
      confidence = 0.3;
      console.error(`Smart-Thinking: Incertitude sur la validité de l'information, confiance: ${confidence}`);
    }
    // Par défaut si aucun cas précédent n'est satisfait
    else {
      status = 'unverified';
      confidence = 0.3;
      console.error(`Smart-Thinking: Information non vérifiée, confiance par défaut: ${confidence}`);
    }
    
    // IMPORTANT: Mettre à jour les métadonnées de la pensée avec le statut final correct
    thought.metadata.isVerified = status === 'verified' || status === 'partially_verified';
    
    // Important: Ajuster la métadonnée isVerified pour l'absence d'information
    // Une absence d'information confirmée est techniquement "vérifiée" mais différemment
    if (status === 'absence_of_information' as VerificationStatus) {
      thought.metadata.isVerified = true; // Nous considérons qu'une absence d'information est une information vérifiée
    }
    
    // Mise à jour du reste des métadonnées
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = verificationResults.length > 0 ? 'tools' : 'internal';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    thought.metadata.verificationStages = verificationStages;
    
    let finalStatus: VerificationStatus = status;
    let finalConfidence = confidence; // Score de confiance par défaut
    
    // NOUVELLE LOGIQUE: Considérer une pensée "partiellement vérifiée" si elle a une confiance interne élevée
    // Même si elle n'a pas été vérifiée explicitement par des sources externes
    // Cela s'applique surtout aux pensées de raisonnement mathématique/logique
    if (finalStatus === 'unverified' && thought.metrics && thought.metrics.confidence > 0.65) {
      // Cas spécial: Si la pensée contient des équations, calculs ou raisonnements mathématiques
      const hasCalculations = content.match(/\d+[\+\-\*\/\^]=|sqrt\(|log\(|sin\(|cos\(|\([\d\s\+\-\*\/\^]+\)/) !== null;
      const hasMathReferences = content.includes("mathématique") || content.includes("algorithme") || 
                            content.includes("calculer") || content.includes("computation") || 
                            content.includes("complexité") || content.includes("factorisation");
      
      if (hasCalculations || hasMathReferences) {
        // Les pensées contenant des calculs ou des références mathématiques avec haute confiance 
        // sont considérées comme partiellement vérifiées
        finalStatus = 'partially_verified';
        finalConfidence = Math.max(confidence, thought.metrics.confidence * 0.8);
        console.error(`Smart-Thinking: Pensée mathématique à haute confiance (${thought.metrics.confidence.toFixed(2)}) considérée comme partiellement vérifiée`);
      } 
      // Pour les pensées avec très haute confiance interne, les considérer partiellement vérifiées même sans calculs
      else if (thought.metrics.confidence > 0.75) {
        finalStatus = 'partially_verified';
        finalConfidence = thought.metrics.confidence * 0.75; // Légèrement réduit pour réfleter l'absence de vérification externe
        console.error(`Smart-Thinking: Pensée à très haute confiance (${thought.metrics.confidence.toFixed(2)}) considérée comme partiellement vérifiée`);
      }
    }
    
    // CORRECTION: Si aucune information n'est trouvée dans les sources, forcer le statut
    if (noInformationFound && validPrimaryResults.length >= 2) {
      finalStatus = 'absence_of_information' as VerificationStatus;
      console.error(`Smart-Thinking: Statut forcé à 'absence_of_information' après détection d'absence d'information dans toutes les sources`);
      
      // Ajuster la confiance en fonction du nombre de sources qui confirment l'absence
      finalConfidence = Math.min(0.5 + (validPrimaryResults.length * 0.05), 0.7);
    }
    
    // Déterminer le statut final de vérification
    // Si au moins un outil a confirmé l'information et aucun ne l'a contredite
    if (validPrimaryResults.some(r => r && r.result && r.result.isValid === true) && 
        !validPrimaryResults.some(r => r && r.result && r.result.isValid === false)) {
      finalStatus = 'verified';
      
      // Calculer le score de confiance basé sur le nombre de confirmations et leur niveau de confiance
      const confirmedResults = validPrimaryResults.filter(r => r && r.result && r.result.isValid === true);
      const averageConfidence = confirmedResults.reduce((sum, r) => sum + (r ? r.confidence : 0), 0) / 
                               (confirmedResults.length || 1);
      
      // Ajuster en fonction du nombre de confirmations (bonus pour les confirmations multiples)
      finalConfidence = Math.min(averageConfidence + (confirmedResults.length * 0.05), 0.95);
      console.error(`Smart-Thinking: Information vérifiée avec ${confirmedResults.length} confirmations, confiance: ${finalConfidence}`);
    }
    // Si au moins un outil a confirmé partiellement l'information
    else if (validPrimaryResults.some(r => r && r.result && r.result.isValid === 'partial')) {
      finalStatus = 'partially_verified';
      
      // Calculer le score de confiance pour une vérification partielle
      const partialResults = validPrimaryResults.filter(r => r && r.result && r.result.isValid === 'partial');
      finalConfidence = Math.min(
        partialResults.reduce((sum, r) => sum + (r ? r.confidence : 0), 0) / 
        (partialResults.length || 1),
        0.75
      );
      console.error(`Smart-Thinking: Information partiellement vérifiée, confiance: ${finalConfidence}`);
    }
    // Si les outils sont en désaccord (certains confirment, d'autres contredisent)
    else if (validPrimaryResults.some(r => r && r.result && r.result.isValid === true) && 
             validPrimaryResults.some(r => r && r.result && r.result.isValid === false)) {
      finalStatus = 'contradictory';
      
      // Calculer un score de confiance réduit en cas de contradiction
      finalConfidence = 0.4;
      console.error(`Smart-Thinking: Informations contradictoires détectées, confiance réduite: ${finalConfidence}`);
    }
    // Si on a détecté une absence d'information (cas spécial)
    else if (validPrimaryResults.some(r => r && r.result && 
             (r.result.isValid === 'absence_of_information' || 
              (typeof r.result.isValid === 'string' && r.result.isValid.includes('absence'))))) {
      finalStatus = 'absence_of_information' as VerificationStatus;
      
      // Calculer un score de confiance adapté pour l'absence d'information
      const absenceResults = validPrimaryResults.filter(r => r && r.result && 
                           (r.result.isValid === 'absence_of_information' || 
                            (typeof r.result.isValid === 'string' && r.result.isValid.includes('absence'))));
      finalConfidence = Math.min(0.6 + (absenceResults.length * 0.05), 0.8);
      console.error(`Smart-Thinking: Absence d'information confirmée par ${absenceResults.length} sources, confiance: ${finalConfidence}`);
    }
    // Si les outils n'ont pas pu déterminer la validité de manière claire
    else if (validPrimaryResults.some(r => r && r.result && (r.result.isValid === null || r.result.isValid === undefined))) {
      finalStatus = 'uncertain';
      
      // Attribuer un score de confiance faible
      finalConfidence = 0.3;
      console.error(`Smart-Thinking: Incertitude sur la validité de l'information, confiance: ${finalConfidence}`);
    }
    // Par défaut si aucun cas précédent n'est satisfait
    else {
      finalStatus = 'unverified';
      finalConfidence = 0.3;
      console.error(`Smart-Thinking: Information non vérifiée, confiance par défaut: ${finalConfidence}`);
    }
    
    // IMPORTANT: Mettre à jour les métadonnées de la pensée avec le statut final correct
    thought.metadata.isVerified = finalStatus === 'verified' || finalStatus === 'partially_verified';
    
    // Important: Ajuster la métadonnée isVerified pour l'absence d'information
    // Une absence d'information confirmée est techniquement "vérifiée" mais différemment
    if (finalStatus === 'absence_of_information' as VerificationStatus) {
      thought.metadata.isVerified = true; // Nous considérons qu'une absence d'information est une information vérifiée
    }
    
    // Mise à jour du reste des métadonnées
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = verificationResults.length > 0 ? 'tools' : 'internal';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    thought.metadata.verificationStages = verificationStages;
    
    return {
      status: finalStatus,
      confidence: finalConfidence,
      sources,
      verificationSteps: steps,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      notes: this.generateVerificationNotes(verificationResults, verifiedCalculations),
      verifiedCalculations
    };
  }
  
  /**
   * Détecte si le contenu contient des affirmations factuelles
   * 
   * @param content Le contenu à analyser
   * @returns true si le contenu contient des affirmations factuelles
   */
  private containsFactualClaims(content: string): boolean {
    const factualKeywords = [
      'est', 'sont', 'a été', 'ont été', 'existe', 'existait', 'a démontré', 
      'montre', 'prouve', 'confirme', 'indique', 'révèle', 'selon', 'd\'après', 
      'en', 'depuis', 'à partir de', 'en raison de', 'parce que'
    ];
    
    return this.containsAny(content.toLowerCase(), factualKeywords);
  }
  
  /**
   * Vérifie si un texte contient l'un des termes donnés
   * 
   * @param text Le texte à vérifier
   * @param terms Les termes à rechercher
   * @returns true si le texte contient au moins un des termes, false sinon
   */
  private containsAny(text: string, terms: string[]): boolean {
    return terms.some(term => text.includes(term));
  }
  
  /**
   * Détecte si le contenu contient des opinions
   * 
   * @param content Le contenu à analyser
   * @returns true si le contenu contient des opinions
   */
  private containsOpinions(content: string): boolean {
    const opinionKeywords = [
      'je pense', 'selon moi', 'à mon avis', 'je crois', 'il me semble', 
      'pourrait', 'devrait', 'semble', 'apparemment', 'probablement',
      'peut-être', 'possiblement', 'opinion', 'point de vue', 'perspective'
    ];
    
    return this.containsAny(content.toLowerCase(), opinionKeywords);
  }
  
  /**
   * Détecte si le contenu contient des statistiques
   * 
   * @param content Le contenu à analyser
   * @returns true si le contenu contient des statistiques
   */
  private containsStatistics(content: string): boolean {
    const statisticsPatterns = [
      /\d+\s*%/, // Pourcentages
      /\d+\s*sur\s*\d+/, // X sur Y
      /moyenne/i, /médiane/i, /écart.type/i, // Termes statistiques
      /augmentation/i, /diminution/i, /croissance/i, /baisse/i, // Évolution
      /statistique/i, /données/i, /étude/i, /sondage/i, /enquête/i // Références à des sources de données
    ];
    
    return statisticsPatterns.some(pattern => pattern.test(content));
  }
  
  /**
   * Détecte si le contenu contient des références externes
   * 
   * @param content Le contenu à analyser
   * @returns true si le contenu contient des références externes
   */
  private containsExternalReferences(content: string): boolean {
    // Vérifier les URLs
    if (/https?:\/\/[^\s]+/.test(content)) {
      return true;
    }
    
    // Vérifier les citations ou mentions de sources
    const referencePatterns = [
      /selon\s+[^,.]+/, // "selon X"
      /d'après\s+[^,.]+/, // "d'après X"
      /\bcit[eé]\b/, // "cité" ou "cite"
      /d'(une|[l']) étude/i, // référence à une étude
      /référence/i, /source/i, // mentions explicites
      /publié/i, /rapport/i, /article/i, // publications
      /dans ([A-Z][^,.]+)/, // Potentielles sources commencant par une majuscule "dans Le Monde"
      /"[^"]{10,}"/ // Citations entre guillemets d'au moins 10 caractères
    ];
    
    return referencePatterns.some(pattern => pattern.test(content));
  }

  /**
   * Récupère les statuts de vérification des pensées connectées
   * 
   * @param thoughtIds IDs des pensées connectées à vérifier
   * @returns Tableau des statuts de vérification
   */
  private async getConnectedThoughtsVerificationStatus(thoughtIds: string[]): Promise<VerificationStatus[]> {
    // Ici, il faudrait implémenter la logique pour récupérer les statuts
    // Dans une implémentation réelle, nous interrogerions le graphe de pensées
    // Pour le moment, on utilise une valeur par défaut pour démontrer le principe
    return thoughtIds.map(_ => 'partially_verified' as VerificationStatus);
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