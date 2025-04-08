import { 
  ThoughtNode, 
  ThoughtMetrics, 
  Connection, 
  ConnectionType, 
  VerificationStatus,
  CalculationVerificationResult
} from './types';
import { analyzeForMetric } from './utils/openrouter-client'; // Import the new utility

/**
 * metrics-calculator.ts - VERSION OPTIMISÉE
 *
 * Système centralisé pour tous les calculs de métriques dans Smart-Thinking
 * Implémente des algorithmes avancés optimisés pour calculer la confiance, la pertinence,
 * la qualité et autres métriques utilisées par le système.
 */

/**
 * Classe qui centralise tous les calculs de métriques dans Smart-Thinking.
 * Cette classe implémente des algorithmes avancés pour le calcul de confiance,
 * la pertinence, la qualité et d'autres métriques utilisées dans le système.
 */
export class MetricsCalculator {

  // Dictionnaires de mots indicateurs pour l'analyse linguistique
  private positiveWords: string[] = [
    'précis', 'clair', 'cohérent', 'logique', 'détaillé', 'rigoureux', 'méthodique',
    'analytique', 'systématique', 'fondé', 'approfondi', 'équilibré', 'objectif',
    'exact', 'raisonnable', 'valide', 'pertinent', 'significatif'
  ];

  private negativeWords: string[] = [
    'vague', 'confus', 'incohérent', 'illogique', 'superficiel', 'flou', 'ambigu',
    'subjectif', 'inexact', 'imprécis', 'douteux', 'spéculatif', 'non pertinent',
    'biaisé', 'contradictoire', 'simpliste', 'circulaire'
  ];

  // Indicateurs de qualité par type de pensée
  private qualityIndicators: Record<string, {positive: string[], negative: string[]}> = {
    'regular': {
      positive: ['clairement formulé', 'bien structuré', 'idée développée'],
      negative: ['incomplet', 'hors sujet', 'mal structuré']
    },
    'meta': {
      positive: ['auto-critique', 'réflexif', 'évaluatif', 'conscient'],
      negative: ['superficiel', 'non réflexif', 'auto-complaisant']
    },
    'hypothesis': {
      positive: ['testable', 'falsifiable', 'précis', 'fondé sur', 'prédictif'],
      negative: ['vague', 'non testable', 'infalsifiable', 'sans fondement']
    },
    'conclusion': {
      positive: ['synthétise', 'résume', 'découle de', 'cohérent avec'],
      negative: ['déconnecté', 'sans rapport', 'non justifié', 'contradictoire']
    },
    'revision': {
      positive: ['améliore', 'corrige', 'précise', 'clarifie', 'nuance'],
      negative: ['répétitif', 'redondant', 'contredit sans justification']
    }
  };

  // Modalisateurs de certitude/incertitude pour l'analyse linguistique
  private uncertaintyModifiers: string[] = [
    'peut-être', 'possible', 'probablement', 'semble',
    'pourrait', 'hypothèse', 'suppose', 'doute', 
    'éventuellement', 'potentiellement', 'apparemment', 'suggère'
  ];

  private certaintyModifiers: string[] = [
    'certainement', 'clairement', 'évidemment', 'sans doute', 'indiscutablement',
    'nécessairement', 'doit', 'est', 'démontré', 'prouvé', 'assurément',
    'incontestablement', 'manifestement', 'définitivement', 'inévitablement'
  ];

