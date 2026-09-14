/**
 * v13 benchmark — statistics and rendering (no dependencies).
 *
 * Accuracy = mean task score. Exact-match = fraction of tasks with score 1.
 * The sign test is an exact two-sided binomial over discordant baseline/tool
 * pairs (ties excluded), computed iteratively to avoid overflow.
 */

import type {
  BenchDelta,
  BenchReport,
  Condition,
  ConditionStats,
  RunResult,
  TaskScore,
} from './types';

export function computeStats(
  condition: Condition,
  results: RunResult[],
  scores: TaskScore[],
): ConditionStats {
  const conditionResults = results.filter(result => result.condition === condition);
  const conditionScores = scores.filter(score => score.condition === condition);
  const latencies = conditionResults.map(result => result.latencyMs).sort((a, b) => a - b);
  const accuracy =
    conditionScores.length > 0
      ? conditionScores.reduce((sum, score) => sum + score.score, 0) / conditionScores.length
      : 0;
  const exactMatches = conditionScores.filter(score => score.exactMatch).length;
  const inputTokens = conditionResults.reduce((sum, result) => sum + (result.inputTokens ?? 0), 0);
  const outputTokens = conditionResults.reduce((sum, result) => sum + (result.outputTokens ?? 0), 0);
  const hasTokens = conditionResults.some(
    result => result.inputTokens !== undefined || result.outputTokens !== undefined,
  );

  return {
    condition,
    tasks: new Set(conditionScores.map(score => score.taskId)).size,
    runs: conditionResults.length,
    accuracy: round(accuracy, 4),
    exactMatchRate: conditionScores.length > 0 ? round(exactMatches / conditionScores.length, 4) : 0,
    meanLatencyMs: mean(latencies),
    p50LatencyMs: percentile(latencies, 0.5),
    p95LatencyMs: percentile(latencies, 0.95),
    inputTokens: hasTokens ? inputTokens : undefined,
    outputTokens: hasTokens ? outputTokens : undefined,
    wins: 0,
    losses: 0,
    ties: 0,
    hallucinations: conditionScores.reduce(
      (sum, score) => sum + score.hallucinationFlags.length,
      0,
    ),
    contradictions: conditionScores.filter(score => score.containsContradiction).length,
  };
}

export function computeDelta(
  baseline: ConditionStats,
  tool: ConditionStats,
  scores: TaskScore[],
): BenchDelta {
  const baselineByTask = groupScores(scores, 'baseline');
  const toolByTask = groupScores(scores, 'tool');
  let wins = 0;
  let losses = 0;
  let ties = 0;

  for (const [taskId, baselineScore] of baselineByTask) {
    const toolScore = toolByTask.get(taskId);
    if (toolScore === undefined) {
      continue;
    }
    if (toolScore > baselineScore) {
      wins += 1;
    } else if (toolScore < baselineScore) {
      losses += 1;
    } else {
      ties += 1;
    }
  }

  const absolutePp = round((tool.accuracy - baseline.accuracy) * 100, 2);
  const relativePct =
    baseline.accuracy > 0 ? round(((tool.accuracy - baseline.accuracy) / baseline.accuracy) * 100, 1) : null;

  return {
    absolutePp,
    relativePct,
    wins,
    losses,
    ties,
    signTestPValue: round(signTestPValue(wins, losses), 8),
  };
}

/** Exact two-sided binomial sign test. */
export function signTestPValue(wins: number, losses: number): number {
  const n = wins + losses;
  if (n === 0) {
    return 1;
  }
  const k = Math.min(wins, losses);
  let term = 2 ** -n;
  let cumulative = term;
  for (let index = 1; index <= k; index += 1) {
    term *= (n - index + 1) / index;
    cumulative += term;
  }
  return Math.min(1, 2 * cumulative);
}

export interface BuildReportArgs {
  label: string;
  provider: string;
  mode: 'simulate' | 'live';
  seed: number;
  conditions: Condition[];
  results: RunResult[];
  scores: TaskScore[];
  notes?: string[];
}

export function buildReport(args: BuildReportArgs): BenchReport {
  const stats = args.conditions.map(condition =>
    computeStats(condition, args.results, args.scores),
  );
  const baseline = stats.find(stat => stat.condition === 'baseline');
  const tool = stats.find(stat => stat.condition === 'tool');
  const delta = baseline && tool ? computeDelta(baseline, tool, args.scores) : undefined;

  if (delta && baseline && tool) {
    baseline.wins = delta.wins;
    baseline.losses = delta.losses;
    baseline.ties = delta.ties;
    tool.wins = delta.wins;
    tool.losses = delta.losses;
    tool.ties = delta.ties;
  }

  return {
    label: args.label,
    provider: args.provider,
    mode: args.mode,
    seed: args.seed,
    generatedAt: new Date().toISOString(),
    tasks: new Set(args.scores.map(score => score.taskId)).size,
    conditions: args.conditions,
    delta,
    stats,
    results: args.results,
    scores: args.scores,
    notes: args.notes ?? [],
  };
}

