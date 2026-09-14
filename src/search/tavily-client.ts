import { ProviderError, ProviderNotConfiguredError, ValidationError } from '../errors';
import { LIMITS } from '../constants';
import type { SearchDepth } from '../types';

const TAVILY_BASE = 'https://api.tavily.com';
const SEARCH_ENDPOINT = `${TAVILY_BASE}/search`;
const EXTRACT_ENDPOINT = `${TAVILY_BASE}/extract`;
const CRAWL_ENDPOINT = `${TAVILY_BASE}/crawl`;
const MAP_ENDPOINT = `${TAVILY_BASE}/map`;
const RESEARCH_ENDPOINT = `${TAVILY_BASE}/research`;

export type TavilyTopic = 'general' | 'news' | 'finance';
export type TavilyTimeRange = 'day' | 'week' | 'month' | 'year';
export type TavilyAnswerMode = boolean | 'basic' | 'advanced';
export type TavilyRawContentMode = boolean | 'markdown' | 'text';

export interface TavilySearchOptions {
  query: string;
  maxResults?: number;
  searchDepth?: SearchDepth | 'fast' | 'ultra-fast';
  includeAnswer?: TavilyAnswerMode;
  apiKey?: string;
  topic?: TavilyTopic;
  timeRange?: TavilyTimeRange;
  includeDomains?: string[];
  excludeDomains?: string[];
  includeRawContent?: TavilyRawContentMode;
  chunksPerSource?: number;
  country?: string;
  safeSearch?: boolean;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score?: number;
  publishedDate?: string;
  rawContent?: string;
}

export interface TavilySearchResponse {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
}

export interface TavilyExtractResult {
  url: string;
  content: string;
}

export interface TavilyCrawlOptions {
  url: string;
  instructions?: string;
  maxDepth?: number;
  maxBreadth?: number;
  limit?: number;
  selectPaths?: string[];
  excludePaths?: string[];
  allowExternal?: boolean;
  extractDepth?: 'basic' | 'advanced';
  format?: 'markdown' | 'text';
  apiKey?: string;
  timeoutSeconds?: number;
}


export interface TavilyResearchOptions {
  input: string;
  model?: 'mini' | 'pro' | 'auto';
  outputLength?: 'short' | 'standard' | 'long';
  citationFormat?: 'numbered' | 'mla' | 'apa' | 'chicago';
  includeDomains?: string[];
  excludeDomains?: string[];
  apiKey?: string;
  /** Max time to wait for the async task to complete. */
  maxWaitMs?: number;
  timeoutSeconds?: number;
}

export interface TavilyResearchResult {
  requestId: string;
  content: string;
  sources: Array<{ title: string; url: string }>;
  credits?: number;
  responseTime?: number;
}

export interface TavilyCrawlResult {
  url: string;
  content: string;
}

export interface TavilyMapOptions {
  url: string;
  instructions?: string;
  maxDepth?: number;
  maxBreadth?: number;
  limit?: number;
  selectPaths?: string[];
  excludePaths?: string[];
  allowExternal?: boolean;
  apiKey?: string;
  timeoutSeconds?: number;
}

export interface TavilyMapResponse {
  baseUrl: string;
  urls: string[];
}

interface TavilyRawResult {
  title?: unknown;
  url?: unknown;
  content?: unknown;
  score?: unknown;
  published_date?: unknown;
  raw_content?: unknown;
}

interface TavilyRawResponse {
  answer?: unknown;
  results?: unknown;
}

export function redactApiKey(message: string, apiKey?: string): string {
  if (!apiKey) {
    return message;
  }
  return message.split(apiKey).join('[redacted]');
}

function toStringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const items = value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  return items.length > 0 ? items : undefined;
}

export class TavilyClient {
  private readonly envApiKey?: string;
  private readonly timeoutMs: number;

  constructor(options: { envApiKey?: string; timeoutMs?: number } = {}) {
    this.envApiKey = options.envApiKey?.trim() || undefined;
    this.timeoutMs = options.timeoutMs ?? LIMITS.WEB_REQUEST_TIMEOUT_MS;
  }

  isConfigured(overrideKey?: string): boolean {
    return Boolean((overrideKey ?? this.envApiKey)?.trim());
  }

