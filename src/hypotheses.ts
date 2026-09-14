import { randomUUID } from 'node:crypto';
import type { EvidenceItem, HypothesisNode, HypothesisStatus } from './types';

export interface HypothesisInput {
  id?: string;
  statement: string;
  parentId?: string;
  status?: HypothesisStatus;
  confidence?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function createHypothesis(input: HypothesisInput): HypothesisNode {
  const now = new Date().toISOString();
  return {
    id: input.id ?? `hyp-${randomUUID()}`,
    statement: input.statement.trim(),
    status: input.status ?? 'open',
    confidence: clamp(input.confidence ?? 0.5, 0, 1),
    parentId: input.parentId,
    evidenceFor: [],
    evidenceAgainst: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function upsertHypotheses(
  existing: HypothesisNode[],
  inputs: HypothesisInput[],
): HypothesisNode[] {
  const byId = new Map(existing.map(hypothesis => [hypothesis.id, hypothesis]));
  const result = [...existing];

  for (const input of inputs) {
    if (input.id && byId.has(input.id)) {
      const current = byId.get(input.id)!;
      const updated: HypothesisNode = {
        ...current,
        statement: input.statement.trim() || current.statement,
        status: input.status ?? current.status,
        confidence: clamp(input.confidence ?? current.confidence, 0, 1),
        parentId: input.parentId ?? current.parentId,
        updatedAt: new Date().toISOString(),
      };
      const index = result.findIndex(hypothesis => hypothesis.id === updated.id);
      result[index] = updated;
      byId.set(updated.id, updated);
    } else {
      const created = createHypothesis(input);
      result.push(created);
      byId.set(created.id, created);
    }
  }

  return result;
}

export function recordHypothesisEvidence(
  hypotheses: HypothesisNode[],
  update: { id: string; support?: string; contradict?: string; confidence?: number },
): HypothesisNode[] {
  return hypotheses.map(hypothesis => {
    if (hypothesis.id !== update.id) {
      return hypothesis;
    }
    const evidenceFor = update.support
      ? [...hypothesis.evidenceFor, update.support]
      : hypothesis.evidenceFor;
    const evidenceAgainst = update.contradict
      ? [...hypothesis.evidenceAgainst, update.contradict]
      : hypothesis.evidenceAgainst;

    const supportWeight = evidenceFor.length;
    const againstWeight = evidenceAgainst.length;
    const derivedConfidence =
      supportWeight + againstWeight === 0
        ? hypothesis.confidence
        : clamp(0.5 + (supportWeight - againstWeight) * 0.15, 0.05, 0.95);
    const confidence = clamp(update.confidence ?? derivedConfidence, 0, 1);
    const status: HypothesisStatus = deriveStatus(supportWeight, againstWeight, confidence);

    return {
      ...hypothesis,
      evidenceFor,
      evidenceAgainst,
      confidence,
      status,
      updatedAt: new Date().toISOString(),
    };
  });
}

export function deriveHypothesisReport(
  hypotheses: HypothesisNode[],
  evidence: EvidenceItem[],
): { ranked: HypothesisNode[]; warnings: string[] } {
  const warnings: string[] = [];
  const byId = new Map(hypotheses.map(hypothesis => [hypothesis.id, hypothesis]));

  for (const item of evidence) {
    if (!item.claim) {
      continue;
    }
    const match = hypotheses.find(hypothesis =>
      item.claim && hypothesis.statement.toLowerCase().includes(item.claim.toLowerCase().slice(0, 40)),
    );
    if (!match) {
      continue;
    }
    if (item.stance === 'supports' && !match.evidenceFor.includes(item.id)) {
      match.evidenceFor.push(item.id);
    }
    if (item.stance === 'contradicts' && !match.evidenceAgainst.includes(item.id)) {
      match.evidenceAgainst.push(item.id);
    }
  }

  const ranked = [...byId.values()]
    .map(hypothesis => {
      const status = deriveStatus(
        hypothesis.evidenceFor.length,
        hypothesis.evidenceAgainst.length,
        hypothesis.confidence,
      );
      return { ...hypothesis, status };
    })
    .sort((a, b) => {
      if (a.status === b.status) {
        return b.confidence - a.confidence;
      }
      const order: Record<HypothesisStatus, number> = { supported: 0, open: 1, inconclusive: 2, refuted: 3 };
      return order[a.status] - order[b.status];
    });

  for (const hypothesis of ranked) {
    if (hypothesis.status === 'supported' && hypothesis.evidenceAgainst.length === 0) {
      warnings.push(`Hypothèse "${hypothesis.statement.slice(0, 80)}" est soutenue mais jamais testée négativement.`);
    }
  }

  return { ranked, warnings };
}

function deriveStatus(supportCount: number, againstCount: number, confidence: number): HypothesisStatus {
  if (againstCount > 0 && supportCount === 0) {
    return 'refuted';
  }
  if (supportCount >= 2 && againstCount === 0 && confidence >= 0.6) {
    return 'supported';
  }
  if (againstCount > supportCount) {
    return 'refuted';
  }
  if (supportCount > 0 && againstCount > 0) {
    return 'inconclusive';
  }
  return 'open';
}
