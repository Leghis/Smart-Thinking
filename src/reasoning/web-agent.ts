/**
 * Autonomous web research agent (server-side loop).
 *
 * decompose → search → dedupe → extract → evidence with per-source stance →
 * cross-check by independent domain → cited candidates + contradictions.
 *
 * Everything is bounded: credits per session, sources, rounds. When a provider
 * refuses (quota, auth, rate limit) the agent returns what it already collected
 * and says so — it never fabricates a result.
 */
import { extractKeywords } from '../keywords';
import { hashId, type SearchService } from '../search/search-service';
import { classifyProviderFailure, type Degradation, type DegradationReason } from '../search/provider-status';
import { classifyStanceFromKeywords } from '../search/stance';
import {
  EXTRACT_BATCH_SIZE,
  WEB_CREDIT_COSTS,
  WebCreditLedger,
} from '../search/web-budget';
import type {
  EvidenceItem,
  SearchConfig,
  SearchProviderPreference,
  WebSearchResult,
} from '../types';
import { assistDecompose, type AssistClient } from './assist';

export interface WebAgentOptions {
  maxSources?: number;
  maxRounds?: number;
  maxCredits?: number;
  includeDomains?: string[];
  excludeDomains?: string[];
  timeRange?: 'day' | 'week' | 'month' | 'year';
  tavilyApiKey?: string;
  provider?: SearchProviderPreference;
}

export interface WebAgentDeps {
  searchService: SearchService;
  credits: WebCreditLedger;
  sessionId: string;
  sessionConfig?: SearchConfig;
  assist?: AssistClient;
}

export interface WebAgentSource {
  url: string;
  title: string;
  domain: string;
  score?: number;
  publishedDate?: string;
  extracted: boolean;
  textLength: number;
}

export interface WebAgentAnswerCandidate {
  text: string;
  score: number;
  domains: string[];
  sources: string[];
}

export interface WebAgentResult {
  question: string;
  subQuestions: string[];
  rounds: number;
  provider: 'tavily' | 'native' | 'none';
  sources: WebAgentSource[];
  evidence: EvidenceItem[];
  answerCandidates: WebAgentAnswerCandidate[];
  contradictions: string[];
  citations: string[];
  discardedNeutral: number;
  creditsUsed: number;
  creditsRemaining: number;
  diagnostics: {
    sourcesFetched: number;
    pagesExtracted: number;
    sentencesScanned: number;
    sentencesKept: number;
    discardedNeutral: number;
  };
  /** No usable evidence was produced: never let this look like a success. */
  empty?: true;
  emptyReason?: 'no_results' | 'no_relevant_sentence' | 'extraction_failed';
  hint?: string;
  degraded?: true;
  degradedReason?: DegradationReason;
  degradedDetail?: string;
  truncated?: true;
  truncationReason?: 'session_budget' | 'call_budget';
  requiresClientAction?: boolean;
  instruction?: string;
}

const MAX_SOURCES_CAP = 20;
const MAX_ROUNDS_CAP = 4;
const RESULTS_PER_QUERY = 5;
const MAX_PER_DOMAIN = 2;
const MAX_SENTENCES_PER_SOURCE = 3;
const MAX_CANDIDATES = 5;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;
/** Navigation, paywall and boilerplate fragments carry no evidence. */
const BOILERPLATE_PATTERN =
  /(\bmin de lecture\b|\bmis à jour le\b|\bpartager\b|\bs'abonner\b|\bnewsletter\b|\bcookies?\b|\bà lire aussi\b|\bvoir plus\b|\ben continuer\b|\[[^\]]*\]\([^)]*\))/i;
const NATIVE_INSTRUCTION =
  'Aucun moteur de recherche serveur n\'est configuré. Exécutez cette recherche avec votre propre outil de navigation web natif, puis ingérez les résultats avec smartthinking ou web_search(provider="results"). Ne prétendez pas que la recherche a été exécutée côté serveur.';

export function domainOf(url: string): string {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return hostname.startsWith('www.') ? hostname.slice(4) : hostname;
  } catch {
    return url.toLowerCase();
  }
}

function clampInt(value: number | undefined, fallback: number, cap: number): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(1, Math.min(Math.floor(value as number), cap));
}

/**
 * Deterministic decomposition used when no assist model is configured: the
 * question itself plus angle variants derived from its own keywords.
 */
