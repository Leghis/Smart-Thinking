import { createHash } from 'node:crypto';
import { MathEvaluator } from '../utils/math-evaluator';
import { VerificationMemory } from '../verification-memory';
import { SearchService } from '../search/search-service';
import { extractKeywords } from '../keywords';
import {
  evaluateVerificationHeuristics,
  determineVerificationRequirements,
} from '../verification-needs';
import { PATTERNS, SIMILARITY_THRESHOLDS } from '../constants';
import type {
  CalculationVerificationResult,
  EvidenceItem,
  EvidenceStance,
  ThoughtNode,
  VerificationCheck,
  VerificationDetailedStatus,
  VerificationResult,
  VerificationStatus,
  WebSearchResult,
} from '../types';
import { assistJudge, type AssistClient, type JudgeResult } from '../reasoning/assist';
import type {
  ClaimVerificationRequest,
  IVerificationService,
  PreliminaryVerificationResult,
  PreviousVerificationResult,
  VerificationStoreExtras,
} from './verification-service.interface';

export interface VerificationServiceOptions {
  verificationMemory: VerificationMemory;
  searchService?: SearchService;
  enableWebVerification?: boolean;
  cacheMaxEntries?: number;
  offline?: boolean;
  assist?: AssistClient;
}

interface CacheEntry {
  expiresAt: number;
  result: VerificationResult;
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_CACHE_MAX = 256;

export class VerificationService implements IVerificationService {
  private readonly verificationMemory: VerificationMemory;
  private readonly searchService?: SearchService;
  private readonly enableWebVerification: boolean;
  private readonly cacheMaxEntries: number;
  private readonly offline: boolean;
  private readonly assist?: AssistClient;
  private readonly cache = new Map<string, CacheEntry>();

  constructor(options: VerificationServiceOptions) {
    this.verificationMemory = options.verificationMemory;
    this.searchService = options.searchService;
    this.enableWebVerification = options.enableWebVerification ?? true;
    this.cacheMaxEntries = options.cacheMaxEntries ?? DEFAULT_CACHE_MAX;
    this.offline = options.offline ?? false;
    this.assist = options.assist;
  }

  async performPreliminaryVerification(
    content: string,
    explicitlyRequested: boolean = false,
  ): Promise<PreliminaryVerificationResult> {
    const containsMath = PATTERNS.MATH_CALCULATION.test(content) || explicitlyRequested;
    let verifiedCalculations: CalculationVerificationResult[] | undefined;

    if (containsMath) {
      verifiedCalculations = await this.detectAndVerifyCalculations(content);
      if (verifiedCalculations.length === 0) {
        verifiedCalculations = undefined;
      }
    }

    const preverifiedThought = verifiedCalculations
      ? this.annotateThoughtWithVerifications(content, verifiedCalculations)
      : content;

    return {
      verifiedCalculations,
      initialVerification: Boolean(verifiedCalculations),
      verificationInProgress: false,
      preverifiedThought,
    };
  }

  async checkPreviousVerification(
    content: string,
    sessionId?: string,
    _thoughtType?: string,
    _connectedThoughtIds?: string[],
  ): Promise<PreviousVerificationResult> {
    const previous = await this.verificationMemory.findVerification(
      content,
      sessionId,
      SIMILARITY_THRESHOLDS.HIGH,
    );

    if (!previous) {
      return {
        previousVerification: null,
        isVerified: false,
        verificationStatus: 'unverified',
        certaintySummary: 'Aucune vérification antérieure trouvée pour cette pensée.',
      };
    }

    const checks = previous.checks ?? [];
    const evidence = previous.evidence ?? [];
    const verification: VerificationResult = {
      status: previous.status,
      confidence: previous.confidence,
      sources: previous.sources,
      verificationSteps: ['Vérification récupérée depuis la mémoire de session.'],
      checks,
      evidence,
    };

    return {
      previousVerification: previous,
      verification,
      isVerified: previous.status === 'verified' || previous.status === 'partially_verified',
      verificationStatus: mapToDetailedStatus(previous.status),
      certaintySummary: buildCertaintySummary(previous.status, previous.confidence),
    };
  }

