import { LIMITS } from '../constants';
import { ProviderError, ValidationError } from '../errors';
import { SearchService } from '../search/search-service';
import { TavilyClient } from '../search/tavily-client';
import { fetchUrlContent, isPrivateUrl, normalizeUrl } from '../search/url-content';

const originalFetch = global.fetch;

function jsonResponse(payload: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? 'application/json' : null),
    },
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  } as unknown as Response;
}

function textResponse(body: string, contentType: string, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get: (name: string) => (name.toLowerCase() === 'content-type' ? contentType : null),
    },
    text: async () => body,
    json: async () => {
      throw new Error('Body is not JSON.');
    },
  } as unknown as Response;
}

function requestBody(fetchMock: jest.Mock, callIndex = 0): Record<string, unknown> {
  const init = fetchMock.mock.calls[callIndex]?.[1] as RequestInit | undefined;
  return JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
}

async function captureProviderError(promise: Promise<unknown>): Promise<ProviderError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ProviderError);
    return error as ProviderError;
  }
  throw new Error('Expected the promise to reject with a ProviderError.');
}

describe('TavilyClient', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('parses results, clamps maxResults and includes the answer when requested', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({
        answer: 'Réponse synthétique',
        results: [
          {
            title: 'Titre',
            url: 'https://example.com/a',
            content: 'Contenu principal',
            score: 0.91,
            published_date: '2025-02-01',
          },
          { title: 'Entrée invalide', content: 'sans url' },
        ],
      }),
    );

    const client = new TavilyClient({ envApiKey: 'tavily-secret', timeoutMs: 500 });
    const response = await client.search({ query: 'requête', maxResults: 3, includeAnswer: true });

    expect(response.answer).toBe('Réponse synthétique');
    expect(response.results).toHaveLength(1);
    expect(response.results[0]).toMatchObject({
      title: 'Titre',
      url: 'https://example.com/a',
      content: 'Contenu principal',
      score: 0.91,
      publishedDate: '2025-02-01',
    });

    const body = requestBody(fetchMock);
    expect(body.max_results).toBe(3);
    expect(body.include_answer).toBe(true);
    expect(body.search_depth).toBe('basic');

    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    await client.search({ query: 'borne haute', maxResults: 99 });
    expect(requestBody(fetchMock, 1).max_results).toBe(LIMITS.MAX_SEARCH_RESULTS);

    await client.search({ query: 'borne basse', maxResults: 0 });
    expect(requestBody(fetchMock, 2).max_results).toBe(1);
  });

  test('maps 401, 429 and 500 responses to ProviderError with retryable flags', async () => {
    const client = new TavilyClient({ envApiKey: 'tavily-secret', timeoutMs: 500 });

    fetchMock.mockResolvedValue(textResponse('unauthorized', 'text/plain', 401));
    const unauthorized = await captureProviderError(client.search({ query: 'q' }));
    expect(unauthorized.retryable).toBe(false);
    expect(unauthorized.details?.status).toBe(401);

    fetchMock.mockResolvedValue(textResponse('rate limited', 'text/plain', 429));
    const rateLimited = await captureProviderError(client.search({ query: 'q' }));
    expect(rateLimited.retryable).toBe(true);

    fetchMock.mockResolvedValue(textResponse('server error', 'text/plain', 500));
    const serverError = await captureProviderError(client.search({ query: 'q' }));
    expect(serverError.retryable).toBe(true);
    expect(serverError.details?.status).toBe(500);
  });

  test('redacts the API key from thrown errors and details', async () => {
    const client = new TavilyClient({ envApiKey: 'tavily-super-secret', timeoutMs: 500 });
    fetchMock.mockResolvedValue(
      textResponse('failure with key tavily-super-secret exposed', 'text/plain', 500),
    );

    const error = await captureProviderError(client.search({ query: 'q' }));

    expect(error.message).not.toContain('tavily-super-secret');
    expect(JSON.stringify(error.details)).not.toContain('tavily-super-secret');
    expect(JSON.stringify(error.details)).toContain('[redacted]');
  });

  test('wraps transport failures in a retryable ProviderError', async () => {
    const client = new TavilyClient({ envApiKey: 'tavily-secret', timeoutMs: 500 });
    fetchMock.mockRejectedValue(new Error('network down'));

    const error = await captureProviderError(client.search({ query: 'q' }));

    expect(error.retryable).toBe(true);
    expect(error.message).toContain('network down');
  });

  test('maps advanced search options and uses Bearer auth without leaking the key in the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    const client = new TavilyClient({ envApiKey: 'tavily-secret', timeoutMs: 500 });

    await client.search({
      query: 'inflation 2026',
      searchDepth: 'advanced',
      topic: 'news',
      timeRange: 'week',
      includeDomains: ['insee.fr'],
      excludeDomains: ['spam.example'],
      includeRawContent: 'markdown',
      chunksPerSource: 2,
      country: 'france',
      includeAnswer: 'advanced',
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer tavily-secret');
    const body = requestBody(fetchMock);
    expect(body).toMatchObject({
      search_depth: 'advanced',
      topic: 'news',
      time_range: 'week',
      include_domains: ['insee.fr'],
      exclude_domains: ['spam.example'],
      include_raw_content: 'markdown',
      chunks_per_source: 2,
      country: 'france',
      include_answer: 'advanced',
    });
    expect(body).not.toHaveProperty('api_key');
  });

  test('crawls a site and maps its URLs', async () => {
    const client = new TavilyClient({ envApiKey: 'tavily-secret', timeoutMs: 500 });

    fetchMock.mockResolvedValue(
      jsonResponse({
        base_url: 'https://docs.example.com',
        results: [
          { url: 'https://docs.example.com/a', raw_content: 'Page A' },
          { url: 'https://docs.example.com/b', raw_content: 'Page B' },
          { raw_content: 'sans url' },
        ],
      }),
    );
    const pages = await client.crawl({ url: 'https://docs.example.com', maxDepth: 2, limit: 5 });
    expect(pages).toEqual([
      { url: 'https://docs.example.com/a', content: 'Page A' },
      { url: 'https://docs.example.com/b', content: 'Page B' },
    ]);
    expect(requestBody(fetchMock).max_depth).toBe(2);

    fetchMock.mockResolvedValue(
      jsonResponse({ base_url: 'https://docs.example.com', results: ['https://docs.example.com/a', 'https://docs.example.com/b'] }),
    );
    const mapped = await client.map({ url: 'https://docs.example.com' });
    expect(mapped.urls).toHaveLength(2);
  });
});


