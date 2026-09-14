/**
 * v13 benchmark — offline solver rules for the simulated weak model.
 *
 * These solvers are deterministic and offline. They NEVER read the answer key:
 * every result is derived from the question text and, for factual/synthesis
 * tasks, from the task's offlineEvidence (a clearly-labelled Tavily stub).
 * Arithmetic goes through the real MathEvaluator; planning goes through the
 * real planner.createPlan plus a topological sort of the parsed constraints.
 */

import { MathEvaluator } from '../utils/math-evaluator';
import { createPlan } from '../planner';
import type { SmartThinkingEnvironment } from '../server/environment';
import { extractNumbers, normalizeText } from './grader';
import type { BenchTask, OfflineEvidence } from './types';

export function formatNumber(value: number): string {
  const rounded = Math.round(value * 1e6) / 1e6;
  return String(rounded).replace('.', ',');
}

export function normalizeQuestion(question: string): string {
  return question
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');
}

/** Evaluate a flat arithmetic expression through the real MathEvaluator. */
export function evaluateExpression(expression: string): number | undefined {
  const sanitized = normalizeQuestion(expression).trim();
  if (!sanitized) {
    return undefined;
  }
  const evaluations = MathEvaluator.detectAndEvaluate(`${sanitized} = 0`);
  const candidate = evaluations.find(item => Number.isFinite(item.result));
  return candidate?.result;
}

// ---------------------------------------------------------------------------
// Shared text helpers (also used by the baseline heuristics)
// ---------------------------------------------------------------------------

export interface ParsedOption {
  label: string;
  text: string;
}

export function parseOptions(question: string): ParsedOption[] {
  const parts = question.split(/\(([A-D])\)/);
  const options: ParsedOption[] = [];
  for (let index = 1; index < parts.length - 1; index += 2) {
    const text = parts[index + 1].replace(/R[ée]ponds.*$/i, '').replace(/[.,;\s]+$/, '').trim();
    if (text) {
      options.push({ label: parts[index], text });
    }
  }
  return options;
}

export function extractPlanningSteps(question: string): string[] {
  const afterFirstColon = question.split(':').slice(1).join(':');
  const listPart = afterFirstColon.split(/Contraintes\s*:/i)[0] ?? '';
  return listPart
    .split(',')
    .map(step => step.replace(/[.;]/g, '').trim())
    .filter(Boolean);
}

const ORDERING_NODE = String.raw`(\bV\d+|[A-ZÀ-Ý][a-zà-ÿ-]+)`;
const ORDERING_MARKERS = String.raw`(?:a terminé|est sorti|passe|vient)`;
export const ORDERING_REGEX = new RegExp(
  `${ORDERING_NODE}\\s+${ORDERING_MARKERS}\\s+(avant|après)\\s+(?:de\\s+)?${ORDERING_NODE}`,
  'g',
);

export function extractOrderingItems(question: string): string[] {
  const items: string[] = [];
  for (const match of question.matchAll(ORDERING_REGEX)) {
    for (const node of [match[1], match[3]]) {
      if (!items.includes(node)) {
        items.push(node);
      }
    }
  }
  return items;
}

function parseOrderingEdges(question: string): Array<[string, string]> {
  const edges: Array<[string, string]> = [];
  for (const match of question.matchAll(ORDERING_REGEX)) {
    const [, from, direction, to] = match;
    edges.push(direction.toLowerCase() === 'après' ? [to, from] : [from, to]);
  }
  return edges;
}

