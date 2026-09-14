/**
 * Deterministic ordering/comparison constraint solver.
 *
 * Parses French and English relational statements ("A before B", "X plus
 * rapide que Y", "X < Y"...) into a directed graph, topologically sorts it and
 * reports contradictions or multiple possible orders. This gives any LLM an
 * exact solver for scheduling, ranking and logical-deduction puzzles.
 */

export interface OrderingConstraint {
  before: string;
  after: string;
  raw: string;
}

export interface ConstraintSolveResult {
  entities: string[];
  constraints: OrderingConstraint[];
  order?: string[];
  unique: boolean;
  possibleNext?: string[];
  contradictions: string[];
  explanation: string;
}

const BEFORE_PATTERNS: RegExp[] = [
  /^(?<a>.+?)\s+(?:est|était|se trouve|arrive|termine|passe|vient|sort|commence)\s+(?:arrivé\s+)?avant\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:a|ont)\s+(?:terminé|fini|commencé|démarré|arrivé)\s+avant\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+avant\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s*<\s*(?<b>.+)$/,
  /^(?<a>.+?)\s+(?:plus|moins)\s+(?:rapide|vite|petit|jeune|récent|bas|court|léger|faible)\s+que\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:plus|moins)\s+(?:lent|grand|âgé|vieux|ancien|haut|long|lourd|fort)\s+que\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+is\s+(?:faster|earlier|older|smaller|shorter|younger|lower|less)\s+than\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:finished|arrived|started|happened|came|comes|ran|runs)\s+(?:before|ahead of)\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+before\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:is|was)\s+(?:before|earlier than)\s+(?<b>.+)$/i,
];

const AFTER_PATTERNS: RegExp[] = [
  /^(?<a>.+?)\s+(?:est|était|se trouve|arrive|termine|passe|vient|sort|commence)\s+(?:arrivé\s+)?après\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:a|ont)\s+(?:terminé|fini|commencé|démarré|arrivé)\s+après\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+après\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s*>\s*(?<b>.+)$/,
  /^(?<a>.+?)\s+(?:plus|moins)\s+(?:lent|vieux|ancien|grand|âgé|haut|long|lourd|fort)\s+que\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:plus|moins)\s+(?:rapide|vite|petit|jeune|récent|bas|court|léger|faible)\s+que\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+is\s+(?:slower|later|younger|newer|bigger|taller|longer|heavier|higher|greater|more)\s+than\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:finished|arrived|started|happened|came|comes|ran|runs)\s+(?:after|behind)\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+after\s+(?<b>.+)$/i,
  /^(?<a>.+?)\s+(?:is|was)\s+(?:after|later than)\s+(?<b>.+)$/i,
];

const CONNECTOR_SPLIT = /\s*(?:;|,|\.|\n|\bet\b|\band\b|\bpuis\b|\bthen\b|\bmais\b|\bbut\b)\s*/i;

const COMPARISON_FAMILIES: Array<{ greater: RegExp; less: RegExp }> = [
  {
    greater: /(?:plus|moins)\s+(?:lent|vieux|ancien|grand|âgé|haut|long|lourd|fort)/i,
    less: /(?:plus|moins)\s+(?:rapide|vite|petit|jeune|récent|bas|court|léger|faible)/i,
  },
];

