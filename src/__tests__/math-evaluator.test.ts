import { readFileSync } from 'fs';
import { join } from 'path';
import { MathEvaluator } from '../utils/math-evaluator';

describe('MathEvaluator', () => {
  it('détecte une expression arithmétique standard', () => {
    const texte = 'Selon les plans, 2 + 3 = 5 est vérifié.';
    const [resultat] = MathEvaluator.detectAndEvaluate(texte);

    expect(resultat).toBeDefined();
    expect(resultat.expressionText).toContain('2 + 3');
    expect(resultat.isCorrect).toBe(true);
    expect(resultat.result).toBeCloseTo(5);
  });

  it('gère les expressions avec parenthèses et faux résultat', () => {
    const texte = 'On affirme que (2 + 3) * 4 = 10.';
    const [resultat] = MathEvaluator.detectAndEvaluate(texte);

    expect(resultat.isCorrect).toBe(false);
    expect(resultat.claimedResult).toBe(10);
    expect(resultat.result).toBeCloseTo(20);
  });

  it('ignore les notations de fonction et retourne un contexte dédié', () => {
    const texte = 'f(x) = f(2) = 4\nMais 6 - 2 = 4';
    const resultats = MathEvaluator.detectAndEvaluate(texte);

    expect(resultats.length).toBeGreaterThan(0);
    const fonction = resultats.find(r => r.context === 'notation_fonction');
    const calcul = resultats.find(r => r.context !== 'notation_fonction');

    expect(fonction).toBeDefined();
    expect(calcul).toBeDefined();
  });

  it('valide chaque étape d’une chaîne séquentielle', () => {
    const texte = '2³ - 2×2 - 5 = 8 - 4 - 5 = -1';
    const resultat = MathEvaluator.detectAndEvaluate(texte).find(r =>
      r.original.includes('2³')
    );

    expect(resultat).toBeDefined();
    expect(resultat!.isCorrect).toBe(true);
    expect(resultat!.result).toBeCloseTo(-1);
  });

  it('signale l’étape fautive même si le résultat final correspond', () => {
    const texte = 'Chaîne: 2 + 2 = 4 = 99 = 4';
    const resultat = MathEvaluator.detectAndEvaluate(texte).find(r =>
      r.original.includes('99')
    );

    expect(resultat).toBeDefined();
    expect(resultat!.isCorrect).toBe(false);
    expect(resultat!.context).toContain('Étape 2');
    expect(resultat!.context).toContain('99');

    const [verification] = MathEvaluator.convertToVerificationResults([resultat!]);
    expect(verification.reason).toBeDefined();
    expect(verification.reason).toContain('Étape');
  });

  it('met en cache le calcul sans lever d’erreur sur division par zéro', () => {
    const texte = '10 / 2 = 5';
    const [premier] = MathEvaluator.detectAndEvaluate(texte);
    const [second] = MathEvaluator.detectAndEvaluate(texte);

    expect(premier.result).toBeCloseTo(second.result);
    expect(premier.isCorrect).toBe(second.isCorrect);
  });

  it('interprète les expressions textuelles et les fonctions mathématiques', () => {
    const texte = '2 plus 2 égale 4. La racine carrée de 9 = 3. 2 au carré = 4.';
    const resultats = MathEvaluator.detectAndEvaluate(texte);

    const addition = resultats.find(res => res.expressionText.includes('2 + 2'));
    const racine = resultats.find(res => res.claimedResult === 3);
    const carre = resultats.find(res => res.claimedResult === 4 && res.expressionText.includes('Math.pow'));

    expect(addition?.isCorrect).toBe(true);
    expect(racine?.isCorrect).toBe(true);
    expect(carre?.isCorrect).toBe(true);
  });

  it('marque une expression invalide comme non vérifiée avec une raison', () => {
    const texte = 'Cette affirmation est fausse: 5 + 5 = 3.';
    const [resultat] = MathEvaluator.detectAndEvaluate(texte);
    expect(resultat.isCorrect).toBe(false);
    expect(resultat.confidence).toBeLessThan(1);

    const [verification] = MathEvaluator.convertToVerificationResults([resultat]);
    expect(verification.isCorrect).toBe(false);
    expect(verification.reason).toBeDefined();
    expect(verification.reason).toContain('10');
  });

  it('n’utilise ni eval, ni Function, ni vm', () => {
    const source = readFileSync(join(__dirname, '..', 'utils', 'math-evaluator.ts'), 'utf8');
    expect(source).not.toContain('new Function');
    expect(source).not.toContain('Function(');
    expect(source).not.toMatch(/\beval\s*\(/);
    expect(source).not.toContain("from 'vm'");
  });

  it('evaluateExpression calcule et vérifie une valeur revendiquée', () => {
    expect(MathEvaluator.evaluateExpression('(120*0.45)').value).toBeCloseTo(54, 10);
    expect(MathEvaluator.evaluateExpression('250*0,8*1,1').value).toBeCloseTo(220, 10);
    expect(MathEvaluator.evaluateExpression('Math.sqrt(144)').value).toBeCloseTo(12, 10);
    const checked = MathEvaluator.evaluateExpression('12*4+6 = 54');
    expect(checked.claimedResult).toBe(54);
    expect(checked.matchesClaim).toBe(true);
    expect(MathEvaluator.evaluateExpression('95/5 = 18').matchesClaim).toBe(false);
  });

  it('evaluateExpression rejette les entrées dangereuses', () => {
    expect(() => MathEvaluator.evaluateExpression('')).toThrow();
    expect(() => MathEvaluator.evaluateExpression('process.exit(1)')).toThrow();
    expect(() => MathEvaluator.evaluateExpression('x'.repeat(600))).toThrow();
  });
});
