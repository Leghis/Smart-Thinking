/**
 * math-evaluator.ts
 *
 * Safe detection and evaluation of mathematical expressions in text.
 * All evaluation goes through a Shunting-Yard parser plus a fixed function
 * dispatch table — no eval, Function constructor or dynamic code generation.
 */

import { CalculationVerificationResult } from '../types';

export interface MathEvaluationResult {
  original: string;
  expressionText: string;
  result: number;
  isCorrect: boolean;
  claimedResult: number;
  confidence: number;
  context?: string;
}

interface FunctionSpec {
  minArgs: number;
  maxArgs: number;
  fn: (args: number[]) => number;
}

export class MathEvaluator {
  private static readonly MAX_CACHE_ENTRIES = 500;
  private static readonly expressionCache = new Map<string, number>();

  private static readonly EXPRESSION_TYPES = {
    STANDARD:
      /((?:\d+(?:\.\d+)?|\([\d\s+\-*/^.,]+\))(?:\s*[+\-*/^]\s*(?:\d+(?:\.\d+)?|\([\d\s+\-*/^.,]+\)))+)\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(-?\d+(?:\.\d+)?)/gi,
    PARENTHESES:
      /\([\d\s+\-*/^.,]+\)(?:\s*[+\-*/^]\s*(?:\d+(?:\.\d+)?|\([\d\s+\-*/^.,]+\)))*\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(-?\d+(?:\.\d+)?)/gi,
    TEXTUAL:
      /(\d+(?:\.\d+)?)(?:\s*(?:plus|moins|fois|divisé par|multiplié par)\s*(?:\d+(?:\.\d+)?))(?:\s*(?:plus|moins|fois|divisé par|multiplié par)\s*(?:\d+(?:\.\d+)?))*\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(-?\d+(?:\.\d+)?)/gi,
    FUNCTIONS:
      /(?:(?:racine\s+carrée\s+(?:de)?\s*(\d+(?:\.\d+)?))|(?:(?:\d+(?:\.\d+)?)\s+au\s+(?:carré|cube)))\s*(?:=|égale?|est égal à|vaut|font|donne)\s*(-?\d+(?:\.\d+)?)/gi,
  };

  private static readonly SEQUENTIAL_PATTERN =
    /(\d+(?:[\³\²\¹])?(?:\s*[\+\-\*×\/]\s*\d+(?:[\³\²\¹])?)+)\s*=\s*([^=]+)\s*=\s*([^=]+)(?:\s*=\s*([^=]+))?/g;

