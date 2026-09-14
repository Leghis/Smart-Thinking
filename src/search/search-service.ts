import { createHash } from 'node:crypto';
import { LIMITS, CACHE_TTL_MS } from '../constants';
import { extractKeywords } from '../keywords';
import { ProviderError, ProviderNotConfiguredError } from '../errors';
import {
  TavilyClient,
  type TavilyAnswerMode,
  type TavilyCrawlResult,
  type TavilyExtractResult,
  type TavilyMapResponse,
  type TavilyRawContentMode,
  type TavilyResearchResult,
  type TavilySearchResponse,
  type TavilyTimeRange,
  type TavilyTopic,
} from './tavily-client';
import { fetchUrlContent, type FetchUrlOptions } from './url-content';
import type {
  SearchConfig,
  SearchDepth,
  SearchProviderName,
  SearchProviderPreference,
  UrlContent,
  WebSearchResponse,
  WebSearchResult,
} from '../types';

export interface SearchServiceOptions {
  envApiKey?: string;
  defaultProvider?: SearchProviderPreference;
  defaultDepth?: SearchDepth;
  timeoutMs?: number;
  allowPrivateHosts?: boolean;
}

export interface WebSearchRequest {
  query: string;
  maxResults?: number;
  searchDepth?: SearchDepth | 'fast' | 'ultra-fast';
  provider?: SearchProviderPreference;
  tavilyApiKey?: string;
  includeAnswer?: TavilyAnswerMode;
  topic?: TavilyTopic;
  timeRange?: TavilyTimeRange;
  includeDomains?: string[];
  excludeDomains?: string[];
  includeRawContent?: TavilyRawContentMode;
  chunksPerSource?: number;
  country?: string;
  safeSearch?: boolean;
}

export interface SiteCrawlRequest {
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
  tavilyApiKey?: string;
  sessionConfig?: SearchConfig;
}

interface CacheEntry {
  expiresAt: number;
  response: WebSearchResponse;
}

const NATIVE_INSTRUCTION =
  'Aucun moteur de recherche serveur n\'est configuré. Effectuez cette recherche avec votre propre outil de navigation web natif, puis ingérez les résultats avec smartthinking ou web_search(provider="results"). Ne prétendez pas que la recherche a été exécutée côté serveur.';

export function hashId(prefix: string, value: string): string {
  return `${prefix}-${createHash('sha1').update(value).digest('hex').slice(0, 16)}`;
}

export function buildSearchQueries(text: string, maxQueries = 2): string[] {
  const keywords = extractKeywords(text);
  if (keywords.length === 0) {
    return [];
  }
  const queries = new Set<string>();
  queries.add(keywords.slice(0, 6).join(' '));
  if (keywords.length > 6) {
    queries.add(keywords.slice(0, 10).join(' '));
  }
  if (maxQueries > 0 && keywords.length >= 3) {
    queries.add(`${keywords[0]} ${keywords[1]}`);
  }
  return Array.from(queries).slice(0, Math.max(maxQueries, 1));
}

export class SearchService {
  private readonly tavily: TavilyClient;
  private readonly defaultProvider: SearchProviderPreference;
  private readonly defaultDepth: SearchDepth;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly timeoutMs: number;
  private readonly allowPrivateHosts: boolean;

  constructor(options: SearchServiceOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? LIMITS.WEB_REQUEST_TIMEOUT_MS;
    this.tavily = new TavilyClient({ envApiKey: options.envApiKey, timeoutMs: this.timeoutMs });
    this.defaultProvider = options.defaultProvider ?? 'auto';
    this.defaultDepth = options.defaultDepth ?? 'basic';
    this.allowPrivateHosts = options.allowPrivateHosts ?? false;
  }

  isTavilyConfigured(sessionKey?: string): boolean {
    return this.tavily.isConfigured(sessionKey);
  }

  resolveProvider(
    preference: SearchProviderPreference | undefined,
    sessionConfig?: SearchConfig,
    overrideKey?: string,
  ): SearchProviderName {
    const effective = preference ?? sessionConfig?.provider ?? this.defaultProvider;
    const hasKey = this.tavily.isConfigured(overrideKey ?? sessionConfig?.tavilyApiKey);

    switch (effective) {
      case 'tavily':
        return hasKey ? 'tavily' : 'none';
      case 'native':
        return 'native';
      case 'off':
        return 'none';
      case 'auto':
      default:
        return hasKey ? 'tavily' : 'native';
    }
  }

  async webSearch(
    request: WebSearchRequest,
    sessionConfig?: SearchConfig,
  ): Promise<WebSearchResponse> {
    const query = request.query.trim();
    const provider = this.resolveProvider(request.provider, sessionConfig, request.tavilyApiKey);
    const maxResults = Math.min(Math.max(request.maxResults ?? 5, 1), LIMITS.MAX_SEARCH_RESULTS);

    if (provider === 'none') {
      return {
        provider: 'none',
        query,
        results: [],
        requiresClientAction: false,
        instruction: 'Recherche web désactivée ou non configurée. Ajoutez une clé Tavily via session(action="configure_search") ou TAVILY_API_KEY.',
      };
    }

    if (provider === 'native') {
      return {
        provider: 'native',
        query,
        results: [],
        requiresClientAction: true,
        instruction: NATIVE_INSTRUCTION,
        searchQueries: [query],
      };
    }

    const apiKey = request.tavilyApiKey ?? sessionConfig?.tavilyApiKey;
    const depth = request.searchDepth ?? sessionConfig?.searchDepth ?? this.defaultDepth;
    const cacheKey = hashId(
      'search',
      JSON.stringify({
        provider,
        depth,
        maxResults,
        query: query.toLowerCase(),
        topic: request.topic,
        timeRange: request.timeRange,
        includeDomains: request.includeDomains,
        excludeDomains: request.excludeDomains,
        raw: request.includeRawContent,
        country: request.country,
      }),
    );
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return { ...cached.response, cached: true };
    }