describe('SearchService', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('selects tavily in auto mode when a key is configured', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'auto' });

    const response = await service.webSearch({ query: 'actualité' });

    expect(response.provider).toBe('tavily');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('falls back to native delegation without any network call when no key exists', async () => {
    const service = new SearchService({ defaultProvider: 'auto' });

    const response = await service.webSearch({ query: 'actualité' });

    expect(response.provider).toBe('native');
    expect(response.requiresClientAction).toBe(true);
    expect(response.instruction).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('returns none when the provider is off', async () => {
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'auto' });

    const response = await service.webSearch({ query: 'actualité', provider: 'off' });

    expect(response.provider).toBe('none');
    expect(response.requiresClientAction).toBe(false);
    expect(response.results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('falls back to native with an explanation when Tavily fails', async () => {
    fetchMock.mockRejectedValue(new Error('quota épuisé'));
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'tavily' });

    const response = await service.webSearch({ query: 'actualité' });

    expect(response.provider).toBe('native');
    expect(response.requiresClientAction).toBe(true);
    expect(response.instruction).toContain('Raison');
    expect(response.instruction).toContain('quota épuisé');
  });

  test('caches identical Tavily searches within the TTL', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ results: [{ title: 'T', url: 'https://example.com', content: 'C' }] }),
    );
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'tavily' });

    const first = await service.webSearch({ query: 'Même Requête' });
    const second = await service.webSearch({ query: 'même requête' });

    expect(first.provider).toBe('tavily');
    expect(second.cached).toBe(true);
    expect(second.results).toEqual(first.results);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test('extended search options are forwarded and cache keys stay distinct', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ results: [] }));
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'tavily' });

    await service.webSearch({ query: 'sujet', topic: 'news', timeRange: 'day', includeDomains: ['lemonde.fr'] });
    await service.webSearch({ query: 'sujet', topic: 'general' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstBody = requestBody(fetchMock, 0);
    expect(firstBody.topic).toBe('news');
    expect(firstBody.time_range).toBe('day');
    expect(firstBody.include_domains).toEqual(['lemonde.fr']);
  });

  test('fetchUrl prefers Tavily extract when a key is configured', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ results: [{ url: 'https://example.com/doc', raw_content: 'Contenu extrait par Tavily' }] }),
    );
    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'tavily' });

    const content = await service.fetchUrl('https://example.com/doc');

    expect(content.text).toBe('Contenu extrait par Tavily');
    const endpoint = String(fetchMock.mock.calls[0]?.[0]);
    expect(endpoint).toContain('/extract');
    expect(requestBody(fetchMock).urls).toEqual(['https://example.com/doc']);
  });

  test('fetchUrl falls back to a direct fetch when Tavily extract fails', async () => {
    fetchMock
      .mockResolvedValueOnce(textResponse('extract down', 'text/plain', 500))
      .mockResolvedValueOnce(textResponse('Contenu direct', 'text/plain'));

    const service = new SearchService({ envApiKey: 'session-key', defaultProvider: 'tavily' });
    const content = await service.fetchUrl('https://example.com/doc');

    expect(content.text).toBe('Contenu direct');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});