  private static readonly FUNCTION_NOTATION_PATTERN =
    /(?:[a-zA-Z]['\(\)\d₀₁₂₃₄₅₆₇₈₉]*\s*=\s*[a-zA-Z][\'\(\)\d\.]+)|(?:[a-zA-Z]\'?\([\w₀₁₂₃₄₅₆₇₈₉\.]+\)\s*=\s*[a-zA-Z]\'?\([^)]+\))/g;

  private static readonly FUNCTION_NOTATION_START = /^[a-zA-Z]'?\([^)]+\)\s*=/;

  private static readonly FUNCTION_NOTATION_INLINE = /\s[a-zA-Z]'?\([^)]+\)\s*=/;

  private static readonly CLAIMED_RESULT_REGEX = /(?:=|égale?|est égal à|vaut|font|donne)\s*([\-\+]?\d+(?:\.\d+)?)/i;

  private static readonly FUNCTION_CALL_REGEX =
    /^Math\.(sqrt|pow|abs|round|floor|ceil|max|min|sin|cos|tan)\s*\((.+)\)$/i;

  private static readonly RELATIVE_EPSILON = 1e-10;
  private static readonly ABSOLUTE_EPSILON = 1e-12;

  private static readonly OPERATOR_PRECEDENCE: Record<string, number> = {
    '+': 1,
    '-': 1,
    '*': 2,
    '/': 2,
    '^': 3,
  };

  private static readonly OPERATOR_ASSOCIATIVITY: Record<string, string> = {
    '+': 'left',
    '-': 'left',
    '*': 'left',
    '/': 'left',
    '^': 'right',
  };

  private static readonly OPERATOR_FUNCTIONS: Record<string, (a: number, b: number) => number> = {
    '+': (a, b) => a + b,
    '-': (a, b) => a - b,
    '*': (a, b) => a * b,
    '/': (a, b) => {
      if (Math.abs(b) < MathEvaluator.ABSOLUTE_EPSILON) {
        throw new Error('Division par zéro');
      }
      return a / b;
    },
    '^': (a, b) => Math.pow(a, b),
  };

  private static readonly FUNCTION_DISPATCH: Record<string, FunctionSpec> = {
    sqrt: { minArgs: 1, maxArgs: 1, fn: args => Math.sqrt(args[0]) },
    pow: { minArgs: 2, maxArgs: 2, fn: args => Math.pow(args[0], args[1]) },
    abs: { minArgs: 1, maxArgs: 1, fn: args => Math.abs(args[0]) },
    round: { minArgs: 1, maxArgs: 1, fn: args => Math.round(args[0]) },
    floor: { minArgs: 1, maxArgs: 1, fn: args => Math.floor(args[0]) },
    ceil: { minArgs: 1, maxArgs: 1, fn: args => Math.ceil(args[0]) },
    max: { minArgs: 2, maxArgs: Number.POSITIVE_INFINITY, fn: args => Math.max(...args) },
    min: { minArgs: 2, maxArgs: Number.POSITIVE_INFINITY, fn: args => Math.min(...args) },
    sin: { minArgs: 1, maxArgs: 1, fn: args => Math.sin(args[0]) },
    cos: { minArgs: 1, maxArgs: 1, fn: args => Math.cos(args[0]) },
    tan: { minArgs: 1, maxArgs: 1, fn: args => Math.tan(args[0]) },
  };

  public static detectAndEvaluate(text: string): MathEvaluationResult[] {
    const results: MathEvaluationResult[] = [];

    const functionNotations = this.detectFunctionNotations(text);
    for (const notation of functionNotations) {
      results.push({
        original: notation,
        expressionText: 'Notation de fonction',
        result: NaN,
        isCorrect: true,
        claimedResult: NaN,
        confidence: 0.95,
        context: 'notation_fonction',
      });
    }

    let analysisText = text;
    for (const notation of functionNotations) {
      analysisText = analysisText.replace(notation, ' '.repeat(notation.length));
    }
    analysisText = this.normalizeForDetection(analysisText);

    this.detectExpressionsOfType(analysisText, 'STANDARD', results);
    this.detectExpressionsOfType(analysisText, 'PARENTHESES', results);
    this.detectExpressionsOfType(analysisText, 'TEXTUAL', results);
    this.detectExpressionsOfType(analysisText, 'FUNCTIONS', results);
    this.detectSequentialExpressions(analysisText, results);

    return this.dedupeResults(results);
  }

  /** Normalizes unicode operators and French decimal commas before matching. */
  private static normalizeForDetection(text: string): string {
    return text
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/[−–—]/g, '-')
      .replace(/(\d),(\d)/g, '$1.$2');
  }

  /** Keeps the longest non-overlapping expression and drops duplicate matches. */
  private static dedupeResults(results: MathEvaluationResult[]): MathEvaluationResult[] {
    const seen = new Set<string>();
    const unique = results.filter(result => {
      const key =
        result.context === 'notation_fonction' ? `notation:${result.original}` : result.original;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });

    return unique.filter((candidate, index) =>
      !unique.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.original.length > candidate.original.length &&
          other.original.includes(candidate.original),
      ),
    );
  }

  private static detectFunctionNotations(text: string): string[] {
    return Array.from(text.matchAll(this.FUNCTION_NOTATION_PATTERN), match => match[0]);
  }

  private static detectSequentialExpressions(
    text: string,
    results: MathEvaluationResult[]
  ): void {
    for (const match of text.matchAll(this.SEQUENTIAL_PATTERN)) {
      try {
        const fullMatch = match[0];
        const parts = fullMatch.split('=').map(part => part.trim());
        if (parts.length < 2) {
          continue;
        }

        const values: number[] = [];
        let valid = true;
        for (const part of parts) {
          if (/^[+-]?\d+(?:\.\d+)?$/.test(part)) {
            values.push(parseFloat(part));
            continue;
          }
          const expression = this.convertSequentialExpression(part);
          if (!expression) {
            valid = false;
            break;
          }
          try {
            values.push(this.safeEvaluate(expression));
          } catch {
            valid = false;
            break;
          }
        }

        if (!valid || values.length !== parts.length) {
          continue;
        }

        const firstResult = values[0];
        let isCorrect = true;
        let failedStep = '';
        for (let i = 1; i < values.length; i++) {
          if (!this.areNumbersEqual(values[i - 1], values[i])) {
            isCorrect = false;
            failedStep = `Étape ${i}: ${values[i - 1]} ≠ ${values[i]}`;
            break;
          }
        }

        results.push({
          original: fullMatch,
          expressionText: this.convertSequentialExpression(parts[0]),
          result: firstResult,
          isCorrect,
          claimedResult: values[values.length - 1],
          confidence: isCorrect ? 0.9 : 0.75,
          context: isCorrect ? undefined : failedStep,
        });
      } catch (error) {
        console.error(`Erreur lors de l'évaluation d'une expression séquentielle: ${error}`);
      }
    }
  }