  async search(options: TavilySearchOptions): Promise<TavilySearchResponse> {
    const apiKey = this.requireKey(options.apiKey);
    if (!options.query.trim()) {
      throw new ValidationError('La requête de recherche ne peut pas être vide.');
    }

    const body: Record<string, unknown> = {
      query: options.query.trim(),
      search_depth: options.searchDepth ?? 'basic',
      max_results: Math.min(Math.max(options.maxResults ?? 5, 1), LIMITS.MAX_SEARCH_RESULTS),
      include_answer: options.includeAnswer ?? false,
      include_raw_content: options.includeRawContent ?? false,
    };
    if (options.topic) body.topic = options.topic;
    if (options.timeRange) body.time_range = options.timeRange;
    if (options.includeDomains?.length) body.include_domains = options.includeDomains;
    if (options.excludeDomains?.length) body.exclude_domains = options.excludeDomains;
    if (options.chunksPerSource !== undefined) {
      body.chunks_per_source = Math.min(Math.max(options.chunksPerSource, 1), 3);
    }
    if (options.country) body.country = options.country;
    if (options.safeSearch !== undefined) body.safe_search = options.safeSearch;

    const payload = await this.request<TavilyRawResponse>(SEARCH_ENDPOINT, body, apiKey, this.timeoutMs);
    const results = Array.isArray(payload.results) ? payload.results : [];

    return {
      query: options.query.trim(),
      answer: typeof payload.answer === 'string' && payload.answer.trim() ? payload.answer.trim() : undefined,
      results: results
        .map((entry): TavilySearchResult | null => this.normalizeResult(entry))
        .filter((entry): entry is TavilySearchResult => entry !== null),
    };
  }

