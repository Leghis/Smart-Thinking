import { 
  ThoughtNode, 
  ThoughtMetrics, 
  Connection, 
  ConnectionType, 
  VerificationStatus,
  CalculationVerificationResult 
} from './types';

/**
 * metrics-calculator.ts
 *
 * Système centralisé pour tous les calculs de métriques dans Smart-Thinking
 * Implémente des algorithmes avancés pour calculer la confiance, la pertinence,
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
    'peut-être', 'possible', 'probablement', 'incertain', 'semble',
    'pourrait', 'hypothèse', 'suppose', 'doute', 'incertain',
    'éventuellement', 'potentiellement', 'apparemment', 'suggère'
  ];

  private certaintyModifiers: string[] = [
    'certainement', 'clairement', 'évidemment', 'sans doute', 'indiscutablement',
    'nécessairement', 'doit', 'est', 'démontré', 'prouvé', 'assurément',
    'incontestablement', 'manifestement', 'définitivement', 'inévitablement'
  ];

  // Mots-stop en français (stop words)
  private stopWords: string[] = [
    'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
    'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui',
    'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
    'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
    'est', 'sont', 'être', 'avoir', 'fait', 'faire',
    'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup'
  ];

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
    VERIFIED_THRESHOLD: 0.75, // Optimisé: de 0.7 à 0.75 pour plus de rigueur
    PARTIALLY_VERIFIED_THRESHOLD: 0.4, // Optimisé: de 0.3 à 0.4 pour mieux différencier
    ABSENCE_THRESHOLD: 0.5,
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
    // Poids des différentes composantes dans le calcul de la confiance
    confidenceWeights: {
      modifierAnalysis: 0.4,   // Analyse des modalisateurs de certitude/incertitude
      thoughtType: 0.2,        // Type de pensée (hypothesis, conclusion, etc.)
      structuralIndicators: 0.2, // Indicateurs structurels (références, citations, etc.)
      sentimentBalance: 0.2    // Équilibre des sentiments positifs/négatifs
    },

    // Poids des différentes composantes dans le calcul de la pertinence
    relevanceWeights: {
      keywordOverlap: 0.5,     // Chevauchement de mots-clés
      connectionStrength: 0.5  // Force des connexions dans le graphe
    },

    // Poids des différentes composantes dans le calcul de la qualité
    qualityWeights: {
      wordIndicators: 0.25,    // Indicateurs de mots positifs/négatifs
      typeSpecificIndicators: 0.25, // Indicateurs spécifiques au type
      structuralBalance: 0.2,  // Équilibre structurel
      coherence: 0.3           // Cohérence globale
    },

    // Ajustements par type de pensée
    typeAdjustments: {
      'hypothesis': { confidence: 0.9, quality: 1.0, coherence: 1.1 },
      'conclusion': { confidence: 1.1, quality: 1.2, coherence: 1.2 },
      'meta': { confidence: 1.0, quality: 1.1, coherence: 0.9 },
      'revision': { confidence: 1.05, quality: 1.1, coherence: 1.05 },
      'regular': { confidence: 1.0, quality: 1.0, coherence: 1.0 }
    },

    // Paramètres pour l'algorithme TF-IDF
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
   * Calcule la métrique de confiance pour une pensée
   * Implémente un algorithme amélioré pour évaluer la confiance
   *
   * @param thought La pensée à évaluer
   * @returns Niveau de confiance entre 0 et 1
   */
  calculateConfidence(thought: ThoughtNode): number {
    const content = thought.content.toLowerCase();
    const typeWeight = this.config.typeAdjustments[thought.type].confidence;

    // 1. Analyse des modalisateurs de certitude/incertitude (approche continue)
    const uncertaintyCount = this.uncertaintyModifiers.filter(mod => content.includes(mod)).length;
    const certaintyCount = this.certaintyModifiers.filter(mod => content.includes(mod)).length;

    // Calculer le ratio de certitude de manière continue
    let modifierScore;
    if (uncertaintyCount === 0 && certaintyCount === 0) {
      modifierScore = 0.5; // Valeur neutre par défaut
    } else {
      const totalModifiers = uncertaintyCount + certaintyCount;
      // Fonction sigmoïde pour une transition douce plutôt qu'un seuil discret
      const certitudeRatio = certaintyCount / totalModifiers;
      modifierScore = 1 / (1 + Math.exp(-5 * (certitudeRatio - 0.5))); // Sigmoïde centrée à 0.5
    }

    // 2. Analyse des indicateurs structurels (approche continue)
    // Compter les références et les nombres plutôt que de simplement vérifier leur présence
    const referenceMatches = content.match(/\(([^)]+)\)|\[[^\]]+\]/g) || [];
    const numberMatches = content.match(/\d+([.,]\d+)?%?/g) || [];
    
    // Calculer le score en fonction du nombre d'occurrences, avec saturation progressive
    const referenceScore = Math.min(0.2, referenceMatches.length * 0.05);
    const numberScore = Math.min(0.1, numberMatches.length * 0.025);
    const structuralScore = 0.5 + referenceScore + numberScore;

    // 3. Analyse de l'équilibre des sentiments (approche continue)
    const positiveCount = this.positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = this.negativeWords.filter(word => content.includes(word)).length;
    
    // Fonction de transfert plus nuancée pour l'équilibre des sentiments
    let sentimentBalance;
    if (positiveCount === 0 && negativeCount === 0) {
      sentimentBalance = 0.5; // Neutre par défaut
    } else {
      const total = Math.max(positiveCount + negativeCount, 1);
      const ratio = positiveCount / total;
      // Utiliser une courbe en cloche qui favorise l'équilibre (max à 0.5)
      sentimentBalance = 0.5 + 0.4 * (1 - 2 * Math.abs(ratio - 0.5));
    }

    // 4. Score basé sur le type de pensée (approche continue)
    // Mapper les types de pensée à des scores sur une échelle continue
    const typeScores = {
      'conclusion': 0.8,
      'hypothesis': 0.6,
      'meta': 0.7,
      'revision': 0.75,
      'regular': 0.65
    };
    const typeScore = typeScores[thought.type] || 0.65;

    // Combinaison pondérée des facteurs avec normalisation intégrée
    const weights = this.config.confidenceWeights;
    let confidenceScore = (
        modifierScore * weights.modifierAnalysis +
        typeScore * weights.thoughtType +
        structuralScore * weights.structuralIndicators +
        sentimentBalance * weights.sentimentBalance
    ) * typeWeight;

    // Limiter entre MIN_CONFIDENCE et MAX_CONFIDENCE
    return Math.min(Math.max(confidenceScore, this.THRESHOLDS.MIN_CONFIDENCE), this.THRESHOLDS.MAX_CONFIDENCE);
  }

  /**
   * Calcule la métrique de pertinence pour une pensée par rapport à son contexte
   * Utilise un algorithme hybride combinant TF-IDF et analyse de connexions
   *
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées (contexte)
   * @returns Niveau de pertinence entre 0 et 1
   */
  calculateRelevance(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): number {
    // Si pas de pensées connectées, la pertinence est moyenne par défaut
    if (connectedThoughts.length === 0) {
      return 0.5;
    }

    // 1. Chevauchement de mots-clés avec TF-IDF
    const thoughtKeywords = this.extractKeywords(thought.content);
    const contextKeywords = this.extractAndWeightContextKeywords(connectedThoughts.map(t => t.content).join(' '));

    // Calculer la pertinence par chevauchement pondéré
    let keywordScore = 0;
    let totalWeight = 0;

    for (const [keyword, weight] of Object.entries(contextKeywords)) {
      totalWeight += weight;
      if (thoughtKeywords.includes(keyword)) {
        keywordScore += weight;
      }
    }

    const keywordOverlapScore = totalWeight > 0 ? keywordScore / totalWeight : 0.5;

    // 2. Analyse des connexions
    const connectionScores = thought.connections.map(conn => {
      // Pondération selon le type de connexion et sa force
      const typeWeight = this.getConnectionTypeWeight(conn.type);
      return conn.strength * typeWeight;
    });

    const connectionScore = connectionScores.length > 0
        ? connectionScores.reduce((sum, score) => sum + score, 0) / connectionScores.length
        : 0.5;

    // 3. Calcul de l'ancrage contextuel (connexions entrantes)
    const incomingConnections = connectedThoughts.flatMap(t =>
        t.connections.filter(conn => conn.targetId === thought.id)
    );

    const incomingScore = incomingConnections.length > 0
        ? incomingConnections.reduce((sum, conn) => sum + conn.strength, 0) / incomingConnections.length
        : 0.5;

    // Combinaison pondérée avec distribution uniforme entre les composantes de connexion
    const relevanceScore = (
        keywordOverlapScore * this.config.relevanceWeights.keywordOverlap +
        ((connectionScore + incomingScore) / 2) * this.config.relevanceWeights.connectionStrength
    );

    // Ajustement par type de pensée
    const typeAdjustment = thought.type === 'meta' ? 0.9 :
        thought.type === 'revision' ? 1.1 : 1.0;

    // Limiter entre 0.2 et 0.95
    return Math.max(
      this.THRESHOLDS.MIN_RELEVANCE,
      Math.min(this.THRESHOLDS.MAX_RELEVANCE, relevanceScore * typeAdjustment)
    );
  }

  /**
   * Calcule la métrique de qualité globale pour une pensée
   * Utilise une approche multi-factorielle
   *
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées (contexte)
   * @returns Niveau de qualité entre 0 et 1
   */
  calculateQuality(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): number {
    const content = thought.content.toLowerCase();
    
    // MODIFICATION: Ajustement par type plus équilibré pour les conclusions et révisions
    let typeAdjustment;
    if (thought.type === 'conclusion') {
        typeAdjustment = 1.05; // Réduit de 1.2 à 1.05 pour éviter la survalorisation
    } else if (thought.type === 'revision') {
        typeAdjustment = 1.0; // Réduit de 1.1 à 1.0 pour éviter les fluctuations
    } else {
        typeAdjustment = this.config.typeAdjustments[thought.type].quality;
    }

    // 1. Analyse des indicateurs lexicaux (mots positifs/négatifs)
    const positiveCount = this.positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = this.negativeWords.filter(word => content.includes(word)).length;

    // Score basé sur le ratio positif/négatif
    let wordIndicatorScore = 0.5;
    if (positiveCount > 0 || negativeCount > 0) {
      const total = Math.max(positiveCount + negativeCount, 1);
      wordIndicatorScore = (positiveCount / total) * 0.5 + 0.3; // Échelle de 0.3 à 0.8
    }

    // 2. Analyse des indicateurs spécifiques au type
    const typeIndicators = this.qualityIndicators[thought.type] || this.qualityIndicators['regular'];

    const positiveTypeCount = typeIndicators.positive.filter(ind => content.includes(ind)).length;
    const negativeTypeCount = typeIndicators.negative.filter(ind => content.includes(ind)).length;

    // Score basé sur les indicateurs spécifiques au type
    let typeIndicatorScore = 0.5;
    if (positiveTypeCount > 0 || negativeTypeCount > 0) {
      typeIndicatorScore = 0.5 + (positiveTypeCount - negativeTypeCount) * 0.1;
      typeIndicatorScore = Math.min(Math.max(typeIndicatorScore, 0.3), 0.9);
    }

    // 3. Analyse structurelle (longueur, complexité, etc.)
    const words = content.split(/\s+/);
    const wordCount = words.length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);

    // MODIFICATION: Analyse structurelle révisée pour ne pas pénaliser les conclusions concises
    let structuralScore = 0.5;
    
    if (thought.type === 'conclusion' || thought.type === 'revision') {
        // Pour les conclusions et révisions, une plage de longueur plus large est acceptable
        if (wordCount < 5) {
            structuralScore = 0.4; // Pénalité réduite pour les textes courts
        } else if (wordCount > 300) {
            structuralScore = 0.5; // Pénalité réduite pour les textes longs
        } else {
            structuralScore = 0.8; // Valeur élevée pour une plage large
        }
    } else {
        // Garder la logique existante pour les autres types
        if (wordCount < 5) {
            structuralScore = 0.3;
        } else if (wordCount > 300) {
            structuralScore = 0.4;
        } else if (wordCount >= 150 && wordCount <= 300) {
            structuralScore = 0.6;
        } else if (wordCount >= 30 && wordCount < 150) {
            structuralScore = 0.8;
        }
    }

    // Pénaliser les phrases trop longues ou trop courtes
    if (avgSentenceLength > 25) {
      structuralScore *= 0.9; // Phrases trop longues
    } else if (avgSentenceLength < 5 && sentenceCount > 1) {
      structuralScore *= 0.9; // Phrases trop courtes
    }

    // 4. Analyse de la cohérence avec le contexte
    let coherenceScore = 0.5;

    if (connectedThoughts.length > 0) {
      // Détecter les contradictions
      const contradictions = connectedThoughts.filter(t =>
          thought.connections.some(conn => conn.targetId === t.id && conn.type === 'contradicts')
      ).length;

      // Détecter les soutiens
      const supports = connectedThoughts.filter(t =>
          thought.connections.some(conn => conn.targetId === t.id && conn.type === 'supports')
      ).length;
      
      // NOUVEAU: Valoriser les révisions qui synthétisent plusieurs pensées
      if (thought.type === 'revision' || thought.type === 'conclusion') {
          const synthesizesMultiple = thought.connections.length >= 2;
          if (synthesizesMultiple) {
              coherenceScore = 0.7; // Valoriser la synthèse dans les révisions/conclusions
          }
      }

      // MODIFICATION: Logique de cohérence améliorée
      if (contradictions > 0 && supports === 0) {
        coherenceScore = Math.max(coherenceScore, 0.45); // Légèrement augmenté
      } else if (contradictions > 0 && supports > 0) {
        coherenceScore = Math.max(coherenceScore, 0.6); // Valoriser la résolution des contradictions
      } else if (supports > 0) {
        coherenceScore = Math.max(coherenceScore, 0.7); // Soutenu sans contradiction
      }

      // Bonus pour les pensées bien connectées
      const connectionRatio = thought.connections.length / Math.max(connectedThoughts.length, 1);
      if (connectionRatio > 0.5) {
        coherenceScore += 0.1;
      }
      
      // S'assurer que coherenceScore ne dépasse pas 0.9
      coherenceScore = Math.min(coherenceScore, 0.9);
    }

    // Combiner les scores avec pondération
    const qualityScore = (
        wordIndicatorScore * this.config.qualityWeights.wordIndicators +
        typeIndicatorScore * this.config.qualityWeights.typeSpecificIndicators +
        structuralScore * this.config.qualityWeights.structuralBalance +
        coherenceScore * this.config.qualityWeights.coherence
    ) * typeAdjustment;

    // Limiter entre 0.3 et 0.95
    return Math.min(Math.max(qualityScore, 0.3), 0.95);
  }

  /**
   * Calcule un score global de fiabilité basé sur différentes métriques et vérifications
   * avec une normalisation automatique des poids
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
    // Mapping des statuts de vérification vers un score
    const verificationScoreMap: Record<string, number> = {
      'verified': 0.95,
      'partially_verified': 0.7,
      'contradictory': 0.2,
      'uncertain': 0.35,
      'absence_of_information': 0.6,
      'unverified': 0.4
    };

    // Poids pour chaque métrique
    let weights = {
      confidence: 0.35,
      relevance: 0.15,
      quality: 0.15,
      verification: 0.35
    };

    // Adapter les poids si nous avons des calculs vérifiés
    if (calculationResults && calculationResults.length > 0) {
      // Si nous avons des calculs, augmenter le poids de la vérification
      weights = {
        confidence: 0.25,
        relevance: 0.10,
        quality: 0.10,
        verification: 0.55  // Plus de poids pour la vérification des calculs
      };
    }

    // Calcul du score brut pondéré
    let rawScore = 
      weights.confidence * metrics.confidence +
      weights.relevance * metrics.relevance +
      weights.quality * metrics.quality;
    
    // Ajout du score de vérification
    const verificationScore = verificationScoreMap[verificationStatus] || 0.35;
    rawScore += weights.verification * verificationScore;
    
    // Bonus pour les calculs corrects
    if (calculationResults && calculationResults.length > 0) {
      const correctCalculations = calculationResults.filter(result => result.isCorrect).length;
      const correctRatio = correctCalculations / calculationResults.length;
      
      // Bonus pour les calculs corrects (jusqu'à +10%)
      rawScore += correctRatio * 0.1;
    }
    
    // Ajustement selon le statut spécifique (bonus/malus)
    if (verificationStatus === 'verified' && metrics.confidence > this.THRESHOLDS.HIGH_CONFIDENCE_THRESHOLD) {
      // Bonus pour information vérifiée avec haute confiance
      rawScore *= 1.1;
    } else if (verificationStatus === 'absence_of_information') {
      // Absence d'info n'est pas nécessairement négatif, mais limite la fiabilité max
      rawScore = Math.min(rawScore, 0.75);
    }
    
    // Lissage temporel si score précédent disponible (évite les oscillations trop rapides)
    if (previousScore !== undefined) {
      rawScore = 0.7 * rawScore + 0.3 * previousScore;
    }
    
    // Normalisation finale
    return Math.max(
      this.THRESHOLDS.MIN_RELIABILITY,
      Math.min(this.THRESHOLDS.MAX_RELIABILITY, rawScore)
    );
  }

  /**
   * Calcule un score de pertinence basé sur la correspondance avec le contexte
   * 
   * @param thought La pensée à évaluer
   * @param context Le contexte actuel
   * @returns Score de pertinence (0-1)
   */
  calculateRelevanceScore(thought: ThoughtNode, context: string): number {
    const thoughtKeywords = this.extractKeywords(thought.content);
    const contextKeywordWeights = this.extractAndWeightContextKeywords(context);
    
    let relevanceScore = 0;
    let totalWeight = 0;
    
    // Calculer le score en fonction des correspondances pondérées
    thoughtKeywords.forEach(keyword => {
      if (contextKeywordWeights[keyword]) {
        const weight = contextKeywordWeights[keyword];
        relevanceScore += weight;
        totalWeight += weight;
      }
    });
    
    // Normaliser le score
    if (totalWeight > 0) {
      relevanceScore = relevanceScore / totalWeight;
    } else {
      // Aucune correspondance, score minimal
      relevanceScore = this.THRESHOLDS.MIN_RELEVANCE;
    }
    
    // Pondérer en fonction des connexions et du type de pensée
    let connectionFactor = 1.0;
    
    // Bonus pour les connexions fortes avec d'autres pensées pertinentes
    if (thought.connections && thought.connections.length > 0) {
      let connectionScore = 0;
      thought.connections.forEach((connection: Connection) => {
        const typeWeight = this.getConnectionTypeWeight(connection.type);
        connectionScore += typeWeight * connection.strength;
      });
      connectionFactor += (connectionScore / thought.connections.length) * 0.5;
    }
    
    relevanceScore *= connectionFactor;
    
    // Normaliser entre MIN et MAX
    return Math.max(
      this.THRESHOLDS.MIN_RELEVANCE,
      Math.min(this.THRESHOLDS.MAX_RELEVANCE, relevanceScore)
    );
  }

  /**
   * Extrait les mots-clés d'un texte donné
   * 
   * @param text Le texte à analyser
   * @returns Un tableau de mots-clés
   */
  extractKeywords(text: string): string[] {
    // Convertir en minuscules et supprimer la ponctuation
    const processedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    
    // Liste de mots vides (stop words) en français et anglais
    const stopWords = new Set([
      // Français
      'le', 'la', 'les', 'un', 'une', 'des', 'et', 'ou', 'de', 'du', 'au', 'aux',
      'ce', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
      'notre', 'nos', 'votre', 'vos', 'leur', 'leurs', 'est', 'sont', 'être', 'avoir',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles', 'que', 'qui', 'quoi',
      'comment', 'pourquoi', 'quand', 'où', 'car', 'mais', 'donc', 'or', 'ni', 'si',
      'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'contre', 'par', 'vers',
      // Anglais
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with',
      'without', 'by', 'from', 'of', 'as', 'is', 'are', 'was', 'were', 'be', 'been',
      'having', 'have', 'had', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
      'this', 'that', 'these', 'those', 'my', 'your', 'his', 'her', 'its', 'our', 'their',
      'what', 'which', 'who', 'whom', 'whose', 'when', 'where', 'why', 'how'
    ]);
    
    // Diviser en mots et filtrer les mots vides
    const words = processedText.split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.has(word)
    );
    
    // Compter la fréquence des mots
    const wordCounts: Record<string, number> = {};
    words.forEach(word => {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    });
    
    // Trier par fréquence décroissante et renvoyer les N premiers
    return Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(entry => entry[0]);
  }

  /**
   * Extrait et pondère les mots-clés du contexte
   * 
   * @param text Le texte du contexte
   * @returns Un objet avec les mots-clés et leurs poids
   */
  extractAndWeightContextKeywords(text: string): Record<string, number> {
    const keywords = this.extractKeywords(text);
    const weightedKeywords: Record<string, number> = {};
    
    // Assigner des poids en fonction de l'ordre (les premiers mots-clés sont plus importants)
    keywords.forEach((keyword, index) => {
      // Formule simple qui donne plus de poids aux premiers mots-clés
      weightedKeywords[keyword] = 1 - (index / (keywords.length * 2)); 
    });
    
    return weightedKeywords;
  }

  /**
   * Obtient le poids associé à un type de connexion
   * 
   * @param type Le type de connexion
   * @returns Le poids de ce type de connexion
   */
  getConnectionTypeWeight(type: ConnectionType): number {
    const weights: Record<ConnectionType, number> = {
      'supports': 0.9,
      'contradicts': 0.7, // Même si contradictoire, c'est une relation forte
      'refines': 0.8,
      'branches': 0.6,
      'derives': 0.75,
      'associates': 0.5,
      'exemplifies': 0.7,
      'generalizes': 0.75,
      'compares': 0.6,
      'contrasts': 0.65,
      'questions': 0.5,
      'extends': 0.7,
      'analyzes': 0.8,
      'synthesizes': 0.85,
      'applies': 0.7,
      'evaluates': 0.8,
      'cites': 0.9,
      'extended-by': 0.7,
      'analyzed-by': 0.8,
      'component-of': 0.7,
      'applied-by': 0.7,
      'evaluated-by': 0.8,
      'cited-by': 0.9
    };
    
    return weights[type] || 0.5; // Valeur par défaut si type inconnu
  }

  /**
   * Détermine le statut de vérification en fonction du score de confiance
   * et d'autres facteurs
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
    
    // Sinon, c'est l'implémentation originale avec confidence, hasContradictions et hasInformation
    const confidence = confidenceOrResults as number;
    
    // Absence d'information: aucune source pour vérifier
    if (!hasInformation) {
      return 'absence_of_information';
    }
    
    // Contradictions: les sources se contredisent
    if (hasContradictions) {
      // Si beaucoup de contradictions et peu de confiance
      if (confidence < this.THRESHOLDS.CONTRADICTION_THRESHOLD) {
        return 'contradictory';
      }
      // Contradictions mais avec un niveau de confiance moyen
      return 'uncertain';
    }
    
    // Vérification normale basée sur le niveau de confiance
    if (confidence >= this.THRESHOLDS.VERIFIED_THRESHOLD) {
      return 'verified';
    } else if (confidence >= this.THRESHOLDS.PARTIALLY_VERIFIED_THRESHOLD) {
      return 'partially_verified';
    }
    
    // Par défaut: non vérifié
    return 'unverified';
  }
  
  /**
   * Détermine le statut de vérification à partir des résultats de multiples sources
   * Algorithme amélioré pour gérer les cas ambigus
   *
   * @param results Résultats de vérification provenant de différentes sources
   * @returns Statut de vérification (VerificationStatus)
   */
  private determineVerificationStatusFromResults(results: any[]): VerificationStatus {
    if (!results || results.length === 0) {
      return 'unverified';
    }
    
    // Compter les différents types de résultats avec pondération par confiance
    const counts = {
      verified: 0,
      contradicted: 0,
      uncertain: 0,
      absence: 0,
      inconclusive: 0
    };
    
    // Comptage pondéré par la confiance de la source
    results.forEach(result => {
      const confidence = result.confidence || 0.5;
      const isValid = result.result?.isValid;
      
      if (isValid === true) {
        counts.verified += confidence;
      } else if (isValid === false) {
        counts.contradicted += confidence;
      } else if (isValid === 'uncertain') {
        counts.uncertain += confidence;
      } else if (isValid === 'absence_of_information') {
        counts.absence += confidence;
      } else {
        counts.inconclusive += confidence;
      }
    });
    
    // Calcul des ratios par rapport au total
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    const verifiedRatio = counts.verified / total;
    const contradictedRatio = counts.contradicted / total;
    const uncertainRatio = counts.uncertain / total;
    const absenceRatio = counts.absence / total;
    
    // Logique de décision optimisée
    
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
   * Génère un résumé explicatif du niveau de certitude
   * 
   * @param status Statut de vérification
   * @param confidence Niveau de confiance (0-1)
   * @returns Résumé textuel du niveau de certitude
   */
  generateCertaintySummary(status: VerificationStatus, confidence: number = 0.5): string {
    // Formater le pourcentage pour l'affichage
    const percentage = Math.round(confidence * 100);
    
    let summary = '';
    
    switch (status) {
      case 'verified':
        summary = `Information vérifiée avec un niveau de confiance de ${percentage}%. Plusieurs sources fiables confirment cette information.`;
        break;
      case 'partially_verified':
        summary = `Information partiellement vérifiée avec un niveau de confiance de ${percentage}%. Certains éléments sont confirmés par des sources fiables.`;
        break;
      case 'unverified':
        summary = `Information non vérifiée. Niveau de confiance: ${percentage}%. Aucune source ne confirme ou n'infirme cette information.`;
        break;
      case 'contradictory':
        summary = `Information contradictoire. Niveau de confiance: ${percentage}%. Des sources crédibles se contredisent sur ce sujet.`;
        break;
      case 'absence_of_information':
        summary = `Aucune information trouvée sur ce sujet. Niveau de confiance: ${percentage}%. Cette absence d'information est elle-même une information pertinente.`;
        break;
      case 'uncertain':
        summary = `Information incertaine. Niveau de confiance: ${percentage}%. Les sources disponibles ne permettent pas de conclure avec certitude.`;
        break;
      default:
        summary = `Niveau de confiance: ${percentage}%.`;
    }
    
    // Ajouter des conseils supplémentaires selon le niveau de confiance
    if (confidence < 0.3) {
      summary += ' Cette information doit être considérée comme hautement spéculative.';
    } else if (confidence > 0.85) {
      summary += ' Cette information peut être considérée comme fiable.';
    }
    
    return summary;
  }

  /**
   * Détecte les biais potentiels dans une pensée
   * 
   * @param thought La pensée à analyser
   * @returns Un tableau des biais détectés avec leur score (0-1)
   */
  detectBiases(thought: ThoughtNode): Array<{type: string, score: number, description: string}> {
    const content = thought.content.toLowerCase();
    const biases = [];
    
    // Liste des patterns de biais cognitifs courants
    const biasPatterns = [
      {
        type: 'confirmation_bias',
        patterns: ['je savais déjà', 'comme prévu', 'confirme que', 'toujours été', 'évidemment'],
        description: 'Tendance à favoriser les informations qui confirment des croyances préexistantes'
      },
      {
        type: 'recency_bias',
        patterns: ['récemment', 'dernièrement', 'ces jours-ci', 'tendance actuelle', 'de nos jours'],
        description: 'Tendance à donner plus d\'importance aux événements récents'
      },
      {
        type: 'availability_heuristic',
        patterns: ['souvent', 'fréquemment', 'généralement', 'habituellement', 'couramment'],
        description: 'Jugement basé sur des exemples qui viennent facilement à l\'esprit'
      },
      {
        type: 'black_white_thinking',
        patterns: ['toujours', 'jamais', 'impossible', 'absolument', 'parfaitement', 'totalement'],
        description: 'Tendance à voir les choses en termes absolus sans nuances'
      },
      {
        type: 'authority_bias',
        patterns: ['expert dit', 'selon les experts', 'études montrent', 'scientifiquement prouvé'],
        description: 'Tendance à attribuer plus de poids aux opinions des figures d\'autorité'
      }
    ];
    
    // Détecter les biais
    biasPatterns.forEach(bias => {
      let matchCount = 0;
      bias.patterns.forEach(pattern => {
        if (content.includes(pattern)) {
          matchCount++;
        }
      });
      
      if (matchCount > 0) {
        // Calculer un score basé sur le nombre de correspondances
        const score = Math.min(matchCount / bias.patterns.length * 1.5, 1);
        if (score > 0.2) { // Seuil minimum pour considérer un biais
          biases.push({
            type: bias.type,
            score,
            description: bias.description
          });
        }
      }
    });
    
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
   * Détermine les besoins de vérification pour un contenu donné
   * 
   * @param content Le contenu textuel à analyser
   * @returns Configuration recommandée pour la vérification
   */
  determineVerificationRequirements(content: string): {
    needsFactCheck: boolean;
    needsMathCheck: boolean;
    needsSourceCheck: boolean;
    priority: 'low' | 'medium' | 'high';
    suggestedTools: string[];
    requiresMultipleVerifications: boolean;
    reasons: string[];
    recommendedVerificationsCount: number;
  } {
    const lowercaseContent = content.toLowerCase();
    
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
    
    // Détection des références à des sources
    if (/selon|d'après|source|cité|référence|étude|recherche|publication/i.test(content)) {
      result.needsSourceCheck = true;
      result.suggestedTools.push('citation_checker');
      result.reasons.push('Contient des références à des sources');
    }
    
    // Détermination de la priorité
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
    
    // Définir la priorité en fonction du score
    if (score >= 3) {
      result.priority = 'high';
    } else if (score >= 1) {
      result.priority = 'medium';
    }
    
    // Déterminer si plusieurs vérifications sont nécessaires
    // Basé sur la complexité et l'importance du contenu
    if (result.needsFactCheck && (result.needsMathCheck || result.needsSourceCheck)) {
      result.requiresMultipleVerifications = true;
      result.recommendedVerificationsCount = 2;
      
      // Si les trois types de vérification sont nécessaires, recommander 3 vérifications
      if (result.needsFactCheck && result.needsMathCheck && result.needsSourceCheck) {
        result.recommendedVerificationsCount = 3;
      }
    }
    
    // Si la priorité est élevée, recommander toujours au moins 2 vérifications
    if (result.priority === 'high' && result.recommendedVerificationsCount < 2) {
      result.requiresMultipleVerifications = true;
      result.recommendedVerificationsCount = 2;
    }
    
    return result;
  }

  /**
   * Calcule un niveau de confiance pour un ensemble de résultats de vérification
   * en utilisant une approche bayésienne
   * 
   * @param results Résultats de vérification
   * @returns Score de confiance entre 0 et 1
   */
  calculateVerificationConfidence(results: any[]): number {
    if (!results || results.length === 0) {
      return 0.5; // Confiance neutre par défaut
    }
    
    // Approche bayésienne pour agréger les résultats
    // Partir d'une probabilité a priori de 0.5 (neutre)
    let posteriorOdds = 1.0; // Odds de 1:1 équivaut à une probabilité de 0.5
    
    // Facteurs de pondération pour différentes sources
    const sourceTypeWeights: Record<string, number> = {
      'search': 0.8,
      'database': 0.9,
      'calculation': 0.95,
      'external_api': 0.85,
      'default': 0.7
    };
    
    // Nombre total de résultats positifs et négatifs pondérés
    let positiveWeight = 0;
    let negativeWeight = 0;
    
    // Analyser chaque résultat
    results.forEach(result => {
      // Déterminer le poids de cette source
      const sourceWeight = sourceTypeWeights[result.toolType] || sourceTypeWeights.default;
      
      // Ajuster la confiance en fonction de la validité
      if (result.result?.isValid === true) {
        positiveWeight += sourceWeight * (result.confidence || 0.5);
      } else if (result.result?.isValid === false) {
        negativeWeight += sourceWeight * (result.confidence || 0.5);
      }
      // Les autres cas (incertain, absence d'info) ne modifient pas les odds
    });
    
    // Si aucun résultat positif ou négatif clair, retourner une confiance neutre
    if (positiveWeight === 0 && negativeWeight === 0) {
      return 0.5;
    }
    
    // Calculer le ratio de vraisemblance bayésien
    const likelihoodRatio = (positiveWeight + 0.5) / (negativeWeight + 0.5);
    
    // Mettre à jour les odds postérieures
    posteriorOdds *= likelihoodRatio;
    
    // Convertir les odds en probabilité
    let confidence = posteriorOdds / (1 + posteriorOdds);
    
    // Bonus pour le nombre de sources consultées (plus de sources = plus fiable)
    const sourceCountBonus = Math.min(results.length * 0.05, 0.2);
    confidence = Math.min(confidence + sourceCountBonus, 0.95);
    
    // Limite inférieure pour éviter une confiance trop basse
    confidence = Math.max(confidence, 0.2);
    
    return confidence;
  }

  // Expressions régulières pour l'analyse de contenu
  private REGEX = {
    MATH_CALCULATION: /(?:\d+(?:\.\d+)?)\s*(?:[+\-*/^]|plus|moins|divisé|fois|multiplié)\s*(?:\d+(?:\.\d+)?)/i,
    MATHEMATICAL_PROOF: /(?:prouvons|démontrons|supposons|soit|démonstration|preuve|CQFD|théorème|lemme|corollaire)/i,
    LOGICAL_DEDUCTION: /(?:donc|par conséquent|ainsi|il s'ensuit que|cela implique|on en déduit|cela prouve)/i,
    FACTUAL_CLAIM: /(?:est|sont|était|étaient|a été|ont été|sera|seront)\s+(?:un|une|des|le|la|les|du|de la)/i,
    STRONG_EMOTION: /(?:!{2,}|incroyable|fantastique|horrible|déteste|adore|absolument|totalement|complètement|extrêmement)/i
  };
}