  private static convertSequentialExpression(expr: string): string {
    const converted = expr
      .replace(/(\d+)[\³]/g, '$1**3')
      .replace(/(\d+)[\²]/g, '$1**2')
      .replace(/(\d+)[\¹]/g, '$1**1')
      .replace(/[×]/g, '*');

    return this.sanitizeExpression(converted);
  }

  private static detectExpressionsOfType(
    text: string,
    type: keyof typeof MathEvaluator.EXPRESSION_TYPES,
    results: MathEvaluationResult[]
  ): void {
    const regex = this.EXPRESSION_TYPES[type];

    for (const match of text.matchAll(regex)) {
      try {
        const fullMatch = match[0];

        if (this.isFunctionNotation(fullMatch)) {
          continue;
        }

        const claimedResultMatch = this.CLAIMED_RESULT_REGEX.exec(fullMatch);
        if (!claimedResultMatch) {
          continue;
        }

        const claimedResult = parseFloat(claimedResultMatch[1]);
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

        if (!expressionToEvaluate) {
          continue;
        }

        const actualResult = this.safeEvaluate(expressionToEvaluate);
        const isCorrect = this.areNumbersEqual(actualResult, claimedResult);

        results.push({
          original: fullMatch,
          expressionText: expressionToEvaluate,
          result: actualResult,
          isCorrect,
          claimedResult,
          confidence: isCorrect ? confidence : confidence * 0.8,
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
          context: 'erreur_evaluation',
        });
      }
    }
  }

  private static isFunctionNotation(expr: string): boolean {
    return (
      this.FUNCTION_NOTATION_START.test(expr) || this.FUNCTION_NOTATION_INLINE.test(expr)
    );
  }

  private static areNumbersEqual(a: number, b: number): boolean {
    const diff = Math.abs(a - b);

    if (Math.abs(a) < this.ABSOLUTE_EPSILON || Math.abs(b) < this.ABSOLUTE_EPSILON) {
      return diff < this.ABSOLUTE_EPSILON;
    }

    const relativeEpsilon = this.RELATIVE_EPSILON * Math.max(Math.abs(a), Math.abs(b));
    return diff < Math.max(this.ABSOLUTE_EPSILON, relativeEpsilon);
  }

  public static convertToVerificationResults(
    evaluationResults: MathEvaluationResult[]
  ): CalculationVerificationResult[] {
    return evaluationResults.map(result => {
      if (result.context === 'notation_fonction') {
        return {
          original: result.original,
          verified: 'Notation de fonction mathématique (non évaluée)',
          isCorrect: true,
          confidence: 0.95,
        };
      }

      if (!result.isCorrect) {
        const reason = result.context?.startsWith('Étape')
          ? `Chaîne de calcul invalide: ${result.context}`
          : `Calcul incorrect: ${result.expressionText || result.original} = ${result.result}, pas ${result.claimedResult}.`;
        return {
          original: result.original,
          verified: result.context?.startsWith('Étape')
            ? `Calcul incorrect. Erreur à ${result.context}`
            : `Calcul incorrect. ${result.expressionText} = ${result.result}, pas ${result.claimedResult}`,
          isCorrect: false,
          confidence: result.confidence,
          reason,
        };
      }

      return {
        original: result.original,
        verified: `${result.expressionText} = ${result.result}`,
        isCorrect: true,
        confidence: result.confidence,
      };
    });
  }

  private static extractStandardExpression(expr: string): string {
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
    return this.sanitizeExpression(parts[0]);
  }