export function heuristicSubQuestions(question: string, maxRounds: number): string[] {
  const compact = question.replace(/\s+/g, ' ').trim();
  const subject = extractKeywords(question).slice(0, 6).join(' ');
  const variants = [compact];
  if (subject) {
    variants.push(`${subject} chiffres officiels 2025 2026`);
    variants.push(`${subject} source officielle institution`);
    variants.push(`${subject} limites critiques controverses`);
  }
  return Array.from(new Set(variants.filter(Boolean))).slice(0, maxRounds);
}

function toSentences(text: string): string[] {
  return text
    .split(SENTENCE_SPLIT)
    .map(sentence => sentence.replace(/\s+/g, ' ').trim())
    .filter(
      sentence =>
        sentence.length >= 20 &&
        sentence.length <= 400 &&
        !BOILERPLATE_PATTERN.test(sentence),
    );
}

interface SentenceHit {
  text: string;
  source: WebSearchResult;
  domain: string;
  matches: number;
}

function tokenSet(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^\p{L}\p{N}]+/u)
      .filter(token => token.length > 3),
  );
}

const FIGURE_PATTERN = /\b\d+(?:[.,]\d+)?\s?(?:%|pour ?cent|milliards?|millions?|twh|gwh|kwh)?\b/gi;

/** Distinctive figures quoted by a sentence (used to corroborate across wordings). */
function figuresOf(text: string): Set<string> {
  const figures = new Set<string>();
  for (const match of text.matchAll(FIGURE_PATTERN)) {
    const normalized = match[0].replace(/\s+/g, '').toLowerCase();
    // Years alone are not discriminating enough.
    if (/^\d{4}$/.test(normalized) && Number(normalized) > 1900 && Number(normalized) < 2100) {
      continue;
    }
    if (normalized.length > 1) {
      figures.add(normalized);
    }
  }
  return figures;
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const token of a) {
    if (b.has(token)) {
      shared += 1;
    }
  }
  return shared / Math.min(a.size, b.size);
}

/** Group near-duplicate sentences and score each group by independent domains. */
export function clusterCandidates(hits: SentenceHit[]): WebAgentAnswerCandidate[] {
  const clusters: Array<{ tokens: Set<string>; figures: Set<string>; hits: SentenceHit[] }> = [];
  for (const hit of hits) {
    const tokens = tokenSet(hit.text);
    const figures = figuresOf(hit.text);
    const questionKeywords = extractKeywords(hit.text);
    const existing = clusters.find(cluster => {
      if (similarity(cluster.tokens, tokens) >= 0.6) {
        return true;
      }
      // Same figure + shared vocabulary: two outlets reporting the same number.
      const sharedFigures = Array.from(figures).filter(figure => cluster.figures.has(figure));
      if (sharedFigures.length === 0) {
        return false;
      }
      const sharedKeywords = questionKeywords.filter(keyword => cluster.tokens.has(keyword));
      return sharedKeywords.length >= 1 || sharedFigures.length >= 2;
    });
    if (existing) {
      existing.hits.push(hit);
      for (const figure of figures) {
        existing.figures.add(figure);
      }
    } else {
      clusters.push({ tokens, figures, hits: [hit] });
    }
  }
  return clusters
    .map(cluster => {
      const best = [...cluster.hits].sort((a, b) => b.matches - a.matches)[0];
      const domains = Array.from(new Set(cluster.hits.map(hit => hit.domain)));
      return {
        text: best.text,
        score: domains.length + Math.min(cluster.hits.length, 4) * 0.1,
        domains,
        sources: Array.from(new Set(cluster.hits.map(hit => hit.source.url))),
      };
    })
    .sort((a, b) => b.score - a.score || b.text.length - a.text.length)
    .slice(0, MAX_CANDIDATES);
}

