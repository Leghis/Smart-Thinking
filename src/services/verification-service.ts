import { ThoughtNode, VerificationStatus, VerificationResult, CalculationVerificationResult, VerificationDetailedStatus, SuggestedTool } from '../types';
import { VerificationMemory, VerificationSearchResult } from '../verification-memory';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { MathEvaluator } from '../utils/math-evaluator';
import { VerificationConfig, SystemConfig } from '../config';
import { IVerificationService, PreliminaryVerificationResult, PreviousVerificationResult } from './verification-service.interface';

/**
 * Classe LRUCache optimisée pour la mise en cache des résultats
 * @template K Type de clé
 * @template V Type de valeur
 */
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V> = new Map();
  
  /**
   * Crée une nouvelle instance de LRUCache
   * @param capacity Capacité maximale du cache
   */
  constructor(capacity: number) {
    this.capacity = capacity;
  }
  
  /**
   * Récupère une valeur du cache
   * @param key Clé à rechercher
   * @returns Valeur associée à la clé ou undefined si non trouvée
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Déplacer l'élément à la fin pour le LRU
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value!);
    
    return value;
  }
  
  /**
   * Ajoute ou met à jour une entrée dans le cache
   * @param key Clé de l'entrée
   * @param value Valeur à stocker
   */
  put(key: K, value: V): void {
    // Supprimer l'élément s'il existe déjà
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Supprimer le plus ancien si la capacité est atteinte
    else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      // Vérifier que oldestKey n'est pas undefined avant de l'utiliser
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    
    // Ajouter le nouvel élément
    this.cache.set(key, value);
  }
  
  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
  }
  
  /**
   * Retourne la taille actuelle du cache
   */
  get size(): number {
    return this.cache.size;
  }
  
  /**
   * Vérifie si une clé existe dans le cache
   * @param key Clé à vérifier
   * @returns true si la clé existe, false sinon
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }
}

/**
 * Interface pour les caractéristiques du contenu
 */
interface ContentCharacteristics {
  hasFactualClaims: boolean;
  hasOpinions: boolean;
  hasStatistics: boolean;
  hasExternalRefs: boolean;
  hasCalculations: boolean;
}

/**
 * Service optimisé pour la vérification des informations
 * Utilise des expressions régulières précompilées, un cache LRU, et des promesses optimisées
 */
export class VerificationService implements IVerificationService {
  private toolIntegrator: ToolIntegrator;
  private metricsCalculator: MetricsCalculator;
  private verificationMemory: VerificationMemory;
  
  /**
   * Expressions régulières précompilées et mises en cache
   * pour une détection optimisée des caractéristiques
   */
  private static readonly REGEX_CACHE = {
    FACTUAL_CLAIMS: new RegExp('\\b(est|sont|a été|ont été|existe|existait|a démontré|montre|prouve|confirme|indique|révèle)\\b', 'i'),
    STATISTICS: new RegExp('\\b(\\d+\\s*%|moyenne|médiane|écart.type|statistique|données|étude|sondage|enquête)\\b', 'i'),
    OPINIONS: new RegExp('\\b(je pense|selon moi|à mon avis|je crois|il me semble|pourrait|devrait|semble|apparemment|probablement|peut-être)\\b', 'i'),
    EXTERNAL_REFS: new RegExp('(https?:\\/\\/[^\\s]+|selon\\s+[^,.]+|d\'après\\s+[^,.]+|\\bcit[eé]\\b|d\'(une|l\') étude|référence|source|publié|rapport|article)', 'i'),
    CALCULATIONS: new RegExp('(\\d+\\s*[\\+\\-\\*\\/]\\s*\\d+\\s*=|\\d+(?:[\\³\\²\\¹])|calcul\\s*(?:complexe|avancé)?\\s*:?\\s*([^=]+)=\\s*\\d+|=\\s*[\\d\\-+]+\\s*=\\s*[\\d\\-+]+)', 'i')
  };
  
  /**
   * Cache LRU pour les résultats de vérification
   */
  private static readonly verificationCache = new LRUCache<string, VerificationResult>(100);
  
