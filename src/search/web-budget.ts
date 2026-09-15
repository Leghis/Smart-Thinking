/**
 * Per-session web credit budget.
 *
 * Tavily bills every call (search ≈ 1 credit, extract ≈ 1 credit per 5 pages,
 * crawl ≈ 5, managed research ≈ 50). Without a ledger a single research loop
 * can silently burn a whole plan quota, so every server-side web call must ask
 * for its credits first and stop cleanly when the budget is exhausted.
 */

export const WEB_CREDIT_COSTS = {
  search: 1,
  extractBatch: 1,
  crawl: 5,
  map: 1,
  research: 50,
} as const;

export const EXTRACT_BATCH_SIZE = 5;

export interface ChargeResult {
  granted: boolean;
  creditsUsed: number;
  remaining: number;
  reason?: 'budget';
}

export class WebCreditLedger {
  private readonly usageBySession = new Map<string, number>();
  private readonly limit: number;

  constructor(limit: number) {
    this.limit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 0;
  }

  get creditLimit(): number {
    return this.limit;
  }

  used(sessionId: string): number {
    return this.usageBySession.get(sessionId) ?? 0;
  }

  remaining(sessionId: string): number {
    return Math.max(0, this.limit - this.used(sessionId));
  }

  canAfford(sessionId: string, credits: number): boolean {
    return credits <= 0 || this.remaining(sessionId) >= credits;
  }

  /** All-or-nothing: an unaffordable charge is refused and changes nothing. */
  charge(sessionId: string, credits: number): ChargeResult {
    const used = this.used(sessionId);
    const remaining = Math.max(0, this.limit - used);
    if (credits > 0 && remaining < credits) {
      return { granted: false, creditsUsed: used, remaining, reason: 'budget' };
    }
    const next = used + Math.max(0, credits);
    this.usageBySession.set(sessionId, next);
    return { granted: true, creditsUsed: next, remaining: Math.max(0, this.limit - next) };
  }

  reset(sessionId?: string): void {
    if (sessionId) {
      this.usageBySession.delete(sessionId);
      return;
    }
    this.usageBySession.clear();
  }
}
