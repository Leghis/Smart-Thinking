/**
 * math-evaluator.ts
 * 
 * Module pour la détection et l'évaluation robuste d'expressions mathématiques dans un texte.
 * Utilise une approche modulaire avec des expressions régulières spécialisées et une évaluation sécurisée.
 */

import { CalculationVerificationResult } from '../types';

/**
 * Résultat détaillé de l'évaluation d'une expression mathématique
 */
export interface MathEvaluationResult {
  original: string;        // Expression originale complète trouvée dans le texte
  expressionText: string;  // Expression mathématique extraite
  result: number;          // Résultat calculé
  isCorrect: boolean;      // Si le résultat correspond à celui revendiqué
  claimedResult: number;   // Résultat revendiqué dans le texte
  confidence: number;      // Niveau de confiance dans l'évaluation (0-1)
}

/**
 * Classe utilitaire pour la détection et l'évaluation d'expressions mathématiques
 */
export class MathEvaluator {
  
  /**
   * Types d'expressions mathématiques supportées
   */
  private static readonly EXPRESSION_TYPES = {
    // Expressions arithmétiques standard (ex: 2 + 3 = 5)
    STANDARD: /(\d+(?:\.\d+)?)(?:\s*[\+\-\*\/\^]\s*\d+(?:\.\d+)?)+(?:\s*[\+\-\*\/\^]\s*\d+(?:\.\d+)?)*\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i,
    
    // Expressions avec parenthèses (ex: (2 + 3) * 4 = 20)
    PARENTHESES: /\([\d\s\+\-\*\/\^\.]+\)(?:\s*[\+\-\*\/\^]\s*(?:\d+(?:\.\d+)?|\([\d\s\+\-\*\/\^\.]+\)))*\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i,
    
    // Expressions textuelles (ex: 2 plus 3 égale 5)
    TEXTUAL: /(\d+(?:\.\d+)?)(?:\s*(?:plus|moins|fois|divisé par|multiplié par)\s*(?:\d+(?:\.\d+)?))(?:\s*(?:plus|moins|fois|divisé par|multiplié par)\s*(?:\d+(?:\.\d+)?))*\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i,
    
    // Fonctions mathématiques (ex: racine carrée de 9 = 3, ou 2 au carré = 4)
    FUNCTIONS: /(?:(?:racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?))|(?:(?:\d+(?:\.\d+)?)\s+au\s+(?:carré|cube)))\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i
  };

  /**
   * Expression régulière pour extraire les revendications de résultat
   */
  private static readonly CLAIMED_RESULT_REGEX = /(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i;

  /**
   * Seuil de tolérance relatif pour comparer les nombres (à ajuster selon la précision nécessaire)
   * Utile pour les calculs avec de grands nombres
   */
  private static readonly RELATIVE_EPSILON = 1e-10;
  
  /**
   * Seuil de tolérance absolu minimal pour les petits nombres
   */
  private static readonly ABSOLUTE_EPSILON = 1e-12;

  /**
   * Détecte et évalue toutes les expressions mathématiques dans un texte
   * 
   * @param text Texte à analyser
   * @returns Tableau des résultats d'évaluation pour chaque expression trouvée
   */
  public static detectAndEvaluate(text: string): MathEvaluationResult[] {
    const results: MathEvaluationResult[] = [];
    
    // Rechercher par type d'expression
    this.detectExpressionsOfType(text, 'STANDARD', results);
    this.detectExpressionsOfType(text, 'PARENTHESES', results);
    this.detectExpressionsOfType(text, 'TEXTUAL', results);
    this.detectExpressionsOfType(text, 'FUNCTIONS', results);
    
    return results;
  }
  
  /**
   * Détecte et évalue les expressions d'un type spécifique dans un texte
   * 
   * @param text Texte à analyser
   * @param type Type d'expression à rechercher
   * @param results Tableau des résultats à compléter
   */
  private static detectExpressionsOfType(text: string, type: keyof typeof MathEvaluator.EXPRESSION_TYPES, results: MathEvaluationResult[]): void {
    const regex = this.EXPRESSION_TYPES[type];
    let match;
    
    // Utiliser exec de manière répétée pour trouver toutes les occurrences
    const matches: RegExpExecArray[] = [];
    const textCopy = text.slice(); // Créer une copie du texte pour éviter les problèmes de regex global
    const regexWithGlobal = new RegExp(regex.source, regex.flags + (regex.flags.includes('g') ? '' : 'g'));

    while ((match = regexWithGlobal.exec(textCopy)) !== null) {
      matches.push(match);
      
      // Pour éviter les boucles infinies si lastIndex n'est pas incrémenté
      if (regexWithGlobal.lastIndex === match.index) {
        regexWithGlobal.lastIndex++;
      }
    }
    
    for (const match of matches) {
      try {
        const fullMatch = match[0];
        
        // Extraire le résultat revendiqué
        const claimedResultMatch = this.CLAIMED_RESULT_REGEX.exec(fullMatch);
        if (!claimedResultMatch) continue;
        
        const claimedResultStr = claimedResultMatch[1];
        const claimedResult = parseFloat(claimedResultStr);
        
        // Déterminer l'expression à évaluer selon le type
        let expressionToEvaluate = '';
        let confidence = 0.99; // Haute confiance par défaut
        
        switch (type) {
          case 'STANDARD':
            expressionToEvaluate = this.extractStandardExpression(fullMatch);
            break;
          case 'PARENTHESES':
            expressionToEvaluate = this.extractParenthesesExpression(fullMatch);
            break;
          case 'TEXTUAL':
            expressionToEvaluate = this.convertTextToMathExpression(fullMatch);
            confidence = 0.95; // Légèrement moins de confiance pour les expressions textuelles
            break;
          case 'FUNCTIONS':
            expressionToEvaluate = this.extractFunctionExpression(fullMatch);
            confidence = 0.97; // Confiance pour les fonctions mathématiques
            break;
        }
        
        // Si on n'a pas pu extraire l'expression, passer à la suivante
        if (!expressionToEvaluate) continue;
        
        // Évaluer l'expression de manière sécurisée
        const actualResult = this.safeEvaluate(expressionToEvaluate);
        
        // Vérifier si le résultat correspond à celui revendiqué
        const isCorrect = this.areNumbersEqual(actualResult, claimedResult);
        
        // Ajouter le résultat
        results.push({
          original: fullMatch,
          expressionText: expressionToEvaluate,
          result: actualResult,
          isCorrect,
          claimedResult,
          confidence: isCorrect ? confidence : (confidence * 0.8) // Légère pénalité si incorrect
        });
      } catch (error) {
        // En cas d'erreur, ajouter une entrée avec faible confiance
        console.error(`Erreur lors de l'évaluation mathématique: ${error}`);
        
        // Extraire le résultat revendiqué si possible
        const claimedResultMatch = this.CLAIMED_RESULT_REGEX.exec(match[0]);
        const claimedResult = claimedResultMatch ? parseFloat(claimedResultMatch[1]) : 0;
        
        results.push({
          original: match[0],
          expressionText: '',
          result: NaN,
          isCorrect: false,
          claimedResult,
          confidence: 0.3 // Faible confiance en cas d'erreur
        });
      }
    }
  }
  
  /**
   * Compare deux nombres en tenant compte des erreurs d'arrondi
   * Utilise une approche avec épsilon relatif pour de meilleurs résultats
   * 
   * @param a Premier nombre
   * @param b Deuxième nombre
   * @returns Vrai si les nombres sont considérés égaux
   */
  private static areNumbersEqual(a: number, b: number): boolean {
    // Utiliser une combinaison d'épsilon relatif et absolu pour une meilleure précision
    const diff = Math.abs(a - b);
    
    // Pour les petits nombres, utiliser ABSOLUTE_EPSILON
    if (Math.abs(a) < this.ABSOLUTE_EPSILON || Math.abs(b) < this.ABSOLUTE_EPSILON) {
      return diff < this.ABSOLUTE_EPSILON;
    }
    
    // Pour les grands nombres, utiliser un épsilon relatif
    const relativeEpsilon = this.RELATIVE_EPSILON * Math.max(Math.abs(a), Math.abs(b));
    return diff < Math.max(this.ABSOLUTE_EPSILON, relativeEpsilon);
  }
  
  /**
   * Convertit les résultats d'évaluation au format CalculationVerificationResult
   * utilisé par le système de vérification
   * 
   * @param evaluationResults Résultats d'évaluation à convertir
   * @returns Liste des résultats de vérification de calculs
   */
  public static convertToVerificationResults(
    evaluationResults: MathEvaluationResult[]
  ): CalculationVerificationResult[] {
    return evaluationResults.map(result => ({
      original: result.original,
      verified: result.isCorrect 
        ? `${result.expressionText} = ${result.result}` 
        : `Calcul incorrect. ${result.expressionText} = ${result.result}, pas ${result.claimedResult}`,
      isCorrect: result.isCorrect,
      confidence: result.confidence
    }));
  }
  
  /**
   * Extrait l'expression mathématique standard
   * 
   * @param expr Expression originale
   * @returns Expression nettoyée prête pour l'évaluation
   */
  private static extractStandardExpression(expr: string): string {
    // Extraire la partie gauche de l'équation
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    if (parts.length < 1) return '';
    
    return this.sanitizeExpression(parts[0]);
  }
  
  /**
   * Extrait l'expression mathématique avec parenthèses
   * 
   * @param expr Expression originale
   * @returns Expression nettoyée prête pour l'évaluation
   */
  private static extractParenthesesExpression(expr: string): string {
    // Extraire la partie gauche de l'équation
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    if (parts.length < 1) return '';
    
    return this.sanitizeExpression(parts[0]);
  }
  
  /**
   * Extrait une expression de fonction mathématique
   * 
   * @param expr Expression originale
   * @returns Expression nettoyée prête pour l'évaluation
   */
  private static extractFunctionExpression(expr: string): string {
    // Racine carrée
    const sqrtMatch = expr.match(/racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?)/i);
    if (sqrtMatch) {
      return `Math.sqrt(${sqrtMatch[1]})`;
    }
    
    // Puissances
    const squareMatch = expr.match(/(\d+(?:\.\d+)?)\s+au\s+carré/i);
    if (squareMatch) {
      return `Math.pow(${squareMatch[1]}, 2)`;
    }
    
    const cubeMatch = expr.match(/(\d+(?:\.\d+)?)\s+au\s+cube/i);
    if (cubeMatch) {
      return `Math.pow(${cubeMatch[1]}, 3)`;
    }
    
    return '';
  }
  
  /**
   * Nettoie et sécurise une expression mathématique standard
   * 
   * @param expr Expression à nettoyer
   * @returns Expression nettoyée
   */
  private static sanitizeExpression(expr: string): string {
    // Supprimer tout caractère qui n'est pas un chiffre, un opérateur ou une parenthèse
    return expr.replace(/[^\d\s().+\-*/^]/g, '')
              .trim()
              .replace(/\^/g, '**'); // Convertir ^ en ** pour l'exponentiation
  }
  
  /**
   * Convertit une expression textuelle en expression mathématique
   * 
   * @param textExpr Expression textuelle (ex: "2 plus 3")
   * @returns Expression mathématique (ex: "2 + 3")
   */
  private static convertTextToMathExpression(textExpr: string): string {
    // Extraire la partie gauche de l'équation
    const parts = textExpr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    if (parts.length < 1) return '';
    
    return parts[0]
      .replace(/\s+plus\s+/gi, ' + ')
      .replace(/\s+moins\s+/gi, ' - ')
      .replace(/\s+fois\s+/gi, ' * ')
      .replace(/\s+divisé\s+par\s+/gi, ' / ')
      .replace(/\s+multiplié\s+par\s+/gi, ' * ')
      .replace(/\s+au\s+carré/gi, ' ** 2 ')
      .replace(/\s+au\s+cube/gi, ' ** 3 ');
  }
  
  /**
   * Évalue une expression mathématique de manière sécurisée
   * en utilisant un parseur mathématique dédié plutôt que Function
   * 
   * @param expr Expression à évaluer
   * @returns Résultat de l'évaluation
   */
  private static safeEvaluate(expr: string): number {
    // Expressions avec Math.xxx, les gérer séparément
    if (expr.includes('Math.')) {
      return this.evaluateMathExpression(expr);
    }
    
    // Pour les expressions standard, utiliser le parseur dédié
    try {
      return this.parseMathExpression(expr);
    } catch (error) {
      throw new Error(`Impossible d'évaluer l'expression: ${expr}`);
    }
  }
  
  /**
   * Évalue une expression mathématique contenant des fonctions Math
   * 
   * @param expr Expression à évaluer (ex: Math.sqrt(9))
   * @returns Résultat de l'évaluation
   */
  private static evaluateMathExpression(expr: string): number {
    // Vérifier la sécurité de l'expression
    if (!/^Math\.(sqrt|pow|abs|round|floor|ceil|max|min|sin|cos|tan)\([\d\s,\.]+\)$/.test(expr)) {
      throw new Error("Expression Math non autorisée");
    }
    
    // Créer une fonction qui prend Math comme paramètre et renvoie le résultat
    // Utiliser Function ici est moins problématique car nous avons vérifié la forme de l'expression
    const evalFunc = new Function('Math', `return ${expr};`);
    const result = evalFunc(Math);
    
    // Vérifier que le résultat est un nombre valide
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      throw new Error("Résultat n'est pas un nombre valide");
    }
    
    return result;
  }
  
  /**
   * Analyse et évalue une expression mathématique standard de manière sécurisée
   * sans utiliser eval ou Function - implémentation d'un mini-parseur
   * 
   * @param expr Expression à évaluer
   * @returns Résultat de l'évaluation
   */
  private static parseMathExpression(expr: string): number {
    // Vérifier que l'expression contient uniquement des caractères autorisés
    if (!/^[\d\s().+\-*/^]+$/.test(expr)) {
      throw new Error("Expression contient des caractères non autorisés");
    }
    
    // Normaliser l'expression
    expr = expr.replace(/\s+/g, '').replace(/\*\*/g, '^');
    
    // Analyser l'expression et calculer le résultat
    return this.parseExpression(expr);
  }
  
  /**
   * Analyse récursive d'une expression mathématique
   * Implémente une version simplifiée de l'algorithme Shunting Yard
   * 
   * @param expr Expression à analyser
   * @returns Résultat de l'analyse
   */
  private static parseExpression(expr: string): number {
    // 1. Traiter les opérations d'addition et de soustraction (priorité basse)
    const addSubTerms = expr.split(/(?<!\d[eE])([+\-])/).filter(term => term.trim() !== '');
    
    if (addSubTerms.length > 1) {
      let result = this.parseTerm(addSubTerms[0]);
      
      for (let i = 1; i < addSubTerms.length; i += 2) {
        const operator = addSubTerms[i];
        const term = addSubTerms[i + 1];
        
        if (operator === '+') {
          result += this.parseTerm(term);
        } else if (operator === '-') {
          result -= this.parseTerm(term);
        }
      }
      
      return result;
    }
    
    // 2. Si pas d'addition/soustraction, traiter les termes
    return this.parseTerm(expr);
  }
  
  /**
   * Analyse un terme (multiplication et division)
   * 
   * @param term Terme à analyser
   * @returns Résultat de l'analyse
   */
  private static parseTerm(term: string): number {
    // 1. Traiter les opérations de multiplication et division (priorité moyenne)
    const mulDivFactors = term.split(/([*/])/).filter(factor => factor.trim() !== '');
    
    if (mulDivFactors.length > 1) {
      let result = this.parseFactor(mulDivFactors[0]);
      
      for (let i = 1; i < mulDivFactors.length; i += 2) {
        const operator = mulDivFactors[i];
        const factor = mulDivFactors[i + 1];
        
        if (operator === '*') {
          result *= this.parseFactor(factor);
        } else if (operator === '/') {
          const divisor = this.parseFactor(factor);
          if (Math.abs(divisor) < this.ABSOLUTE_EPSILON) {
            throw new Error("Division par zéro");
          }
          result /= divisor;
        }
      }
      
      return result;
    }
    
    // 2. Si pas de multiplication/division, traiter les facteurs
    return this.parseFactor(term);
  }
  
  /**
   * Analyse un facteur (puissance et expressions parenthésées)
   * 
   * @param factor Facteur à analyser
   * @returns Résultat de l'analyse
   */
  private static parseFactor(factor: string): number {
    // 1. Traiter les expressions entre parenthèses
    if (factor.startsWith('(') && factor.endsWith(')')) {
      return this.parseExpression(factor.substring(1, factor.length - 1));
    }
    
    // 2. Traiter les opérations d'exponentiation (priorité haute)
    const powerParts = factor.split('^');
    
    if (powerParts.length > 1) {
      let result = this.parseNumber(powerParts[0]);
      
      for (let i = 1; i < powerParts.length; i++) {
        result = Math.pow(result, this.parseNumber(powerParts[i]));
      }
      
      return result;
    }
    
    // 3. Si pas d'exponentiation, traiter les nombres
    return this.parseNumber(factor);
  }
  
  /**
   * Convertit une chaîne en nombre
   * 
   * @param num Chaîne à convertir
   * @returns Nombre
   */
  private static parseNumber(num: string): number {
    // Gestion du nombre négatif si le signe moins est collé au nombre
    if (num.startsWith('-')) {
      return -this.parseNumber(num.substring(1));
    }
    
    // Conversion en nombre
    const parsed = parseFloat(num);
    
    if (isNaN(parsed)) {
      throw new Error(`Format de nombre invalide: ${num}`);
    }
    
    return parsed;
  }
}