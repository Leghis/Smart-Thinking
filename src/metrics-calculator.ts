/**
 * metrics-calculator.ts
 *
 * Système centralisé pour tous les calculs de métriques dans Smart-Thinking
 * Implémente des algorithmes avancés pour calculer la confiance, la pertinence,
 * la qualité et autres métriques utilisées par le système.
 */

import { ThoughtNode, ThoughtMetrics, Connection, ConnectionType, VerificationStatus, CalculationVerificationResult } from './types';

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
    'éventuellement', 'potentiellement', 'aparemment', 'suggère'
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
      keywordOverlap: 0.5,     // Chevauchement de mots-clés - CORRIGÉ: de 0.3 à 0.5
      connectionStrength: 0.5  // Force des connexions dans le graphe - CORRIGÉ: de 0.3 à 0.5
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
  }

  /**
   * Calcule la métrique de confiance pour une pensée
   * Implémente un algorithme bayésien simple pour évaluer la confiance
   *
   * @param thought La pensée à évaluer
   * @returns Niveau de confiance entre 0 et 1
   */
  calculateConfidence(thought: ThoughtNode): number {
    const content = thought.content.toLowerCase();
    const typeWeight = this.config.typeAdjustments[thought.type].confidence;

    // 1. Analyse des modalisateurs de certitude/incertitude
    const uncertaintyCount = this.uncertaintyModifiers.filter(mod => content.includes(mod)).length;
    const certaintyCount = this.certaintyModifiers.filter(mod => content.includes(mod)).length;

    // Calcul du score Bayésien simple
    // La probabilité a priori est de 0.5 (neutre)
    // On ajuste en fonction des indices de certitude et d'incertitude
    const prior = 0.5;
    let likelihood = 0.5;

    if (uncertaintyCount > 0 || certaintyCount > 0) {
      const totalModifiers = Math.max(uncertaintyCount + certaintyCount, 1);
      likelihood = (certaintyCount / totalModifiers) * 0.5 + 0.5;
    }

    // Calcul Bayésien simplifié: P(confiance|modalisateurs) ∝ P(modalisateurs|confiance) * P(confiance)
    let confidenceScore = (prior * likelihood) / ((prior * likelihood) + ((1 - prior) * (1 - likelihood)));

    // 2. Analyse des indicateurs structurels (citations, références, données)
    const hasReferences = /\(([^)]+)\)|\[[^\]]+\]/.test(content); // Recherche de parenthèses ou crochets
    const hasNumbers = /\d+([.,]\d+)?%?/.test(content); // Recherche de chiffres ou pourcentages

    let structuralScore = 0.5;
    if (hasReferences) structuralScore += 0.2;
    if (hasNumbers) structuralScore += 0.1;

    // 3. Analyse de l'équilibre des sentiments
    const positiveCount = this.positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = this.negativeWords.filter(word => content.includes(word)).length;
    const sentimentTotal = Math.max(positiveCount + negativeCount, 1);
    const sentimentBalance = (Math.abs(positiveCount - negativeCount) / sentimentTotal) * 0.5 + 0.5;

    // 4. Score basé sur le type de pensée (CORRIGÉ: ajout de cette composante manquante)
    let typeScore = 0.5; // Valeur par défaut

    switch (thought.type) {
      case 'conclusion':
        typeScore = 0.8; // Les conclusions doivent montrer plus de confiance
        break;
      case 'hypothesis':
        typeScore = 0.6; // Les hypothèses sont par nature plus incertaines
        break;
      case 'meta':
        typeScore = 0.7; // Les méta-pensées reflètent une certaine confiance
        break;
      case 'revision':
        typeScore = 0.75; // Les révisions montrent une confiance modérée à élevée
        break;
      default:
        typeScore = 0.65; // Pour les pensées régulières
    }

    // Combinaison pondérée des facteurs
    // CORRIGÉ: inclure toutes les composantes selon leurs poids respectifs
    confidenceScore = (
        confidenceScore * this.config.confidenceWeights.modifierAnalysis +
        typeScore * this.config.confidenceWeights.thoughtType +
        structuralScore * this.config.confidenceWeights.structuralIndicators +
        sentimentBalance * this.config.confidenceWeights.sentimentBalance
    ) * typeWeight;

    // Limiter entre 0.1 et 0.95 pour éviter les extrêmes absolus
    return Math.min(Math.max(confidenceScore, 0.1), 0.95);
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
    const contextKeywords = this.extractAndWeightContextKeywords(connectedThoughts);

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

    // 3. Calcul de l'ancrage contextuel (connections entrantes)
    const incomingConnections = connectedThoughts.flatMap(t =>
        t.connections.filter(conn => conn.targetId === thought.id)
    );

    const incomingScore = incomingConnections.length > 0
        ? incomingConnections.reduce((sum, conn) => sum + conn.strength, 0) / incomingConnections.length
        : 0.5;

    // CORRIGÉ: Combinaison pondérée pour le score final, sans la similarité sémantique
    // qui n'est pas implémentée, en redistribuant son poids
    const relevanceScore = (
        keywordOverlapScore * this.config.relevanceWeights.keywordOverlap +
        connectionScore * (this.config.relevanceWeights.connectionStrength / 2) +
        incomingScore * (this.config.relevanceWeights.connectionStrength / 2)
    );

    // Ajustement par type de pensée
    const typeAdjustment = thought.type === 'meta' ? 0.9 :
        thought.type === 'revision' ? 1.1 : 1.0;

    // Limiter entre 0.2 et 0.95
    return Math.min(Math.max(relevanceScore * typeAdjustment, 0.2), 0.95);
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
    const typeAdjustment = this.config.typeAdjustments[thought.type].quality;

    // 1. Analyse des indicateurs lexicaux (mots positifs/négatifs)
    const positiveCount = this.positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = this.negativeWords.filter(word => content.includes(word)).length;

    // Score basé sur le ratio positif/négatif (plus de positifs = meilleure qualité)
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
    // CORRIGÉ: Utilisez la bonne expression régulière pour diviser le texte
    const words = content.split(/\s+/);
    const wordCount = words.length;
    const sentenceCount = content.split(/[.!?]+/).filter(s => s.trim().length > 0).length;
    const avgSentenceLength = wordCount / Math.max(sentenceCount, 1);

    // CORRIGÉ: Plages non chevauchantes pour le score structurel
    let structuralScore = 0.5;

    // Pénaliser les pensées trop courtes ou trop longues
    if (wordCount < 5) {
      structuralScore = 0.3; // Trop court
    } else if (wordCount > 300) {
      structuralScore = 0.4; // Trop long
    } else if (wordCount >= 150 && wordCount <= 300) {
      structuralScore = 0.6; // Longueur acceptable mais non idéale
    } else if (wordCount >= 30 && wordCount < 150) {
      structuralScore = 0.8; // Longueur idéale
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

      // Ajuster le score en fonction des contradictions et soutiens
      if (contradictions > 0 && supports === 0) {
        coherenceScore = 0.4; // Contradiction sans soutien
      } else if (contradictions > 0 && supports > 0) {
        coherenceScore = 0.5; // Équilibré
      } else if (supports > 0) {
        coherenceScore = 0.7; // Soutenu sans contradiction
      }

      // Bonus pour les pensées bien connectées
      const connectionRatio = thought.connections.length / Math.max(connectedThoughts.length, 1);
      if (connectionRatio > 0.5) {
        coherenceScore += 0.1;
      }
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
   * Calcule un score global de fiabilité basé sur les différentes métriques et vérifications
   *
   * @param metrics Les métriques de base
   * @param verificationStatus Statut de vérification actuel
   * @param calculationResults Résultats de vérification des calculs (optionnel)
   * @returns Score de fiabilité entre 0 et 1
   */
  calculateReliabilityScore(
      metrics: ThoughtMetrics,
      verificationStatus: VerificationStatus,
      calculationResults?: CalculationVerificationResult[]
  ): number {
    // Poids des différentes composantes
    const weights = {
      confidence: 0.35,
      verification: 0.35,
      quality: 0.2,
      calculationAccuracy: 0.1
    };

    // NOUVELLE CORRECTION: Ajuster la confiance selon le statut de vérification
    let adjustedConfidence = metrics.confidence;
    
    // Si l'information n'est pas vérifiée, limiter la confiance maximale à 0.6
    if (verificationStatus === 'unverified') {
        adjustedConfidence = Math.min(adjustedConfidence, 0.6);
    }
    
    // CORRIGÉ: Score basé sur les métriques avec pondération relative correcte
    const confidenceRelativeWeight = weights.confidence / (weights.confidence + weights.quality);
    const qualityRelativeWeight = weights.quality / (weights.confidence + weights.quality);

    let scoreFromMetrics = (
        adjustedConfidence * confidenceRelativeWeight +
        metrics.quality * qualityRelativeWeight
    );

    // Score basé sur le statut de vérification
    let verificationScore = 0.5; // Par défaut

    switch (verificationStatus) {
      case 'verified':
        verificationScore = 0.95;
        break;
      case 'partially_verified':
        verificationScore = 0.7;
        break;
      case 'contradicted':
        verificationScore = 0.2;
        break;
      case 'inconclusive':
        verificationScore = 0.4;
        break;
      case 'unverified':
      default:
        // NOUVELLE CORRECTION: Réduire le score de vérification pour les informations non vérifiées
        verificationScore = 0.3; // Au lieu de 0.5
    }

    // Score basé sur l'exactitude des calculs (si présents)
    let calculationScore = 0.5; // Par défaut

    // CORRIGÉ: Créer une copie locale des poids pour éviter de modifier l'original
    const adjustedWeights = { ...weights };

    if (calculationResults && calculationResults.length > 0) {
      const correctCalculations = calculationResults.filter(calc => calc.isCorrect).length;
      calculationScore = correctCalculations / calculationResults.length;

      // Renforcer l'influence des calculs correctement vérifiés
      if (calculationScore === 1.0) {
        verificationScore = Math.max(verificationScore, 0.7); // Bonus minimum si tous les calculs sont corrects
      }
    } else {
      // Sans calculs à vérifier, redistribuer ce poids proportionnellement
      const calcWeight = adjustedWeights.calculationAccuracy;
      adjustedWeights.calculationAccuracy = 0;

      // CORRIGÉ: Redistribution proportionnelle des poids
      const totalRemaining = adjustedWeights.confidence + adjustedWeights.verification + adjustedWeights.quality;
      adjustedWeights.confidence += (adjustedWeights.confidence / totalRemaining) * calcWeight;
      adjustedWeights.verification += (adjustedWeights.verification / totalRemaining) * calcWeight;
      adjustedWeights.quality += (adjustedWeights.quality / totalRemaining) * calcWeight;
    }

    // Combiner tous les scores avec pondération
    let reliabilityScore = (
        scoreFromMetrics * (adjustedWeights.confidence + adjustedWeights.quality) +
        verificationScore * adjustedWeights.verification +
        (calculationScore || 0.5) * adjustedWeights.calculationAccuracy
    );
    
    // NOUVELLE CORRECTION: Appliquer un plafond de fiabilité global selon le statut de vérification
    if (verificationStatus === 'unverified') {
        reliabilityScore = Math.min(reliabilityScore, 0.5); // Plafonner à 50% pour non vérifié
    } else if (verificationStatus === 'contradicted') {
        reliabilityScore = Math.min(reliabilityScore, 0.4); // Plafonner à 40% pour contredit
    } else if (verificationStatus === 'inconclusive') {
        reliabilityScore = Math.min(reliabilityScore, 0.6); // Plafonner à 60% pour inconclusif
    }

    // Limiter entre 0.1 et 0.95
    return Math.min(Math.max(reliabilityScore, 0.1), 0.95);
  }

  /**
   * Calcule un score de confiance pour la vérification à partir de multiples sources
   * Utilise un modèle de consensus pondéré
   *
   * @param verificationResults Résultats de vérification provenant de différentes sources
   * @returns Score de confiance entre 0 et 1
   */
  calculateVerificationConfidence(verificationResults: any[]): number {
    if (verificationResults.length === 0) {
      return 0.5; // Valeur par défaut
    }

    // Calculer une moyenne pondérée des confiances
    const totalWeight = verificationResults.reduce((sum, r) => sum + r.confidence, 0);
    const weightedConfidence = verificationResults.reduce((sum, r) => {
      const resultConfidence = r.result.confidence || 0.5;
      return sum + (resultConfidence * r.confidence);
    }, 0);

    // Ajouter un facteur de consensus
    const validities = verificationResults.map(r => r.result.isValid === true ? 1 :
        r.result.isValid === false ? -1 : 0);

    // Mesure d'accord: 1.0 si toutes les sources sont d'accord, 0.5 si divisées
    let agreementFactor = 0.5;

    if (validities.length > 1) {
      const trueCount = validities.filter(v => v === 1).length;
      const falseCount = validities.filter(v => v === -1).length;
      const indeterminateCount = validities.filter(v => v === 0).length;

      // Calcul inspiré de l'indice de Fleiss Kappa pour l'accord inter-évaluateurs
      if (trueCount === validities.length || falseCount === validities.length) {
        agreementFactor = 1.0; // Accord parfait
      } else if (indeterminateCount === validities.length) {
        agreementFactor = 0.5; // Toutes indéterminées
      } else if (trueCount > 0 && falseCount > 0) {
        // Désaccord franc
        const ratio = Math.abs(trueCount - falseCount) / (trueCount + falseCount);
        agreementFactor = 0.5 - (0.3 * (1 - ratio)); // Entre 0.2 et 0.5
      } else {
        // Partiellement indéterminé
        agreementFactor = 0.7; // Accord modéré
      }
    }

    // Score final: combinaison de la moyenne pondérée et du facteur d'accord
    const confidence = totalWeight > 0
        ? (weightedConfidence / totalWeight) * 0.7 + agreementFactor * 0.3
        : 0.5;

    return Math.min(Math.max(confidence, 0.1), 0.95);
  }

  /**
   * Détermine le statut de vérification global à partir de multiples sources
   *
   * @param results Résultats de vérification
   * @returns Statut de vérification global
   */
  determineVerificationStatus(results: any[]): VerificationStatus {
    if (results.length === 0) {
      return 'unverified';
    }

    // Compter les différents statuts
    const statusCounts = {
      verified: 0,
      contradicted: 0,
      inconclusive: 0
    };

    // Analyse plus nuancée des résultats
    for (const result of results) {
      const confidence = result.confidence || 0.5;

      if (result.result.isValid === true) {
        statusCounts.verified += confidence; // Pondérer par la confiance
      } else if (result.result.isValid === false) {
        statusCounts.contradicted += confidence;
      } else {
        statusCounts.inconclusive += confidence;
      }
    }

    // Logique de décision pour le statut global
    const totalConfidence = statusCounts.verified + statusCounts.contradicted + statusCounts.inconclusive;

    if (totalConfidence === 0) return 'unverified';

    // Calcul des proportions
    const verifiedRatio = statusCounts.verified / totalConfidence;
    const contradictedRatio = statusCounts.contradicted / totalConfidence;
    const inconclusiveRatio = statusCounts.inconclusive / totalConfidence;

    // Règles de décision basées sur des seuils
    if (contradictedRatio > 0.3) {
      return 'contradicted'; // Contradiction significative
    } else if (verifiedRatio > 0.7) {
      return 'verified'; // Vérification forte
    } else if (verifiedRatio > 0.3) {
      return 'partially_verified'; // Vérification partielle
    } else if (inconclusiveRatio > 0.6) {
      return 'inconclusive'; // Principalement non concluant
    } else {
      return 'partially_verified'; // Cas par défaut plus nuancé
    }
  }

  /**
   * Extrait les mots-clés d'un texte en filtrant les mots courants
   *
   * @param text Texte à analyser
   * @returns Tableau de mots-clés
   */
  extractKeywords(text: string): string[] {
    return text.toLowerCase()
        .split(/\W+/)
        .filter(word =>
            word.length > 3 &&
            !this.stopWords.includes(word)
        );
  }

  /**
   * Extrait et pondère les mots-clés du contexte en utilisant TF-IDF
   *
   * @param connectedThoughts Pensées connectées formant le contexte
   * @returns Dictionnaire de mots-clés pondérés
   */
  private extractAndWeightContextKeywords(connectedThoughts: ThoughtNode[]): Record<string, number> {
    // Si pas de pensées connectées, retourner un objet vide
    if (connectedThoughts.length === 0) {
      return {};
    }

    // Extraire tous les mots-clés de chaque pensée
    const thoughtKeywords = connectedThoughts.map(thought =>
        this.extractKeywords(thought.content)
    );

    // Calculer la fréquence des termes (TF)
    const termFrequency: Record<string, number> = {};

    for (const keywords of thoughtKeywords) {
      // Compter chaque mot une seule fois par document
      const uniqueKeywords = [...new Set(keywords)];

      for (const keyword of uniqueKeywords) {
        termFrequency[keyword] = (termFrequency[keyword] || 0) + 1;
      }
    }

    // Calculer le score TF-IDF pour chaque mot
    const documentCount = thoughtKeywords.length;
    const weightedKeywords: Record<string, number> = {};

    for (const [term, frequency] of Object.entries(termFrequency)) {
      // Ignorer les termes trop peu fréquents
      if (frequency < this.config.tfIdf.minFrequency) {
        continue;
      }

      // Ignorer les termes trop courants
      if (frequency / documentCount > this.config.tfIdf.maxDocumentPercentage) {
        continue;
      }

      // Calculer l'IDF: ln(N/df)
      const idf = Math.log(documentCount / frequency);

      // TF-IDF = fréquence * idf
      weightedKeywords[term] = frequency * idf;
    }

    return weightedKeywords;
  }

  /**
   * Calcule le poids d'un type de connexion pour l'analyse de pertinence
   *
   * @param type Type de connexion
   * @returns Poids entre 0 et 1
   */
  private getConnectionTypeWeight(type: ConnectionType): number {
    // Poids pour chaque type de connexion dans l'analyse de pertinence
    const weights: Record<ConnectionType, number> = {
      'supports': 0.9,
      'contradicts': 0.7,
      'refines': 0.95,
      'derives': 0.85,
      'branches': 0.7,
      'associates': 0.6,
      'exemplifies': 0.8,
      'generalizes': 0.8,
      'compares': 0.7,
      'contrasts': 0.7,
      'questions': 0.6,
      'extends': 0.85,
      'analyzes': 0.9,
      'synthesizes': 0.9,
      'applies': 0.8,
      'evaluates': 0.85,
      'cites': 0.9,
      'extended-by': 0.8,
      'analyzed-by': 0.8,
      'component-of': 0.8,
      'applied-by': 0.7,
      'evaluated-by': 0.8,
      'cited-by': 0.85
    };

    return weights[type] || 0.7; // Valeur par défaut si type inconnu
  }

  /**
   * Détecte les biais potentiels dans une pensée
   *
   * @param thought La pensée à analyser
   * @returns Un tableau de biais détectés, vide si aucun
   */
  detectBiases(thought: ThoughtNode): string[] {
    const content = thought.content.toLowerCase();
    const detectedBiases: string[] = [];

    // Dictionnaire de marqueurs linguistiques de biais cognitifs courants
    const biasMarkers: Record<string, string[]> = {
      'confirmation': ['toujours', 'jamais', 'tous', 'aucun', 'évidemment', 'clairement', 'sans aucun doute'],
      'ancrage': ['initialement', 'au début', 'comme dit précédemment', 'revenons à'],
      'disponibilité': ['récemment', 'dernièrement', 'exemple frappant', 'cas célèbre'],
      'autorité': ['expert', 'autorité', 'scientifique', 'étude montre', 'recherche prouve'],
      'faux consensus': ['tout le monde', 'majorité', 'consensus', 'généralement accepté', 'communément'],
      'corrélation/causalité': ['parce que', 'donc', 'cause', 'effet', 'entraîne', 'provoque']
    };

    // Vérifier chaque type de biais
    for (const [bias, markers] of Object.entries(biasMarkers)) {
      if (markers.some(marker => content.includes(marker))) {
        detectedBiases.push(bias);
      }
    }

    return detectedBiases;
  }

  /**
   * Calcule un score de PageRank simplifié pour évaluer l'importance des pensées dans le graphe
   *
   * @param thoughtId ID de la pensée à évaluer
   * @param allThoughts Toutes les pensées du graphe
   * @param dampingFactor Facteur d'amortissement (typiquement 0.85)
   * @param iterations Nombre d'itérations pour la convergence
   * @returns Score PageRank entre 0 et 1
   */
  calculatePageRankScore(
      thoughtId: string,
      allThoughts: ThoughtNode[],
      dampingFactor: number = 0.85,
      iterations: number = 10
  ): number {
    // Créer un graphe de connexions
    const graph: Record<string, string[]> = {};
    const ranks: Record<string, number> = {};

    // Initialiser le graphe et les rangs
    for (const thought of allThoughts) {
      graph[thought.id] = [];
      ranks[thought.id] = 1 / allThoughts.length;
    }

    // Construire le graphe des connexions
    for (const thought of allThoughts) {
      for (const conn of thought.connections) {
        if (graph[conn.targetId]) {
          graph[conn.targetId].push(thought.id);
        }
      }
    }

    // Algorithme PageRank simplifié
    for (let i = 0; i < iterations; i++) {
      const newRanks: Record<string, number> = {};

      // Initialiser avec la composante de téléportation
      for (const id in graph) {
        newRanks[id] = (1 - dampingFactor) / allThoughts.length;
      }

      // Calculer la contribution des connexions entrantes
      for (const [id, inLinks] of Object.entries(graph)) {
        for (const sourceId of inLinks) {
          const outLinkCount = allThoughts.find(t => t.id === sourceId)?.connections.length || 1;
          newRanks[id] += dampingFactor * (ranks[sourceId] / outLinkCount);
        }
      }

      // Mettre à jour les rangs
      Object.assign(ranks, newRanks);
    }

    // Normaliser le résultat pour obtenir un score entre 0 et 1
    const maxRank = Math.max(...Object.values(ranks));
    const normalizedScore = ranks[thoughtId] / maxRank;

    return normalizedScore;
  }

  /**
   * Suggère des améliorations pour une pensée en fonction de ses métriques
   *
   * @param thought La pensée à analyser
   * @param metrics Les métriques calculées pour la pensée
   * @param connectedThoughts Les pensées connectées (contexte)
   * @returns Un tableau de suggestions d'amélioration
   */
  suggestImprovements(
      thought: ThoughtNode,
      metrics: ThoughtMetrics,
      connectedThoughts: ThoughtNode[]
  ): string[] {
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

  /**
   * Génère un résumé du niveau de certitude en langage naturel
   *
   * @param status Statut de vérification
   * @param score Score de fiabilité
   * @param verifiedCalculations Calculs vérifiés (optionnel)
   * @returns Un résumé en langage naturel
   */
  generateCertaintySummary(
      status: VerificationStatus,
      score: number,
      verifiedCalculations?: CalculationVerificationResult[]
  ): string {
    const percentage = Math.round(score * 100);

    // Déterminer d'abord si des calculs ont été vérifiés
    const hasVerifiedCalculations = verifiedCalculations && verifiedCalculations.length > 0;

    // Si des calculs ont été vérifiés, toujours considérer l'information comme au moins partiellement vérifiée
    if (hasVerifiedCalculations && status === 'unverified') {
      status = 'partially_verified';
    }
    
    // NOUVELLE CORRECTION: Ajouter des avertissements explicites pour les scores élevés d'informations non vérifiées
    let confidenceStatement = "";
    if (status === 'unverified' && percentage > 40) {
        confidenceStatement = ` Ce niveau de confiance reflète uniquement l'évaluation interne du modèle et NON une vérification factuelle.`;
    }

    let summary = "";

    switch (status) {
      case 'verified':
        summary = `Information vérifiée avec un niveau de confiance de ${percentage}%.`;
        break;
      case 'partially_verified':
        summary = `Information partiellement vérifiée avec un niveau de confiance de ${percentage}%.`;
        if (!hasVerifiedCalculations) {
          summary += ` Certains aspects n'ont pas pu être confirmés.`;
        }
        break;
      case 'contradicted':
        summary = `Des contradictions ont été détectées dans l'information. Niveau de confiance: ${percentage}%. Considérez des sources supplémentaires pour clarifier ces points.`;
        break;
      case 'inconclusive':
        summary = `La vérification n'a pas été concluante. Niveau de confiance: ${percentage}%. Je vous suggère de reformuler la question ou de consulter d'autres sources d'information.`;
        break;
      default:
        // CORRIGÉ: Message plus précis pour les informations non vérifiées
        summary = `Information non vérifiée. Niveau de confiance interne: ${percentage}%.${confidenceStatement} Pour une vérification complète, utilisez le paramètre requestVerification=true.`;
    }

    // Ajouter des détails sur les calculs si disponibles
    if (hasVerifiedCalculations) {
      const totalCalculations = verifiedCalculations!.length;
      const incorrectCalculations = verifiedCalculations!.filter(calc => !calc.isCorrect);
      const inProgressCalculations = verifiedCalculations!.filter(calc =>
          calc.verified.includes("vérifier") || calc.verified.includes("Vérification")
      );

      if (inProgressCalculations.length > 0) {
        summary += ` ${inProgressCalculations.length} calcul(s) encore en cours de vérification.`;
      } else if (incorrectCalculations.length > 0) {
        summary += ` ${incorrectCalculations.length} calcul(s) incorrect(s) détecté(s) et corrigé(s) sur un total de ${totalCalculations}.`;
      } else {
        summary += ` Tous les ${totalCalculations} calcul(s) ont été vérifiés et sont corrects.`;
      }
    }

    return summary;
  }
}