  // Mots-stop en français (stop words) - OPTIMISATION: Utilisation d'un Set pour recherche O(1)
  private stopWords: Set<string> = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui',
    'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'est', 'sont', 'être', 'avoir', 'fait', 'faire',
    'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup'
  ]);

  // OPTIMISATION: Pré-compilation des expressions régulières
  private REGEX = {
    REFERENCES: /\(([^)]+)\)|\[[^\]]+\]/g,
    NUMBERS: /\d+([.,]\d+)?%?/g,
    PUNCTUATION: /[.,\/#!$%\^&\*;:{}=\-_`~()]/g,
    WHITESPACE: /\s+/,
    SENTENCES: /[.!?]+/,
    UNCERTAINTY_MODIFIERS: null as RegExp | null,
    CERTAINTY_MODIFIERS: null as RegExp | null,
    MATH_CALCULATION: /(?:\d+(?:\.\d+)?)\s*(?:[+\-*/^]|plus|moins|divisé|fois|multiplié)\s*(?:\d+(?:\.\d+)?)/i,
    MATHEMATICAL_PROOF: /(?:prouvons|démontrons|supposons|soit|démonstration|preuve|CQFD|théorème|lemme|corollaire)/i,
    LOGICAL_DEDUCTION: /(?:donc|par conséquent|ainsi|il s'ensuit que|cela implique|on en déduit|cela prouve)/i,
    FACTUAL_CLAIM: /(?:est|sont|était|étaient|a été|ont été|sera|seront)\s+(?:un|une|des|le|la|les|du|de la)/i,
    STRONG_EMOTION: /(?:!{2,}|incroyable|fantastique|horrible|déteste|adore|absolument|totalement|complètement|extrêmement)/i
  };

  // OPTIMISATION: Mappage pour les types de pensée
  private typeScoresMap: Map<string, number> = new Map([
    ['conclusion', 0.8],
    ['hypothesis', 0.6],
    ['meta', 0.7],
    ['revision', 0.75],
    ['regular', 0.65]
  ]);

  // OPTIMISATION: Mappage pour les types de connexion
  private connectionWeightsMap: Map<ConnectionType, number> = new Map([
    ['supports', 0.9],
    ['contradicts', 0.7],
    ['refines', 0.8],
    ['branches', 0.6],
    ['derives', 0.75],
    ['associates', 0.5],
    ['exemplifies', 0.7],
    ['generalizes', 0.75],
    ['compares', 0.6],
    ['contrasts', 0.65],
    ['questions', 0.5],
    ['extends', 0.7],
    ['analyzes', 0.8],
    ['synthesizes', 0.85],
    ['applies', 0.7],
    ['evaluates', 0.8],
    ['cites', 0.9],
    ['extended-by', 0.7],
    ['analyzed-by', 0.8],
    ['component-of', 0.7],
    ['applied-by', 0.7],
    ['evaluated-by', 0.8],
    ['cited-by', 0.9]
  ]);

  // OPTIMISATION: Mappage pour status de vérification
  private verificationScoreMap: Record<VerificationStatus, number> = {
    'verified': 0.95,
    'partially_verified': 0.75,
    'contradicted': 0.3,
    'contradictory': 0.2,
    'uncertain': 0.4,
    'absence_of_information': 0.65,
    'unverified': 0.45,
    'inconclusive': 0.55
  };

  // Constantes centralisées pour les seuils utilisés dans les calculs
  private THRESHOLDS = {
    // Confiance
    MIN_CONFIDENCE: 0.1,
    MAX_CONFIDENCE: 0.95,
    // Pertinence
    MIN_RELEVANCE: 0.1,
    MAX_RELEVANCE: 0.95,
    // Qualité
    MIN_QUALITY: 0.1,
    MAX_QUALITY: 0.95,
    // Fiabilité
    MIN_RELIABILITY: 0.1,
    MAX_RELIABILITY: 0.95,
    // Confiance
    HIGH_CONFIDENCE_THRESHOLD: 0.80,
    MEDIUM_CONFIDENCE_THRESHOLD: 0.50,
    LOW_CONFIDENCE_THRESHOLD: 0.30,
    // Fiabilité
    HIGH_RELIABILITY_THRESHOLD: 0.75,
    MEDIUM_RELIABILITY_THRESHOLD: 0.45,
    LOW_RELIABILITY_THRESHOLD: 0.25,
    // Vérification
    VERIFIED_THRESHOLD: 0.8,
    PARTIALLY_VERIFIED_THRESHOLD: 0.45,
    ABSENCE_THRESHOLD: 0.65,        
    UNCERTAIN_THRESHOLD: 0.5,      
    CONTRADICTION_THRESHOLD: 0.3,  
    // Similarité
    HIGH_SIMILARITY: 0.85,
    // Erreur numérique
    WEIGHT_TOLERANCE: 0.001,
    // Nouveaux seuils pour les calculs mathématiques
    MATH_HIGH_CONFIDENCE: 0.8, 
    MATH_MEDIUM_CONFIDENCE: 0.65
  };

  // Paramètres configurables pour ajuster les calculs
  private config = {
    // Poids des différentes composantes dans le calcul de la confiance (HEURISTIQUE UNIQUEMENT)
    confidenceWeights: {
      modifierAnalysis: 0.4,   // Analyse des modalisateurs de certitude/incertitude
      thoughtType: 0.2,        // Type de pensée (hypothesis, conclusion, etc.)
      structuralIndicators: 0.2, // Indicateurs structurels (références, citations, etc.)
      sentimentBalance: 0.2    // Équilibre des sentiments positifs/négatifs
    },

    // Poids des différentes composantes dans le calcul de la pertinence (HEURISTIQUE UNIQUEMENT)
    relevanceWeights: {
      keywordOverlap: 0.5,     // Chevauchement de mots-clés
      connectionStrength: 0.5  // Force des connexions dans le graphe
    },

    // Poids des différentes composantes dans le calcul de la qualité (HEURISTIQUE UNIQUEMENT)
    qualityWeights: {
      wordIndicators: 0.25,    // Indicateurs de mots positifs/négatifs
      typeSpecificIndicators: 0.25, // Indicateurs spécifiques au type
      structuralBalance: 0.2,  // Équilibre structurel
      coherence: 0.3           // Cohérence globale
    },

    // Ajustements par type de pensée (HEURISTIQUE UNIQUEMENT)
    typeAdjustments: {
      'hypothesis': { confidence: 0.9, quality: 1.0, coherence: 1.1 },
      'conclusion': { confidence: 1.1, quality: 1.2, coherence: 1.2 },
      'meta': { confidence: 1.0, quality: 1.1, coherence: 0.9 },
      'revision': { confidence: 1.05, quality: 1.1, coherence: 1.05 },
      'regular': { confidence: 1.0, quality: 1.0, coherence: 1.0 }
    },

    // Paramètres pour l'algorithme TF-IDF (HEURISTIQUE UNIQUEMENT)
    tfIdf: {
      minFrequency: 2,         // Fréquence minimale pour qu'un terme soit considéré
      maxDocumentPercentage: 0.7 // Pourcentage maximum de documents contenant un terme
    }
  };

  /**
   * Constructeur
   * @param customConfig Configuration personnalisée (optionnelle)
   */
  constructor(customConfig?: Partial<typeof MetricsCalculator.prototype.config>) {
    if (customConfig) {
      this.config = { ...this.config, ...customConfig };
    }
    
    // Vérifier que les poids s'additionnent à 1.0
    this.validateWeights();
    
    // OPTIMISATION: Précompiler les expressions régulières pour les modalisateurs
    this.REGEX.UNCERTAINTY_MODIFIERS = new RegExp('\\b(' + this.uncertaintyModifiers.join('|') + ')\\b', 'gi');
    this.REGEX.CERTAINTY_MODIFIERS = new RegExp('\\b(' + this.certaintyModifiers.join('|') + ')\\b', 'gi');
  }
  
  /**
   * Valide et normalise tous les poids dans les configurations pour s'assurer qu'ils s'additionnent à 1.0
   * Affiche un avertissement si ce n'est pas le cas et corrige automatiquement
   */
  private validateWeights(): void {
    const categories = [
      { name: 'confiance', weights: this.config.confidenceWeights as Record<string, number> },
      { name: 'pertinence', weights: this.config.relevanceWeights as Record<string, number> },
      { name: 'qualité', weights: this.config.qualityWeights as Record<string, number> }
    ];
    
    for (const category of categories) {
      const sum = Object.values(category.weights).reduce((total, w) => total + w, 0);
      
      // Vérifier si la somme des poids est proche de 1.0
      if (Math.abs(sum - 1.0) > this.THRESHOLDS.WEIGHT_TOLERANCE) {
        console.error(`AVERTISSEMENT: Les poids de ${category.name} s'additionnent à ${sum}, pas à 1.0`);
        
        // Normaliser automatiquement les poids
        const factor = 1.0 / sum;
        for (const key in category.weights) {
          category.weights[key] *= factor;
        }
        
        console.error(`Correction automatique appliquée aux poids de ${category.name}`);
      }
    }
  }

  /**
   * OPTIMISATION: Compter les modalisateurs avec RegExp (plus rapide)
   * 
   * @param content Contenu à analyser
   * @param regex Expression régulière à utiliser
   * @returns Nombre d'occurrences
   */
  private countModifiers(content: string, regex: RegExp): number {
    const matches = content.match(regex);
    return matches ? matches.length : 0;
  }

  /**
   * Calcule la métrique de confiance pour une pensée.
   * Priorise l'appel LLM avec contexte, utilise l'heuristique en fallback.
   *
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées (pour le contexte)
   * @returns Niveau de confiance entre 0 et 1
   */
  async calculateConfidence(thought: ThoughtNode, connectedThoughts: ThoughtNode[] = []): Promise<number> { 

    // --- Préparer le contexte pour l'appel LLM ---
    let contextForLlm: { previousThoughtContent?: string; connectionType?: string; } | undefined = undefined;
    if (thought.connections.length > 0 && connectedThoughts.length > 0) {
        const firstConnection = thought.connections[0];
        const previousThought = connectedThoughts.find(t => t.id === firstConnection.targetId); 
        if (previousThought) {
            contextForLlm = {
                previousThoughtContent: previousThought.content,
                connectionType: firstConnection.type
            };
        }
    }
    // --- Fin de la préparation du contexte ---

    // Appel à analyzeForMetric AVEC le contexte
    const llmConfidence = await analyzeForMetric(thought.content, 'confidence', contextForLlm);

    if (llmConfidence !== null) {
      // Utiliser directement le score LLM s'il est disponible
      const finalScore = llmConfidence; 

      // Clamp the result
      if (finalScore < this.THRESHOLDS.MIN_CONFIDENCE) {
        return this.THRESHOLDS.MIN_CONFIDENCE;
      } else if (finalScore > this.THRESHOLDS.MAX_CONFIDENCE) {
        return this.THRESHOLDS.MAX_CONFIDENCE;
      }
      return finalScore;
    }

    // --- Fallback: Calcul heuristique si l'appel LLM échoue ---
    console.warn(`LLM analysis failed for confidence on thought ${thought.id}. Falling back to heuristic.`);
    const content = thought.content.toLowerCase();
    const typeWeight = this.config.typeAdjustments[thought.type].confidence;

    // 1. Analyse des modalisateurs
    const uncertaintyCount = this.countModifiers(content, this.REGEX.UNCERTAINTY_MODIFIERS!);
    const certaintyCount = this.countModifiers(content, this.REGEX.CERTAINTY_MODIFIERS!);
    let modifierScore = 0.5;
    if (uncertaintyCount > 0 || certaintyCount > 0) {
      const totalModifiers = uncertaintyCount + certaintyCount;
      modifierScore = certaintyCount / totalModifiers;
    }

    // 2. Analyse structurelle
    const referenceMatches = content.match(this.REGEX.REFERENCES) || [];
    const numberMatches = content.match(this.REGEX.NUMBERS) || [];
    const referenceScore = Math.min(referenceMatches.length * 0.05, 0.2);
    const numberScore = Math.min(numberMatches.length * 0.025, 0.1);
    const structuralScore = 0.5 + referenceScore + numberScore;

    // 3. Score basé sur le type
    const typeScore = this.typeScoresMap.get(thought.type) || 0.65;

    // Combinaison pondérée
    const weights = this.config.confidenceWeights;
    let heuristicConfidenceScore = (
        modifierScore * weights.modifierAnalysis +
        typeScore * weights.thoughtType +
        structuralScore * weights.structuralIndicators +
        0.5 * weights.sentimentBalance // Placeholder
    ) * typeWeight;

    // Clamp final
    if (heuristicConfidenceScore < this.THRESHOLDS.MIN_CONFIDENCE) {
      return this.THRESHOLDS.MIN_CONFIDENCE;
    } else if (heuristicConfidenceScore > this.THRESHOLDS.MAX_CONFIDENCE) {
      return this.THRESHOLDS.MAX_CONFIDENCE;
    }
    return heuristicConfidenceScore;
  }

  /**
   * Calcule la métrique de pertinence pour une pensée.
   * Priorise l'appel LLM avec contexte, utilise l'heuristique en fallback.
   *
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées (contexte)
   * @returns Niveau de pertinence entre 0 et 1
   */
  async calculateRelevance(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): Promise<number> {
    
    // --- Préparer le contexte pour l'appel LLM ---
    let contextForLlm: { previousThoughtContent?: string; connectionType?: string; } | undefined = undefined;
    if (thought.connections.length > 0 && connectedThoughts.length > 0) {
        const firstConnection = thought.connections[0];
        const previousThought = connectedThoughts.find(t => t.id === firstConnection.targetId); 
        if (previousThought) {
            contextForLlm = {
                previousThoughtContent: previousThought.content,
                connectionType: firstConnection.type
            };
        }
    }
    // --- Fin de la préparation du contexte ---

    // Appel à analyzeForMetric AVEC le contexte
    const llmRelevance = await analyzeForMetric(thought.content, 'relevance', contextForLlm);

    if (llmRelevance !== null) {
        const finalScore = llmRelevance; 

        // Clamp the result
        if (finalScore < this.THRESHOLDS.MIN_RELEVANCE) {
            return this.THRESHOLDS.MIN_RELEVANCE;
        } else if (finalScore > this.THRESHOLDS.MAX_RELEVANCE) {
            return this.THRESHOLDS.MAX_RELEVANCE;
        }
        return finalScore;
    }

    // --- Fallback: Calcul heuristique si l'appel LLM échoue ---
    console.warn(`LLM analysis failed for relevance on thought ${thought.id}. Falling back to heuristic.`);

    if (connectedThoughts.length === 0) {
      return 0.5;
    }

    // 1. Chevauchement de mots-clés
    const thoughtKeywords = this.extractKeywords(thought.content);
    const contextContent = connectedThoughts.map(t => t.content).join(' ');
    const contextKeywords = this.extractAndWeightContextKeywords(contextContent);
    let keywordScore = 0;
    let totalWeight = 0;
    for (const [keyword, weight] of Object.entries(contextKeywords)) {
      totalWeight += weight;
      if (thoughtKeywords.includes(keyword)) {
        keywordScore += weight;
      }
    }
    const keywordOverlapScore = totalWeight > 0 ? keywordScore / totalWeight : 0.5;

    // 2. Analyse des connexions (sortantes)
    let connectionScoreSum = 0;
    const connectionScoresLength = thought.connections.length;
    if (connectionScoresLength > 0) {
      for (let i = 0; i < connectionScoresLength; i++) {
        const conn = thought.connections[i];
        const typeWeight = this.connectionWeightsMap.get(conn.type) || 0.5;
        connectionScoreSum += conn.strength * typeWeight;
      }
    }
    const connectionScore = connectionScoresLength > 0 ? connectionScoreSum / connectionScoresLength : 0.5;

    // 3. Analyse des connexions (entrantes)
    const incomingConnections = []; 
    for (const t of connectedThoughts) {
      for (const conn of t.connections) {
        if (conn.targetId === thought.id) {
          incomingConnections.push(conn);
        }
      }
    }
    let incomingScore = 0.5;
    if (incomingConnections.length > 0) {
      let incomingStrengthSum = 0;
      for (const conn of incomingConnections) {
        incomingStrengthSum += conn.strength;
      }
      incomingScore = incomingStrengthSum / incomingConnections.length;
    }

    // Combinaison pondérée
    const relevanceScore = (
        keywordOverlapScore * this.config.relevanceWeights.keywordOverlap +
        ((connectionScore + incomingScore) / 2) * this.config.relevanceWeights.connectionStrength
    );

    // Ajustement par type
    const typeAdjustment = thought.type === 'meta' ? 0.9 : (thought.type === 'revision' ? 1.1 : 1.0);
    const adjustedScore = relevanceScore * typeAdjustment;

    // Clamp final
    if (adjustedScore < this.THRESHOLDS.MIN_RELEVANCE) {
      return this.THRESHOLDS.MIN_RELEVANCE;
    } else if (adjustedScore > this.THRESHOLDS.MAX_RELEVANCE) {
      return this.THRESHOLDS.MAX_RELEVANCE;
    }
    return adjustedScore;
  }

  /**
   * Calcule la métrique de qualité globale pour une pensée.
   * Priorise l'appel LLM avec contexte, utilise l'heuristique en fallback.
   *
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées (contexte)
   * @returns Niveau de qualité entre 0 et 1
   */
  async calculateQuality(thought: ThoughtNode, connectedThoughts: ThoughtNode[] = []): Promise<number> {
    
    // --- Préparer le contexte pour l'appel LLM ---
    let contextForLlm: { previousThoughtContent?: string; connectionType?: string; } | undefined = undefined;
    if (thought.connections.length > 0 && connectedThoughts.length > 0) {
        const firstConnection = thought.connections[0];
        const previousThought = connectedThoughts.find(t => t.id === firstConnection.targetId); 
        if (previousThought) {
            contextForLlm = {
                previousThoughtContent: previousThought.content,
                connectionType: firstConnection.type
            };
        }
    }
    // --- Fin de la préparation du contexte ---

    // Appel à analyzeForMetric AVEC le contexte
    const llmQuality = await analyzeForMetric(thought.content, 'quality', contextForLlm);

    if (llmQuality !== null) {
      const finalScore = llmQuality; 

      // Clamp the result
      if (finalScore < this.THRESHOLDS.MIN_QUALITY) {
        return this.THRESHOLDS.MIN_QUALITY;
      } else if (finalScore > this.THRESHOLDS.MAX_QUALITY) {
        return this.THRESHOLDS.MAX_QUALITY;
      }
      return finalScore;
    }

    // --- Fallback: Calcul heuristique si l'appel LLM échoue ---
    console.warn(`LLM analysis failed for quality on thought ${thought.id}. Falling back to heuristic.`);
    const content = thought.content.toLowerCase();
    const typeAdjustment = this.config.typeAdjustments[thought.type]?.quality || 1.0;

    // 1. Indicateurs lexicaux
    const positiveWordsRegex = new RegExp('\\b(' + this.positiveWords.join('|') + ')\\b', 'gi');
    const negativeWordsRegex = new RegExp('\\b(' + this.negativeWords.join('|') + ')\\b', 'gi');
    const positiveMatches = content.match(positiveWordsRegex) || [];
    const negativeMatches = content.match(negativeWordsRegex) || [];
    const positiveCount = positiveMatches.length;
    const negativeCount = negativeMatches.length;
    let wordIndicatorScore = 0.5;
    if (positiveCount > 0 || negativeCount > 0) {
      const total = positiveCount + negativeCount;
      wordIndicatorScore = (positiveCount / total) * 0.5 + 0.3;
    }

    // 2. Indicateurs spécifiques au type
    const typeIndicators = this.qualityIndicators[thought.type] || this.qualityIndicators['regular'];
    const positiveTypeRegex = new RegExp(typeIndicators.positive.join('|'), 'gi');
    const negativeTypeRegex = new RegExp(typeIndicators.negative.join('|'), 'gi');
    const positiveTypeMatches = content.match(positiveTypeRegex) || [];
    const negativeTypeMatches = content.match(negativeTypeRegex) || [];
    const positiveTypeCount = positiveTypeMatches.length;
    const negativeTypeCount = negativeTypeMatches.length;
    let typeIndicatorScore = 0.5;
    if (positiveTypeCount > 0 || negativeTypeCount > 0) {
      typeIndicatorScore = 0.5 + (positiveTypeCount - negativeTypeCount) * 0.1;
      typeIndicatorScore = typeIndicatorScore < 0.3 ? 0.3 : (typeIndicatorScore > 0.9 ? 0.9 : typeIndicatorScore);
    }

    // 3. Analyse structurelle
    const wordsArray = content.split(this.REGEX.WHITESPACE);
    const wordCount = wordsArray.length;
    const sentencesArray = content.split(this.REGEX.SENTENCES).filter(s => s.trim().length > 0);
    const sentenceCount = sentencesArray.length;
    const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);
    let structuralScore;
    const isTypeWithSpecialHandling = thought.type === 'conclusion' || thought.type === 'revision';
    if (isTypeWithSpecialHandling) {
      structuralScore = wordCount < 5 ? 0.4 : (wordCount > 300 ? 0.5 : 0.8);
    } else {
      if (wordCount < 5) structuralScore = 0.3;
      else if (wordCount > 300) structuralScore = 0.4;
      else if (wordCount >= 150) structuralScore = 0.6;
      else if (wordCount >= 30) structuralScore = 0.8;
      else structuralScore = 0.5;
    }
    if (avgSentenceLength > 25 || (avgSentenceLength < 5 && sentenceCount > 1)) {
      structuralScore *= 0.9;
    }

    // 4. Analyse de cohérence (simplifiée sans contexte profond pour l'heuristique)
    let coherenceScore = 0.5; 
    if (thought.connections.length > 0) {
        coherenceScore = 0.6; // Léger bonus si connecté
        // Une analyse plus poussée nécessiterait connectedThoughts ici
    }

    // Combinaison pondérée
    const weights = this.config.qualityWeights;
    const qualityScore = (
        wordIndicatorScore * weights.wordIndicators +
        typeIndicatorScore * weights.typeSpecificIndicators +
        structuralScore * weights.structuralBalance +
        coherenceScore * weights.coherence
    ) * typeAdjustment;

    // Clamp final
    if (qualityScore < 0.3) {
      return 0.3;
    } else if (qualityScore > 0.95) {
      return 0.95;
    }
    return qualityScore;
  }

  /**
   * Calcule un score global de fiabilité basé sur différentes métriques et vérifications
   * avec une normalisation automatique des poids - VERSION OPTIMISÉE
   *
   * @param metrics Les métriques de base
   * @param verificationStatus Statut de vérification actuel
   * @param calculationResults Résultats de vérification des calculs (optionnel)
   * @param previousScore Score précédent (optionnel)
   * @returns Score de fiabilité entre 0 et 1
   */
  calculateReliabilityScore(
      metrics: ThoughtMetrics, 
      verificationStatus: VerificationStatus,
      calculationResults?: CalculationVerificationResult[],
      previousScore?: number
  ): number {
    // OPTIMISATION: Utiliser Map pour accéder au score de vérification
    const verificationScore = this.verificationScoreMap[verificationStatus] || 0.45;

    // OPTIMISATION: Déterminer les poids avec moins de conditions
    // Poids pour chaque métrique
    let weights = calculationResults && calculationResults.length > 0 
        ? { confidence: 0.25, relevance: 0.10, quality: 0.10, verification: 0.55 }
        : { confidence: 0.35, relevance: 0.15, quality: 0.15, verification: 0.35 };

    // Calcul du score brut pondéré
    let rawScore = 
      weights.confidence * metrics.confidence +
      weights.relevance * metrics.relevance +
      weights.quality * metrics.quality +
      weights.verification * verificationScore;
    
    // OPTIMISATION: Bonus pour les calculs corrects en une seule passe
    if (calculationResults && calculationResults.length > 0) {
      let correctCalculations = 0;
      for (const result of calculationResults) {
        if (result.isCorrect) correctCalculations++;
      }
      const correctRatio = correctCalculations / calculationResults.length;
      rawScore += correctRatio * 0.1;
    }
    
    // OPTIMISATION: Ajustement selon le statut spécifique avec moins de conditions
    if (verificationStatus === 'verified' && metrics.confidence > this.THRESHOLDS.HIGH_CONFIDENCE_THRESHOLD) {
      rawScore *= 1.1;
    } else if (verificationStatus === 'absence_of_information') {
      rawScore = rawScore > 0.75 ? 0.75 : rawScore;
    }
    
    // Lissage temporel si score précédent disponible
    if (previousScore !== undefined) {
      rawScore = 0.7 * rawScore + 0.3 * previousScore;
    }
    
    // OPTIMISATION: Normalisation finale directe
    if (rawScore < this.THRESHOLDS.MIN_RELIABILITY) {
      return this.THRESHOLDS.MIN_RELIABILITY;
    } else if (rawScore > this.THRESHOLDS.MAX_RELIABILITY) {
      return this.THRESHOLDS.MAX_RELIABILITY;
    }
    return rawScore;
  }

  /**
   * Calcule un score de pertinence basé sur la correspondance avec le contexte - VERSION OPTIMISÉE
   * 
   * @param thought La pensée à évaluer
   * @param context Le contexte actuel
   * @returns Score de pertinence (0-1)
   */
  calculateRelevanceScore(thought: ThoughtNode, context: string): number {
    // OPTIMISATION: Extraction des mots-clés
    const thoughtKeywords = this.extractKeywords(thought.content);
    const contextKeywordWeights = this.extractAndWeightContextKeywords(context);
    
    let relevanceScore = 0;
    let totalWeight = 0;
    
    // OPTIMISATION: Boucle unique pour calculer le score
    for (const keyword of thoughtKeywords) {
      const weight = contextKeywordWeights[keyword];
      if (weight) {
        relevanceScore += weight;
        totalWeight += weight;
      }
    }
    
    // Normaliser le score
    if (totalWeight > 0) {
      relevanceScore = relevanceScore / totalWeight;
    } else {
      // Aucune correspondance, score minimal
      relevanceScore = this.THRESHOLDS.MIN_RELEVANCE;
    }
    
    // OPTIMISATION: Pondérer en fonction des connexions et du type de pensée
    let connectionFactor = 1.0;
    
    // Bonus pour les connexions fortes avec d'autres pensées pertinentes
    if (thought.connections && thought.connections.length > 0) {
      let connectionScore = 0;
      for (const connection of thought.connections) {
        // OPTIMISATION: Utiliser Map
        const typeWeight = this.connectionWeightsMap.get(connection.type) || 0.5;
        connectionScore += typeWeight * connection.strength;
      }
      connectionFactor += (connectionScore / thought.connections.length) * 0.5;
    }
    
    relevanceScore *= connectionFactor;
    
    // OPTIMISATION: Normaliser entre MIN et MAX directement
    if (relevanceScore < this.THRESHOLDS.MIN_RELEVANCE) {
      return this.THRESHOLDS.MIN_RELEVANCE;
    } else if (relevanceScore > this.THRESHOLDS.MAX_RELEVANCE) {
      return this.THRESHOLDS.MAX_RELEVANCE;
    }
    return relevanceScore;
  }

  /**
   * Extrait les mots-clés d'un texte donné - VERSION OPTIMISÉE
   * 
   * @param text Le texte à analyser
   * @returns Un tableau de mots-clés
   */
  extractKeywords(text: string): string[] {
    // OPTIMISATION: Convertir en minuscules et supprimer la ponctuation
    const processedText = text.toLowerCase().replace(this.REGEX.PUNCTUATION, '');
    
    // OPTIMISATION: Utiliser Map pour le comptage (plus efficace)
    const wordCountsMap = new Map<string, number>();
    
    // OPTIMISATION: Diviser et traiter en une seule passe
    const words = processedText.split(this.REGEX.WHITESPACE);
    for (const word of words) {
      if (word.length > 2 && !this.stopWords.has(word)) {
        wordCountsMap.set(word, (wordCountsMap.get(word) || 0) + 1);
      }
    }
    
    // OPTIMISATION: Convertir en tableau et trier
    const sortedEntries = Array.from(wordCountsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);
    
    // Extraire les mots uniquement
    return sortedEntries.map(entry => entry[0]);
  }

  /**
   * Extrait et pondère les mots-clés du contexte - VERSION OPTIMISÉE
   * 
   * @param text Le texte du contexte
   * @returns Un objet avec les mots-clés et leurs poids
   */
  extractAndWeightContextKeywords(text: string): Record<string, number> {
    const keywords = this.extractKeywords(text);
    const weightedKeywords: Record<string, number> = {};
    
    // OPTIMISATION: Calculer la longueur une seule fois
    const keywordsLength = keywords.length;
    const factor = 1 / (keywordsLength * 2);
    
    // OPTIMISATION: Assigner des poids en une seule passe
    for (let i = 0; i < keywordsLength; i++) {
      const keyword = keywords[i];
      weightedKeywords[keyword] = 1 - (i * factor);
    }
    
    return weightedKeywords;
  }

  /**
   * Obtient le poids associé à un type de connexion - VERSION OPTIMISÉE
   * 
   * @param type Le type de connexion
   * @returns Le poids de ce type de connexion
   */
  getConnectionTypeWeight(type: ConnectionType): number {
    // OPTIMISATION: Utiliser Map pour un accès plus rapide
    return this.connectionWeightsMap.get(type) || 0.5;
  }

  /**
   * Détermine le statut de vérification en fonction du score de confiance
   * et d'autres facteurs - VERSION OPTIMISÉE
   * 
   * @param confidenceOrResults Niveau de confiance dans la vérification (0-1) ou résultats de vérification
   * @param hasContradictions Indique s'il y a des contradictions
   * @param hasInformation Indique s'il y a des informations disponibles
   * @returns Le statut de vérification
   */
  determineVerificationStatus(
    confidenceOrResults: number | any[], 
    hasContradictions: boolean = false, 
    hasInformation: boolean = true
  ): VerificationStatus {
    // Si le premier paramètre est un tableau, on est dans le cas d'un appel depuis verification-service
    if (Array.isArray(confidenceOrResults)) {
      return this.determineVerificationStatusFromResults(confidenceOrResults);
    }
    
    // OPTIMISATION: Logic simplifiée avec retours immédiats
    const confidence = confidenceOrResults as number;
    
    // Absence d'information
    if (!hasInformation) {
      return 'absence_of_information';
    }
    
    // Contradictions
    if (hasContradictions) {
      return confidence < this.THRESHOLDS.CONTRADICTION_THRESHOLD 
        ? 'contradictory' 
        : 'uncertain';
    }
    
    // Vérification normale basée sur le niveau de confiance
    if (confidence >= this.THRESHOLDS.VERIFIED_THRESHOLD) {
      return 'verified';
    } else if (confidence >= this.THRESHOLDS.PARTIALLY_VERIFIED_THRESHOLD) {
      return 'partially_verified';
    }
    
    return 'unverified';
  }
  
  /**
   * Détermine le statut de vérification à partir des résultats de multiples sources - VERSION OPTIMISÉE
   * Algorithme amélioré pour gérer les cas ambigus
   *
   * @param results Résultats de vérification provenant de différentes sources
   * @returns Statut de vérification (VerificationStatus)
   */
  private determineVerificationStatusFromResults(results: any[]): VerificationStatus {
    if (!results || results.length === 0) {
      return 'unverified';
    }
    
    // OPTIMISATION: Comptage direct sans créer des objets intermédiaires
    let verifiedCount = 0;
    let contradictedCount = 0;
    let uncertainCount = 0;
    let absenceCount = 0;
    let inconclusiveCount = 0;
    let totalConfidence = 0;
    
    // OPTIMISATION: Une seule passe pour tous les comptages
    for (const result of results) {
      const confidence = result.confidence || 0.5;
      totalConfidence += confidence;
      const isValid = result.result?.isValid;
      
      if (isValid === true) {
        verifiedCount += confidence;
      } else if (isValid === false) {
        contradictedCount += confidence;
      } else if (isValid === 'uncertain') {
        uncertainCount += confidence;
      } else if (isValid === 'absence_of_information') {
        absenceCount += confidence;
      } else {
        inconclusiveCount += confidence;
      }
    }
    
    // Calcul des ratios
    const verifiedRatio = verifiedCount / totalConfidence;
    const contradictedRatio = contradictedCount / totalConfidence;
    const uncertainRatio = uncertainCount / totalConfidence;
    const absenceRatio = absenceCount / totalConfidence;
    
    // OPTIMISATION: Logique de décision simplifiée avec retours immédiats
    
    // 1. Contradiction forte prend priorité
    if (contradictedRatio > 0.5) {
      return 'contradictory';
    }
    
    // 2. Désaccord franc entre vérifié et contredit
    if (verifiedRatio > 0.3 && contradictedRatio > 0.3) {
      return 'uncertain';
    }
    
    // 3. Vérification forte si le ratio est suffisant
    if (verifiedRatio > this.THRESHOLDS.VERIFIED_THRESHOLD) {
      return 'verified';
    }
    
    // 4. Vérification partielle pour les cas intermédiaires
    if (verifiedRatio > this.THRESHOLDS.PARTIALLY_VERIFIED_THRESHOLD) {
      return 'partially_verified';
    }
    
    // 5. Cas d'incertitude forte
    if (uncertainRatio > this.THRESHOLDS.UNCERTAIN_THRESHOLD) {
      return 'uncertain';
    }
    
    // 6. Absence d'information comme cas particulier
    if (absenceRatio > this.THRESHOLDS.ABSENCE_THRESHOLD) {
      return 'absence_of_information';
    }
    
    // 7. Par défaut, vérification partielle si au moins quelques éléments positifs
    if (verifiedRatio > 0) {
      return 'partially_verified';
    }
    
    // 8. Sinon, considérer comme non vérifié
    return 'unverified';
  }

  /**
   * Génère un résumé explicatif du niveau de certitude - VERSION OPTIMISÉE
   * 
   * @param status Statut de vérification
   * @param confidence Niveau de confiance (0-1)
   * @returns Résumé textuel du niveau de certitude
   */
  generateCertaintySummary(status: VerificationStatus, confidence: number = 0.5): string {
    // Formater le pourcentage pour l'affichage
    const percentage = Math.round(confidence * 100);
    
    // OPTIMISATION: Utiliser un modèle de chaîne de base et personnaliser selon le statut
    const statusDescriptions: Record<VerificationStatus, string> = {
      'verified': `Information vérifiée avec un niveau de confiance de ${percentage}%. Plusieurs sources fiables confirment cette information.`,
      'partially_verified': `Information partiellement vérifiée avec un niveau de confiance de ${percentage}%. Certains éléments sont confirmés par des sources fiables.`,
      'unverified': `Information non vérifiée. Niveau de confiance: ${percentage}%. Aucune source ne confirme ou n'infirme cette information.`,
      'contradicted': `Information contredite. Niveau de confiance: ${percentage}%. Des sources fiables contredisent cette information.`,
      'contradictory': `Information contradictoire. Niveau de confiance: ${percentage}%. Des sources crédibles se contredisent sur ce sujet.`,
      'absence_of_information': `Aucune information trouvée sur ce sujet. Niveau de confiance: ${percentage}%. Cette absence d'information est elle-même une information pertinente.`,
      'uncertain': `Information incertaine. Niveau de confiance: ${percentage}%. Les sources disponibles ne permettent pas de conclure avec certitude.`,
      'inconclusive': `Résultat non concluant. Niveau de confiance: ${percentage}%. Les données sont insuffisantes ou ambiguës pour tirer une conclusion définitive.`
    };
    
    let summary = statusDescriptions[status] || `Niveau de confiance: ${percentage}%.`;
    
    // Ajouter des conseils supplémentaires selon le niveau de confiance
    if (confidence < 0.3) {
      summary += ' Cette information doit être considérée comme hautement spéculative.';
    } else if (confidence > 0.85) {
      summary += ' Cette information peut être considérée comme fiable.';
    }
    
    return summary;
  }

  /**
   * Détecte les biais potentiels dans une pensée - VERSION OPTIMISÉE
   * 
   * @param thought La pensée à analyser
   * @returns Un tableau des biais détectés avec leur score (0-1) (basé sur LLM ou heuristique)
   */
  async detectBiases(thought: ThoughtNode): Promise<Array<{type: string, score: number, description: string}>> {
    const llmBiasScore = await analyzeForMetric(thought.content, 'bias');

    if (llmBiasScore !== null && llmBiasScore > 0.3) { // Use a threshold to decide if LLM detected significant bias
        // If LLM detects bias, return a generic bias entry.
        // More sophisticated analysis could involve asking the LLM *which* bias it detected.
        return [{
            type: 'llm_detected_bias',
            score: llmBiasScore,
            description: 'Potential bias detected by internal LLM analysis.'
        }];
    } else if (llmBiasScore !== null && llmBiasScore <= 0.3) {
        // LLM analysis suggests low bias, return empty array
        return [];
    }

    // Fallback to original heuristic calculation if LLM fails or score is low/null
    if (llmBiasScore === null) {
      console.warn(`LLM analysis failed for bias on thought ${thought.id}. Falling back to heuristic.`);
    }

    const content = thought.content.toLowerCase();
    const biases = [];

    // OPTIMISATION: Liste des patterns de biais cognitifs courants
    const biasPatterns = [
      {
        type: 'confirmation_bias',
        regex: /je savais déjà|comme prévu|confirme que|toujours été|évidemment/gi,
        patterns: ['je savais déjà', 'comme prévu', 'confirme que', 'toujours été', 'évidemment'],
        description: 'Tendance à favoriser les informations qui confirment des croyances préexistantes'
      },
      {
        type: 'recency_bias',
        regex: /récemment|dernièrement|ces jours-ci|tendance actuelle|de nos jours/gi,
        patterns: ['récemment', 'dernièrement', 'ces jours-ci', 'tendance actuelle', 'de nos jours'],
        description: 'Tendance à donner plus d\'importance aux événements récents'
      },
      {
        type: 'availability_heuristic',
        regex: /souvent|fréquemment|généralement|habituellement|couramment/gi,
        patterns: ['souvent', 'fréquemment', 'généralement', 'habituellement', 'couramment'],
        description: 'Jugement basé sur des exemples qui viennent facilement à l\'esprit'
      },
      {
        type: 'black_white_thinking',
        regex: /toujours|jamais|impossible|absolument|parfaitement|totalement/gi,
        patterns: ['toujours', 'jamais', 'impossible', 'absolument', 'parfaitement', 'totalement'],
        description: 'Tendance à voir les choses en termes absolus sans nuances'
      },
      {
        type: 'authority_bias',
        regex: /expert dit|selon les experts|études montrent|scientifiquement prouvé/gi,
        patterns: ['expert dit', 'selon les experts', 'études montrent', 'scientifiquement prouvé'],
        description: 'Tendance à attribuer plus de poids aux opinions des figures d\'autorité'
      }
    ];
    
    // OPTIMISATION: Détecter les biais avec RegExp
    for (const bias of biasPatterns) {
      const matches = content.match(bias.regex);
      if (matches && matches.length > 0) {
        // Calculer un score basé sur le nombre de correspondances
        const score = Math.min(matches.length / bias.patterns.length * 1.5, 1);
        if (score > 0.2) { // Seuil minimum pour considérer un biais
          biases.push({
            type: bias.type,
            score,
            description: bias.description
          });
        }
      }
    }
    
    // Analyse de sentiment pour détecter le biais émotionnel
    if (this.REGEX.STRONG_EMOTION.test(content)) {
      biases.push({
        type: 'emotional_bias',
        score: 0.7,
        description: 'Jugement influencé par une forte charge émotionnelle'
      });
    }
    
    return biases;
  }

  /**
   * Détermine les besoins de vérification pour un contenu donné - VERSION OPTIMISÉE
   * 
   * @param content Le contenu textuel à analyser
   * @returns Configuration recommandée pour la vérification (basée sur LLM ou heuristique)
   */
  async determineVerificationRequirements(content: string): Promise<{
    needsFactCheck: boolean;
    needsMathCheck: boolean;
    needsSourceCheck: boolean;
    priority: 'low' | 'medium' | 'high';
    suggestedTools: string[];
    requiresMultipleVerifications: boolean;
    reasons: string[];
    recommendedVerificationsCount: number;
  }> {
    const lowercaseContent = content.toLowerCase(); // Define lowercaseContent here
    const llmVerificationNeed = await analyzeForMetric(content, 'verification_need');

    // Initialiser les résultats
    const result = {
      needsFactCheck: false,
      needsMathCheck: false,
      needsSourceCheck: false,
      priority: 'low' as 'low' | 'medium' | 'high',
      suggestedTools: [] as string[],
      requiresMultipleVerifications: false,
      reasons: [] as string[],
      recommendedVerificationsCount: 1
    };
    
    // OPTIMISATION: Détection par RegExp
    
    // Détection des affirmations factuelles
    if (this.REGEX.FACTUAL_CLAIM.test(content)) {
      result.needsFactCheck = true;
      result.suggestedTools.push('web_search');
      result.reasons.push('Contient des affirmations factuelles');
    }
    
    // Détection des calculs mathématiques
    if (this.REGEX.MATH_CALCULATION.test(content) || 
        this.REGEX.MATHEMATICAL_PROOF.test(content)) {
      result.needsMathCheck = true;
      result.suggestedTools.push('math_evaluator');
      result.reasons.push('Contient des calculs ou preuves mathématiques');
    }
    
    // OPTIMISATION: Utiliser RegExp pour détecter les références à des sources
    const sourceRegex = /selon|d'après|source|cité|référence|étude|recherche|publication/i;
    if (sourceRegex.test(content)) {
      result.needsSourceCheck = true;
      result.suggestedTools.push('citation_checker');
      result.reasons.push('Contient des références à des sources');
    }
    
    // OPTIMISATION: Détermination de la priorité avec RegExp
    let score = 0;
    
    // Augmenter le score si contient des affirmations fortes
    if (/certainement|absolument|sans aucun doute|clairement|évidemment|forcément/i.test(lowercaseContent)) {
      score += 2;
      result.reasons.push('Contient des affirmations fortes');
    }
    
    // Augmenter le score si contient des statistiques ou chiffres précis
    if (/\d+%|\d+\.\d+|millions?|milliards?/i.test(lowercaseContent)) {
      score += 2;
      result.reasons.push('Contient des statistiques ou chiffres précis');
    }
    
    // Augmenter le score si contient des références temporelles récentes
    if (/récemment|cette année|ce mois|cette semaine|aujourd'hui|actuellement/i.test(lowercaseContent)) {
      score += 1;
      result.reasons.push('Contient des références temporelles récentes');
    }
    // OPTIMISATION: Définir la priorité en fonction du score directement et de l'analyse LLM
    if (llmVerificationNeed !== null) {
        // Blend LLM score with heuristic score
        score += llmVerificationNeed * 2; // Give LLM score some weight
        if (llmVerificationNeed > 0.7) result.reasons.push('LLM analysis indicates high verification need');
    } else {
        console.warn(`LLM analysis failed for verification_need. Relying solely on heuristic.`);
    }

    result.priority = score >= 4 ? 'high' : (score >= 2 ? 'medium' : 'low'); // Adjusted thresholds

    // OPTIMISATION: Déterminer si plusieurs vérifications sont nécessaires
    // Basé sur la complexité et l'importance du contenu
    result.requiresMultipleVerifications = 
      (result.needsFactCheck && (result.needsMathCheck || result.needsSourceCheck)) ||
      (result.priority === 'high');
    
    // OPTIMISATION: Calculer le nombre de vérifications recommandées directement
    if (result.requiresMultipleVerifications) {
      result.recommendedVerificationsCount = 
        (result.needsFactCheck && result.needsMathCheck && result.needsSourceCheck) ? 3 : 2;
    }
    
    return result;
  }

  /**
   * Calcule un niveau de confiance pour un ensemble de résultats de vérification - VERSION OPTIMISÉE
   * en utilisant une approche bayésienne
   * 
   * @param results Résultats de vérification
   * @returns Score de confiance entre 0 et 1
   */
  calculateVerificationConfidence(results: any[]): number {
    if (!results || results.length === 0) {
      return 0.5; // Confiance neutre par défaut
    }
    
    // OPTIMISATION: Facteurs de pondération pour différentes sources
    const sourceTypeWeights = new Map([
      ['search', 0.8],
      ['database', 0.9],
      ['calculation', 0.95],
      ['external_api', 0.85]
    ]);
    const defaultWeight = 0.7;
    
    // OPTIMISATION: Compter directement sans objets intermédiaires
    let positiveWeight = 0;
    let negativeWeight = 0;
    
    // OPTIMISATION: Analyser chaque résultat en une seule passe
    for (const result of results) {
      // Déterminer le poids de cette source
      const sourceWeight = sourceTypeWeights.get(result.toolType) || defaultWeight;
      const confidence = result.confidence || 0.5;
      
      // Ajuster la confiance en fonction de la validité
      if (result.result?.isValid === true) {
        positiveWeight += sourceWeight * confidence;
      } else if (result.result?.isValid === false) {
        negativeWeight += sourceWeight * confidence;
      }
    }
    
    // Si aucun résultat positif ou négatif clair, retourner une confiance neutre
    if (positiveWeight === 0 && negativeWeight === 0) {
      return 0.5;
    }
    
    // OPTIMISATION: Calculer le ratio de vraisemblance bayésien directement
    const likelihoodRatio = (positiveWeight + 0.5) / (negativeWeight + 0.5);
    
    // Convertir les odds en probabilité
    let confidence = likelihoodRatio / (1 + likelihoodRatio);
    
    // Bonus pour le nombre de sources consultées
    const sourceCountBonus = Math.min(results.length * 0.05, 0.2);
    confidence = Math.min(confidence + sourceCountBonus, 0.95);
    
    // Limite inférieure pour éviter une confiance trop basse
    return Math.max(confidence, 0.2);
  }
}