  /**
   * Cache LRU pour les résultats de calcul
   */
  private static readonly calculationCache = new LRUCache<string, CalculationVerificationResult[]>(50);

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
   * Version optimisée utilisant le cache et une détection plus efficace
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
    
    // Détection optimisée des calculs en utilisant l'expression régulière précompilée
    const hasCalculations = VerificationService.REGEX_CACHE.CALCULATIONS.test(content);
    
    if (explicitlyRequested || hasCalculations) {
      console.error('Smart-Thinking: Détection de calculs, recherche d\'outils de vérification externe...');
      verificationInProgress = true;
      
      // Générer une clé de cache basée sur le contenu
      const cacheKey = `prelim_${this.hashString(content)}`;
      
      // Vérifier si le résultat est dans le cache
      const cachedResults = VerificationService.calculationCache.get(cacheKey);
      if (cachedResults) {
        console.error('Smart-Thinking: Utilisation des résultats préliminaires en cache');
        verifiedCalculations = cachedResults;
        initialVerification = true;
        
        if (verifiedCalculations && verifiedCalculations.length > 0) {
          preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
        }
        
        return {
          verifiedCalculations,
          initialVerification,
          verificationInProgress,
          preverifiedThought
        };
      }
      
      // Vérifier s'il existe des outils de vérification adaptés
      const calculationTools = this.toolIntegrator.suggestVerificationTools(content)
        .filter(tool => tool.name.toLowerCase().includes('calc') || 
               tool.name.toLowerCase().includes('math') || 
               tool.name.toLowerCase().includes('python') || 
               tool.name.toLowerCase().includes('javascript'));
      
      if (calculationTools.length > 0) {
        console.error(`Smart-Thinking: Utilisation de l'outil externe ${calculationTools[0].name} pour vérifier les calculs`);
        try {
          // Utiliser executeWithTimeout pour éviter les opérations bloquantes
          const result = await this.executeWithTimeout(
            this.toolIntegrator.executeVerificationTool(calculationTools[0].name, content), 
            5000
          );
          
          if (result && result.verifiedCalculations) {
            verifiedCalculations = result.verifiedCalculations;
            initialVerification = true;
            
            if (verifiedCalculations && verifiedCalculations.length > 0) {
              preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
              console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs vérifiés via outil externe`);
              
              // Mettre en cache les résultats
              VerificationService.calculationCache.put(cacheKey, verifiedCalculations);
            }
            
            return {
              verifiedCalculations,
              initialVerification,
              verificationInProgress,
              preverifiedThought
            };
          }
        } catch (error) {
          console.error(`Smart-Thinking: Erreur lors de l'utilisation de l'outil externe:`, error);
        }
      }
      
      // Utiliser la vérification interne
      console.error('Smart-Thinking: Vérification interne des calculs...');
      
      try {
        verifiedCalculations = await this.detectAndVerifyCalculations(content);
        initialVerification = verifiedCalculations.length > 0;
        
        if (verifiedCalculations.length > 0) {
          preverifiedThought = this.annotateThoughtWithVerifications(content, verifiedCalculations);
          console.error(`Smart-Thinking: ${verifiedCalculations.length} calculs détectés et vérifiés`);
          
          // Mettre en cache les résultats
          VerificationService.calculationCache.put(cacheKey, verifiedCalculations);
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
   * Version optimisée avec gestion de cache
   * 
   * @param content Le contenu de la pensée à vérifier
   * @param sessionId ID de session
   * @param thoughtType Type de pensée (regular, conclusion, etc.)
   * @param connectedThoughtIds IDs des pensées connectées  
   * @returns Résultat de la vérification précédente si trouvée
   */
  public async checkPreviousVerification(
    content: string,
    sessionId: string = SystemConfig.DEFAULT_SESSION_ID,
    thoughtType: string = 'regular',
    connectedThoughtIds: string[] = []
  ): Promise<PreviousVerificationResult> {
    // Générer une clé de cache
    const cacheKey = `prev_${this.hashString(content)}_${sessionId}`;
    
    // Vérifier le cache local pour les vérifications précédentes
    const cachedResult = VerificationService.verificationCache.get(cacheKey);
    if (cachedResult) {
      console.error('Smart-Thinking: Résultat de vérification précédente trouvé dans le cache');
      
      // Construire un résultat à partir du cache
      return {
        previousVerification: {
          id: cacheKey,
          status: cachedResult.status as VerificationStatus,
          confidence: cachedResult.confidence,
          sources: cachedResult.sources || [],
          timestamp: new Date(),
          similarity: 1.0, // Correspondance exacte du cache
          text: content
        },
        isVerified: cachedResult.status === 'verified' || cachedResult.status === 'partially_verified',
        verificationStatus: cachedResult.status as VerificationDetailedStatus,
        certaintySummary: `Information vérifiée précédemment (mise en cache).`,
        verification: cachedResult
      };
    }
    
    // Valeurs par défaut
    const result: PreviousVerificationResult = {
      previousVerification: null,
      isVerified: false,
      verificationStatus: 'unverified' as VerificationDetailedStatus,
      certaintySummary: 'Information non vérifiée'
    };
    
    try {
      // Seuil de similarité élevé pour éviter les fausses correspondances
      const similarityThreshold = VerificationConfig.SIMILARITY.HIGH_SIMILARITY;
      
      console.error(`Smart-Thinking: Recherche de vérifications précédentes avec seuil ${similarityThreshold}...`);
      
      const previousVerification = await this.verificationMemory.findVerification(
        content,
        sessionId,
        similarityThreshold
      );
      
      if (previousVerification) {
        console.error(`Smart-Thinking: Vérification précédente trouvée avec similarité: ${previousVerification.similarity}`);
        
        // Ne marquer comme vérifié que si le niveau de similarité est vraiment élevé
        // et si les sources sont valides
        const isValidSource = previousVerification.sources && 
                              previousVerification.sources.length > 0 && 
                              !previousVerification.sources.includes("Information non vérifiable");
        
        const isVerified = ['verified', 'partially_verified'].includes(previousVerification.status) && 
                           previousVerification.similarity >= VerificationConfig.SIMILARITY.HIGH_SIMILARITY &&
                           isValidSource;
        
        // Ajuster le niveau de confiance en fonction de la similarité
        const adjustedConfidence = Math.min(previousVerification.confidence, previousVerification.similarity);
        
        // Construire la réponse avec les informations de vérification précédente
        const result = {
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
        
        // Mettre en cache le résultat si vérifié
        if (isVerified && result.verification) {
          VerificationService.verificationCache.put(cacheKey, result.verification);
        }
        
        return result;
      } 
      // Propagation du statut pour les pensées de type conclusion ou revision
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
          
          // Mettre en cache ce résultat également
          VerificationService.verificationCache.put(cacheKey, result.verification);
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
   * Version refactorisée et optimisée
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
    console.error(`Smart-Thinking: Début de la vérification approfondie`);
    
    // Vérifier le cache local si la vérification n'est pas forcée
    if (!forceVerification) {
      const cacheKey = `verify_${this.hashString(content)}`;
      const cachedResult = VerificationService.verificationCache.get(cacheKey);
      
      if (cachedResult) {
        console.error('Smart-Thinking: Résultat de vérification trouvé dans le cache');
        
        // Mettre à jour les métadonnées de la pensée
        thought.metadata.isVerified = cachedResult.status === 'verified' || cachedResult.status === 'partially_verified';
        thought.metadata.verificationSource = 'cache';
        thought.metadata.verificationTimestamp = new Date();
        thought.metadata.verificationSessionId = sessionId;
        
        return cachedResult;
      }
    }
    
    // Étape 1: Vérifier si l'information a déjà été vérifiée
    const previousVerification = await this.checkForPreviousVerification(thought, forceVerification, sessionId);
    if (previousVerification) return previousVerification;
    
    // Étape 2: Déterminer les besoins de vérification
    const verificationNeeds = await this.analyzeVerificationNeeds(thought.content);
    
    // Étape 3: Sélectionner et exécuter les outils appropriés
    const verificationResults = await this.executeVerificationTools(thought.content, verificationNeeds);
    
    // Étape 4: Vérifier les calculs si nécessaire
    const verifiedCalculations = containsCalculations ? 
      await this.verifyCalculations(thought.content, verificationResults) : undefined;
    
    // Étape 5: Agréger et analyser les résultats
    return this.analyzeAndAggregateResults(thought, verificationResults, verifiedCalculations, sessionId);
  }
  
  /**
   * Étape 1: Vérifier si l'information a déjà été vérifiée dans les vérifications précédentes
   * 
   * @param thought La pensée à vérifier
   * @param forceVerification Si true, ignore les vérifications précédentes
   * @param sessionId Identifiant de la session
   * @returns Le résultat de vérification si trouvé, null sinon
   */
  private async checkForPreviousVerification(
    thought: ThoughtNode, 
    forceVerification: boolean,
    sessionId: string
  ): Promise<VerificationResult | null> {
    if (forceVerification) {
      console.error('Smart-Thinking: Vérification forcée, ignorer les vérifications précédentes');
      return null;
    }
    
    const previousCheckResult = await this.checkPreviousVerification(
      thought.content, 
      sessionId, 
      thought.type, 
      thought.connections.map(c => c.targetId)
    );
    
    if (previousCheckResult.previousVerification && previousCheckResult.isVerified && previousCheckResult.verification) {
      console.error('Smart-Thinking: Utilisation d\'une vérification précédente trouvée en mémoire');
      
      // Mettre à jour les métadonnées de la pensée
      thought.metadata.isVerified = previousCheckResult.isVerified;
      thought.metadata.verificationSource = 'memory';
      thought.metadata.verificationTimestamp = previousCheckResult.previousVerification.timestamp;
      thought.metadata.verificationSessionId = sessionId;
      thought.metadata.semanticSimilarity = previousCheckResult.previousVerification.similarity;
      
      // Retourner la vérification existante
      return previousCheckResult.verification;
    }
    
    return null;
  }
  
  /**
   * Étape 2: Analyser les besoins de vérification
   * 
   * @param content Contenu à analyser
   * @returns Les besoins de vérification déterminés
   */
  private async analyzeVerificationNeeds(
    content: string
  ): Promise<{
    contentCharacteristics: ContentCharacteristics;
    verificationRequirements: any;
  }> {
    console.error('Smart-Thinking: Analyse des besoins de vérification');
    
    // Analyser le contenu en une seule passe (optimisé)
    const contentCharacteristics = this.analyzeContentCharacteristics(content);
    
    // Étiqueter les catégories de contenu détectées
    const contentCategories = [];
    if (contentCharacteristics.hasFactualClaims) contentCategories.push('claims');
    if (contentCharacteristics.hasCalculations) contentCategories.push('calculations');
    if (contentCharacteristics.hasOpinions) contentCategories.push('opinions');
    if (contentCharacteristics.hasStatistics) contentCategories.push('statistics');
    if (contentCharacteristics.hasExternalRefs) contentCategories.push('references');
    
    console.error(`Smart-Thinking: Catégories de contenu détectées: ${contentCategories.join(', ') || 'aucune spécifique'}`);
    
    // Déterminer les besoins de vérification
    const verificationRequirements = this.metricsCalculator.determineVerificationRequirements(content);
    
    return {
      contentCharacteristics,
      verificationRequirements
    };
  }
  
  /**
   * Étape 3: Sélectionner et exécuter les outils de vérification
   * 
   * @param content Contenu à vérifier
   * @param verificationNeeds Besoins de vérification déterminés
   * @returns Résultats de vérification
   */
  private async executeVerificationTools(
    content: string,
    verificationNeeds: any
  ): Promise<any[]> {
    console.error('Smart-Thinking: Sélection et exécution des outils de vérification');
    
    // Obtenir les outils de vérification recommandés
    const verificationTools = this.toolIntegrator.suggestVerificationTools(content);
    
    if (verificationTools.length === 0) {
      console.error('Smart-Thinking: Aucun outil de vérification disponible');
      return [];
    }
    
    console.error(`Smart-Thinking: ${verificationTools.length} outils de vérification disponibles`);
    
    // Calculer le nombre optimal d'outils à utiliser
    const baseToolCount = Math.min(
      verificationNeeds.verificationRequirements.requiresMultipleVerifications ? 
        verificationNeeds.verificationRequirements.recommendedVerificationsCount : 1,
      Math.max(1, verificationTools.length)
    );
    
    // Ajuster le nombre d'outils en fonction de la complexité
    const contentCategories = Object.values(verificationNeeds.contentCharacteristics)
      .filter(value => value === true).length;
    
    const toolsToUse = Math.min(
      contentCategories > 2 ? baseToolCount + 1 : baseToolCount,
      verificationTools.length
    );
    
    console.error(`Smart-Thinking: Utilisation de ${toolsToUse} outil(s) externe(s) pour la vérification`);
    
    // Exécuter les vérifications avec Promise.allSettled et timeouts
    const verificationPromises = verificationTools.slice(0, toolsToUse).map(
      async (tool: SuggestedTool) => {
        return this.executeWithTimeout(
          (async () => {
            try {
              console.error(`Smart-Thinking: Utilisation de l'outil de vérification "${tool.name}"...`);
              const result = await this.toolIntegrator.executeVerificationTool(tool.name, content);
              
              // Vérifier si l'outil a retourné un résultat exploitable
              const isValidResult = result && 
                (result.isValid !== undefined || 
                result.verifiedCalculations || 
                result.sources || 
                result.details);
              
              if (isValidResult) {
                console.error(`Smart-Thinking: Vérification avec "${tool.name}" terminée avec succès`);
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
          })(),
          10000 // 10 secondes de timeout
        );
      }
    );
    
    // Attendre la résolution de toutes les promesses avec Promise.allSettled
    const settledResults = await Promise.allSettled(verificationPromises);
    
    // Filtrer les résultats réussis
    const verificationResults = settledResults
      .filter((result): result is PromiseFulfilledResult<any> => 
        result.status === 'fulfilled' && result.value !== null)
      .map(result => result.value);
    
    console.error(`Smart-Thinking: ${verificationResults.length}/${verificationPromises.length} vérifications réussies`);
    
    return verificationResults;
  }
  