describe('url-content', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test('normalizes URLs and rejects malformed input', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/');
    expect(normalizeUrl('http://example.com/page')).toBe('http://example.com/page');

    expect(() => normalizeUrl('http://')).toThrow(ValidationError);
    expect(() => normalizeUrl('')).toThrow(ValidationError);
    expect(() => normalizeUrl('   ')).toThrow(ValidationError);
  });

  test('blocks private and loopback hosts', () => {
    expect(isPrivateUrl('http://localhost:3000')).toBe(true);
    expect(isPrivateUrl('http://127.0.0.1')).toBe(true);
    expect(isPrivateUrl('http://10.1.2.3')).toBe(true);
    expect(isPrivateUrl('http://192.168.0.10')).toBe(true);
    expect(isPrivateUrl('http://169.254.169.254/latest/meta-data')).toBe(true);
    expect(isPrivateUrl('https://example.com')).toBe(false);
    expect(isPrivateUrl('not a url')).toBe(true);
  });

  test('strips HTML tags and scripts and extracts the title', async () => {
    const html =
      '<html><head><title>Mon Titre</title><script>alert("bad")</script><style>.x{}</style></head>' +
      '<body><h1>Bonjour</h1><p>Monde &amp; plus</p></body></html>';
    fetchMock.mockResolvedValue(textResponse(html, 'text/html; charset=utf-8'));

    const content = await fetchUrlContent('https://example.com/page');

    expect(content.title).toBe('Mon Titre');
    expect(content.text).toContain('Bonjour');
    expect(content.text).toContain('Monde & plus');
    expect(content.text).not.toContain('bad');
    expect(content.text).not.toContain('<h1>');
    expect(content.truncated).toBe(false);
  });

  test('truncates long content to maxChars', async () => {
    fetchMock.mockResolvedValue(textResponse('a'.repeat(100), 'text/plain'));

    const content = await fetchUrlContent('https://example.com/long', { maxChars: 10 });

    expect(content.text).toHaveLength(10);
    expect(content.truncated).toBe(true);
  });

  test('rejects non-text content types', async () => {
    fetchMock.mockResolvedValue(textResponse('binary', 'image/png'));

    await expect(fetchUrlContent('https://example.com/image.png')).rejects.toBeInstanceOf(ProviderError);
  });

  test('blocks SSRF targets before issuing any fetch', async () => {
    await expect(fetchUrlContent('http://localhost:8080/secret')).rejects.toBeInstanceOf(ValidationError);
    await expect(fetchUrlContent('http://169.254.169.254/latest/meta-data')).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
