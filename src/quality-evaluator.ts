import { ThoughtMetrics, ThoughtNode, VerificationStatus, VerificationResult, CalculationVerificationResult } from './types';
import { ThoughtGraph } from './thought-graph';
import { ToolIntegrator } from './tool-integrator';

/**
 * Classe qui évalue la qualité des pensées
 */
export class QualityEvaluator {
  private toolIntegrator: ToolIntegrator | null = null;
  
  /**
   * Définit l'instance de ToolIntegrator à utiliser pour les vérifications
   * 
   * @param toolIntegrator L'instance de ToolIntegrator à utiliser
   */
  public setToolIntegrator(toolIntegrator: ToolIntegrator): void {
    this.toolIntegrator = toolIntegrator;
  }
  
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
    const wordCount = content.split(/\\s+/).length;
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
      .split(/\\W+/)
      .filter(word => 
        word.length > 3 && 
        !stopWords.includes(word)
      );
  }
  
  /**
   * Vérification approfondie d'une pensée
   * 
   * @param thought La pensée à vérifier
   * @param toolIntegrator L'intégrateur d'outils pour la vérification
   * @param containsCalculations Indique si la pensée contient des calculs à vérifier
   * @returns Le résultat de la vérification
   */
  public async deepVerify(thought: ThoughtNode, toolIntegrator: ToolIntegrator, containsCalculations: boolean = false): Promise<VerificationResult> {
    const content = thought.content;
    
    // Définir temporairement le toolIntegrator pour cette opération si non déjà défini
    const previousToolIntegrator = this.toolIntegrator;
    if (!this.toolIntegrator) {
      this.toolIntegrator = toolIntegrator;
    }
    
    // Déterminer quels outils de recherche sont pertinents pour la vérification
    const verificationTools = toolIntegrator.suggestVerificationTools(content);
    
    // Résultats de vérification pour chaque outil
    const verificationResults: any[] = [];
    
    // Utiliser chaque outil pour vérifier l'information
    for (const tool of verificationTools) {
      try {
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
      // Utiliser la nouvelle méthode asynchrone
      verifiedCalculations = await this.detectAndVerifyCalculations(content);
    }
    
    // Agréger et analyser les résultats
    const status = this.aggregateVerificationStatus(verificationResults);
    const confidence = this.calculateVerificationConfidence(verificationResults);
    const sources = verificationResults.map(r => `${r.toolName}: ${r.result.source || 'Source non spécifiée'}`);
    const steps = verificationResults.map(r => `Vérifié avec ${r.toolName}`);
    
    // Détecter les contradictions entre les sources
    const contradictions = this.detectContradictions(verificationResults);
    
    // Restaurer l'état précédent du toolIntegrator si nécessaire
    if (!previousToolIntegrator) {
      this.toolIntegrator = null;
    }
    
    return {
      status,
      confidence,
      sources,
      verificationSteps: steps,
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      notes: this.generateVerificationNotes(verificationResults),
      verifiedCalculations
    };
  }

  /**
   * Vérifie un calcul complexe à l'aide de Smart-E2B
   * 
   * @param fullExpression L'expression complète à vérifier
   * @param expressionStr La partie expression mathématique
   * @param resultStr Le résultat prétendu
   * @returns Une promesse résolvant vers un résultat de vérification
   */
  private async verifyComplexCalculation(
    fullExpression: string,
    expressionStr: string,
    resultStr: string
  ): Promise<CalculationVerificationResult> {
    try {
      // Construction du code Python pour l'évaluation
      const pyCode = `
        import math
        import numpy as np
        
        # Expression à évaluer
        expression = "${expressionStr.replace(/"/g, '\\"')}"
        claimed_result = ${resultStr}
        
        # Évaluer l'expression (avec précaution)
        try:
            # Remplacer certains mots par leurs fonctions correspondantes
            expr = expression.replace("racine carrée", "math.sqrt")
            expr = expr.replace("puissance", "**")
            expr = expr.replace("sin", "math.sin")
            expr = expr.replace("cos", "math.cos")
            
            # Évaluer
            actual_result = eval(expr)
            
            # Vérifier
            is_correct = abs(actual_result - claimed_result) < 0.0001
            
            print(f"Résultat: {actual_result}")
            print(f"Correct: {is_correct}")
            
            result = {
                "verified": f"{expr} = {actual_result}",
                "isCorrect": is_correct,
                "confidence": 0.95
            }
        except Exception as e:
            result = {
                "verified": f"Erreur: {str(e)}",
                "isCorrect": False,
                "confidence": 0.5
            }
            
        # Retourner le résultat au format JSON
        import json
        print(json.dumps(result))
      `;
      
      if (!this.toolIntegrator) {
        throw new Error("ToolIntegrator non disponible");
      }
      
      // Utiliser l'outil Python pour évaluer l'expression
      const pythonResult = await this.toolIntegrator.executeVerificationTool('executePython', pyCode);
      
      // Extraire et retourner le résultat
      return {
        original: fullExpression,
        verified: pythonResult.result.verified || "Erreur de vérification",
        isCorrect: pythonResult.result.isCorrect || false,
        confidence: pythonResult.result.confidence || 0.5
      };
    } catch (error) {
      console.error(`Erreur lors de la vérification du calcul complexe:`, error);
      return {
        original: fullExpression,
        verified: `Erreur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`,
        isCorrect: false,
        confidence: 0.3
      };
    }
  }

  /**
   * Détecte et vérifie les calculs dans un texte de manière asynchrone
   * 
   * @param content Le texte contenant potentiellement des calculs
   * @returns Une promesse résolvant vers un tableau de résultats de vérification de calculs
   */
  public async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    const results: CalculationVerificationResult[] = [];
    
    // Expressions régulières enrichies pour détecter plus de formats d'expressions mathématiques
    const calculationRegexes = [
      // Format standard: 5 + 3 = 8
      /(\\d+(?:\\.\\d+)?)\\s*([\\+\\-\\*\\/])\\s*(\\d+(?:\\.\\d+)?)\\s*=\\s*(\\d+(?:\\.\\d+)?)/g,
      
      // Format avec parenthèses: (5 + 3) = 8
      /\\((\\d+(?:\\.\\d+)?)\\s*([\\+\\-\\*\\/])\\s*(\\d+(?:\\.\\d+)?)\\)\\s*=\\s*(\\d+(?:\\.\\d+)?)/g,
      
      // Format avec mots: 5 plus 3 égale 8
      /(\\d+(?:\\.\\d+)?)\\s*(plus|moins|fois|divisé par)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:égale|égal|est égal à|vaut|font|donne)\\s*(\\d+(?:\\.\\d+)?)/gi,
      
      // Format puissance: 2^3 = 8
      /(\\d+(?:\\.\\d+)?)\\s*(?:\\^|\\*\\*)\\s*(\\d+(?:\\.\\d+)?)\\s*=\\s*(\\d+(?:\\.\\d+)?)/g,
      
      // Format racine carrée: racine carrée de 9 = 3
      /racine\\s+carrée\\s+(?:de)?\\s+(\\d+(?:\\.\\d+)?)\\s*=\\s*(\\d+(?:\\.\\d+)?)/gi
    ];
    
    // Traiter le format standard (opérations arithmétiques de base)
    let match;
    while ((match = calculationRegexes[0].exec(content)) !== null) {
      const [fullExpression, num1Str, operator, num2Str, resultStr] = match;
      
      try {
        // Convertir les opérandes en nombres
        const num1 = parseFloat(num1Str);
        const num2 = parseFloat(num2Str);
        const claimedResult = parseFloat(resultStr);
        
        // Calculer le résultat correct
        let correctResult: number;
        switch (operator) {
          case '+': correctResult = num1 + num2; break;
          case '-': correctResult = num1 - num2; break;
          case '*': correctResult = num1 * num2; break;
          case '/': correctResult = num1 / num2; break;
          default: correctResult = NaN;
        }
        
        // Vérifier si le résultat est correct (avec une petite marge d'erreur pour les nombres flottants)
        const isCorrect = Math.abs(correctResult - claimedResult) < 0.0001;
        
        // Ajouter le résultat de la vérification
        results.push({
          original: fullExpression,
          verified: `${num1} ${operator} ${num2} = ${correctResult}`,
          isCorrect,
          confidence: 0.99 // Confiance élevée pour les calculs simples
        });
      } catch (error) {
        // En cas d'erreur dans le calcul
        results.push({
          original: fullExpression,
          verified: "Erreur dans l'évaluation du calcul",
          isCorrect: false,
          confidence: 0.5
        });
      }
    }
    
    // Traiter le format avec parenthèses
    while ((match = calculationRegexes[1].exec(content)) !== null) {
      const [fullExpression, num1Str, operator, num2Str, resultStr] = match;
      
      try {
        // Même logique que pour le format standard
        const num1 = parseFloat(num1Str);
        const num2 = parseFloat(num2Str);
        const claimedResult = parseFloat(resultStr);
        
        let correctResult: number;
        switch (operator) {
          case '+': correctResult = num1 + num2; break;
          case '-': correctResult = num1 - num2; break;
          case '*': correctResult = num1 * num2; break;
          case '/': correctResult = num1 / num2; break;
          default: correctResult = NaN;
        }
        
        const isCorrect = Math.abs(correctResult - claimedResult) < 0.0001;
        
        results.push({
          original: fullExpression,
          verified: `(${num1} ${operator} ${num2}) = ${correctResult}`,
          isCorrect,
          confidence: 0.99
        });
      } catch (error) {
        results.push({
          original: fullExpression,
          verified: "Erreur dans l'évaluation du calcul avec parenthèses",
          isCorrect: false,
          confidence: 0.5
        });
      }
    }
    
    // Traiter le format avec mots
    while ((match = calculationRegexes[2].exec(content)) !== null) {
      const [fullExpression, num1Str, operatorWord, num2Str, resultStr] = match;
      
      try {
        const num1 = parseFloat(num1Str);
        const num2 = parseFloat(num2Str);
        const claimedResult = parseFloat(resultStr);
        
        // Convertir l'opérateur textuel en opérateur mathématique
        let operator: string;
        let correctResult: number;
        
        switch (operatorWord.toLowerCase()) {
          case 'plus': 
            operator = '+';
            correctResult = num1 + num2; 
            break;
          case 'moins': 
            operator = '-';
            correctResult = num1 - num2; 
            break;
          case 'fois': 
            operator = '*';
            correctResult = num1 * num2; 
            break;
          case 'divisé par': 
            operator = '/';
            correctResult = num1 / num2; 
            break;
          default: 
            operator = '?';
            correctResult = NaN;
        }
        
        const isCorrect = Math.abs(correctResult - claimedResult) < 0.0001;
        
        results.push({
          original: fullExpression,
          verified: `${num1} ${operator} ${num2} = ${correctResult}`,
          isCorrect,
          confidence: 0.98  // Légèrement moins de confiance due à l'ambigüïté possible du langage naturel
        });
      } catch (error) {
        results.push({
          original: fullExpression,
          verified: "Erreur dans l'évaluation du calcul en format texte",
          isCorrect: false,
          confidence: 0.5
        });
      }
    }
    
    // Traiter le format puissance
    while ((match = calculationRegexes[3].exec(content)) !== null) {
      const [fullExpression, baseStr, exponentStr, resultStr] = match;
      
      try {
        const base = parseFloat(baseStr);
        const exponent = parseFloat(exponentStr);
        const claimedResult = parseFloat(resultStr);
        
        // Calcul de puissance
        const correctResult = Math.pow(base, exponent);
        const isCorrect = Math.abs(correctResult - claimedResult) < 0.0001;
        
        results.push({
          original: fullExpression,
          verified: `${base}^${exponent} = ${correctResult}`,
          isCorrect,
          confidence: 0.99
        });
      } catch (error) {
        results.push({
          original: fullExpression,
          verified: "Erreur dans l'évaluation de la puissance",
          isCorrect: false,
          confidence: 0.5
        });
      }
    }
    
    // Traiter le format racine carrée
    while ((match = calculationRegexes[4].exec(content)) !== null) {
      const [fullExpression, numberStr, resultStr] = match;
      
      try {
        const number = parseFloat(numberStr);
        const claimedResult = parseFloat(resultStr);
        
        // Calcul de racine carrée
        const correctResult = Math.sqrt(number);
        const isCorrect = Math.abs(correctResult - claimedResult) < 0.0001;
        
        results.push({
          original: fullExpression,
          verified: `racine carrée de ${number} = ${correctResult}`,
          isCorrect,
          confidence: 0.99
        });
      } catch (error) {
        results.push({
          original: fullExpression,
          verified: "Erreur dans l'évaluation de la racine carrée",
          isCorrect: false,
          confidence: 0.5
        });
      }
    }
    
    // Pour les calculs plus complexes, vérifier immédiatement via Smart-E2B
    const complexCalculationRegex = /calcul\\s*(?:complexe|avancé)?\\s*:?\\s*([^=]+)=\\s*(\\d+(?:\\.\\d+)?)/gi;
    
    const complexCalculationPromises: Promise<CalculationVerificationResult>[] = [];
    let complexMatch;
    
    while ((complexMatch = complexCalculationRegex.exec(content)) !== null) {
      const [fullExpression, expressionStr, resultStr] = complexMatch;
      
      // Vérifier immédiatement avec le toolIntegrator si disponible
      if (this.toolIntegrator) {
        const verificationPromise = this.verifyComplexCalculation(fullExpression, expressionStr, resultStr);
        complexCalculationPromises.push(verificationPromise);
      } else {
        // Si pas de toolIntegrator, marquer comme à vérifier
        results.push({
          original: fullExpression,
          verified: "Impossible de vérifier sans ToolIntegrator",
          isCorrect: false,
          confidence: 0.3
        });
      }
    }
    
    // Attendre que toutes les vérifications complexes soient terminées
    if (complexCalculationPromises.length > 0) {
      const complexResults = await Promise.all(complexCalculationPromises);
      results.push(...complexResults);
    }
    
    return results;
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
      } else if (verification.verified === "\u00c0 vérifier via Smart-E2B") {
        annotatedThought = annotatedThought.replace(
          original, 
          `${original} [⏳ Vérification en cours...]`
        );
      } else {
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
    if (results.length === 0) {
      return 'unverified';
    }
    
    // Compter les différents statuts
    const statusCounts = {
      verified: 0,
      contradicted: 0,
      inconclusive: 0
    };
    
    for (const result of results) {
      if (result.result.isValid === true) {
        statusCounts.verified++;
      } else if (result.result.isValid === false) {
        statusCounts.contradicted++;
      } else {
        statusCounts.inconclusive++;
      }
    }
    
    // Logique de décision pour le statut global
    if (statusCounts.contradicted > 0) {
      return 'contradicted';
    } else if (statusCounts.verified > 0 && statusCounts.inconclusive === 0) {
      return 'verified';
    } else if (statusCounts.verified > 0) {
      return 'partially_verified';
    } else {
      return 'inconclusive';
    }
  }

  /**
   * Calcule la confiance globale dans la vérification
   * 
   * @param results Les résultats de vérification
   * @returns Le niveau de confiance global (0 à 1)
   */
  private calculateVerificationConfidence(results: any[]): number {
    if (results.length === 0) {
      return 0;
    }
    
    // Moyenne pondérée des confiances de chaque outil
    const totalWeight = results.reduce((sum, r) => sum + r.confidence, 0);
    const weightedConfidence = results.reduce((sum, r) => {
      const resultConfidence = r.result.confidence || 0.5;
      return sum + (resultConfidence * r.confidence);
    }, 0);
    
    return totalWeight > 0 ? weightedConfidence / totalWeight : 0.5;
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
        
        // Logique de détection des contradictions (\u00e0 personnaliser selon le format des résultats)
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