  private static extractParenthesesExpression(expr: string): string {
    const parts = expr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
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

  /**
   * Public calculator entry point (used by the MCP `calculate` tool).
   * Accepts textual operators, Math.* calls and an optional `= claimed` suffix.
   */
  public static evaluateExpression(raw: string): {
    expression: string;
    value: number;
    claimedResult?: number;
    matchesClaim?: boolean;
  } {
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new Error('Expression vide.');
    }
    if (trimmed.length > 500) {
      throw new Error('Expression trop longue (500 caractères maximum).');
    }

    const equalsIndex = trimmed.indexOf('=');
    const left = equalsIndex >= 0 ? trimmed.slice(0, equalsIndex) : trimmed;
    const right = equalsIndex >= 0 ? trimmed.slice(equalsIndex + 1) : undefined;

    let normalized = this.convertTextToMathExpression(left).replace(/,/g, '.');
    if (!/^[\s\d.()+\-*/^a-zA-Z]*$/.test(normalized)) {
      throw new Error('L\'expression contient des caractères non autorisés.');
    }

    normalized = this.replaceMathCalls(normalized);

    if (/[a-zA-Z]/.test(normalized)) {
      throw new Error('L\'expression contient des termes non autorisés.');
    }
    if (!/\d/.test(normalized)) {
      throw new Error('Aucun nombre détecté dans l\'expression.');
    }

    const compact = normalized.replace(/\s+/g, '');
    const value = this.safeEvaluate(compact);
    const claimedResult = right !== undefined ? Number.parseFloat(right.replace(',', '.').trim()) : undefined;
    const matchesClaim =
      claimedResult !== undefined && Number.isFinite(claimedResult)
        ? this.areNumbersEqual(value, claimedResult)
        : undefined;

    return {
      expression: compact,
      value,
      claimedResult: Number.isFinite(claimedResult) ? claimedResult : undefined,
      matchesClaim,
    };
  }