  async extract(urls: string[], options: { apiKey?: string; extractDepth?: 'basic' | 'advanced' } = {}): Promise<TavilyExtractResult[]> {
    const apiKey = this.requireKey(options.apiKey);
    if (urls.length === 0) {
      return [];
    }

    const payload = await this.request<{ results?: unknown }>(
      EXTRACT_ENDPOINT,
      { urls, extract_depth: options.extractDepth ?? 'basic' },
      apiKey,
      this.timeoutMs,
    );
    const results = Array.isArray(payload.results) ? payload.results : [];

    return results
      .map((entry): TavilyExtractResult | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const url = typeof record.url === 'string' ? record.url : undefined;
        const content = typeof record.raw_content === 'string' ? record.raw_content : undefined;
        if (!url || !content) {
          return null;
        }
        return { url, content };
      })
      .filter((entry): entry is TavilyExtractResult => entry !== null);
  }

  async crawl(options: TavilyCrawlOptions): Promise<TavilyCrawlResult[]> {
    const apiKey = this.requireKey(options.apiKey);
    const body: Record<string, unknown> = {
      url: options.url,
      max_depth: clamp(options.maxDepth ?? 1, 1, 5),
      max_breadth: clamp(options.maxBreadth ?? 20, 1, 500),
      limit: Math.max(options.limit ?? 20, 1),
      allow_external: options.allowExternal ?? false,
      extract_depth: options.extractDepth ?? 'basic',
      format: options.format ?? 'markdown',
    };
    if (options.instructions) body.instructions = options.instructions;
    if (options.selectPaths?.length) body.select_paths = options.selectPaths;
    if (options.excludePaths?.length) body.exclude_paths = options.excludePaths;

    const payload = await this.request<{ results?: unknown }>(
      CRAWL_ENDPOINT,
      body,
      apiKey,
      (options.timeoutSeconds ?? 60) * 1000,
    );
    const results = Array.isArray(payload.results) ? payload.results : [];

    return results
      .map((entry): TavilyCrawlResult | null => {
        if (!entry || typeof entry !== 'object') {
          return null;
        }
        const record = entry as Record<string, unknown>;
        const url = typeof record.url === 'string' ? record.url : undefined;
        const content = typeof record.raw_content === 'string' ? record.raw_content : '';
        return url ? { url, content } : null;
      })
      .filter((entry): entry is TavilyCrawlResult => entry !== null);
  }

  async map(options: TavilyMapOptions): Promise<TavilyMapResponse> {
    const apiKey = this.requireKey(options.apiKey);
    const body: Record<string, unknown> = {
      url: options.url,
      max_depth: clamp(options.maxDepth ?? 1, 1, 5),
      max_breadth: clamp(options.maxBreadth ?? 20, 1, 500),
      limit: Math.max(options.limit ?? 50, 1),
      allow_external: options.allowExternal ?? false,
    };
    if (options.instructions) body.instructions = options.instructions;
    if (options.selectPaths?.length) body.select_paths = options.selectPaths;
    if (options.excludePaths?.length) body.exclude_paths = options.excludePaths;

    const payload = await this.request<{ base_url?: unknown; results?: unknown }>(
      MAP_ENDPOINT,
      body,
      apiKey,
      (options.timeoutSeconds ?? 60) * 1000,
    );
    const urls = toStringArray(payload.results) ?? [];

    return {
      baseUrl: typeof payload.base_url === 'string' ? payload.base_url : options.url,
      urls,
    };
  }


  async research(options: TavilyResearchOptions): Promise<TavilyResearchResult> {
    const apiKey = this.requireKey(options.apiKey);
    const body: Record<string, unknown> = {
      input: options.input,
      model: options.model ?? 'auto',
      stream: false,
      citation_format: options.citationFormat ?? 'numbered',
      output_length: options.outputLength ?? 'standard',
    };
    if (options.includeDomains?.length) body.include_domains = options.includeDomains.slice(0, 20);
    if (options.excludeDomains?.length) body.exclude_domains = options.excludeDomains.slice(0, 20);

    const created = await this.request<{ request_id?: unknown }>(
      RESEARCH_ENDPOINT,
      body,
      apiKey,
      (options.timeoutSeconds ?? 60) * 1000,
    );
    const requestId = typeof created.request_id === 'string' ? created.request_id : '';
    if (!requestId) {
      throw new ProviderError('Tavily Research n\'a pas renvoyé de request_id.', { provider: 'tavily' });
    }

    const deadline = Date.now() + (options.maxWaitMs ?? 240_000);
    let delayMs = 2_000;
    while (Date.now() < deadline) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
      delayMs = Math.min(Math.round(delayMs * 1.4), 10_000);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30_000);
      try {
        const response = await fetch(`${RESEARCH_ENDPOINT}/${encodeURIComponent(requestId)}`, {
          headers: { Authorization: `Bearer ${apiKey}` },
          signal: controller.signal,
        });
        if (response.status === 202) continue;
        if (!response.ok) {
          throw new ProviderError(`Tavily Research a renvoyé ${response.status}.`, {
            provider: 'tavily',
            status: response.status,
          });
        }
        const payload = (await response.json()) as {
          status?: string;
          content?: unknown;
          sources?: unknown;
          usage?: { credits?: number };
          response_time?: number;
        };
        if (payload.status === 'failed') {
          throw new ProviderError('Tavily Research a échoué.', { provider: 'tavily' });
        }
        const sources = Array.isArray(payload.sources)
          ? payload.sources
              .map(source => ({
                title: String((source as { title?: unknown })?.title ?? ''),
                url: String((source as { url?: unknown })?.url ?? ''),
              }))
              .filter(source => source.url)
          : [];
        return {
          requestId,
          content: typeof payload.content === 'string' ? payload.content : JSON.stringify(payload.content ?? ''),
          sources,
          credits: payload.usage?.credits,
          responseTime: payload.response_time,
        };
      } finally {
        clearTimeout(timer);
      }
    }
    throw new ProviderError('Tavily Research: délai dépassé avant la fin de la tâche.', { provider: 'tavily' }, true);
  }

  private requireKey(overrideKey?: string): string {
    const apiKey = (overrideKey ?? this.envApiKey)?.trim();
    if (!apiKey) {
      throw new ProviderNotConfiguredError('tavily');
    }
    return apiKey;
  }

  private normalizeResult(entry: unknown): TavilySearchResult | null {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const record = entry as TavilyRawResult;
    if (typeof record.url !== 'string' || typeof record.content !== 'string') {
      return null;
    }
    return {
      title: typeof record.title === 'string' ? record.title : record.url,
      url: record.url,
      content: record.content,
      score: typeof record.score === 'number' ? record.score : undefined,
      publishedDate: typeof record.published_date === 'string' ? record.published_date : undefined,
      rawContent: typeof record.raw_content === 'string' ? record.raw_content : undefined,
    };
  }

  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>,
    apiKey: string,
    timeoutMs: number,
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (response.status === 401 || response.status === 403) {
        throw new ProviderError('Tavily a refusé la clé API fournie (401/403).', {
          provider: 'tavily',
          status: response.status,
        });
      }
      if (response.status === 429) {
        throw new ProviderError('Tavily a renvoyé une limite de débit (429).', {
          provider: 'tavily',
          status: response.status,
        }, true);
      }
      if (response.status === 432 || response.status === 433) {
        throw new ProviderError('Quota Tavily dépassé pour cette clé (432/433).', {
          provider: 'tavily',
          status: response.status,
        });
      }
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new ProviderError(`Erreur Tavily ${response.status}.`, {
          provider: 'tavily',
          status: response.status,
          body: redactApiKey(text.slice(0, 500), apiKey),
        }, response.status >= 500);
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError(`Tavily n'a pas répondu dans les ${timeoutMs}ms.`, {
          provider: 'tavily',
        }, true);
      }
      throw new ProviderError(
        redactApiKey(error instanceof Error ? error.message : 'Échec de la requête Tavily.', apiKey),
        { provider: 'tavily' },
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
