/**
 * math-evaluator.ts
 * 
 * Module pour la détection et l'évaluation robuste d'expressions mathématiques dans un texte.
 * Utilise une approche unifiée avec une expression régulière optimisée et une évaluation sécurisée.
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
   * Expression régulière unifiée pour détecter différents formats d'expressions mathématiques:
   * 1. Expressions arithmétiques standard (ex: 2 + 3 = 5)
   * 2. Expressions avec parenthèses (ex: (2 + 3) * 4 = 20)
   * 3. Expressions textuelles (ex: 2 plus 3 égale 5)
   * 4. Fonctions mathématiques (ex: racine carrée de 9 = 3)
   */
  private static readonly EXPRESSION_REGEX = 
    /(?:([\d\s().+\-*/^]+)|(?:(\d+(?:\.\d+)?)(?:\s*(?:plus|moins|fois|divisé par)\s*(?:\d+(?:\.\d+)?)))|(?:racine\s+carrée\s+(?:de)?\s*(?:\d+(?:\.\d+)?)))(?:\s*(?:=|égale?|est égal à|vaut|font|donne)\s*)(\d+(?:\.\d+)?)/gi;
  
  /**
   * Seuil de tolérance pour considérer deux nombres comme égaux (gestion des erreurs d'arrondi)
   */
  private static readonly EPSILON = 0.0001;

  /**
   * Détecte et évalue toutes les expressions mathématiques dans un texte
   * 
   * @param text Texte à analyser
   * @returns Tableau des résultats d'évaluation pour chaque expression trouvée
   */
  public static detectAndEvaluate(text: string): MathEvaluationResult[] {
    const results: MathEvaluationResult[] = [];
    let match;
    
    while ((match = this.EXPRESSION_REGEX.exec(text)) !== null) {
      try {
        const [fullMatch, standardExpr, textExpr, claimedResultStr] = match;
        const claimedResult = parseFloat(claimedResultStr);
        
        // Déterminer le type d'expression et la préparer pour l'évaluation
        let expressionToEvaluate = '';
        let confidence = 0.99; // Haute confiance par défaut
        
        if (standardExpr) {
          // Expression standard avec opérateurs mathématiques
          expressionToEvaluate = this.sanitizeExpression(standardExpr);
        } else if (textExpr) {
          // Expression textuelle - convertir en notation mathématique
          expressionToEvaluate = this.convertTextToMathExpression(textExpr);
          confidence = 0.95; // Légèrement moins de confiance pour les expressions textuelles
        } else {
          // Cas spécial pour racine carrée
          const sqrtMatch = fullMatch.match(/racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?)/i);
          if (sqrtMatch) {
            expressionToEvaluate = `Math.sqrt(${sqrtMatch[1]})`;
          } else {
            // Si on ne peut pas analyser correctement, faible confiance
            expressionToEvaluate = fullMatch;
            confidence = 0.6;
          }
        }
        
        // Évaluer l'expression de manière sécurisée
        const actualResult = this.safeEvaluate(expressionToEvaluate);
        
        // Vérifier si le résultat correspond à celui revendiqué
        const isCorrect = Math.abs(actualResult - claimedResult) < this.EPSILON;
        
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
        results.push({
          original: match[0],
          expressionText: match[1] || match[2] || '',
          result: NaN,
          isCorrect: false,
          claimedResult: parseFloat(match[3] || '0'),
          confidence: 0.3 // Faible confiance en cas d'erreur
        });
      }
    }
    
    return results;
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
    return textExpr
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
   * en utilisant Function plutôt que eval
   * 
   * @param expr Expression à évaluer
   * @returns Résultat de l'évaluation
   */
  private static safeEvaluate(expr: string): number {
    // Vérifier si l'expression contient uniquement des caractères autorisés
    if (!/^[\d\s().+\-*/^,\s\w]+$/.test(expr)) {
      throw new Error("Expression contient des caractères non autorisés");
    }
    
    // Pour les expressions avec Math.xxx, les évaluer directement
    if (expr.includes('Math.')) {
      // Créer une fonction qui prend Math comme paramètre et renvoie le résultat
      const evalFunc = new Function('Math', `return ${expr};`);
      return evalFunc(Math);
    }
    
    // Pour les expressions standard
    try {
      // Créer une fonction qui n'a pas d'accès au contexte global et renvoie le résultat
      const evalFunc = new Function(`return ${expr};`);
      const result = evalFunc();
      
      // Vérifier que le résultat est un nombre valide
      if (typeof result !== 'number' || isNaN(result) || !isFinite(result)) {
        throw new Error("Résultat n'est pas un nombre valide");
      }
      
      return result;
    } catch (error) {
      throw new Error(`Impossible d'évaluer l'expression: ${expr}`);
    }
  }
}