    let response: TavilySearchResponse;
    try {
      response = await this.tavily.search({
        query,
        maxResults,
        searchDepth: depth,
        includeAnswer: request.includeAnswer ?? false,
        apiKey: apiKey ?? undefined,
        topic: request.topic,
        timeRange: request.timeRange,
        includeDomains: request.includeDomains,
        excludeDomains: request.excludeDomains,
        includeRawContent: request.includeRawContent,
        chunksPerSource: request.chunksPerSource,
        country: request.country,
        safeSearch: request.safeSearch,
      });
    } catch (error) {
      if (error instanceof ProviderError || error instanceof ProviderNotConfiguredError) {
        return {
          provider: 'native',
          query,
          results: [],
          requiresClientAction: true,
          instruction: `${NATIVE_INSTRUCTION} (Raison: ${error.message})`,
          searchQueries: [query],
        };
      }
      throw error;
    }

    const result: WebSearchResponse = {
      provider: 'tavily',
      query,
      results: this.mapResults(response.results, 'tavily'),
      answer: response.answer,
    };

    this.cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS.SEARCH, response: result });
    this.pruneCache();
    return result;
  }

  async crawlSite(request: SiteCrawlRequest): Promise<{
    baseUrl: string;
    pages: Array<{ url: string; content: string }>;
    truncated: boolean;
  }> {
    const results: TavilyCrawlResult[] = await this.tavily.crawl({
      url: request.url,
      instructions: request.instructions,
      maxDepth: request.maxDepth,
      maxBreadth: request.maxBreadth,
      limit: request.limit,
      selectPaths: request.selectPaths,
      excludePaths: request.excludePaths,
      allowExternal: request.allowExternal,
      extractDepth: request.extractDepth,
      format: request.format,
      apiKey: request.tavilyApiKey ?? request.sessionConfig?.tavilyApiKey,
    });

    let remaining = LIMITS.MAX_FETCH_CHARS;
    const pages = results.map(page => {
      const content = page.content.length > remaining ? page.content.slice(0, Math.max(remaining, 0)) : page.content;
      remaining -= content.length;
      return { url: page.url, content };
    });

    return { baseUrl: request.url, pages, truncated: remaining <= 0 };
  }

  async mapSite(request: SiteCrawlRequest): Promise<TavilyMapResponse> {
    return this.tavily.map({
      url: request.url,
      instructions: request.instructions,
      maxDepth: request.maxDepth,
      maxBreadth: request.maxBreadth,
      limit: request.limit,
      selectPaths: request.selectPaths,
      excludePaths: request.excludePaths,
      allowExternal: request.allowExternal,
      apiKey: request.tavilyApiKey ?? request.sessionConfig?.tavilyApiKey,
    });
  }

  async fetchUrl(url: string, apiKeyOverride?: string): Promise<UrlContent> {
    if (this.tavily.isConfigured(apiKeyOverride)) {
      try {
        const extracted = await this.tavily.extract([url], { apiKey: apiKeyOverride });
        const page = extracted[0];
        if (page) {
          const truncated = page.content.length > LIMITS.MAX_FETCH_CHARS;
          return {
            url: page.url,
            text: truncated ? page.content.slice(0, LIMITS.MAX_FETCH_CHARS) : page.content,
            truncated,
            retrievedAt: new Date().toISOString(),
          };
        }
      } catch {
        // Fall back to the direct fetch below.
      }
    }

    return fetchUrlContent(url, {
      maxChars: LIMITS.MAX_FETCH_CHARS,
      timeoutMs: this.timeoutMs,
      allowPrivateHosts: this.allowPrivateHosts,
    } satisfies FetchUrlOptions);
  }

  async tavilyResearch(
    input: string,
    options: { model?: 'mini' | 'pro' | 'auto'; outputLength?: 'short' | 'standard' | 'long' } = {},
    apiKeyOverride?: string,
  ): Promise<TavilyResearchResult> {
    if (!this.tavily.isConfigured(apiKeyOverride)) {
      throw new ProviderNotConfiguredError('tavily');
    }
    return this.tavily.research({
      input,
      model: options.model,
      outputLength: options.outputLength,
      apiKey: apiKeyOverride,
    });
  }

  async extractWithTavily(urls: string[], apiKeyOverride?: string): Promise<TavilyExtractResult[]> {
    const results = await this.tavily.extract(urls, { apiKey: apiKeyOverride });
    if (results.length === 0) {
      throw new ProviderError('Tavily extract n\'a renvoyé aucun contenu.', { urls });
    }
    return results;
  }

  private mapResults(
    results: Array<{
      title: string;
      url: string;
      content: string;
      score?: number;
      publishedDate?: string;
      rawContent?: string;
    }>,
    source: 'tavily' | 'native',
  ): WebSearchResult[] {
    return results.map(entry => ({
      id: hashId('web', entry.url),
      title: entry.title,
      url: entry.url,
      text: entry.rawContent && entry.rawContent.length > entry.content.length ? entry.rawContent : entry.content,
      score: entry.score,
      publishedDate: entry.publishedDate,
      source,
    }));
  }

  private pruneCache(): void {
    if (this.cache.size <= 256) {
      return;
    }
    const now = Date.now();
    for (const [key, entry] of this.cache) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
      }
    }
    while (this.cache.size > 256) {
      const oldest = this.cache.keys().next().value;
      if (oldest === undefined) {
        break;
      }
      this.cache.delete(oldest);
    }
  }
}