  /**
   * Étape 4: Vérifier les calculs si nécessaire
   * 
   * @param content Contenu à vérifier
   * @param verificationResults Résultats de vérification existants
   * @returns Résultats de vérification des calculs
   */
  private async verifyCalculations(
    content: string,
    verificationResults: any[]
  ): Promise<CalculationVerificationResult[] | undefined> {
    console.error('Smart-Thinking: Vérification des calculs');
    
    // Vérifier si des calculs ont déjà été vérifiés par les outils externes
    for (const result of verificationResults) {
      if (result && result.result && result.result.verifiedCalculations) {
        console.error(`Smart-Thinking: Calculs vérifiés par l'outil externe "${result.toolName}"`);
        return result.result.verifiedCalculations;
      }
    }
    
    console.error('Smart-Thinking: Aucun outil externe n\'a vérifié les calculs, utilisation de la vérification interne');
    
    // Générer une clé de cache pour les calculs
    const cacheKey = `calc_${this.hashString(content)}`;
    
    // Vérifier si les résultats sont dans le cache
    const cachedResults = VerificationService.calculationCache.get(cacheKey);
    if (cachedResults) {
      console.error('Smart-Thinking: Utilisation des résultats de calcul en cache');
      return cachedResults;
    }
    
    // Si pas dans le cache, utiliser la détection interne
    const verifiedCalculations = await this.detectAndVerifyCalculations(content);
    
    // Mettre en cache les résultats
    if (verifiedCalculations.length > 0) {
      VerificationService.calculationCache.put(cacheKey, verifiedCalculations);
    }
    
    return verifiedCalculations;
  }
  