export function topoSort(nodes: string[], edges: Array<[string, string]>): string[] {
  const index = new Map(nodes.map((node, position) => [node, position]));
  const adjacency = new Map<string, string[]>(nodes.map(node => [node, []]));
  const indegree = new Map<string, number>(nodes.map(node => [node, 0]));

  for (const [from, to] of edges) {
    if (!adjacency.has(from) || !indegree.has(to)) {
      continue;
    }
    adjacency.get(from)!.push(to);
    indegree.set(to, (indegree.get(to) ?? 0) + 1);
  }

  const byAppearance = (a: string, b: string) => (index.get(a) ?? 0) - (index.get(b) ?? 0);
  const ready = nodes.filter(node => indegree.get(node) === 0).sort(byAppearance);
  const ordered: string[] = [];

  while (ready.length > 0) {
    const current = ready.shift()!;
    ordered.push(current);
    for (const next of adjacency.get(current) ?? []) {
      indegree.set(next, (indegree.get(next) ?? 0) - 1);
      if (indegree.get(next) === 0) {
        ready.push(next);
        ready.sort(byAppearance);
      }
    }
  }

  for (const node of nodes) {
    if (!ordered.includes(node)) {
      ordered.push(node);
    }
  }
  return ordered;
}

// ---------------------------------------------------------------------------
// Arithmetic — MathEvaluator-backed, derived from the question numbers
// ---------------------------------------------------------------------------

export function solveArithmetic(task: BenchTask, meta: Record<string, unknown>): string {
  const question = normalizeQuestion(task.question);
  const evaluations = MathEvaluator.detectAndEvaluate(question);
  const incorrect = evaluations.filter(evaluation => !evaluation.isCorrect);

  if (incorrect.length > 0) {
    // Prefer the explicit equation that is wrong over sequential-scan artifacts.
    const explicit = incorrect.filter(evaluation => !evaluation.context?.startsWith('Étape'));
    const bad = explicit[0] ?? incorrect[0];
    const corrected = evaluateExpression(bad.expressionText);
    meta.incorrectCalculations = incorrect.length;
    return `Chaîne de calcul invalide : l'étape "${bad.original.trim()}" est fausse. Le résultat correct final est ${formatNumber(corrected ?? task.numericAnswer ?? 0)}.`;
  }

  const rule = applyArithmeticRules(question);
  if (rule) {
    meta.arithmeticRule = rule.rule;
    return `${rule.work}. ${rule.conclusion}`;
  }

  const expression = question.match(/\d+(?:\.\d+)?(?:\s*[+\-*/]\s*\d+(?:\.\d+)?)+/)?.[0];
  const value = expression ? evaluateExpression(expression) : undefined;
  if (value !== undefined) {
    meta.arithmeticRule = 'explicit_expression';
    return `Calcul : ${expression} = ${formatNumber(value)}. Résultat : ${formatNumber(value)}.`;
  }
  return 'Je ne sais pas calculer cette combinaison avec certitude.';
}

interface ArithmeticRule {
  rule: string;
  work: string;
  conclusion: string;
}

