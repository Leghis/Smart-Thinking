import { solveOrdering } from '../reasoning/constraint-solver';
import { solveLinearEquation, solveLinearSystem } from '../reasoning/equation-solver';
import { listKnowledgeTopics, lookupKnowledge, searchKnowledge } from '../reasoning/math-knowledge';
import { runCas, isCasAvailable } from '../reasoning/cas';
import { deepResearch } from '../reasoning/research';
import { assistCritique, assistDecompose, assistJudge, createAssistClient } from '../reasoning/assist';
import { ClaimLedger } from '../reasoning/claims';
import {
  buildScienceProtocol,
  classifyScienceDomain,
  detectScienceDomain,
} from '../reasoning/protocol';
import { runCompute } from '../reasoning/compute';
import type { SearchService, WebSearchRequest } from '../search/search-service';
import type { WebSearchResponse } from '../types';

describe('reasoning toolbox', () => {
  test('knowledge base returns targeted entries and topics', () => {
    const weierstrass = lookupKnowledge('weierstrass duplication');
    expect(weierstrass.length).toBeGreaterThan(0);
    expect(weierstrass[0].content.length).toBeGreaterThan(50);

    const gauss = lookupKnowledge('eisenstein gauss');
    expect(gauss.some(entry => entry.id === 'gaussian-integers-eisenstein')).toBe(true);

    expect(lookupKnowledge('sujet inexistant xyz').length).toBe(0);
    expect(listKnowledgeTopics().length).toBeGreaterThan(10);
    expect(lookupKnowledge(undefined, 'methodology').length).toBeGreaterThan(0);
  });

  test('constraint solver covers comparisons, ambiguity and contradictions', () => {
    const unique = solveOrdering('A est plus rapide que B et B est plus rapide que C.', ['A', 'B', 'C']);
    expect(unique.order).toEqual(['A', 'B', 'C']);
    expect(unique.unique).toBe(true);

    const explicit = solveOrdering('', ['X', 'Y', 'Z'], [{ before: 'X', after: 'Y' }]);
    expect(explicit.order?.[0]).toBe('X');
    expect(explicit.unique).toBe(false);

    const cyclic = solveOrdering('A avant B, B avant C, C avant A', ['A', 'B', 'C']);
    expect(cyclic.contradictions.length).toBeGreaterThan(0);
  });

  test('equation solver handles linear, system and invalid inputs', () => {
    const linear = solveLinearEquation('4x - 8 = 0');
    expect('variables' in linear && linear.variables.x).toBeCloseTo(2, 8);

    const system = solveLinearSystem(['x + y = 3', 'x - y = 1']);
    expect('variables' in system && system.variables.x).toBeCloseTo(2, 8);
    expect('variables' in system && system.variables.y).toBeCloseTo(1, 8);

    expect('error' in solveLinearEquation('x + y = 1')).toBe(true);
    expect('error' in solveLinearSystem(['x + y = 1', 'x + y = 2'])).toBe(true);
  });

  test('CAS verifies identities and enumerates lattice points with SymPy', async () => {
    if (!(await isCasAvailable())) {
      expect(true).toBe(true);
      return;
    }

    const identity = await runCas({
      operation: 'verify_identity',
      lhs: '-2*t + (1/4)*((6*t**2-2)**2/(4*t**3-4*t))',
      rhs: '(t**2+1)**2/(4*t*(t**2-1))',
      symbols: ['t'],
    });
    expect(identity.ok).toBe(true);
    expect(identity.equal).toBe(true);

    const residues = await runCas({ operation: 'mod_linear', coefficient: 4, modulus: 17, count: 16 });
    expect(residues.result).toEqual([4, 8, 12, 16, 3, 7, 11, 15, 2, 6, 10, 14, 1, 5, 9, 13]);

    // `^` is XOR in SymPy: it used to crash with a raw TypeError.
    const caret = await runCas({ operation: 'simplify', expr: '(x+1)^2', symbols: ['x'] });
    expect(caret.ok).toBe(true);
    expect(caret.normalizedPower).toBe(true);
    expect(String(caret.result)).toBe('(x + 1)**2');

    const lattice = await runCas({ operation: 'lattice_solve', a: 4, b: 1, modulus: 17, count: 16 });
    const points = lattice.result as Array<{ u: number; v: number }>;
    expect(points).toHaveLength(16);
    for (const point of points) {
      expect((4 * point.u - point.v) % 17).toBe(0);
    }

    const minimal = await runCas({ operation: 'minimal_polynomial', value: 'sqrt(2)', symbol: 'x' });
    expect(String(minimal.result)).toContain('x**2 - 2');

    await expect(runCas({ operation: 'simplify', expr: 'import os' })).rejects.toThrow();
  });

  test('deep research aggregates Tavily answers, candidates and citations', async () => {
    const searchService = {
      resolveProvider: () => 'tavily' as const,
      webSearch: async (request: WebSearchRequest): Promise<WebSearchResponse> => ({
        provider: 'tavily',
        query: request.query,
        answer: 'Canberra is the capital of Australia.',
        results: [
          {
            id: 'web-1',
            title: 'Canberra — capital',
            url: 'https://example.org/canberra',
            text: 'Canberra is the capital of Australia and its largest inland city.',
            source: 'tavily',
          },
          {
            id: 'web-2',
            title: 'Australia facts',
            url: 'https://example.org/australia',
            text: 'The capital of Australia is Canberra since 1913.',
            source: 'tavily',
          },
        ],
      }),
    } as unknown as SearchService;

    const result = await deepResearch('What is the capital of Australia?', { searchService });
    expect(result.provider).toBe('tavily');
    expect(result.answerCandidates.length).toBeGreaterThan(0);
    expect(result.answerCandidates[0].text).toContain('Canberra');
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.hops).toBeGreaterThanOrEqual(1);
  });

  test('deep research delegates natively without a configured provider', async () => {
    const searchService = {
      resolveProvider: () => 'native' as const,
      webSearch: async () => {
        throw new Error('should not be called');
      },
    } as unknown as SearchService;

    const result = await deepResearch('Question multi-hop ?', { searchService });
    expect(result.provider).toBe('native');
    expect(result.requiresClientAction).toBe(true);
    expect(result.evidence).toEqual([]);
  });

  test('assist client is disabled without a key and parses JSON with a key', async () => {
    const previousKey = process.env.SMART_THINKING_ASSIST_API_KEY;
    const previousDeepseek = process.env.DEEPSEEK_API_KEY;
    delete process.env.SMART_THINKING_ASSIST_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    expect(createAssistClient().available).toBe(false);
    if (previousKey !== undefined) process.env.SMART_THINKING_ASSIST_API_KEY = previousKey;
    if (previousDeepseek !== undefined) process.env.DEEPSEEK_API_KEY = previousDeepseek;

    const originalFetch = global.fetch;
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```json\n{"score10": 7, "comments": "ok"}\n```' } }],
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
    try {
      const assist = createAssistClient({ apiKey: 'test-key', baseUrl: 'https://assist.test' });
      expect(assist.available).toBe(true);
      const parsed = await assist.completeJson<{ score10: number }>('s', 'u');
      expect(parsed?.score10).toBe(7);

      const critique = await assistCritique(assist, 'problem', 'draft');
      expect(critique).not.toBeNull();
      const decomposition = await assistDecompose(assist, 'problem');
      expect(decomposition).not.toBeNull();
      const judge = await assistJudge(assist, 'claim', 'evidence');
      expect(judge).not.toBeNull();
      expect(fetchMock).toHaveBeenCalled();
    } finally {
      global.fetch = originalFetch;
    }
  });

  test('claim ledger enforces method+evidence and detects conflicts', () => {
    const ledger = new ClaimLedger();
    ledger.register('s1', { statement: 'Cardinal', value: '42', method: 'CRT', evidence: 'script 1' });
    ledger.register('s1', { statement: 'Cardinal', value: '43', method: 'CRT', evidence: 'script 2' });
    ledger.register('s1', { statement: 'Borne', value: '1/8' });

    const report = ledger.audit('s1');
    expect(report.total).toBe(3);
    expect(report.supported).toBe(2);
    expect(report.unsupported).toHaveLength(1);
    expect(report.unsupported[0].missing).toContain('evidence');
    expect(report.conflicts).toHaveLength(1);
    expect(report.conflicts[0].values.sort()).toEqual(['42', '43']);

    ledger.clear('s1');
    expect(ledger.audit('s1').total).toBe(0);
  });

  test('science protocol detects domains and returns generic methodology', () => {
    expect(detectScienceDomain('Six transactions lisent un instantané et écrivent un journal')).toBe('distributed');
    expect(detectScienceDomain('Le budget de l\'agent MCP et ses autorisations')).toBe('agents');
    expect(detectScienceDomain('Résoudre x^2 mod p^3 pour des nombres premiers')).toBe('number-theory');

    const protocol = buildScienceProtocol('Un problème inclassable de réflexion pure');
    expect(protocol.domain).toBe('general');
    expect(protocol.steps.length).toBeGreaterThan(4);
    expect(protocol.checklist.length).toBeGreaterThan(0);
    expect(protocol.answerFormat.join(' ').toLowerCase()).toContain('réponse');
  });

  test('classifies a sums-of-two-cubes problem as number theory with auditable signals', () => {
    const problem =
      'Trouver tous les entiers naturels qui sont somme de deux cubes de deux façons distinctes, par exemple 1729 = 1^3+12^3 = 9^3+10^3';

    const classification = classifyScienceDomain(problem);
    expect(classification.domain).toBe('number-theory');
    expect(classification.confidence).toBeGreaterThan(0.5);
    expect(classification.signals).toContain('cubes');

    const protocol = buildScienceProtocol(problem);
    expect(protocol.domain).toBe('number-theory');
    expect(protocol.domainConfidence).toBeGreaterThan(0.5);
    expect(protocol.checklist.join(' ')).toContain('CRT');
  });

  test('never injects an off-topic knowledge sheet for a generic question', () => {
    const problem =
      'Trouver tous les entiers naturels qui sont somme de deux cubes de deux façons distinctes, par exemple 1729 = 1^3+12^3 = 9^3+10^3';

    const matches = searchKnowledge(problem);
    expect(matches).toHaveLength(0);
    expect(lookupKnowledge(problem)).toHaveLength(0);
  });

  test('compute sandbox rejects dangerous code and runs exact math', async () => {
    await expect(runCompute({ code: 'import os\nprint(1)' })).rejects.toThrow();
    await expect(runCompute({ code: 'open("/etc/passwd")' })).rejects.toThrow();
    await expect(runCompute({ code: 'x = (1).__class__' })).rejects.toThrow();

    const script = [
      'import sympy as sp',
      'x = sp.Symbol("x")',
      'roots = sp.nthroot_mod(1, 2, 17, all_roots=True)',
      'print(sorted(roots))',
    ].join('\n');
    const result = await runCompute({ code: script, timeoutMs: 30000 });
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('16');
  }, 40000);
});