  /**
   * Étape 5: Analyser et agréger les résultats
   * 
   * @param thought Pensée à vérifier
   * @param verificationResults Résultats de vérification
   * @param verifiedCalculations Résultats de vérification des calculs
   * @param sessionId ID de session
   * @returns Résultat final de vérification
   */
  private async analyzeAndAggregateResults(
    thought: ThoughtNode,
    verificationResults: any[],
    verifiedCalculations: CalculationVerificationResult[] | undefined,
    sessionId: string
  ): Promise<VerificationResult> {
    console.error('Smart-Thinking: Analyse et agrégation des résultats');
    
    // Déterminer le statut et le niveau de confiance de manière optimisée
    const { status, confidence } = this.determineVerificationStatusAndConfidence(
      verificationResults,
      thought
    );
    
    console.error(`Smart-Thinking: Statut préliminaire: ${status}, confiance: ${confidence.toFixed(2)}`);
    
    // Construire la liste des sources et des étapes
    const sources = verificationResults.map(r => {
      const source = r.result.source || `${r.toolName} (source non spécifiée)`;
      return `${r.toolName}: ${source}`;
    });
    
    const verificationStages = ['vérification principale'];
    if (verifiedCalculations && verifiedCalculations.length > 0) {
      verificationStages.push('vérification des calculs');
    }
    
    const steps = [
      ...verificationStages.map(stage => `Étape de ${stage}`),
      ...verificationResults.map(r => `Vérifié avec ${r.toolName} (${r.stage})`)
    ];
    
    // Détecter les contradictions
    const contradictions = this.detectContradictions(verificationResults);
    
    // Générer des notes de vérification
    const notes = this.generateVerificationNotes(verificationResults, verifiedCalculations);
    
    // IMPORTANT: Mettre à jour les métadonnées de la pensée
    thought.metadata.isVerified = status === 'verified' || status === 'partially_verified';
    thought.metadata.verificationTimestamp = new Date();
    thought.metadata.verificationSource = verificationResults.length > 0 ? 'tools' : 'internal';
    thought.metadata.verificationSessionId = sessionId;
    thought.metadata.verificationToolsUsed = verificationResults.length;
    thought.metadata.verificationStages = verificationStages;
    
    // Ajustement spécial pour "absence d'information"
    if (status === 'absence_of_information') {
      thought.metadata.isVerified = true; // Nous considérons qu'une absence d'information est une information vérifiée
    }
    
    // Construire le résultat final
    const verificationResult: VerificationResult = {
      status,
      confidence,
      sources,
      verificationSteps: steps,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      notes,
      verifiedCalculations
    };
    
    // Stocker le résultat dans le cache
    const cacheKey = `verify_${this.hashString(thought.content)}`;
    VerificationService.verificationCache.put(cacheKey, verificationResult);
    
    // Stocker le résultat dans la mémoire de vérification
    await this.storeVerification(
      thought.content,
      status,
      confidence,
      sources,
      sessionId
    );
    
    console.error(`Smart-Thinking: Vérification complétée, statut final: ${status}, confiance: ${confidence.toFixed(2)}`);
    
    return verificationResult;
  }
  
