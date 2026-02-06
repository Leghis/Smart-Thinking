import { MetricsCalculator } from '../metrics-calculator';
import { VerificationService } from '../services/verification-service';
import { SimilarityEngine } from '../similarity-engine';
import { ToolIntegrator } from '../tool-integrator';
import type { SuggestedTool, ThoughtMetrics, ThoughtNode, VerificationStatus } from '../types';
import { VerificationMemory } from '../verification-memory';

class ConfigurableToolIntegrator extends ToolIntegrator {
  private suggestions: SuggestedTool[] = [];
  private resultByToolName: Record<string, any> = {};

  setSuggestions(suggestions: SuggestedTool[]): void {
    this.suggestions = suggestions;
  }

  setResult(toolName: string, result: any): void {
    this.resultByToolName[toolName] = result;
  }

  async suggestVerificationTools(): Promise<SuggestedTool[]> {
    return this.suggestions;
  }

  async executeVerificationTool(toolName: string, content: string): Promise<any> {
    const resolved = this.resultByToolName[toolName];
    if (resolved instanceof Error) {
      throw resolved;
    }
    if (typeof resolved === 'function') {
      return resolved(content);
    }
    return resolved ?? null;
  }
}

const createThought = (id: string, content: string, type: ThoughtNode['type'] = 'regular'): ThoughtNode => ({
  id,
  content,
  type,
  timestamp: new Date(),
  connections: [],
  metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 } as ThoughtMetrics,
  metadata: {},
});