export function renderJson(report: BenchReport): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export function renderMarkdown(report: BenchReport, tasksById: Map<string, { question: string; difficulty: number }>): string {
  const lines: string[] = [];
  lines.push(`# Benchmark Smart-Thinking — ${report.label}`);
  lines.push('');
  lines.push(`- Provider: \`${report.provider}\` (${report.mode})`);
  lines.push(`- Generated: ${report.generatedAt}`);
  lines.push(`- Tasks: ${report.tasks} | Seed: ${report.seed}`);
  lines.push('');

  lines.push('## Summary');
  lines.push('');
  lines.push('| Condition | Accuracy | Exact match | Mean latency | p50 | p95 | Tokens (in/out) | Hallucinations |');
  lines.push('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
  for (const stat of report.stats) {
    lines.push(
      `| ${stat.condition} | ${formatPct(stat.accuracy)} | ${formatPct(stat.exactMatchRate)} | ${formatMs(stat.meanLatencyMs)} | ${formatMs(stat.p50LatencyMs)} | ${formatMs(stat.p95LatencyMs)} | ${stat.inputTokens ?? 0} / ${stat.outputTokens ?? 0} | ${stat.hallucinations} |`,
    );
  }
  lines.push('');

  if (report.delta) {
    const delta = report.delta;
    lines.push('## Delta baseline → tool');
    lines.push('');
    lines.push(`- Absolute: **${delta.absolutePp >= 0 ? '+' : ''}${delta.absolutePp} pp**`);
    lines.push(
      `- Relative: ${delta.relativePct === null ? 'n/a (baseline accuracy = 0)' : `${delta.relativePct >= 0 ? '+' : ''}${delta.relativePct} %`}`,
    );
    lines.push(`- Wins / losses / ties: ${delta.wins} / ${delta.losses} / ${delta.ties}`);
    lines.push(`- Exact binomial sign test p-value: ${formatP(delta.signTestPValue)}`);
    lines.push('');
  }

  lines.push('## Per category');
  lines.push('');
  lines.push('| Category | Baseline accuracy | Tool accuracy | Tasks |');
  lines.push('| --- | ---: | ---: | ---: |');
  for (const category of categoryOrder(report.scores)) {
    const baseline = categoryAccuracy(report.scores, category, 'baseline');
    const tool = categoryAccuracy(report.scores, category, 'tool');
    const count = new Set(
      report.scores.filter(score => score.category === category).map(score => score.taskId),
    ).size;
    lines.push(
      `| ${category} | ${baseline === null ? '—' : formatPct(baseline)} | ${tool === null ? '—' : formatPct(tool)} | ${count} |`,
    );
  }
  lines.push('');

  lines.push('## Task-by-task');
  lines.push('');
  lines.push('| Task | Category | Diff. | Baseline | Tool | Delta | Hallucinations (b/t) |');
  lines.push('| --- | --- | ---: | ---: | ---: | ---: | ---: |');
  const taskIds = [...new Set(report.scores.map(score => score.taskId))];
  for (const taskId of taskIds) {
    const baseline = meanTaskScore(report.scores, taskId, 'baseline');
    const tool = meanTaskScore(report.scores, taskId, 'tool');
    const category = report.scores.find(score => score.taskId === taskId)?.category ?? '—';
    const meta = tasksById.get(taskId);
    const baselineFlags = flagsFor(report.scores, taskId, 'baseline');
    const toolFlags = flagsFor(report.scores, taskId, 'tool');
    const delta = baseline !== null && tool !== null ? round(tool - baseline, 2) : null;
    lines.push(
      `| \`${taskId}\` | ${category} | ${meta?.difficulty ?? '—'} | ${baseline === null ? '—' : baseline.toFixed(2)} | ${tool === null ? '—' : tool.toFixed(2)} | ${delta === null ? '—' : `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`} | ${baselineFlags} / ${toolFlags} |`,
    );
  }
  lines.push('');

  if (report.notes.length > 0) {
    lines.push('## Notes');
    lines.push('');
    for (const note of report.notes) {
      lines.push(`- ${note}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

function categoryOrder(scores: TaskScore[]): string[] {
  const order = ['arithmetic', 'logic', 'planning', 'factual', 'synthesis'];
  const present = new Set(scores.map(score => score.category));
  return order.filter(category => present.has(category as TaskScore['category']));
}

function categoryAccuracy(
  scores: TaskScore[],
  category: string,
  condition: Condition,
): number | null {
  const filtered = scores.filter(score => score.category === category && score.condition === condition);
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, score) => sum + score.score, 0) / filtered.length;
}

function meanTaskScore(
  scores: TaskScore[],
  taskId: string,
  condition: Condition,
): number | null {
  const filtered = scores.filter(score => score.taskId === taskId && score.condition === condition);
  if (filtered.length === 0) {
    return null;
  }
  return filtered.reduce((sum, score) => sum + score.score, 0) / filtered.length;
}

function flagsFor(scores: TaskScore[], taskId: string, condition: Condition): string {
  const flags = scores
    .filter(score => score.taskId === taskId && score.condition === condition)
    .flatMap(score => score.hallucinationFlags);
  return flags.length > 0 ? flags.join(', ') : '—';
}

function groupScores(scores: TaskScore[], condition: Condition): Map<string, number> {
  const grouped = new Map<string, number[]>();
  for (const score of scores.filter(entry => entry.condition === condition)) {
    const values = grouped.get(score.taskId) ?? [];
    values.push(score.score);
    grouped.set(score.taskId, values);
  }
  const result = new Map<string, number>();
  for (const [taskId, values] of grouped) {
    result.set(taskId, values.reduce((sum, value) => sum + value, 0) / values.length);
  }
  return result;
}

function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return round(values.reduce((sum, value) => sum + value, 0) / values.length, 2);
}

function percentile(sorted: number[], ratio: number): number {
  if (sorted.length === 0) {
    return 0;
  }
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(ratio * sorted.length) - 1));
  return round(sorted[index], 2);
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)} %`;
}

function formatMs(value: number): string {
  return `${value.toFixed(1)} ms`;
}

function formatP(value: number): string {
  return value < 0.001 ? '< 0.001' : value.toFixed(3);
}