  async deepVerify(
    thought: ThoughtNode,
    containsCalculations?: boolean,
    forceVerification: boolean = false,
    sessionId?: string,
    connectedThoughts: ThoughtNode[] = [],
  ): Promise<VerificationResult> {
    if (!forceVerification) {
      const previous = await this.checkPreviousVerification(thought.content, sessionId, thought.type);
      if (previous.verification && previous.previousVerification) {
        return previous.verification;
      }
    }

    return this.verifyClaim({
      claim: thought.content,
      sessionId,
      checkCalculation: containsCalculations ?? true,
      checkConsistency: connectedThoughts.length > 0,
      checkWeb: this.enableWebVerification && !this.offline,
      connectedThoughts,
    });
  }

  async verifyClaim(request: ClaimVerificationRequest): Promise<VerificationResult> {
    const sessionId = request.sessionId;
    const connectedIds = (request.connectedThoughts ?? [])
      .map(node => node.id)
      .sort()
      .join(',');
    const cacheKey = request.searchProvider
      ? undefined
      : [
          sessionId ?? 'default',
          hashContent(request.claim),
          `calc:${request.checkCalculation !== false ? 1 : 0}`,
          `cons:${request.checkConsistency ? 1 : 0}`,
          `web:${request.checkWeb ? 1 : 0}`,
          `ctx:${hashContent(connectedIds)}`,
          `key:${request.tavilyApiKey ? hashContent(request.tavilyApiKey) : 'none'}`,
        ].join('|');
    if (cacheKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.result;
      }
    }

    const checks: VerificationCheck[] = [];
    const evidence: EvidenceItem[] = [];
    const contradictions: string[] = [];
    const methodsUnavailable: string[] = [];
    let verifiedCalculations: CalculationVerificationResult[] | undefined;
    let webCounts: { supports: number; contradicts: number } = { supports: 0, contradicts: 0 };
    let judgeVerdict: JudgeResult | null = null;

    if (request.checkCalculation !== false) {
      const calculations = await this.detectAndVerifyCalculations(request.claim);
      if (calculations.length > 0) {
        verifiedCalculations = calculations;
        const incorrect = calculations.filter(calculation => !calculation.isCorrect);
        checks.push({
          name: 'calculation',
          outcome: incorrect.length > 0 ? 'failed' : 'passed',
          summary:
            incorrect.length > 0
              ? `${incorrect.length}/${calculations.length} calcul(s) incorrect(s).`
              : `${calculations.length} calcul(s) vérifié(s) avec succès.`,
          details: calculations.map(calculation =>
            calculation.isCorrect
              ? `✓ ${calculation.original} → ${calculation.verified}`
              : `✗ ${calculation.original} → ${calculation.verified}`,
          ),
        });
        for (const calculation of calculations) {
          if (!calculation.isCorrect) {
            contradictions.push(calculation.reason ?? `Calcul incorrect: ${calculation.original}`);
          }
        }
      }
    }

    if (request.checkConsistency && (request.connectedThoughts?.length ?? 0) > 0) {
      const conflicts = findConsistencyConflicts(request.claim, request.connectedThoughts ?? []);
      contradictions.push(...conflicts);
      checks.push({
        name: 'consistency',
        outcome: conflicts.length > 0 ? 'failed' : 'passed',
        summary:
          conflicts.length > 0
            ? `${conflicts.length} contradiction(s) avec le graphe de session.`
            : 'Aucune contradiction détectée dans le graphe de session.',
        details: conflicts,
      });
    }

    if (request.checkWeb && this.searchService) {
      const webOutcome = await this.runWebCheck(request, evidence);
      checks.push(webOutcome.check);
      methodsUnavailable.push(...webOutcome.unavailable);
      contradictions.push(...webOutcome.contradictions);
      webCounts = webOutcome.counts;

      if (this.assist?.available && evidence.length > 0) {
        const judgeStep = trackerlessJudge(this.assist, request.claim, evidence);
        try {
          judgeVerdict = await judgeStep;
          checks.push({
            name: 'source_quality',
            outcome:
              judgeVerdict?.verdict === 'supports'
                ? 'passed'
                : judgeVerdict?.verdict === 'contradicts'
                  ? 'failed'
                  : 'inconclusive',
            summary: judgeVerdict
              ? `Juge LLM (${judgeVerdict.verdict}, ${Math.round(judgeVerdict.confidence * 100)}%) : ${judgeVerdict.reason}`
              : 'Juge LLM indisponible.',
          });
          if (judgeVerdict?.verdict === 'contradicts') {
            contradictions.push(`Juge LLM: ${judgeVerdict.reason}`);
          }
        } catch {
          judgeVerdict = null;
        }
      }
    } else if (request.checkWeb) {
      methodsUnavailable.push('web');
      checks.push({
        name: 'web',
        outcome: 'unavailable',
        summary: 'Aucun service de recherche web n\'est disponible.',
      });
    }