function cleanEntity(value: string): string {
  return value
    .replace(/^[\s"'«»()\[\]-]+|[\s"'«»()\[\]-]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function stripQuestionTail(value: string): string {
  const markers = [
    /[?？]/,
    /\bquel(?:le)?\b/i,
    /\bqui\b/i,
    /\bquoi\b/i,
    /\bcombien\b/i,
    /\breponds?\b/i,
    /\bréponds?\b/i,
    /\bwhich\b/i,
    /\bwhat\b/i,
    /\bwho\b/i,
  ];
  let result = value;
  for (const marker of markers) {
    const index = result.search(marker);
    if (index > 0) {
      result = result.slice(0, index);
    }
  }
  return result;
}

function tryPatterns(
  segment: string,
  patterns: RegExp[],
): { a: string; b: string } | null {
  for (const pattern of patterns) {
    const match = pattern.exec(segment);
    if (!match?.groups) {
      continue;
    }
    const a = cleanEntity(stripQuestionTail(match.groups.a ?? ''));
    const b = cleanEntity(stripQuestionTail(match.groups.b ?? ''));
    if (a && b && a.toLowerCase() !== b.toLowerCase()) {
      return { a, b };
    }
  }
  return null;
}

function segmentToConstraint(segment: string): OrderingConstraint | null {
  const trimmed = segment.trim();
  if (trimmed.length < 3) {
    return null;
  }

  const before = tryPatterns(trimmed, BEFORE_PATTERNS);
  if (before) {
    return { before: before.a, after: before.b, raw: trimmed };
  }
  const after = tryPatterns(trimmed, AFTER_PATTERNS);
  if (after) {
    return { before: after.b, after: after.a, raw: trimmed };
  }
  return null;
}

export function solveOrdering(
  problem: string,
  explicitEntities: string[] = [],
  explicitRelations: Array<{ before: string; after: string }> = [],
): ConstraintSolveResult {
  const normalized = problem
    .replace(/[−–—]/g, '-')
    .replace(/[’‘]/g, "'");

  const canonical = new Map<string, string>();
  for (const entity of explicitEntities.map(cleanEntity).filter(Boolean)) {
    canonical.set(entity.toLowerCase(), entity);
  }
  const canonicalize = (value: string): string => {
    const direct = canonical.get(value.toLowerCase());
    if (direct) {
      return direct;
    }
    const lower = value.toLowerCase();
    const matches = Array.from(canonical.entries())
      .filter(([candidate]) => {
        const escaped = candidate.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(`(?:^|[^a-z0-9àâäéèêëîïôöùûüç])${escaped}(?:$|[^a-z0-9àâäéèêëîïôöùûüç])`, 'i').test(lower);
      })
      .sort((a, b) => b[0].length - a[0].length);
    return matches.length > 0 ? matches[0][1] : value;
  };

  const entities = new Set<string>(explicitEntities.map(cleanEntity).filter(Boolean));
  const constraints: OrderingConstraint[] = [];
  const contradictions: string[] = [];

  for (const relation of explicitRelations) {
    const before = cleanEntity(relation.before);
    const after = cleanEntity(relation.after);
    if (!before || !after || before.toLowerCase() === after.toLowerCase()) {
      continue;
    }
    const canonicalBefore = canonicalize(before);
    const canonicalAfter = canonicalize(after);
    constraints.push({ before: canonicalBefore, after: canonicalAfter, raw: `${canonicalBefore} < ${canonicalAfter}` });
    entities.add(canonicalBefore);
    entities.add(canonicalAfter);
  }

  const parentheticalSegments: string[] = [];
  const withoutParentheses = normalized.replace(/\(([^)]*)\)/g, (_match, inner: string) => {
    parentheticalSegments.push(inner);
    return ' ';
  });

  const segments = [...parentheticalSegments, ...withoutParentheses.split(CONNECTOR_SPLIT)];
  for (const segment of segments) {
    const constraint = segmentToConstraint(segment);
    if (!constraint) {
      continue;
    }
    const familyConflict = COMPARISON_FAMILIES.some(
      family => family.greater.test(segment) && family.less.test(segment),
    );
    if (familyConflict) {
      contradictions.push(`Énoncé ambigu (comparaisons contradictoires) : "${constraint.raw}"`);
      continue;
    }
    const canonicalBefore = canonicalize(constraint.before);
    const canonicalAfter = canonicalize(constraint.after);
    if (canonicalBefore.toLowerCase() === canonicalAfter.toLowerCase()) {
      continue;
    }
    constraints.push({ before: canonicalBefore, after: canonicalAfter, raw: constraint.raw });
    entities.add(canonicalBefore);
    entities.add(canonicalAfter);
  }

  if (constraints.length === 0) {
    return {
      entities: Array.from(entities),
      constraints,
      unique: false,
      contradictions,
      explanation: 'Aucune relation d\'ordre exploitable trouvée.',
    };
  }

  const adjacency = new Map<string, Set<string>>();
  const inDegree = new Map<string, number>();
  for (const entity of entities) {
    adjacency.set(entity, new Set());
    inDegree.set(entity, 0);
  }

  for (const constraint of constraints) {
    const targets = adjacency.get(constraint.before)!;
    if (!targets.has(constraint.after)) {
      targets.add(constraint.after);
      inDegree.set(constraint.after, (inDegree.get(constraint.after) ?? 0) + 1);
    }
  }

  const order: string[] = [];
  const remaining = new Set(entities);
  let unique = true;

  while (remaining.size > 0) {
    const ready = Array.from(remaining).filter(entity => (inDegree.get(entity) ?? 0) === 0);
    if (ready.length === 0) {
      contradictions.push(`Cycle détecté entre : ${Array.from(remaining).join(', ')}.`);
      return {
        entities: Array.from(entities),
        constraints,
        unique: false,
        contradictions,
        explanation: 'Les contraintes sont incohérentes (cycle).',
      };
    }
    if (ready.length > 1) {
      unique = false;
    }
    const next = ready[0];
    order.push(next);
    remaining.delete(next);
    for (const target of adjacency.get(next) ?? []) {
      inDegree.set(target, (inDegree.get(target) ?? 1) - 1);
    }
  }

  const possibleNext =
    order.length > 0 && !unique
      ? Array.from(entities).filter(
          entity => order.indexOf(entity) >= 0 && (inDegree.get(entity) ?? 0) === 0,
        )
      : undefined;

  const explanation = unique
    ? `Ordre unique : ${order.join(' < ')}.`
    : `Ordre partiel : ${order.join(' < ')}… (plusieurs ordres valides possibles).`;

  return {
    entities: Array.from(entities),
    constraints,
    order,
    unique,
    ...(possibleNext ? { possibleNext } : {}),
    contradictions,
    explanation,
  };
}
