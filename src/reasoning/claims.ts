import { randomUUID } from 'node:crypto';
import { LIMITS } from '../constants';
import type { Claim, ClaimInput } from '../types';

export type { Claim, ClaimInput };

/**
 * Certificate ledger: general enforcement of "no result without evidence".
 *
 * Any solver can register claims with their method and evidence, then audit
 * the session to find unsupported claims or conflicting values. Domain-agnostic
 * (math, engineering, security, economics…).
 */

export interface AuditReport {
  total: number;
  supported: number;
  unsupported: Array<{ id: string; statement: string; missing: string[] }>;
  conflicts: Array<{ key: string; values: string[]; claimIds: string[] }>;
  singleMethod: Array<{ key: string; value: string; method: string; claimIds: string[] }>;
  requirements?: Array<{ requirement: string; covered: boolean; claimIds: string[] }>;
  summary: string;
}

function normalizeKey(statement: string): string {
  return statement
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 120);
}

export class ClaimLedger {
  private readonly sessions = new Map<string, Claim[]>();

  register(sessionId: string, input: ClaimInput): Claim {
    const safeSession = sessionId || LIMITS.DEFAULT_SESSION_ID;
    const claims = this.sessions.get(safeSession) ?? [];
    const claim: Claim = {
      id: `claim-${randomUUID()}`,
      statement: input.statement.trim(),
      value: input.value?.trim(),
      method: input.method?.trim(),
      evidence: input.evidence?.trim(),
      confidence: Math.max(0, Math.min(1, input.confidence ?? 0.8)),
      createdAt: new Date().toISOString(),
    };
    claims.push(claim);
    if (claims.length > 500) {
      claims.splice(0, claims.length - 500);
    }
    this.sessions.set(safeSession, claims);
    return claim;
  }

  audit(sessionId: string, requirements?: string[]): AuditReport {
    const claims = this.sessions.get(sessionId || LIMITS.DEFAULT_SESSION_ID) ?? [];
    const unsupported: AuditReport['unsupported'] = [];
    const byKey = new Map<string, Claim[]>();

    for (const claim of claims) {
      const missing: string[] = [];
      if (!claim.evidence) {
        missing.push('evidence');
      }
      if (!claim.method) {
        missing.push('method');
      }
      if (missing.length > 0) {
        unsupported.push({ id: claim.id, statement: claim.statement, missing });
      }
      if (claim.value) {
        const key = normalizeKey(claim.statement);
        const bucket = byKey.get(key) ?? [];
        bucket.push(claim);
        byKey.set(key, bucket);
      }
    }

    const conflicts: AuditReport['conflicts'] = [];
    const singleMethod: AuditReport['singleMethod'] = [];
    for (const [key, bucket] of byKey) {
      const values = Array.from(new Set(bucket.map(claim => claim.value as string)));
      if (values.length > 1) {
        conflicts.push({ key, values, claimIds: bucket.map(claim => claim.id) });
      }
      const methods = Array.from(new Set(bucket.map(claim => claim.method).filter(Boolean) as string[]));
      if (methods.length === 1 && bucket.length > 1) {
        singleMethod.push({ key, value: bucket[0]?.value ?? '', method: methods[0]!, claimIds: bucket.map(claim => claim.id) });
      }
    }

    const requirementCoverage = requirements
      ? requirements.map(requirement => {
          const tokens = normalizeKey(requirement).split(' ').filter(token => token.length > 2);
          const matches = claims.filter(claim => {
            const haystack = normalizeKey(`${claim.statement} ${claim.value ?? ''}`);
            return tokens.some(token => haystack.includes(token));
          });
          return { requirement, covered: matches.length > 0, claimIds: matches.map(claim => claim.id) };
        })
      : undefined;

    const unverified = requirementCoverage?.filter(item => !item.covered).length ?? 0;
    const supported = claims.length - unsupported.length;
    return {
      total: claims.length,
      supported,
      unsupported,
      conflicts,
      singleMethod,
      ...(requirementCoverage ? { requirements: requirementCoverage } : {}),
      summary:
        claims.length === 0
          ? 'Aucune affirmation enregistrée.'
          : `${supported}/${claims.length} affirmations avec méthode ET preuve` +
            (conflicts.length > 0 ? ` ; ${conflicts.length} conflit(s) de valeur à résoudre` : '') +
            (unverified > 0 ? ` ; ${unverified} exigence(s) sans certificat` : '') +
            (unsupported.length + conflicts.length + unverified === 0 ? '. Tout est couvert.' : '.'),
    };
  }

  list(sessionId: string): Claim[] {
    return [...(this.sessions.get(sessionId || LIMITS.DEFAULT_SESSION_ID) ?? [])];
  }

  /**
   * Rehydrate the in-memory cache from the persisted session without losing
   * claims registered during this process (union by id, insertion order kept).
   */
  hydrate(sessionId: string, persisted: Claim[] | undefined): void {
    const safeSession = sessionId || LIMITS.DEFAULT_SESSION_ID;
    if (!persisted || persisted.length === 0) {
      return;
    }
    const current = this.sessions.get(safeSession) ?? [];
    const known = new Set(current.map(claim => claim.id));
    const merged = [...persisted.filter(claim => !known.has(claim.id)), ...current];
    merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    this.sessions.set(safeSession, merged.slice(-500));
  }

  clear(sessionId: string): void {
    this.sessions.delete(sessionId || LIMITS.DEFAULT_SESSION_ID);
  }
}