  /** Replaces every `Math.fn(...)` call (nested parentheses supported) by its value. */
  private static replaceMathCalls(text: string): string {
    let result = text;
    let index = result.search(/Math\./);
    let guard = 0;

    while (index >= 0) {
      guard += 1;
      if (guard > 20) {
        throw new Error('Expression mathématique trop imbriquée.');
      }

      const nameMatch = /^Math\.(sqrt|pow|abs|round|floor|ceil|max|min|sin|cos|tan)\s*\(/i.exec(
        result.slice(index),
      );
      if (!nameMatch) {
        throw new Error('Fonction mathématique non autorisée.');
      }

      const openIndex = index + nameMatch[0].length - 1;
      const closeIndex = this.findMatchingParen(result, openIndex);
      if (closeIndex < 0) {
        throw new Error('Parenthèses non équilibrées.');
      }

      const argsText = result.slice(openIndex + 1, closeIndex);
      const value = this.evaluateFunctionCall(nameMatch[1].toLowerCase(), argsText);
      result = `${result.slice(0, index)}${value}${result.slice(closeIndex + 1)}`;
      index = result.search(/Math\./);
    }

    return result;
  }

  private static findMatchingParen(text: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < text.length; i += 1) {
      const char = text[i];
      if (char === '(') {
        depth += 1;
      } else if (char === ')') {
        depth -= 1;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  private static sanitizeExpression(expr: string): string {
    return expr
      .replace(/[^\d\s().+\-*/^]/g, '')
      .trim()
      .replace(/\^/g, '**');
  }

  private static convertTextToMathExpression(textExpr: string): string {
    const parts = textExpr.split(/(?:=|égale?|est égal à|vaut|font|donne)/i);
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
    const trimmed = expr.trim();
    const callMatch = this.FUNCTION_CALL_REGEX.exec(trimmed);
    if (callMatch) {
      return this.evaluateFunctionCall(callMatch[1].toLowerCase(), callMatch[2]);
    }

    const cleanExpr = trimmed.replace(/\s+/g, '').replace(/\*\*/g, '^');
    const cached = this.expressionCache.get(cleanExpr);
    if (cached !== undefined) {
      return cached;
    }

    let result: number;
    try {
      result = this.evaluateWithShuntingYard(cleanExpr);
    } catch {
      throw new Error(`Impossible d'évaluer l'expression: ${expr}`);
    }

    this.cacheExpression(cleanExpr, result);
    return result;
  }

  private static evaluateFunctionCall(name: string, argsText: string): number {
    const spec = this.FUNCTION_DISPATCH[name];
    if (!spec) {
      throw new Error(`Fonction mathématique non autorisée: ${name}`);
    }

    const args = this.splitArguments(argsText).map(argument => this.safeEvaluate(argument));
    if (args.length < spec.minArgs || args.length > spec.maxArgs) {
      throw new Error(`Nombre d'arguments invalide pour Math.${name}`);
    }

    const result = spec.fn(args);
    if (typeof result !== 'number' || Number.isNaN(result) || !Number.isFinite(result)) {
      throw new Error("Le résultat n'est pas un nombre valide");
    }
    return result;
  }

  private static splitArguments(text: string): string[] {
    const args: string[] = [];
    let depth = 0;
    let current = '';

    for (const char of text) {
      if (char === '(') {
        depth++;
      } else if (char === ')') {
        depth--;
      } else if (char === ',' && depth === 0) {
        args.push(current);
        current = '';
        continue;
      }
      current += char;
    }

    args.push(current);
    return args.map(arg => arg.trim()).filter(arg => arg.length > 0);
  }

  private static cacheExpression(expr: string, value: number): void {
    if (this.expressionCache.size >= this.MAX_CACHE_ENTRIES) {
      const oldest = this.expressionCache.keys().next().value;
      if (oldest !== undefined) {
        this.expressionCache.delete(oldest);
      }
    }
    this.expressionCache.set(expr, value);
  }

  private static evaluateWithShuntingYard(expr: string): number {
    if (!/^[\d\s().+\-*/^]+$/.test(expr)) {
      throw new Error('Expression contient des caractères non autorisés');
    }

    interface Token {
      type: 'number' | 'operator' | 'left_paren' | 'right_paren';
      value: number | string;
    }

    const tokens: Token[] = [];
    let i = 0;

    while (i < expr.length) {
      if (/[0-9.]/.test(expr[i])) {
        let number = '';
        while (i < expr.length && /[0-9.]/.test(expr[i])) {
          number += expr[i++];
        }
        tokens.push({ type: 'number', value: parseFloat(number) });
      } else if (/[+\-*/^]/.test(expr[i])) {
        tokens.push({ type: 'operator', value: expr[i++] });
      } else if (expr[i] === '(') {
        tokens.push({ type: 'left_paren', value: expr[i++] });
      } else if (expr[i] === ')') {
        tokens.push({ type: 'right_paren', value: expr[i++] });
      } else {
        i++;
      }
    }

    const outputQueue: (number | ((a: number, b: number) => number))[] = [];
    const operatorStack: string[] = [];

    for (const token of tokens) {
      if (token.type === 'number') {
        outputQueue.push(token.value as number);
      } else if (token.type === 'operator') {
        const o1 = token.value as string;

        while (operatorStack.length > 0) {
          const o2 = operatorStack[operatorStack.length - 1];
          if (o2 === '(' || o2 === ')') {
            break;
          }

          if (
            (this.OPERATOR_ASSOCIATIVITY[o1] === 'left' &&
              this.OPERATOR_PRECEDENCE[o1] <= this.OPERATOR_PRECEDENCE[o2]) ||
            (this.OPERATOR_ASSOCIATIVITY[o1] === 'right' &&
              this.OPERATOR_PRECEDENCE[o1] < this.OPERATOR_PRECEDENCE[o2])
          ) {
            outputQueue.push(this.OPERATOR_FUNCTIONS[operatorStack.pop()!]);
          } else {
            break;
          }
        }

        operatorStack.push(o1);
      } else if (token.type === 'left_paren') {
        operatorStack.push(token.value as string);
      } else if (token.type === 'right_paren') {
        while (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] !== '(') {
          outputQueue.push(this.OPERATOR_FUNCTIONS[operatorStack.pop()!]);
        }

        if (operatorStack.length > 0 && operatorStack[operatorStack.length - 1] === '(') {
          operatorStack.pop();
        } else {
          throw new Error('Parenthèses déséquilibrées');
        }
      }
    }

    while (operatorStack.length > 0) {
      const op = operatorStack.pop()!;
      if (op === '(' || op === ')') {
        throw new Error('Parenthèses déséquilibrées');
      }
      outputQueue.push(this.OPERATOR_FUNCTIONS[op]);
    }

    const evaluationStack: number[] = [];

    for (const token of outputQueue) {
      if (typeof token === 'number') {
        evaluationStack.push(token);
      } else if (typeof token === 'function') {
        if (evaluationStack.length < 2) {
          throw new Error("Expression invalide: pas assez d'opérandes");
        }
        const b = evaluationStack.pop()!;
        const a = evaluationStack.pop()!;
        evaluationStack.push(token(a, b));
      }
    }

    if (evaluationStack.length !== 1) {
      throw new Error('Expression invalide: trop d\'opérandes');
    }

    return evaluationStack[0];
  }
}