  /**
   * Détermine le statut et la confiance de la vérification à partir des résultats
   * Version optimisée et factorisée
   * 
   * @param results Résultats de vérification
   * @param thought Pensée à vérifier
   * @returns Statut et niveau de confiance
   */
  private determineVerificationStatusAndConfidence(
    results: any[],
    thought: ThoughtNode
  ): { status: VerificationStatus; confidence: number } {
    // Vérifier si résultats vides
    if (results.length === 0) {
      return {
        status: 'unverified',
        confidence: Math.min(0.3, thought.metrics?.confidence || 0.3)
      };
    }
    
    // Variables pour stocker les compteurs
    const counts = {
      verified: results.filter(r => r && r.result && r.result.isValid === true).length,
      contradicted: results.filter(r => r && r.result && r.result.isValid === false).length,
      partial: results.filter(r => r && r.result && r.result.isValid === 'partial').length,
      absence: results.filter(r => r && r.result && 
        (r.result.isValid === 'absence_of_information' || 
         (typeof r.result.isValid === 'string' && r.result.isValid.includes('absence')))).length,
      uncertain: results.filter(r => r && r.result && 
        (r.result.isValid === null || r.result.isValid === undefined)).length
    };
    
    // Déterminer l'état en fonction des compteurs
    if (counts.verified > 0 && counts.contradicted === 0) {
      // Information vérifiée sans contradiction
      const averageConfidence = this.calculateAverageConfidence(
        results.filter(r => r && r.result && r.result.isValid === true)
      );
      
      return {
        status: 'verified',
        confidence: Math.min(averageConfidence + (counts.verified * 0.05), 0.95)
      };
    } else if (counts.partial > 0) {
      // Information partiellement vérifiée
      const averageConfidence = this.calculateAverageConfidence(
        results.filter(r => r && r.result && r.result.isValid === 'partial')
      );
      
      return {
        status: 'partially_verified',
        confidence: Math.min(averageConfidence, 0.75)
      };
    } else if (counts.verified > 0 && counts.contradicted > 0) {
      // Information contradictoire
      return {
        status: 'contradictory',
        confidence: 0.4
      };
    } else if (counts.absence > 0) {
      // Absence d'information
      return {
        status: 'absence_of_information' as VerificationStatus,
        confidence: Math.min(0.6 + (counts.absence * 0.05), 0.8)
      };
    } else if (counts.uncertain > 0) {
      // Information incertaine
      return {
        status: 'uncertain',
        confidence: 0.3
      };
    } else {
      // Par défaut, non vérifié
      return {
        status: 'unverified',
        confidence: 0.3
      };
    }
  }
  