    const heuristic = evaluateVerificationHeuristics({
      id: 'claim',
      content: request.claim,
      type: 'regular',
      timestamp: new Date(),
      connections: [],
      metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 },
      metadata: {},
    });
    checks.push({
      name: 'heuristics',
      outcome:
        heuristic.status === 'contradicted'
          ? 'failed'
          : heuristic.status === 'uncertain'
            ? 'inconclusive'
            : 'passed',
      summary: heuristic.notes,
      details: heuristic.keyFactors,
    });

    const requirements = determineVerificationRequirements(request.claim);
    if (requirements.priority === 'high') {
      checks.push({
        name: 'source_quality',
        outcome: 'inconclusive',
        summary: `Vérification renforcée recommandée: ${requirements.reasons.join(' ')}`,
        details: requirements.suggestedTools,
      });
    }

    const status = this.aggregateStatus(checks, contradictions, webCounts, judgeVerdict);
    const confidence = this.aggregateConfidence(status, checks, evidence);
    const sources = evidence.map(item => item.source);

    const result: VerificationResult = {
      status,
      confidence,
      sources,
      verificationSteps: checks.map(check => `[${check.outcome}] ${check.name}: ${check.summary}`),
      contradictions: contradictions.length > 0 ? contradictions : undefined,
      checks,
      evidence: evidence.length > 0 ? evidence : undefined,
      methodsUnavailable: methodsUnavailable.length > 0 ? methodsUnavailable : undefined,
      notes: buildNotes(status, checks),
      verifiedCalculations,
    };

    if (cacheKey) {
      this.storeInCache(cacheKey, result);
    }

    try {
      await this.storeVerification(
        request.claim,
        status,
        confidence,
        sources,
        sessionId,
        { evidence: result.evidence, checks },
      );
    } catch {
      // Persistence failures must never break reasoning.
    }

