import { extractKeywords } from '../keywords';
import type { EvidenceItem, SearchConfig } from '../types';
import type { TavilyAnswerMode } from '../search/tavily-client';
import type { SearchService } from '../search/search-service';
import { hashId } from '../search/search-service';
import type { AssistClient } from './assist';
import { assistDecompose } from './assist';

export interface ResearchOptions {
  maxHops?: number;
  maxSources?: number;
  sessionId?: string;
  tavilyApiKey?: string;
  includeAnswer?: TavilyAnswerMode;
}

export interface ResearchDeps {
  searchService: SearchService;
  assist?: AssistClient;
  sessionConfig?: SearchConfig;
}

export interface ResearchAnswerCandidate {
  text: string;
  score: number;
  sources: string[];
}

export interface ResearchResult {
  question: string;
  subQuestions: string[];
  evidence: EvidenceItem[];
  answerCandidates: ResearchAnswerCandidate[];
  citations: string[];
  hops: number;
  provider: 'tavily' | 'native' | 'none';
  requiresClientAction?: boolean;
  instruction?: string;
}

const MAX_SOURCES = 8;
const SENTENCE_SPLIT = /(?<=[.!?])\s+/;

function cleanSentence(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function isCapitalizedEntity(value: string): boolean {
  return /^[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][a-zàâäéèêëîïôöùûüç'-]+$/.test(value);
}

function extractSideEntities(snippet: string, questionKeywords: Set<string>): string[] {
  const tokens = snippet.match(/\b[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ'-]{2,}\b/g) ?? [];
  const entities = new Set<string>();
  for (const token of tokens) {
    if (!isCapitalizedEntity(token)) {
      continue;
    }
    if (questionKeywords.has(token.toLowerCase())) {
      continue;
    }
    entities.add(token);
  }
  return Array.from(entities).slice(0, 4);
}

function extractiveCandidates(
  question: string,
  snippet: string,
  questionKeywords: Set<string>,
): Array<{ text: string; score: number }> {
  const results: Array<{ text: string; score: number }> = [];
  for (const rawSentence of snippet.split(SENTENCE_SPLIT)) {
    const sentence = cleanSentence(rawSentence);
    if (sentence.length < 20 || sentence.length > 400) {
      continue;
    }
    const lower = sentence.toLowerCase();
    const overlap = Array.from(questionKeywords).filter(keyword => lower.includes(keyword)).length;
    if (overlap < 2) {
      continue;
    }
    const hasNumber = /\d/.test(sentence);
    const hasEntity = /\b[A-ZÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ][\wÀ-ÿ'-]{2,}\b/.test(sentence);
    const score = overlap / Math.max(questionKeywords.size, 1) + (hasNumber ? 0.2 : 0) + (hasEntity ? 0.05 : 0);
    results.push({ text: sentence, score: Number(score.toFixed(4)) });
  }
  return results;
}

export async function deepResearch(
  question: string,
  deps: ResearchDeps,
  options: ResearchOptions = {},
): Promise<ResearchResult> {
  const maxHops = Math.max(1, Math.min(options.maxHops ?? 2, 4));
  const maxSources = Math.max(1, Math.min(options.maxSources ?? MAX_SOURCES, 20));
  const tavilyApiKey = options.tavilyApiKey ?? deps.sessionConfig?.tavilyApiKey;

  const provider = deps.searchService.resolveProvider(
    deps.sessionConfig?.provider,
    deps.sessionConfig,
    tavilyApiKey,
  );

  const questionKeywords = new Set(extractKeywords(question));
  const baseQueries = buildQueries(question);

  if (provider === 'native' || provider === 'none') {
    return {
      question,
      subQuestions: [question],
      evidence: [],
      answerCandidates: [],
      citations: [],
      hops: 0,
      provider,
      requiresClientAction: provider === 'native',
      instruction:
        provider === 'native'
          ? 'Aucun moteur serveur configuré : exécutez ces requêtes avec votre recherche native, puis fournissez les extraits à verify.'
          : 'Recherche web désactivée ou sans clé Tavily.',
    };
  }

  const decomposition = deps.assist ? await safeDecompose(deps.assist, question) : null;
  const subQuestions = decomposition?.subQuestions?.length
    ? decomposition.subQuestions.slice(0, 4)
    : [question];
  const pendingQueries = new Set<string>(
    (decomposition?.searchQueries?.length ? decomposition.searchQueries : baseQueries).slice(0, 6),
  );

  const evidence: EvidenceItem[] = [];
  const candidateMap = new Map<string, ResearchAnswerCandidate>();
  const seenUrls = new Set<string>();

  const addCandidate = (text: string, score: number, source: string): void => {
    const key = text.toLowerCase().replace(/\s+/g, ' ').trim();
    if (key.length < 2) {
      return;
    }
    const existing = candidateMap.get(key);
    if (existing) {
      existing.score = Math.max(existing.score, score);
      if (!existing.sources.includes(source)) {
        existing.sources.push(source);
      }
      return;
    }
    candidateMap.set(key, { text: cleanSentence(text), score, sources: [source] });
  };

  let hops = 0;
  const bridgeCandidates = new Set<string>();

  while (hops < maxHops && pendingQueries.size > 0 && evidence.length < maxSources * maxHops) {
    const queries = Array.from(pendingQueries).slice(0, 4);
    pendingQueries.clear();
    hops += 1;

    for (const query of queries) {
      let response;
      try {
        response = await deps.searchService.webSearch(
          {
            query,
            maxResults: 6,
            searchDepth: 'advanced',
            includeAnswer: options.includeAnswer ?? 'basic',
            tavilyApiKey,
          },
          deps.sessionConfig,
        );
      } catch {
        continue;
      }

      if (response.answer) {
        addCandidate(response.answer, 0.9, 'tavily:answer');
      }

      for (const result of response.results) {
        if (seenUrls.size >= maxSources * maxHops) {
          break;
        }
        const evidenceId = result.id || hashId('web', result.url);
        if (!seenUrls.has(result.url)) {
          seenUrls.add(result.url);
          evidence.push({
            id: evidenceId,
            claim: question,
            quote: result.text.slice(0, 500),
            sourceType: 'web',
            source: result.url,
            title: result.title,
            stance: 'neutral',
            confidence: 0.55,
            retrievedAt: new Date().toISOString(),
          });
        }

        for (const candidate of extractiveCandidates(question, result.text, questionKeywords)) {
          addCandidate(candidate.text, candidate.score, result.url);
        }

        if (hops < maxHops) {
          for (const entity of extractSideEntities(`${result.title} ${result.text}`, questionKeywords)) {
            bridgeCandidates.add(entity);
          }
        }
      }
    }

    if (hops < maxHops && bridgeCandidates.size > 0) {
      const anchor = Array.from(questionKeywords).slice(0, 3).join(' ');
      for (const entity of Array.from(bridgeCandidates).slice(0, 4)) {
        pendingQueries.add(`${entity} ${anchor}`.trim());
      }
      bridgeCandidates.clear();
    }
  }

  const answerCandidates = Array.from(candidateMap.values())
    .sort((a, b) => b.score - a.score || a.text.length - b.text.length)
    .slice(0, 8);

  return {
    question,
    subQuestions,
    evidence,
    answerCandidates,
    citations: Array.from(seenUrls),
    hops,
    provider: 'tavily',
  };
}

function buildQueries(question: string): string[] {
  const keywords = extractKeywords(question);
  if (keywords.length === 0) {
    return [question.slice(0, 200)];
  }
  const queries = new Set<string>();
  queries.add(keywords.slice(0, 6).join(' '));
  if (keywords.length > 6) {
    queries.add(keywords.slice(0, 10).join(' '));
  }
  return Array.from(queries);
}

async function safeDecompose(
  assist: AssistClient,
  question: string,
): Promise<{ subQuestions: string[]; searchQueries: string[] } | null> {
  try {
    const result = await assistDecompose(assist, question);
    if (!result) {
      return null;
    }
    return {
      subQuestions: Array.isArray(result.subQuestions)
        ? result.subQuestions.filter(item => typeof item === 'string')
        : [],
      searchQueries: Array.isArray(result.searchQueries)
        ? result.searchQueries.filter(item => typeof item === 'string')
        : [],
    };
  } catch {
    return null;
  }
}
