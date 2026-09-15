import { ProviderError } from '../errors';
import { runWebAgent, heuristicSubQuestions, domainOf } from '../reasoning/web-agent';
import { WebCreditLedger } from '../search/web-budget';
import type { SearchService } from '../search/search-service';
import type { WebSearchResponse, WebSearchResult } from '../types';

const QUESTION = 'Quelle est la consommation électrique annuelle des data centers en Irlande ?';

function result(id: string, url: string, title: string, text: string): WebSearchResult {
  return { id, url, title, text, score: 0.9, source: 'tavily' };
}

const SUPPORT_SENTENCE =
  'La consommation électrique annuelle des data centers en Irlande a atteint 21 % en 2023, un niveau record.';
const SUPPORT_SENTENCE_2 =
  'La consommation électrique annuelle des data centers en Irlande atteint 21 % du total national en 2023.';
const CONTRADICT_SENTENCE =
  "La consommation électrique des data centers en Irlande n'est pas de 21 %, cette affirmation est fausse.";
const IRRELEVANT_SENTENCE =
  'Sesame Street diffusa un générique animé sur un flipper dans les années soixante-dix.';
/** Two keyword hits (not zero) but no support wording: must be counted, never stored. */
const WEAK_SENTENCE =
  'La consommation annuelle progresse sans qu\'aucune conclusion ne soit tirée de ces relevés.';

interface StubOptions {
  results?: WebSearchResult[];
  extractions?: Array<{ url: string; content: string }>;
  failure?: unknown;
  provider?: 'tavily' | 'native' | 'none';
}

function createStub(options: StubOptions = {}) {
  const calls = { search: 0, extract: 0 };
  const stub = {
    calls,
    resolveProvider: () => options.provider ?? 'tavily',
    async webSearch(): Promise<WebSearchResponse> {
      calls.search += 1;
      if (options.failure) {
        throw options.failure;
      }
      return { provider: 'tavily', query: QUESTION, results: options.results ?? [] };
    },
    async extractWithTavily(urls: string[]) {
      calls.extract += 1;
      const content = options.extractions ?? [];
      return urls
        .filter(url => content.some(item => item.url === url))
        .map(url => ({ url, content: content.find(item => item.url === url)!.content }));
    },
  };
  return stub as unknown as SearchService & { calls: typeof calls };
}

describe('web agent', () => {
  test('decomposes a question deterministically without an assist model', () => {
    const subQuestions = heuristicSubQuestions(QUESTION, 3);
    expect(subQuestions).toHaveLength(3);
    expect(subQuestions[0]).toBe(QUESTION);
    expect(subQuestions[1]).toContain('consommation');
  });

  test('normalizes domains for independence counting', () => {
    expect(domainOf('https://www.example.com/a')).toBe('example.com');
    expect(domainOf('https://sub.example.org/b')).toBe('sub.example.org');
  });

  test('runs search + extraction and returns cited candidates and contradictions', async () => {
    const stub = createStub({
      results: [
        result('web-1', 'https://www.one.fr/a', 'Un', SUPPORT_SENTENCE),
        result('web-2', 'https://two.org/b', 'Deux', SUPPORT_SENTENCE_2),
        result('web-3', 'https://three.net/c', 'Trois', CONTRADICT_SENTENCE),
        result('web-1-bis', 'https://www.one.fr/a', 'Duplicat', SUPPORT_SENTENCE),
      ],
      extractions: [
        { url: 'https://www.one.fr/a', content: SUPPORT_SENTENCE },
        { url: 'https://two.org/b', content: SUPPORT_SENTENCE_2 },
      ],
    });
    const credits = new WebCreditLedger(25);

    const result2 = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-1' },
      { maxRounds: 2, maxSources: 8 },
    );

    expect(stub.calls.search).toBe(2);
    expect(result2.rounds).toBe(2);
    expect(result2.provider).toBe('tavily');
    expect(result2.sources.map(source => source.url)).toEqual([
      'https://www.one.fr/a',
      'https://two.org/b',
      'https://three.net/c',
    ]);
    expect(result2.sources.filter(source => source.extracted)).toHaveLength(2);
    expect(result2.answerCandidates.length).toBeGreaterThan(0);
    expect(result2.answerCandidates[0].domains.length).toBeGreaterThanOrEqual(2);
    expect(result2.contradictions.length).toBe(1);
    expect(result2.evidence.some(item => item.stance === 'contradicts')).toBe(true);
    expect(result2.citations.every(url => result2.sources.some(source => source.url === url))).toBe(true);
    expect(result2.creditsUsed).toBeGreaterThan(0);
    expect(result2.degraded).toBeUndefined();
  });

  test('discards neutral sentences instead of counting them as corroboration', async () => {
    const stub = createStub({
      results: [
        result('web-1', 'https://one.fr/a', 'Un', IRRELEVANT_SENTENCE),
        result('web-2', 'https://two.fr/b', 'Deux', WEAK_SENTENCE),
      ],
    });
    const credits = new WebCreditLedger(25);

    const outcome = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-neutral' },
      { maxRounds: 1 },
    );

    expect(outcome.evidence).toHaveLength(0);
    expect(outcome.discardedNeutral).toBeGreaterThan(0);
    expect(outcome.answerCandidates).toHaveLength(0);
  });

  test('drops navigation and paywall boilerplate from the evidence', async () => {
    const stub = createStub({
      results: [
        result(
          'web-1',
          'https://one.fr/a',
          'Un',
          `C Par [Connaissance des Énergies](/x) Mis à jour le | 4 min de lecture consommation électrique irlande data centers. ${SUPPORT_SENTENCE}`,
        ),
      ],
    });
    const credits = new WebCreditLedger(25);

    const outcome = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-boilerplate' },
      { maxRounds: 1 },
    );

    expect(outcome.evidence).toHaveLength(1);
    expect(outcome.evidence[0].quote).toBe(SUPPORT_SENTENCE);
  });

  test('stops cleanly when the session credit budget is exhausted', async () => {
    const stub = createStub({
      results: [result('web-1', 'https://one.fr/a', 'Un', SUPPORT_SENTENCE)],
    });
    const credits = new WebCreditLedger(2);

    const outcome = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-budget' },
      { maxRounds: 4 },
    );

    expect(outcome.truncated).toBe(true);
    expect(outcome.truncationReason).toBe('budget');
    expect(stub.calls.search).toBe(2);
    expect(credits.used('agent-budget')).toBe(2);
  });

  test('reports a quota refusal as degraded instead of pretending success', async () => {
    const stub = createStub({
      failure: new ProviderError('Quota Tavily dépassé pour cette clé (432/433).', {
        provider: 'tavily',
        status: 432,
      }),
    });
    const credits = new WebCreditLedger(25);

    const outcome = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-quota' },
      { maxRounds: 2 },
    );

    expect(outcome.degraded).toBe(true);
    expect(outcome.degradedReason).toBe('quota');
    expect(outcome.evidence).toHaveLength(0);
    expect(outcome.rounds).toBe(0);
  });

  test('delegates to the client when no server search engine is configured', async () => {
    const stub = createStub({ provider: 'native' });
    const credits = new WebCreditLedger(25);

    const outcome = await runWebAgent(
      QUESTION,
      { searchService: stub, credits, sessionId: 'agent-native' },
      { maxRounds: 2 },
    );

    expect(outcome.provider).toBe('native');
    expect(outcome.requiresClientAction).toBe(true);
    expect(outcome.instruction).toBeTruthy();
    expect(stub.calls.search).toBe(0);
    expect(outcome.subQuestions.length).toBeGreaterThan(1);
  });
});
