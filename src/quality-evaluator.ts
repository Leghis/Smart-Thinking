import { ThoughtMetrics, ThoughtNode } from './types';
import { ThoughtGraph } from './thought-graph';

/**
 * Classe qui évalue la qualité des pensées
 */
export class QualityEvaluator {
  // Dictionnaire de mots positifs/négatifs pour une évaluation simple
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
    
    // Évaluer chaque métrique
    const confidence = this.evaluateConfidence(thought);
    const relevance = this.evaluateRelevance(thought, connectedThoughts);
    const quality = this.evaluateQuality(thought, connectedThoughts);
    
    return {
      confidence,
      relevance,
      quality
    };
  }
  
  /**
   * Évalue le niveau de confiance d'une pensée
   * 
   * @param thought La pensée à évaluer
   * @returns Le niveau de confiance entre 0 et 1
   */
  private evaluateConfidence(thought: ThoughtNode): number {
    const content = thought.content.toLowerCase();
    
    // Détection de modalisateurs d'incertitude
    const uncertaintyModifiers = [
      'peut-être', 'possible', 'probablement', 'incertain', 'semble', 
      'pourrait', 'hypothèse', 'suppose', 'doute', 'incertain'
    ];
    
    const certaintyModifiers = [
      'certainement', 'clairement', 'évidemment', 'sans doute', 'indiscutablement',
      'nécessairement', 'doit', 'est', 'démontré', 'prouvé'
    ];
    
    // Compter les occurrences
    const uncertaintyCount = uncertaintyModifiers.filter(mod => content.includes(mod)).length;
    const certaintyCount = certaintyModifiers.filter(mod => content.includes(mod)).length;
    
    // Calculer un score basé sur la présence de modalisateurs
    let confidenceScore = 0.5; // Score par défaut
    
    if (uncertaintyCount > 0 || certaintyCount > 0) {
      // Ajuster le score en fonction du rapport entre certitude et incertitude
      confidenceScore = 0.5 + (certaintyCount - uncertaintyCount) * 0.1;
    }
    
    // Ajuster en fonction du type de pensée
    if (thought.type === 'hypothesis') {
      confidenceScore *= 0.9; // Les hypothèses sont naturellement moins certaines
    } else if (thought.type === 'conclusion') {
      confidenceScore *= 1.1; // Les conclusions devraient être plus certaines
    }
    
    // Limiter le score entre 0.1 et 0.9
    return Math.min(Math.max(confidenceScore, 0.1), 0.9);
  }
  
  /**
   * Évalue la pertinence d'une pensée par rapport au contexte
   * 
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées pour le contexte
   * @returns Le niveau de pertinence entre 0 et 1
   */
  private evaluateRelevance(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): number {
    // Si pas de pensées connectées, la pertinence est moyenne par défaut
    if (connectedThoughts.length === 0) {
      return 0.5;
    }
    
    // Extraire les mots-clés de la pensée et des pensées connectées
    const thoughtWords = this.extractKeywords(thought.content);
    
    const allConnectedWords = connectedThoughts.flatMap(t => 
      this.extractKeywords(t.content)
    );
    
    // Calculer le chevauchement de mots-clés
    const uniqueThoughtWords = new Set(thoughtWords);
    const uniqueConnectedWords = new Set(allConnectedWords);
    
    const intersection = [...uniqueThoughtWords].filter(word => 
      uniqueConnectedWords.has(word)
    );
    
    const overlapScore = intersection.length / Math.max(uniqueThoughtWords.size, 1);
    
    // Analyser les connexions
    const strongConnections = thought.connections.filter(conn => conn.strength > 0.7).length;
    const connectionScore = strongConnections / Math.max(thought.connections.length, 1);
    
    // Combiner les scores
    let relevanceScore = 0.4 * overlapScore + 0.6 * connectionScore;
    
    // Ajuster en fonction du type de pensée
    if (thought.type === 'meta') {
      relevanceScore *= 0.9; // Les méta-pensées peuvent sembler moins directement pertinentes
    } else if (thought.type === 'revision') {
      relevanceScore *= 1.1; // Les révisions devraient être fortement pertinentes
    }
    
    // Limiter le score entre 0.2 et 0.95
    return Math.min(Math.max(relevanceScore, 0.2), 0.95);
  }
  
  /**
   * Évalue la qualité globale d'une pensée
   * 
   * @param thought La pensée à évaluer
   * @param connectedThoughts Les pensées connectées pour le contexte
   * @returns Le niveau de qualité entre 0 et 1
   */
  private evaluateQuality(thought: ThoughtNode, connectedThoughts: ThoughtNode[]): number {
    const content = thought.content.toLowerCase();
    
    // Évaluer la présence de mots positifs/négatifs
    const positiveCount = this.positiveWords.filter(word => content.includes(word)).length;
    const negativeCount = this.negativeWords.filter(word => content.includes(word)).length;
    
    // Calculer un score initial basé sur les mots positifs/négatifs
    let qualityScore = 0.5 + (positiveCount - negativeCount) * 0.05;
    
    // Vérifier les indicateurs spécifiques au type de pensée
    const typeIndicators = this.qualityIndicators[thought.type] || this.qualityIndicators['regular'];
    
    const positiveIndicatorsCount = typeIndicators.positive.filter(ind => 
      content.includes(ind)
    ).length;
    
    const negativeIndicatorsCount = typeIndicators.negative.filter(ind => 
      content.includes(ind)
    ).length;
    
    // Ajuster le score en fonction des indicateurs spécifiques
    qualityScore += (positiveIndicatorsCount - negativeIndicatorsCount) * 0.1;
    
    // Évaluer la longueur - pénaliser les pensées trop courtes ou trop longues
    const wordCount = content.split(/\s+/).length;
    let lengthScore = 1.0;
    
    if (wordCount < 5) {
      lengthScore = 0.7; // Pensée trop courte
    } else if (wordCount > 200) {
      lengthScore = 0.8; // Pensée trop longue
    } else if (wordCount > 30 && wordCount < 100) {
      lengthScore = 1.1; // Longueur idéale
    }
    
    qualityScore *= lengthScore;
    
    // Vérifier la cohérence avec les pensées connectées
    if (connectedThoughts.length > 0) {
      const contradictions = connectedThoughts.filter(t => 
        thought.connections.some(conn => 
          conn.targetId === t.id && conn.type === 'contradicts'
        )
      ).length;
      
      // Pénaliser en cas de contradictions
      if (contradictions > 0) {
        qualityScore *= 0.9;
      }
    }
    
    // Limiter le score entre 0.3 et 0.95
    return Math.min(Math.max(qualityScore, 0.3), 0.95);
  }
  
  /**
   * Extrait les mots-clés d'un texte
   * 
   * @param text Le texte dont extraire les mots-clés
   * @returns Un tableau de mots-clés
   */
  private extractKeywords(text: string): string[] {
    // Liste de mots courants à ignorer (stop words)
    const stopWords = [
      'le', 'la', 'les', 'un', 'une', 'des', 'ce', 'cette', 'ces',
      'et', 'ou', 'mais', 'donc', 'car', 'ni', 'que', 'qui',
      'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par',
      'je', 'tu', 'il', 'elle', 'nous', 'vous', 'ils', 'elles',
      'est', 'sont', 'être', 'avoir', 'fait', 'faire',
      'plus', 'moins', 'très', 'trop', 'peu', 'beaucoup'
    ];
    
    // Extraction simple des mots
    return text.toLowerCase()
      .split(/\W+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.includes(word)
      );
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
   * Suggère des améliorations pour une pensée
   * 
   * @param thought La pensée à améliorer
   * @param thoughtGraph Le graphe de pensées
   * @returns Un tableau de suggestions d'amélioration
   */
  suggestImprovements(thought: ThoughtNode, thoughtGraph: ThoughtGraph): string[] {
    const suggestions: string[] = [];
    const metrics = this.evaluate(thought.id, thoughtGraph);
    
    // Suggérer des améliorations basées sur les métriques
    if (metrics.confidence < 0.4) {
      suggestions.push('Renforcez l\'argumentation avec des preuves ou des références.');
    }
    
    if (metrics.relevance < 0.4) {
      suggestions.push('Clarifiez le lien avec les pensées précédentes ou le sujet principal.');
    }
    
    if (metrics.quality < 0.4) {
      suggestions.push('Améliorez la structure et la clarté de cette pensée.');
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
    const connectedThoughts = thoughtGraph.getConnectedThoughts(thought.id);
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