    return result;
  }

  async detectAndVerifyCalculations(content: string): Promise<CalculationVerificationResult[]> {
    const evaluations = MathEvaluator.detectAndEvaluate(content);
    if (evaluations.length === 0) {
      return [];
    }
    return MathEvaluator.convertToVerificationResults(evaluations);
  }

  annotateThoughtWithVerifications(
    content: string,
    verifications: CalculationVerificationResult[],
  ): string {
    if (verifications.length === 0) {
      return content;
    }
    const annotations = verifications.map(verification =>
      verification.isCorrect
        ? `[✓ ${verification.original} = ${verification.verified}]`
        : `[✗ ${verification.original} — ${verification.reason ?? verification.verified}]`,
    );
    return `${content}\n${annotations.join('\n')}`;
  }

  async storeVerification(
    content: string,
    status: VerificationStatus,
    confidence: number,
    sources: string[],
    sessionId?: string,
    extras: VerificationStoreExtras = {},
  ): Promise<string> {
    return this.verificationMemory.addVerification(
      content,
      status,
      confidence,
      sources,
      sessionId,
      { evidence: extras.evidence, checks: extras.checks, ttl: extras.ttl },
    );
  }

  clearCache(): void {
    this.cache.clear();
  }

  private async runWebCheck(
    request: ClaimVerificationRequest,
    evidence: EvidenceItem[],
  ): Promise<{
    check: VerificationCheck;
    unavailable: string[];
    contradictions: string[];
    counts: { supports: number; contradicts: number };
  }> {
    const searchService = this.searchService;
    if (!searchService) {
      return {
        check: { name: 'web', outcome: 'unavailable', summary: 'Recherche web non configurée.' },
        unavailable: ['web'],
        contradictions: [],
        counts: { supports: 0, contradicts: 0 },
      };
    }

    const provider = searchService.resolveProvider(
      request.searchProvider,
      undefined,
      request.tavilyApiKey,
    );
    if (provider === 'native' || provider === 'none') {
      return {
        check: {
          name: 'web',
          outcome: provider === 'none' ? 'unavailable' : 'inconclusive',
          summary:
            provider === 'none'
              ? 'Recherche web désactivée ou sans clé Tavily.'
              : 'Recherche web déléguée au client natif (aucun appel serveur effectué).',
        },
        unavailable: [provider === 'none' ? 'web' : 'web-native'],
        contradictions: [],
        counts: { supports: 0, contradicts: 0 },
      };
    }

    const queries = buildVerificationQueries(request.claim);
    const contradictions: string[] = [];
    let supports = 0;
    let contradicts = 0;

    for (const query of queries) {
      try {
        const response = await searchService.webSearch(
          { query, maxResults: 5, provider: 'tavily', tavilyApiKey: request.tavilyApiKey },
          undefined,
        );
        for (const result of response.results) {
          const stance = classifyStance(request.claim, result);
          evidence.push(toEvidenceItem(request.claim, result, stance));
          if (stance === 'supports') supports += 1;
          if (stance === 'contradicts') {
            contradicts += 1;
            contradictions.push(`Source opposée: ${result.title} (${result.url})`);
          }
        }
      } catch (error) {
        return {
          check: {
            name: 'web',
            outcome: 'unavailable',
            summary: `Échec de la recherche web: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
          },
          unavailable: ['web'],
          contradictions,
          counts: { supports, contradicts },
        };
      }
    }

    const outcome = supports > contradicts ? (supports > 0 ? 'passed' : 'inconclusive') : contradicts > 0 ? 'failed' : 'inconclusive';
    return {
      check: {
        name: 'web',
        outcome,
        summary: `${supports} source(s) favorable(s), ${contradicts} source(s) opposée(s).`,
        evidenceIds: evidence.map(item => item.id),
      },
      unavailable: [],
      contradictions,
      counts: { supports, contradicts },
    };
  }

  private aggregateStatus(
    checks: VerificationCheck[],
    contradictions: string[],
    webCounts: { supports: number; contradicts: number },
    judgeVerdict?: JudgeResult | null,
  ): VerificationStatus {
    if (judgeVerdict?.verdict === 'contradicts') {
      return 'contradicted';
    }
    const calculation = checks.find(check => check.name === 'calculation');
    if (calculation?.outcome === 'failed') {
      return 'contradicted';
    }

    const consistency = checks.find(check => check.name === 'consistency');
    if (consistency?.outcome === 'failed') {
      return 'contradictory';
    }

    const web = checks.find(check => check.name === 'web');
    const supportCount = webCounts.supports;
    const opposeCount = webCounts.contradicts;

    if (web?.outcome === 'failed' || (opposeCount > 0 && supportCount === 0)) {
      return 'contradicted';
    }
    if (supportCount >= 2 && opposeCount === 0) {
      return 'verified';
    }
    if (supportCount >= 1 && opposeCount === 0) {
      return 'partially_verified';
    }
    if (supportCount > 0 && opposeCount > 0) {
      return 'contradictory';
    }
    if (calculation?.outcome === 'passed') {
      return 'partially_verified';
    }
    if (judgeVerdict?.verdict === 'supports' && judgeVerdict.confidence >= 0.7) {
      return 'partially_verified';
    }
    if (contradictions.length > 0) {
      return 'uncertain';
    }
    return 'unverified';
  }

  private aggregateConfidence(
    status: VerificationStatus,
    checks: VerificationCheck[],
    evidence: EvidenceItem[],
  ): number {
    if (status === 'contradicted') {
      return 0.85;
    }
    if (status === 'contradictory') {
      return 0.5;
    }
    if (status === 'verified') {
      return evidence.length > 0 ? 0.8 : 0.7;
    }
    if (status === 'partially_verified') {
      const hasCalculation = checks.some(check => check.name === 'calculation' && check.outcome === 'passed');
      return hasCalculation ? 0.65 : 0.55;
    }
    if (status === 'uncertain') {
      return 0.35;
    }
    return 0.3;
  }

  private storeInCache(key: string, result: VerificationResult): void {
    if (this.cache.size >= this.cacheMaxEntries) {
      const oldest = this.cache.keys().next().value;
      if (oldest !== undefined) {
        this.cache.delete(oldest);
      }
    }
    this.cache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
  }
}


async function trackerlessJudge(
  assist: AssistClient,
  claim: string,
  evidence: EvidenceItem[],
): Promise<JudgeResult | null> {
  const evidenceText = evidence
    .slice(0, 6)
    .map(item => `- [${item.title ?? item.source}] ${item.quote}`)
    .join('\n');
  return assistJudge(assist, claim, evidenceText);
}

function hashContent(content: string): string {
  return createHash('sha1').update(content).digest('hex').slice(0, 16);
}

function mapToDetailedStatus(status: VerificationStatus): VerificationDetailedStatus {
  return status;
}

function buildCertaintySummary(status: VerificationStatus, confidence: number): string {
  const percentage = Math.round(confidence * 100);
  const labels: Record<VerificationStatus, string> = {
    verified: `Information vérifiée (${percentage}% de confiance).`,
    partially_verified: `Information partiellement vérifiée (${percentage}% de confiance).`,
    unverified: `Information non vérifiée (${percentage}% de confiance).`,
    contradicted: `Information contredite (${percentage}% de confiance).`,
    contradictory: `Sources contradictoires (${percentage}% de confiance).`,
    absence_of_information: `Aucune information trouvée (${percentage}% de confiance).`,
    uncertain: `Information incertaine (${percentage}% de confiance).`,
    inconclusive: `Résultat non concluant (${percentage}% de confiance).`,
  };
  return labels[status];
}

function buildNotes(status: VerificationStatus, checks: VerificationCheck[]): string | undefined {
  const failed = checks.filter(check => check.outcome === 'failed');
  if (failed.length === 0) {
    return undefined;
  }
  return `Points d'attention: ${failed.map(check => check.summary).join(' ')}`;
}

function findConsistencyConflicts(claim: string, connectedThoughts: ThoughtNode[]): string[] {
  const conflicts: string[] = [];
  const claimKeywords = new Set(extractKeywords(claim));

  for (const thought of connectedThoughts) {
    const overlap = extractKeywords(thought.content).filter(keyword => claimKeywords.has(keyword)).length;
    const hasNegation = /(?:n'est pas|ne sont pas|faux|fausse|jamais|contraire|opposé|opposée|refute|réfute|contredit|contredite)/i.test(thought.content);
    if (hasNegation && overlap >= 2) {
      conflicts.push(`Contradiction avec "${truncate(thought.content, 160)}"`);
    }
  }

  return conflicts;
}

function classifyStance(claim: string, result: WebSearchResult): EvidenceStance {
  const claimKeywords = new Set(extractKeywords(claim));
  if (claimKeywords.size === 0) {
    return 'neutral';
  }
  const snippetKeywords = extractKeywords(`${result.title} ${result.text}`);
  const overlap = snippetKeywords.filter(keyword => claimKeywords.has(keyword)).length / claimKeywords.size;
  const text = `${result.title} ${result.text}`.toLowerCase();
  const negation = /(?:n'est pas|ne sont pas|faux|fausse|erroné|incorrect|contredit|dément|démenti|refut|réfut|debunk|not true|false|no evidence)/i.test(text);
  const support = /(?:confirme|confirment|selon|indique|révèle|montre|démontre|rapporte|à raison|true|correct|validé)/i.test(text);

  if (overlap < 0.2) {
    return 'neutral';
  }
  if (negation && !support) {
    return 'contradicts';
  }
  if (support || overlap >= 0.45) {
    return 'supports';
  }
  return 'neutral';
}

function toEvidenceItem(claim: string, result: WebSearchResult, stance: EvidenceStance): EvidenceItem {
  const snippet = result.text.length > 500 ? `${result.text.slice(0, 500)}...` : result.text;
  return {
    id: result.id,
    claim,
    quote: snippet,
    sourceType: 'web',
    source: result.url,
    title: result.title,
    stance,
    confidence: stance === 'neutral' ? 0.4 : 0.6,
    retrievedAt: new Date().toISOString(),
  };
}

function buildVerificationQueries(claim: string): string[] {
  const keywords = extractKeywords(claim);
  if (keywords.length === 0) {
    return [truncate(claim, 120)];
  }
  const queries = new Set<string>();
  queries.add(keywords.slice(0, 6).join(' '));
  if (keywords.length > 6) {
    queries.add(keywords.slice(0, 10).join(' '));
  }
  return Array.from(queries);
}

function truncate(value: string, maxLength: number): string {
  return value.length <= maxLength ? value : `${value.slice(0, maxLength)}...`;
}
