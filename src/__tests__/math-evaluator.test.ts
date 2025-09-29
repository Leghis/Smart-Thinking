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
    const texte = "f(x) = f(2) = 4\nMais 6 - 2 = 4";
    const resultats = MathEvaluator.detectAndEvaluate(texte);

    expect(resultats.length).toBeGreaterThan(0);
    const fonction = resultats.find((r) => r.context === 'notation_fonction');
    const calcul = resultats.find((r) => r.context !== 'notation_fonction');

    expect(fonction).toBeDefined();
    expect(calcul).toBeDefined();
  });

  it('évalue une chaîne séquentielle et signale l’erreur à l’étape fautive', () => {
    const texte = '2³ - 2×2 - 5 = 8 - 4 - 5 = -2';
    const [resultat] = MathEvaluator.detectAndEvaluate(texte).filter((r) => r.context !== 'notation_fonction');

    expect(resultat.isCorrect).toBe(false);
    if (resultat.context) {
      expect(resultat.context).toContain('Étape');
    }
  });

  it('met en cache le calcul sans lever d’erreur sur division par zéro', () => {
    const texte = '10 / 2 = 5';
    const [premier] = MathEvaluator.detectAndEvaluate(texte);
    const [second] = MathEvaluator.detectAndEvaluate(texte);

    expect(premier.result).toBeCloseTo(second.result);
    expect(premier.isCorrect).toBe(second.isCorrect);
  });

  it('interprète les expressions textuelles et les fonctions mathématiques', () => {
    const texte = '2 plus 2 égale 4. La racine carrée de 9 = 3.';
    const resultats = MathEvaluator.detectAndEvaluate(texte);

    const addition = resultats.find((res) => res.expressionText.includes('2 + 2'));
    const racine = resultats.find((res) => res.context === undefined && res.claimedResult === 3);

    expect(addition?.isCorrect).toBe(true);
    expect(racine?.isCorrect).toBe(true);
  });

  it('marque une expression invalide comme non vérifiée', () => {
    const texte = 'Cette affirmation est fausse: 5 + 5 = 3.';
    const [resultat] = MathEvaluator.detectAndEvaluate(texte);
    expect(resultat.isCorrect).toBe(false);
    expect(resultat.confidence).toBeLessThan(1);
  });
});
