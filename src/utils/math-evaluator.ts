/**
 * math-evaluator.ts
 * 
 * Module amélioré pour la détection et l'évaluation robuste d'expressions mathématiques dans un texte.
 * Ajout du support pour les notations de fonctions mathématiques et les expressions d'équations séquentielles.
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
  context?: string;        // Contexte de l'expression (par exemple, "notation de fonction")
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
    FUNCTIONS: /(?:(?:racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?))|(?:(?:\d+(?:\.\d+)?)\s+au\s+(?:carré|cube)))\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(\d+(?:\.\d+)?)/i,
    
    // NOUVEAU: Expressions séquentielles avec plusieurs étapes (ex: 2³ - 2×2 - 5 = 8 - 4 - 5 = -1)
    SEQUENTIAL: /(?:\d+(?:\.\d+)?(?:[\³\²\¹])?(?:\s*[\+\-\*×\/\^]\s*\d+(?:\.\d+)?(?:[\³\²\¹])?)+)\s*=\s*(?:\d+(?:\.\d+)?(?:\s*[\+\-\*×\/\^]\s*\d+(?:\.\d+)?)*)\s*(?:=\s*(?:\d+(?:\.\d+)?))+/i
  };

  /**
   * Expression régulière pour détecter les notations de fonctions
   * NOUVEAU: Détecte les patterns comme f(x₀) = f(2) = ...
   */
  private static readonly FUNCTION_NOTATION_REGEX = /[a-zA-Z]['\(\)\d₀₁₂₃₄₅₆₇₈₉]*\s*=\s*[a-zA-Z]['\(\)\d\.]+\s*=\s*[^=]+\s*=\s*[\d\.\-+]+/i;

  /**
   * Expression régulière pour extraire les revendications de résultat
   */
  private static readonly CLAIMED_RESULT_REGEX = /(?:=|égale?|est égal à|vaut|font|donne)\s*([\-\+]?\d+(?:\.\d+)?)/i;

  /**
   * Seuil de tolérance relatif pour comparer les nombres
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
    
    // NOUVEAU: Filtrer les notations de fonctions mathématiques
    // pour éviter les faux positifs dans l'évaluation
    const functionNotations = this.detectFunctionNotations(text);
    for (const notation of functionNotations) {
      // Ces notations ne sont pas des calculs à vérifier, les ignorer
      // mais les ajouter au résultat pour la documentation
      results.push({
        original: notation,
        expressionText: "Notation de fonction",
        result: NaN,
        isCorrect: true, // On considère que c'est correct car ce n'est pas un calcul à vérifier
        claimedResult: NaN,
        confidence: 0.95,
        context: "notation_fonction"
      });
    }
    
    // Exclure les parties détectées comme notations de fonctions
    let analysisText = text;
    for (const notation of functionNotations) {
      // Remplacer la notation par des espaces pour préserver la structure du texte
      analysisText = analysisText.replace(notation, ' '.repeat(notation.length));
    }
    
    // Rechercher par type d'expression dans le texte filtré
    this.detectExpressionsOfType(analysisText, 'STANDARD', results);
    this.detectExpressionsOfType(analysisText, 'PARENTHESES', results);
    this.detectExpressionsOfType(analysisText, 'TEXTUAL', results);
    this.detectExpressionsOfType(analysisText, 'FUNCTIONS', results);
    
    // NOUVEAU: Détecter et évaluer les expressions séquentielles
    this.detectSequentialExpressions(analysisText, results);
    
    return results;
  }
  
  /**
   * NOUVEAU: Détecte les notations de fonctions mathématiques
   * qui ne doivent pas être évaluées comme des calculs
   * 
   * @param text Texte à analyser
   * @returns Tableau des notations de fonctions trouvées
   */
  private static detectFunctionNotations(text: string): string[] {
    const notations: string[] = [];
    
    // Rechercher les motifs comme "f(x₀) = f(2) = ..."
    const functionPattern = /(?:[a-zA-Z]['\(\)\d₀₁₂₃₄₅₆₇₈₉]*\s*=\s*[a-zA-Z][\'\(\)\d\.]+)|(?:[a-zA-Z]\'?\([\w₀₁₂₃₄₅₆₇₈₉\.]+\)\s*=\s*[a-zA-Z]\'?\([^)]+\))/g;
    
    let match;
    while ((match = functionPattern.exec(text)) !== null) {
      notations.push(match[0]);
    }
    
    return notations;
  }
  
  /**
   * NOUVEAU: Détecte et évalue les expressions séquentielles
   * (expressions avec plusieurs égalités en chaîne)
   * 
   * @param text Texte à analyser
   * @param results Tableau des résultats à compléter
   */
  private static detectSequentialExpressions(text: string, results: MathEvaluationResult[]): void {
    // Regex pour trouver des expressions comme "2³ - 2×2 - 5 = 8 - 4 - 5 = -1"
    const sequentialPattern = /(\d+(?:[\³\²\¹])?\s*(?:[\+\-\*×\/]\s*\d+(?:[\³\²\¹])?)+)\s*=\s*([^=]+)\s*=\s*([^=]+)(?:\s*=\s*([^=]+))?/g;
    
    let match;
    while ((match = sequentialPattern.exec(text)) !== null) {
      try {
        const fullMatch = match[0];
        const parts = fullMatch.split('=').map(part => part.trim());
        
        // Vérifier que nous avons au moins 2 parties
        if (parts.length < 2) continue;
        
        // Le résultat final est la dernière partie
        const finalResult = parseFloat(parts[parts.length - 1]);
        
        // Si le résultat final n'est pas un nombre, ignorer
        if (isNaN(finalResult)) continue;
        
        // Évaluer la première expression pour vérifier la chaîne
        const firstExpression = this.convertSequentialExpression(parts[0]);
        const firstResult = this.safeEvaluate(firstExpression);
        
        // Transformer les expressions cubiques et carrées
        let isCorrect = true;
        let failedStep = "";
        
        // Vérifier chaque étape intermédiaire
        for (let i = 1; i < parts.length - 1; i++) {
          const intermediateResult = parseFloat(parts[i]);
          
          // Si l'étape intermédiaire n'est pas un nombre, ignorer
          if (isNaN(intermediateResult)) {
            // Essayer d'évaluer l'expression si ce n'est pas un simple nombre
            const intermediateExpr = this.convertSequentialExpression(parts[i]);
            const evalResult = this.safeEvaluate(intermediateExpr);
            
            // Vérifier avec la partie précédente
            if (i === 1 && !this.areNumbersEqual(firstResult, evalResult)) {
              isCorrect = false;
              failedStep = `Étape ${i}: ${firstResult} ≠ ${evalResult}`;
              break;
            }
          } else if (i === 1 && !this.areNumbersEqual(firstResult, intermediateResult)) {
            isCorrect = false;
            failedStep = `Étape ${i}: ${firstResult} ≠ ${intermediateResult}`;
            break;
          }
        }
        
        results.push({
          original: fullMatch,
          expressionText: firstExpression,
          result: firstResult,
          isCorrect: isCorrect && this.areNumbersEqual(firstResult, finalResult),
          claimedResult: finalResult,
          confidence: 0.9,
          context: isCorrect ? undefined : failedStep
        });
      } catch (error) {
        console.error(`Erreur lors de l'évaluation d'une expression séquentielle: ${error}`);
      }
    }
  }
  
  /**
   * NOUVEAU: Convertit une expression séquentielle en expression évaluable
   * 
   * @param expr Expression à convertir
   * @returns Expression prête pour l'évaluation
   */
  private static convertSequentialExpression(expr: string): string {
    // Remplacer les puissances Unicode
    let result = expr
      .replace(/(\d+)[\³]/g, '$1**3')
      .replace(/(\d+)[\²]/g, '$1**2')
      .replace(/(\d+)[\¹]/g, '$1**1')
      .replace(/[×]/g, '*');
    
    return this.sanitizeExpression(result);
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
    const textCopy = text.slice();
    const regexWithGlobal = new RegExp(regex.source, regex.flags + (regex.flags.includes('g') ? '' : 'g'));

    while ((match = regexWithGlobal.exec(textCopy)) !== null) {
      matches.push(match);
      
      if (regexWithGlobal.lastIndex === match.index) {
        regexWithGlobal.lastIndex++;
      }
    }
    
    for (const match of matches) {
      try {
        const fullMatch = match[0];
        
        // NOUVEAU: Vérifier si cette expression est une notation de fonction
        if (this.isFunctionNotation(fullMatch)) {
          continue; // Ignorer les notations de fonctions
        }
        
        // Extraire le résultat revendiqué
        const claimedResultMatch = this.CLAIMED_RESULT_REGEX.exec(fullMatch);
        if (!claimedResultMatch) continue;
        
        const claimedResultStr = claimedResultMatch[1];
        const claimedResult = parseFloat(claimedResultStr);
        
        // Déterminer l'expression à évaluer selon le type
        let expressionToEvaluate = '';
        let confidence = 0.99;
        
        switch (type) {
          case 'STANDARD':
            expressionToEvaluate = this.extractStandardExpression(fullMatch);
            break;
          case 'PARENTHESES':
            expressionToEvaluate = this.extractParenthesesExpression(fullMatch);
            break;
          case 'TEXTUAL':
            expressionToEvaluate = this.convertTextToMathExpression(fullMatch);
            confidence = 0.95;
            break;
          case 'FUNCTIONS':
            expressionToEvaluate = this.extractFunctionExpression(fullMatch);
            confidence = 0.97;
            break;
        }
        
        if (!expressionToEvaluate) continue;
        
        // Évaluer l'expression de manière sécurisée
        const actualResult = this.safeEvaluate(expressionToEvaluate);
        
        // Vérifier si le résultat correspond à celui revendiqué
        const isCorrect = this.areNumbersEqual(actualResult, claimedResult);
        
        results.push({
          original: fullMatch,
          expressionText: expressionToEvaluate,
          result: actualResult,
          isCorrect,
          claimedResult,
          confidence: isCorrect ? confidence : (confidence * 0.8)
        });
      } catch (error) {
        console.error(`Erreur lors de l'évaluation mathématique: ${error}`);
        
        const claimedResultMatch = this.CLAIMED_RESULT_REGEX.exec(match[0]);
        const claimedResult = claimedResultMatch ? parseFloat(claimedResultMatch[1]) : 0;
        
        results.push({
          original: match[0],
          expressionText: '',
          result: NaN,
          isCorrect: false,
          claimedResult,
          confidence: 0.3,
          context: "erreur_evaluation"
        });
      }
    }
  }
  
  /**
   * NOUVEAU: Vérifie si une expression est une notation de fonction mathématique
   * 
   * @param expr Expression à vérifier
   * @returns Vrai si c'est une notation de fonction
   */
  private static isFunctionNotation(expr: string): boolean {
    // Vérifier les motifs comme "f(x)" ou "f'(x)"
    return /^[a-zA-Z]'?\([^)]+\)\s*=/.test(expr) || 
           /\s[a-zA-Z]'?\([^)]+\)\s*=/.test(expr);
  }
  
  /**
   * Compare deux nombres en tenant compte des erreurs d'arrondi
   * 
   * @param a Premier nombre
   * @param b Deuxième nombre
   * @returns Vrai si les nombres sont considérés égaux
   */
  private static areNumbersEqual(a: number, b: number): boolean {
    const diff = Math.abs(a - b);
    
    if (Math.abs(a) < this.ABSOLUTE_EPSILON || Math.abs(b) < this.ABSOLUTE_EPSILON) {
      return diff < this.ABSOLUTE_EPSILON;
    }
    
    const relativeEpsilon = this.RELATIVE_EPSILON * Math.max(Math.abs(a), Math.abs(b));
    return diff < Math.max(this.ABSOLUTE_EPSILON, relativeEpsilon);
  }
  
  /**
   * Convertit les résultats d'évaluation au format CalculationVerificationResult
   * utilisé par le système de vérification, avec amélioration des messages
   * 
   * @param evaluationResults Résultats d'évaluation à convertir
   * @returns Liste des résultats de vérification de calculs
   */
  public static convertToVerificationResults(
    evaluationResults: MathEvaluationResult[]
  ): CalculationVerificationResult[] {
    return evaluationResults.map(result => {
      // NOUVEAU: Traitement spécial pour les notations de fonctions
      if (result.context === "notation_fonction") {
        return {
          original: result.original,
          verified: "Notation de fonction mathématique (non évaluée)",
          isCorrect: true, // On ne vérifie pas les notations
          confidence: 0.95
        };
      }
      
      // NOUVEAU: Message amélioré pour les erreurs d'étapes dans les expressions séquentielles
      if (result.context && result.context.startsWith("Étape")) {
        return {
          original: result.original,
          verified: `Calcul incorrect. Erreur à ${result.context}`,
          isCorrect: false,
          confidence: 0.85
        };
      }
      
      return {
        original: result.original,
        verified: result.isCorrect 
          ? `${result.expressionText} = ${result.result}` 
          : `Calcul incorrect. ${result.expressionText} = ${result.result}, pas ${result.claimedResult}`,
        isCorrect: result.isCorrect,
        confidence: result.confidence
      };
    });
  }
  
  // Les méthodes suivantes restent globalement inchangées
  
  private static extractStandardExpression(expr: string): string {
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    if (parts.length < 1) return '';
    
    return this.sanitizeExpression(parts[0]);
  }
  
  private static extractParenthesesExpression(expr: string): string {
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    if (parts.length < 1) return '';
    
    return this.sanitizeExpression(parts[0]);
  }
  
  private static extractFunctionExpression(expr: string): string {
    const sqrtMatch = expr.match(/racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?)/i);
    if (sqrtMatch) {
      return `Math.sqrt(${sqrtMatch[1]})`;
    }
    
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
  
  private static sanitizeExpression(expr: string): string {
    return expr.replace(/[^\d\s().+\-*/^]/g, '')
              .trim()
              .replace(/\^/g, '**');
  }
  
  private static convertTextToMathExpression(textExpr: string): string {
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
  
  private static safeEvaluate(expr: string): number {
    if (expr.includes('Math.')) {
      return this.evaluateMathExpression(expr);
    }
    
    try {
      return this.parseMathExpression(expr);
    } catch (error) {
      throw new Error(`Impossible d'évaluer l'expression: ${expr}`);
    }
  }
  
  private static evaluateMathExpression(expr: string): number {
    if (!/^Math\.(sqrt|pow|abs|round|floor|ceil|max|min|sin|cos|tan)\([\d\s,\.]+\)$/.test(expr)) {
      throw new Error("Expression Math non autorisée");
    }
    
    const evalFunc = new Function('Math', `return ${expr};`);
    const result = evalFunc(Math);
    
    if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
      throw new Error("Résultat n'est pas un nombre valide");
    }
    
    return result;
  }
  
  private static parseMathExpression(expr: string): number {
    if (!/^[\d\s().+\-*/^]+$/.test(expr)) {
      throw new Error("Expression contient des caractères non autorisés");
    }
    
    expr = expr.replace(/\s+/g, '').replace(/\*\*/g, '^');
    
    return this.parseExpression(expr);
  }
  
  private static parseExpression(expr: string): number {
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
    
    return this.parseTerm(expr);
  }
  
  private static parseTerm(term: string): number {
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
    
    return this.parseFactor(term);
  }
  
  private static parseFactor(factor: string): number {
    if (factor.startsWith('(') && factor.endsWith(')')) {
      return this.parseExpression(factor.substring(1, factor.length - 1));
    }
    
    const powerParts = factor.split('^');
    
    if (powerParts.length > 1) {
      let result = this.parseNumber(powerParts[0]);
      
      for (let i = 1; i < powerParts.length; i++) {
        result = Math.pow(result, this.parseNumber(powerParts[i]));
      }
      
      return result;
    }
    
    return this.parseNumber(factor);
  }
  
  private static parseNumber(num: string): number {
    if (num.startsWith('-')) {
      return -this.parseNumber(num.substring(1));
    }
    
    const parsed = parseFloat(num);
    
    if (isNaN(parsed)) {
      throw new Error(`Format de nombre invalide: ${num}`);
    }
    
    return parsed;
  }
}