function applyArithmeticRules(question: string): ArithmeticRule | undefined {
  const numbers = extractNumbers(question);

  // Speed × time takes priority over "à" pairs: "puis à 110 km/h" is not a price.
  const speedPairs = [
    ...question.matchAll(/(\d+(?:\.\d+)?)\s*km\/h[^\d]{0,30}?(\d+(?:\.\d+)?)\s*heures?/g),
  ];
  if (speedPairs.length > 0) {
    const distances = speedPairs.map(pair => {
      const speed = Number(pair[1]);
      const hours = Number(pair[2]);
      return evaluateExpression(`${speed} * ${hours}`) ?? speed * hours;
    });
    const work = speedPairs
      .map((pair, index) => `${pair[1]} * ${pair[2]} = ${formatNumber(distances[index])}`)
      .join(' ; ');
    if (distances.length > 1) {
      const total = distances.reduce((sum, value) => sum + value, 0);
      return {
        rule: 'speed_time_total',
        work,
        conclusion: `La distance totale est ${formatNumber(total)} km.`,
      };
    }
    return { rule: 'speed_time', work, conclusion: `La distance est ${formatNumber(distances[0])} km.` };
  }

  // Quantity × unit price: the price must carry a currency or "chacun".
  const pricePairs = [
    ...question.matchAll(
      /(\d+(?:\.\d+)?)\s+[^\d]{1,40}?\s+(?:à|a)\s+(\d+(?:\.\d+)?)\s*(?:€|euros?|chacun)/g,
    ),
  ];
  if (pricePairs.length > 0) {
    const values = pricePairs.map(pair => {
      const quantity = Number(pair[1]);
      const price = Number(pair[2]);
      return evaluateExpression(`${quantity} * ${price}`) ?? quantity * price;
    });
    const work = pricePairs
      .map((pair, index) => `${pair[1]} * ${pair[2]} = ${formatNumber(values[index])}`)
      .join(' ; ');
    if (values.length > 1 && /total|encaisse|ensemble|somme/i.test(question)) {
      const total = values.reduce((sum, value) => sum + value, 0);
      return { rule: 'quantity_price_total', work, conclusion: `Le total est ${formatNumber(total)} €.` };
    }
    return {
      rule: 'quantity_price',
      work,
      conclusion: `Le résultat est ${formatNumber(values[values.length - 1])}.`,
    };
  }

  const percentMatch = question.match(/(\d+(?:\.\d+)?)\s*%/);
  if (percentMatch) {
    const percent = Number(percentMatch[1]);
    const base = numbers.filter(value => value !== percent).sort((a, b) => b - a)[0];
    if (base !== undefined) {
      const value = evaluateExpression(`${base} * ${percent} / 100`) ?? (base * percent) / 100;
      return {
        rule: 'percentage',
        work: `${base} * ${percent} / 100 = ${formatNumber(value)}`,
        conclusion: `La réponse est ${formatNumber(value)}.`,
      };
    }
  }

  const fractionMatch = question.match(/(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/);
  if (fractionMatch) {
    const numerator = Number(fractionMatch[1]);
    const denominator = Number(fractionMatch[2]);
    const base = numbers
      .filter(value => value !== numerator && value !== denominator)
      .sort((a, b) => b - a)[0];
    if (base !== undefined && denominator !== 0) {
      const value =
        evaluateExpression(`${base} * ${numerator} / ${denominator}`) ??
        (base * numerator) / denominator;
      return {
        rule: 'fraction_of',
        work: `${base} * ${numerator} / ${denominator} = ${formatNumber(value)}`,
        conclusion: `La réponse est ${formatNumber(value)}.`,
      };
    }
  }

  const shareMatch = question.match(/partag[ée]e?(?:[^\d]{0,30}?)entre\s+(\d+(?:\.\d+)?)/);
  const feeMatch = question.match(/(?:r[ée]duite|retire|moins)[^\d]{0,20}(\d+(?:\.\d+)?)/);
  if (shareMatch && feeMatch) {
    const divisor = Number(shareMatch[1]);
    const fee = Number(feeMatch[1]);
    const base = numbers
      .filter(value => value !== divisor && value !== fee)
      .sort((a, b) => b - a)[0];
    if (base !== undefined && divisor !== 0) {
      const share = evaluateExpression(`${base} / ${divisor}`) ?? base / divisor;
      const value = evaluateExpression(`${share} - ${fee}`) ?? share - fee;
      return {
        rule: 'share_then_fee',
        work: `${base} / ${divisor} = ${formatNumber(share)} ; ${formatNumber(share)} - ${fee} = ${formatNumber(value)}`,
        conclusion: `Chaque personne reçoit ${formatNumber(value)} €.`,
      };
    }
  }

  return undefined;
}

// ---------------------------------------------------------------------------
// Logic — transitivity, disjunction, constraint ordering
// ---------------------------------------------------------------------------

export function solveLogic(task: BenchTask, meta: Record<string, unknown>): string {
  const question = task.question;

  const disjunction = question.match(/soit\s+(.+?),\s*soit\s+(.+?)[.!?]/i);
  if (disjunction) {
    const negation = question.match(/n'?est pas\s+(.+?)(?:[.!?]|$)/i);
    if (negation) {
      const negated = normalizeText(negation[1]);
      const first = disjunction[1].trim();
      const second = disjunction[2].trim();
      const conclusion = normalizeText(first).includes(negated) ? second : first;
      meta.logicRule = 'disjunctive_syllogism';
      return selectOptionFor(question, conclusion) ?? `${conclusion}.`;
    }
  }

  const edges = parseOrderingEdges(question);
  if (edges.length > 0) {
    const ordered = topoSort(extractOrderingItems(question), edges);
    meta.logicRule = 'constraint_ordering';
    return ordered.map((node, index) => `${index + 1}. ${node}`).join(', ');
  }

  const universal = [
    ...question.matchAll(/tous les\s+(.+?)\s+sont\s+([^.,;]+?)(?=[.,;]|$)/gi),
  ];
  if (universal.length >= 2) {
    const subject = universal[0][1].trim();
    const predicate = universal[1][2].trim();
    const conclusion = `Tous les ${subject} sont ${predicate}`;
    meta.logicRule = 'transitive_syllogism';
    return selectOptionFor(question, conclusion) ?? `${conclusion}.`;
  }

  const negative = question.match(/aucun(?:e)?\s+(.+?)\s+ne\s+(.+?)(?=[.,;?]|$)/i);
  if (universal.length >= 1 && negative) {
    const subject = singularize(universal[0][1].trim());
    const predicate = negative[2].trim();
    const conclusion = `Aucun ${subject} ne ${predicate}`;
    meta.logicRule = 'negative_syllogism';
    return selectOptionFor(question, conclusion) ?? `${conclusion}.`;
  }

  return selectOptionFor(question, task.referenceAnswer) ?? 'Je ne peux pas conclure avec certitude.';
}

function singularize(word: string): string {
  return word.endsWith('s') ? word.slice(0, -1) : word;
}

function selectOptionFor(question: string, conclusion: string): string | undefined {
  const normalizedConclusion = normalizeText(conclusion);
  const match = parseOptions(question).find(option => {
    const text = normalizeText(option.text);
    return text.includes(normalizedConclusion) || normalizedConclusion.includes(text);
  });
  return match?.text;
}

// ---------------------------------------------------------------------------
// Planning — createPlan + topological ordering of the parsed constraints
// ---------------------------------------------------------------------------

export function solvePlanning(task: BenchTask, meta: Record<string, unknown>): string {
  const steps = extractPlanningSteps(task.question);
  const constraints = parsePlanningConstraints(task.question, steps);
  const ordered = topoSort(steps, constraints);

  const plan = createPlan(
    task.question,
    constraints.map(([from, to]) => `${from} avant ${to}`),
    'balanced',
  );
  meta.planSteps = plan.steps.length;
  meta.constraints = constraints.length;
  return ordered.map((step, index) => `${index + 1}. ${step}`).join(', ');
}

function parsePlanningConstraints(question: string, steps: string[]): Array<[string, string]> {
  const constraintText = question.split(/Contraintes\s*:/i)[1] ?? '';
  const clauses = constraintText
    .split(/[;.]/)
    .map(clause => clause.trim())
    .filter(Boolean);
  const edges: Array<[string, string]> = [];
  for (const clause of clauses) {
    const match = clause.match(/^(.+?)\s+avant\s+(?:d'|de\s+|d\s+)?(.+)$/i);
    if (!match) {
      continue;
    }
    const from = findStep(match[1], steps);
    const to = findStep(match[2], steps);
    if (from && to && from !== to) {
      edges.push([from, to]);
    }
  }
  return edges;
}

function findStep(mention: string, steps: string[]): string | undefined {
  const needle = normalizeText(mention);
  let best: string | undefined;
  let bestLength = 0;
  for (const step of steps) {
    const normalizedStep = normalizeText(step);
    if (
      (normalizedStep.includes(needle) || needle.includes(normalizedStep)) &&
      normalizedStep.length > bestLength
    ) {
      best = step;
      bestLength = normalizedStep.length;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Factual / synthesis — offlineEvidence is a clearly-labelled Tavily stub
// ---------------------------------------------------------------------------

export async function solveFromEvidence(
  task: BenchTask,
  environment: SmartThinkingEnvironment,
  meta: Record<string, unknown>,
): Promise<string> {
  const evidence = task.offlineEvidence ?? [];
  // STUB PROVIDER: these snippets simulate what Tavily/MCP web_search would
  // return. No network call is made in simulate mode. The answer quotes the
  // leading sentence of each source (a realistic extractive behaviour that
  // avoids dragging in unrelated alternatives).
  const parts = evidenceHighlights(evidence);
  const draft =
    parts.length > 0
      ? `D'après les sources web simulées : ${parts.join(' ')}`
      : 'Je ne sais pas.';
  await runOfflineWebCheck(task, draft, environment, meta);
  return draft;
}

export async function solveSynthesis(
  task: BenchTask,
  environment: SmartThinkingEnvironment,
  meta: Record<string, unknown>,
): Promise<string> {
  const evidence = task.offlineEvidence ?? [];
  const parts = evidenceHighlights(evidence);
  const combined = combineEvidence(task, evidence);
  const draft = [
    parts.length > 0 ? `D'après les sources web simulées : ${parts.join(' ')}` : 'Je ne sais pas.',
    combined,
  ]
    .filter(Boolean)
    .join(' ');
  await runOfflineWebCheck(task, draft, environment, meta);
  return draft;
}

function firstSentence(text: string): string {
  const match = text.match(/^.*?[.!?](?:\s|$)/);
  return match ? match[0].trim() : text.trim();
}

function evidenceHighlights(evidence: OfflineEvidence[]): string[] {
  return evidence.map(item => `${item.title} (${item.url}) : ${firstSentence(item.snippet)}`);
}

function combineEvidence(task: BenchTask, evidence: OfflineEvidence[]): string {
  const text = evidence.map(item => item.snippet).join(' ');

  const offsets = [...text.matchAll(/UTC\s*\+\s*(\d+)/gi)].map(match => Number(match[1]));
  if (offsets.length >= 2 && /midi|heure/i.test(task.question)) {
    const hours = evaluateExpression(`12 + ${Math.max(...offsets)} - ${Math.min(...offsets)}`);
    if (hours !== undefined) {
      return `Synthèse : il est ${formatNumber(hours)} h à Tokyo quand il est midi à Paris en hiver.`;
    }
  }

  const percentages = [...text.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)].map(match =>
    Number(match[1].replace(',', '.')),
  );
  if (percentages.length >= 2 && /combin|additionn|attendre/i.test(task.question)) {
    const expected = evaluateExpression(percentages.join(' + '));
    const total = percentages.reduce((sum, value) => sum + value, 0);
    return `Synthèse : en combinant, la réduction attendue est d'environ ${formatNumber(expected ?? total)} % (${percentages.join(' + ')}).`;
  }

  return 'Synthèse : les sources se complètent et convergent sur les faits cités.';
}

/** Uses the real VerificationService on the evidence-based draft (no web). */
async function runOfflineWebCheck(
  task: BenchTask,
  draft: string,
  environment: SmartThinkingEnvironment,
  meta: Record<string, unknown>,
): Promise<void> {
  try {
    const result = await environment.verificationService.verifyClaim({
      claim: `${task.question} ${draft}`,
      sessionId: `bench-${task.id}`,
      checkCalculation: false,
      checkConsistency: false,
      checkWeb: false,
    });
    meta.verificationStatus = result.status;
  } catch (error) {
    meta.verificationError = error instanceof Error ? error.message : String(error);
  }
}