describe('VerificationService', () => {
  let service: VerificationService;
  let verificationMemory: VerificationMemory;
  let toolIntegrator: ConfigurableToolIntegrator;

  beforeEach(() => {
    VerificationMemory.resetInstance();
    verificationMemory = VerificationMemory.getInstance();
    verificationMemory.setSimilarityEngine(new SimilarityEngine());

    toolIntegrator = new ConfigurableToolIntegrator();
    const metricsCalculator = new MetricsCalculator();
    service = new VerificationService(toolIntegrator, metricsCalculator, verificationMemory);
  });

  afterEach(() => {
    verificationMemory.stopCleanupTasks();
    VerificationMemory.resetInstance();
  });

  it('retourne une pré-vérification vide quand aucune détection de calcul n’est requise', async () => {
    const result = await service.performPreliminaryVerification('Texte descriptif simple.', false);
    expect(result.initialVerification).toBe(false);
    expect(result.verifiedCalculations).toBeUndefined();
    expect(result.preverifiedThought).toBe('Texte descriptif simple.');
  });

  it('utilise les résultats externes de calcul quand disponibles', async () => {
    toolIntegrator.setSuggestions([
      { name: 'executePython', confidence: 0.9, reason: 'Calcul', priority: 1 },
    ]);
    toolIntegrator.setResult('executePython', {
      verifiedCalculations: [
        {
          original: '2 + 2 = 4',
          verified: '2 + 2 = 4',
          isCorrect: true,
          confidence: 0.99,
        },
      ],
    });

    const result = await service.performPreliminaryVerification('Vérifions: 2 + 2 = 4', true);

    expect(result.initialVerification).toBe(true);
    expect(result.verifiedCalculations?.length).toBe(1);
    expect(result.preverifiedThought).toContain('[✓ Vérifié]');
  });

  it('récupère une vérification précédente depuis la mémoire et propage les statuts conclusion/revision', async () => {
    const sessionId = 'session-prev';
    const text = 'Le système refroidit de 5°C en 10 minutes.';

    await verificationMemory.addVerification(text, 'verified', 0.92, ['source fiable'], sessionId);
    const previous = await service.checkPreviousVerification(text, sessionId, 'regular', []);

    expect(previous.previousVerification).not.toBeNull();
    expect(previous.isVerified).toBe(true);
    expect(previous.verificationStatus).toBe('verified');

    const propagated = await service.checkPreviousVerification(
      'Conclusion intermédiaire liée à des faits validés',
      'session-propagation',
      'conclusion',
      ['a', 'b']
    );

    expect(propagated.isVerified).toBe(true);
    expect(propagated.verificationStatus).toBe('partially_verified');
  });

  it('met en cache et réutilise la vérification approfondie', async () => {
    toolIntegrator.setSuggestions([
      { name: 'tool_a', confidence: 0.9, reason: 'Source A', priority: 1 },
      { name: 'tool_b', confidence: 0.9, reason: 'Source B', priority: 2 },
    ]);
    toolIntegrator.setResult('tool_a', { isValid: true, source: 'A', details: 'ok' });
    toolIntegrator.setResult('tool_b', { isValid: true, source: 'B', details: 'ok' });

    const content = 'Donnée factuelle: 15% de baisse observée.';

    const firstThought = createThought('cache-1', content);
    const first = await service.deepVerify(firstThought, false, true, 'cache-session');
    expect(['verified', 'partially_verified']).toContain(first.status);

    const secondThought = createThought('cache-2', content);
    const second = await service.deepVerify(secondThought, false, false, 'cache-session');

    expect(second.status).toBe(first.status);
    expect(secondThought.metadata.verificationSource).toBe('cache');
  });

  it('détecte les contradictions quand les résultats ne convergent pas', async () => {
    const thought = createThought(
      'contradiction',
      'Il est certainement vrai et faux à la fois que ce chiffre est valide.'
    );

    const result = await (service as any).analyzeAndAggregateResults(
      thought,
      [
        { toolName: 'tool_true', result: { isValid: true, source: 'Source positive', details: 'confirmé' }, confidence: 0.9, stage: 'primary' },
        { toolName: 'tool_false', result: { isValid: false, source: 'Source négative', details: 'contredit' }, confidence: 0.85, stage: 'primary' },
      ],
      undefined,
      'contradiction-session'
    );

    expect(result.status).toBe('contradicted');
    expect((result.contradictions ?? []).length).toBeGreaterThan(0);
    expect(result.notes).toContain('contredit');
  });

  it('vérifie les calculs en interne puis annote correctement les résultats', async () => {
    const calcText = 'On calcule 3 + 3 = 9 et 2 + 2 = 4.';
    const calcResults = await service.detectAndVerifyCalculations(calcText);

    expect(calcResults.length).toBeGreaterThan(0);

    const annotated = service.annotateThoughtWithVerifications(calcText, [
      {
        original: '3 + 3 = 9',
        verified: '3 + 3 = 6',
        isCorrect: false,
        confidence: 0.99,
      },
      {
        original: '2 + 2 = 4',
        verified: '2 + 2 = 4',
        isCorrect: true,
        confidence: 0.99,
      },
      {
        original: 'x(f)=f(x)',
        verified: 'Notation de fonction',
        isCorrect: true,
        confidence: 0.5,
      },
    ]);

    expect(annotated).toContain('[✗ Incorrect');
    expect(annotated).toContain('[✓ Vérifié]');
    expect(annotated).not.toContain('Notation de fonction [');
  });

  it('stocke les vérifications et expose les statuts associés', async () => {
    const id = await service.storeVerification(
      'Texte stocké',
      'partially_verified',
      0.66,
      ['source de test'],
      'store-session'
    );

    expect(id).toContain('verification-');

    const statuses = await (service as any).getConnectedThoughtsVerificationStatus(['id-1', 'id-2']);
    expect(statuses).toEqual(['partially_verified', 'partially_verified']);
  });

  it('couvre les helpers internes de timeout et de hash', async () => {
    const resolved = await (service as any).executeWithTimeout(Promise.resolve('ok'), 50);
    expect(resolved).toBe('ok');

    const rejected = await (service as any).executeWithTimeout(Promise.reject(new Error('boom')), 50);
    expect(rejected).toBeNull();

    const hashA = (service as any).hashString('abc');
    const hashB = (service as any).hashString('abc');
    const hashC = (service as any).hashString('abcd');

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });

  it('analyse les caractéristiques de contenu et produit des notes de vérification', () => {
    const characteristics = (service as any).analyzeContentCharacteristics(
      "Ce rapport est une étude statistique de 2025: 42% des cas montrent que 3 + 2 = 5."
    );

    expect(characteristics.hasFactualClaims).toBe(true);
    expect(characteristics.hasStatistics).toBe(true);
    expect(characteristics.hasCalculations).toBe(true);

    const notes = (service as any).generateVerificationNotes(
      [
        { toolName: 'alpha', result: { isValid: true } },
        { toolName: 'beta', result: { isValid: false } },
        { toolName: 'gamma', result: { isValid: undefined } },
      ],
      [{ original: '1+1', verified: '2', isCorrect: true, confidence: 1 }]
    );

    expect(notes).toContain('alpha');
    expect(notes).toContain('contredit');
    expect(notes).toContain('calcul');
  });

  it('détermine correctement les statuts et confiances internes', () => {
    const thought = createThought('status', 'Texte');

    const contradicted = (service as any).determineVerificationStatusAndConfidence(
      [{ confidence: 0.8, result: { isValid: false } }],
      thought
    );
    expect(contradicted.status).toBe('contradicted');

    const verified = (service as any).determineVerificationStatusAndConfidence(
      [
        { confidence: 0.9, result: { isValid: true } },
        { confidence: 0.91, result: { isValid: true } },
      ],
      thought
    );
    expect(verified.status).toBe('verified');

    const partial = (service as any).determineVerificationStatusAndConfidence(
      [{ confidence: 0.6, result: { isValid: true } }],
      thought
    );
    expect(partial.status).toBe('partially_verified');

    const absence = (service as any).determineVerificationStatusAndConfidence(
      [{ confidence: 0.7, result: { isValid: 'absence_of_information' } }],
      thought
    );
    expect(absence.status).toBe('absence_of_information');

    const uncertain = (service as any).determineVerificationStatusAndConfidence(
      [{ confidence: 0.7, result: { isValid: undefined } }],
      thought
    );
    expect(uncertain.status).toBe('uncertain');

    const avg = (service as any).calculateAverageConfidence([
      { confidence: 0.6 },
      { confidence: 0.8 },
      { confidence: 1 },
    ]);
    expect(avg).toBeCloseTo(0.8, 5);
  });

  it('renvoie les statuts attendus dans la vérification précédente via cache interne', async () => {
    const session = 'cache-prev-session';
    const content = 'Texte unique pour cache précédent';

    await service.storeVerification(content, 'verified' as VerificationStatus, 0.9, ['cache-source'], session);
    const first = await service.checkPreviousVerification(content, session, 'regular', []);
    expect(first.previousVerification).not.toBeNull();

    const second = await service.checkPreviousVerification(content, session, 'regular', []);
    expect(second.previousVerification?.similarity).toBe(1);
    expect(second.certaintySummary).toContain('mise en cache');
  });
});