export async function runWebAgent(
  question: string,
  deps: WebAgentDeps,
  options: WebAgentOptions = {},
): Promise<WebAgentResult> {
  const { searchService, credits, sessionId } = deps;
  const maxSources = clampInt(options.maxSources, 8, MAX_SOURCES_CAP);
  const maxRounds = clampInt(options.maxRounds, 2, MAX_ROUNDS_CAP);
  const budget = Number.isFinite(options.maxCredits)
    ? Math.max(1, Math.floor(options.maxCredits as number))
    : credits.creditLimit;

  const providerPreference = options.provider ?? deps.sessionConfig?.provider;
  const apiKey = options.tavilyApiKey ?? deps.sessionConfig?.tavilyApiKey;
  const resolvedProvider = searchService.resolveProvider(providerPreference, deps.sessionConfig, apiKey);
  const provider: 'tavily' | 'native' | 'none' =
    resolvedProvider === 'tavily' ? 'tavily' : resolvedProvider === 'none' ? 'none' : 'native';

  const base: WebAgentResult = {
    question,
    subQuestions: [question],
    rounds: 0,
    provider,
    sources: [],
    evidence: [],
    answerCandidates: [],
    contradictions: [],
    citations: [],
    discardedNeutral: 0,
    creditsUsed: credits.used(sessionId),
    creditsRemaining: credits.remaining(sessionId),
    diagnostics: {
      sourcesFetched: 0,
      pagesExtracted: 0,
      sentencesScanned: 0,
      sentencesKept: 0,
      discardedNeutral: 0,
    },
  };

  if (provider !== 'tavily') {
    return {
      ...base,
      subQuestions: heuristicSubQuestions(question, maxRounds),
      requiresClientAction: provider === 'native',
      instruction:
        provider === 'native'
          ? NATIVE_INSTRUCTION
          : 'Recherche web désactivée ou sans clé Tavily : configurez une clé via session(action="configure_search").',
    } as WebAgentResult;
  }

  let degradation: Degradation | undefined;
  let sessionBudgetHit = false;
  let callBudgetHit = false;
  let usedInRun = 0;
  const spend = (creditsToSpend: number): boolean => {
    if (!credits.canAfford(sessionId, creditsToSpend)) {
      sessionBudgetHit = true;
      return false;
    }
    if (usedInRun + creditsToSpend > budget) {
      // The per-call cap is not an exhausted budget: say which one bit.
      callBudgetHit = true;
      return false;
    }
    credits.charge(sessionId, creditsToSpend);
    usedInRun += creditsToSpend;
    return true;
  };
  const truncated = () => sessionBudgetHit || callBudgetHit;

  // 1. Decomposition (assist model when available, deterministic otherwise).
  let subQuestions = heuristicSubQuestions(question, maxRounds);
  if (deps.assist?.available) {
    try {
      const decomposed = await assistDecompose(deps.assist, question);
      if (decomposed?.subQuestions?.length) {
        subQuestions = decomposed.subQuestions.slice(0, maxRounds);
      }
    } catch {
      // Decomposition is best-effort: keep the deterministic one.
    }
  }

  // 2. Search each sub-question, deduplicating URLs and limiting each domain.
  const byUrl = new Map<string, WebSearchResult>();
  const perDomain = new Map<string, number>();
  let rounds = 0;
  for (const subQuestion of subQuestions) {
    if (degradation || truncated()) {
      break;
    }
    if (!spend(WEB_CREDIT_COSTS.search)) {
      break;
    }
    try {
      const response = await searchService.webSearch(
        {
          query: subQuestion,
          maxResults: RESULTS_PER_QUERY,
          provider: 'tavily',
          tavilyApiKey: apiKey,
          includeDomains: options.includeDomains,
          excludeDomains: options.excludeDomains,
          timeRange: options.timeRange,
        },
        deps.sessionConfig,
      );
      rounds += 1;
      for (const result of response.results) {
        const domain = domainOf(result.url);
        const count = perDomain.get(domain) ?? 0;
        if (byUrl.has(result.url) || count >= MAX_PER_DOMAIN) {
          continue;
        }
        byUrl.set(result.url, result);
        perDomain.set(domain, count + 1);
      }
    } catch (error) {
      degradation = classifyProviderFailure(error);
      break;
    }
  }

  const selected = Array.from(byUrl.values())
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxSources);

  // 3. Extract full pages (batch of 5 ≈ 1 credit), falling back to snippets.
  const extracted = new Map<string, string>();
  for (let index = 0; index < selected.length; index += EXTRACT_BATCH_SIZE) {
    if (degradation || truncated()) {
      break;
    }
    const batch = selected.slice(index, index + EXTRACT_BATCH_SIZE);
    if (!spend(WEB_CREDIT_COSTS.extractBatch)) {
      break;
    }
    try {
      const pages = await searchService.extractWithTavily(
        batch.map(entry => entry.url),
        apiKey,
      );
      for (const page of pages) {
        if (page.url && page.content) {
          extracted.set(page.url, page.content);
        }
      }
    } catch (error) {
      degradation = classifyProviderFailure(error);
      break;
    }
  }

  // 4. Sentence-level evidence with an explicit per-source stance.
  const questionKeywords = new Set(extractKeywords(question));
  const hits: SentenceHit[] = [];
  const evidence: EvidenceItem[] = [];
  const contradictions: string[] = [];
  let discardedNeutral = 0;

  let sentencesScanned = 0;
  for (const source of selected) {
    const content = extracted.get(source.url) ?? source.text;
    const domain = domainOf(source.url);
    const sentences = toSentences(content ?? '');
    sentencesScanned += sentences.length;
    const scored = sentences
      .map(sentence => ({
        sentence,
        matches: extractKeywords(sentence).filter(keyword => questionKeywords.has(keyword)).length,
      }))
      .filter(entry => entry.matches >= 2)
      .sort((a, b) => b.matches - a.matches)
      .slice(0, MAX_SENTENCES_PER_SOURCE);

    for (const entry of scored) {
      const stance = classifyStanceFromKeywords(questionKeywords, entry.sentence);
      if (stance === 'neutral') {
        discardedNeutral += 1;
        continue;
      }
      hits.push({ text: entry.sentence, source, domain, matches: entry.matches });
      evidence.push({
        id: hashId('web', `${source.url}#${hits.length}`),
        claim: question,
        quote: entry.sentence,
        sourceType: 'web',
        source: source.url,
        title: source.title,
        stance,
        confidence: stance === 'supports' ? 0.6 : 0.5,
        retrievedAt: new Date().toISOString(),
      });
      if (stance === 'contradicts') {
        contradictions.push(`Source opposée : ${source.title} (${source.url})`);
      }
    }
  }

  const answerCandidates = clusterCandidates(hits);
  const citations = Array.from(new Set(answerCandidates.flatMap(candidate => candidate.sources)));
  const pagesExtracted = extracted.size;
  const emptyReason: WebAgentResult['emptyReason'] =
    selected.length === 0
      ? 'no_results'
      : sentencesScanned === 0
        ? 'extraction_failed'
        : 'no_relevant_sentence';
  // A degraded run already explains itself; a clean run that produced nothing
  // must say so explicitly instead of looking like a success.
  const isEmpty = evidence.length === 0 && !degradation;

  return {
    ...base,
    subQuestions,
    rounds,
    sources: selected.map(source => ({
      url: source.url,
      title: source.title,
      domain: domainOf(source.url),
      score: source.score,
      publishedDate: source.publishedDate,
      extracted: extracted.has(source.url),
      textLength: (extracted.get(source.url) ?? source.text ?? '').length,
    })),
    evidence,
    answerCandidates,
    contradictions: Array.from(new Set(contradictions)),
    citations,
    discardedNeutral,
    creditsUsed: credits.used(sessionId),
    creditsRemaining: credits.remaining(sessionId),
    diagnostics: {
      sourcesFetched: selected.length,
      pagesExtracted,
      sentencesScanned,
      sentencesKept: evidence.length,
      discardedNeutral,
    },
    ...(isEmpty
      ? {
          empty: true as const,
          emptyReason,
          hint:
            emptyReason === 'no_results'
              ? 'Aucun résultat de recherche exploitable : reformulez la question ou élargissez les domaines.'
              : emptyReason === 'extraction_failed'
                ? 'Les pages n\'ont pas pu être extraites : réessayez avec fetch sur une URL précise, ou vérifiez la clé/quota Tavily.'
                : 'Des pages ont été lues mais aucune phrase ne soutient ou ne contredit la question : précisez la question ou fournissez une entité/un chiffre attendu.',
        }
      : {}),
    ...(degradation
      ? {
          degraded: true as const,
          degradedReason: degradation.reason,
          degradedDetail: degradation.detail,
        }
      : {}),
    ...(truncated()
      ? {
          truncated: true as const,
          truncationReason: sessionBudgetHit ? ('session_budget' as const) : ('call_budget' as const),
        }
      : {}),
  };
}