  /**
   * Calcule la confiance moyenne à partir des résultats
   * 
   * @param results Résultats pour lesquels calculer la moyenne
   * @returns Confiance moyenne
   */
  private calculateAverageConfidence(results: any[]): number {
    if (results.length === 0) return 0.5;
    
    return results.reduce((sum, r) => sum + (r ? r.confidence : 0), 0) / results.length;
  }

  /**
   * Détecte et vérifie les calculs dans un texte de manière asynchrone
   * Version optimisée avec mise en cache
   * 
   * @param content Le texte contenant potentiellement des calculs
   * @returns Une promesse résolvant vers un tableau de résultats de vérification de calculs
   */
  public async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    // Générer une clé de cache basée sur le contenu
    const cacheKey = `calc_${this.hashString(content)}`;
    
    // Vérifier si le résultat est dans le cache
    const cachedResults = VerificationService.calculationCache.get(cacheKey);
    if (cachedResults) {
      console.error('Smart-Thinking: Utilisation des résultats de calcul en cache');
      return cachedResults;
    }
    
    console.error('Smart-Thinking: Détection et vérification des calculs avec MathEvaluator');
    
    try {
      const evaluationResults = MathEvaluator.detectAndEvaluate(content);
      console.error(`Smart-Thinking: ${evaluationResults.length} calcul(s) détecté(s)`);
      
      // Filtrer les évaluations vides ou les notations de fonctions
      const filteredResults = evaluationResults.filter((result: any) => 
        !isNaN(result.result) || 
        (result.context === "notation_fonction")
      );
      
      // Convertir les résultats au format CalculationVerificationResult
      const results = MathEvaluator.convertToVerificationResults(filteredResults);
      
      // Mettre en cache les résultats
      VerificationService.calculationCache.put(cacheKey, results);
      
      return results;
    } catch (error) {
      console.error('Smart-Thinking: Erreur lors de la détection des calculs:', error);
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
   * Version optimisée de la détection des contradictions
   * 
   * @param results Résultats à analyser
   * @returns Tableau des contradictions détectées
   */
  private detectContradictions(results: any[]): string[] {
    if (results.length < 2) return [];
    
    // Structure de données pour stocker les contradictions
    const contradictions: string[] = [];
    const validResults = results.filter(r => r && r.result && r.result.isValid !== undefined);
    
    // Tableau d'assertions positives et négatives
    const positiveResults = validResults.filter(r => r.result.isValid === true);
    const negativeResults = validResults.filter(r => r.result.isValid === false);
    
    // Si pas de contradiction, retourner tableau vide
    if (positiveResults.length === 0 || negativeResults.length === 0) {
      return [];
    }
    
    // Génération des contradictions
    for (const pos of positiveResults) {
      for (const neg of negativeResults) {
        contradictions.push(`Contradiction entre ${pos.toolName} (confirme) et ${neg.toolName} (contredit)`);
      }
    }
    
    // Limiter le nombre de contradictions rapportées
    return contradictions.slice(0, 5);
  }

  /**
   * Version optimisée et plus informative de la génération des notes de vérification
   * 
   * @param results Résultats de vérification
   * @param calculations Résultats de vérification des calculs
   * @returns Notes de vérification
   */
  private generateVerificationNotes(results: any[], calculations?: CalculationVerificationResult[]): string {
    if (results.length === 0 && (!calculations || calculations.length === 0)) {
      return "Aucune vérification n'a été effectuée.";
    }
    
    const notes: string[] = [];
    
    // Ajouter informations sur les outils externes
    if (results.length > 0) {
      const toolsUsed = Array.from(new Set(results.map(r => r.toolName))).join(', ');
      notes.push(`Vérification effectuée avec les outils externes suivants: ${toolsUsed}.`);
      
      // Ajouter statistiques sur les résultats
      const confirmedCount = results.filter(r => r.result?.isValid === true).length;
      const contradictedCount = results.filter(r => r.result?.isValid === false).length;
      const uncertainCount = results.filter(r => r.result?.isValid !== true && r.result?.isValid !== false).length;
      
      if (confirmedCount > 0) {
        notes.push(`${confirmedCount} source(s) a(ont) confirmé l'information.`);
      }
      if (contradictedCount > 0) {
        notes.push(`${contradictedCount} source(s) a(ont) contredit l'information.`);
      }
      if (uncertainCount > 0) {
        notes.push(`${uncertainCount} source(s) n'a(ont) pas pu se prononcer.`);
      }
    }
    
    // Ajouter informations sur les calculs vérifiés
    if (calculations && calculations.length > 0) {
      const correctCount = calculations.filter(c => c.isCorrect).length;
      const incorrectCount = calculations.length - correctCount;
      
      notes.push(`${calculations.length} calcul(s) mathématique(s) vérifié(s), dont ${correctCount} correct(s) et ${incorrectCount} incorrect(s).`);
    }
    
    return notes.join(' ');
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
   * Analyse les caractéristiques du contenu en une seule passe
   * 
   * @param content Contenu à analyser
   * @returns Caractéristiques détectées
   */
  private analyzeContentCharacteristics(content: string): ContentCharacteristics {
    return {
      hasFactualClaims: VerificationService.REGEX_CACHE.FACTUAL_CLAIMS.test(content),
      hasOpinions: VerificationService.REGEX_CACHE.OPINIONS.test(content),
      hasStatistics: VerificationService.REGEX_CACHE.STATISTICS.test(content),
      hasExternalRefs: VerificationService.REGEX_CACHE.EXTERNAL_REFS.test(content),
      hasCalculations: VerificationService.REGEX_CACHE.CALCULATIONS.test(content)
    };
  }

  /**
   * Exécute une promesse avec un timeout pour éviter les opérations bloquantes
   * 
   * @param promise Promesse à exécuter
   * @param timeoutMs Délai d'expiration en millisecondes
   * @returns Résultat de la promesse ou null en cas de timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number = 5000): Promise<T | null> {
    let timeoutHandle: NodeJS.Timeout;
    
    const timeoutPromise = new Promise<null>(resolve => {
      timeoutHandle = setTimeout(() => resolve(null), timeoutMs);
    });
    
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutHandle!);
      return result;
    } catch (error) {
      clearTimeout(timeoutHandle!);
      console.error('Smart-Thinking: Erreur ou timeout lors de l\'exécution:', error);
      return null;
    }
  }
  
  /**
   * Génère un hash simple pour une chaîne (utilisé pour les clés de cache)
   * 
   * @param str Chaîne à hacher
   * @returns Hash sous forme de chaîne
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }
}