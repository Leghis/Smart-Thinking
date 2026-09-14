/**
 * v13 benchmark grader — deterministic and dependency-free.
 *
 * Arithmetic tasks: extract the last number in the answer and compare it to
 * `numericAnswer` within `numericTolerance` (default 1e-6). When the reference
 * answer itself declares the reasoning invalid (e.g. a wrong chain equation),
 * the answer must also explicitly state that an error exists.
 *
 * Other categories: `keyFacts` coverage ratio after case/accent-insensitive
 * normalization. Optional `forbiddenPatterns` become `hallucinationFlags`.
 */

import type { BenchTask, TaskScore } from './types';

const DEFAULT_TOLERANCE = 1e-6;

const INVALIDITY_RE =
  /(invalide|incorrect|erron[ée]|faux|fausse|fausses|n'est pas correct|ne sont pas corrects|erreur)/i;
const CLAIMS_VALIDITY_RE =
  /(est correct|sont corrects|calcul valide|raisonnement valide|aucune erreur|tout est juste|cha[îi]ne valide)/i;
const CONTRADICTION_RE = /(contradiction|contradictoire|incoh[ée]rent|s'?auto-?contredit)/i;

/** Lowercase, strip accents and punctuation, collapse whitespace. */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Removes thousand separators (spaces, narrow spaces, grouped commas) from numbers. */
export function stripThousandSeparators(input: string): string {
  let current = input;
  let previous: string;
  do {
    previous = current;
    current = current
      .replace(/(\d)[\s\u00a0\u202f](?=\d{3}(?!\d))/g, '$1')
      .replace(/(\d),(?=\d{3}(?!\d))/g, '$1');
  } while (current !== previous);
  return current;
}

/** Extract numbers, accepting both `12.5` and French `12,5` decimals. */
export function extractNumbers(input: string): number[] {
  const normalized = stripThousandSeparators(input);
  const matches = normalized.match(/-?\d+(?:[.,]\d+)?/g) ?? [];
  return matches
    .map(raw => Number.parseFloat(raw.replace(',', '.')))
    .filter(value => Number.isFinite(value));
}

function collapseDigitSpaces(input: string): string {
  return input.replace(/(\d)\s(?=\d)/g, '$1');
}

const BILINGUAL_SYNONYMS: Record<string, string[]> = {
  yes: ['yes', 'oui', 'true', 'vrai', 'vraie'],
  no: ['no', 'non', 'false', 'faux', 'fausse'],
};

function containsNormalizedFact(haystack: string, needle: string): boolean {
  const normalizedNeedle = collapseDigitSpaces(normalizeText(needle));
  if (!normalizedNeedle) {
    return false;
  }
  const normalizedHaystack = ` ${collapseDigitSpaces(haystack)} `;
  const variants = BILINGUAL_SYNONYMS[normalizedNeedle] ?? [normalizedNeedle];
  return variants.some(variant => normalizedHaystack.includes(` ${variant} `));
}

function gradeArithmetic(task: BenchTask, answer: string): TaskScore {
  const numbers = extractNumbers(answer);
  const tolerance = task.numericTolerance ?? DEFAULT_TOLERANCE;
  const expected = task.numericAnswer;
  const matches = (value: number | undefined): boolean =>
    value !== undefined && expected !== undefined && Math.abs(value - expected) <= tolerance;

  const last = numbers.length > 0 ? numbers[numbers.length - 1] : undefined;
  let numericOk = matches(last);

  if (!numericOk) {
    const finalMarker = answer.match(
      /(?:réponse finale|réponse|resultat|résultat|total final|answer)\s*:?\s*\(?(-?\d+(?:[.,]\d+)?)\)?/i,
    );
    if (finalMarker) {
      numericOk = matches(Number.parseFloat(finalMarker[1].replace(',', '.')));
    }
  }

  if (!numericOk && expected !== undefined) {
    const expectedPattern = new RegExp(`(-?\\d+(?:[.,]\\d+)?)\\s*(?:est\\s+)?(?:faux|fausse|incorrect|erroné)`);
    const deniesExpected = expectedPattern.test(answer) &&
      Math.abs(Number.parseFloat(answer.match(expectedPattern)![1].replace(',', '.')) - expected) <= tolerance;
    numericOk = numbers.some(value => matches(value)) && !deniesExpected;
  }

  const referenceInvalid = INVALIDITY_RE.test(task.referenceAnswer);
  const detectsError = INVALIDITY_RE.test(answer);
  const claimsValidity = CLAIMS_VALIDITY_RE.test(answer);

  let score = numericOk ? 1 : 0;
  if (referenceInvalid && !detectsError) {
    score = 0;
  }

  const flags = collectHallucinationFlags(task, answer);
  const containsContradiction = referenceInvalid
    ? claimsValidity
    : flags.length > 0 || CONTRADICTION_RE.test(answer);

  const details: string[] = [];
  details.push(
    last === undefined
      ? 'aucun nombre extrait'
      : `dernier nombre ${last} ${numericOk ? '✓' : '≠'} ${task.numericAnswer}`,
  );
  if (referenceInvalid) {
    details.push(detectsError ? 'erreur signalée' : 'erreur NON signalée');
  }
  if (flags.length > 0) {
    details.push(`hallucinations: ${flags.join(', ')}`);
  }

  return {
    taskId: task.id,
    category: task.category,
    condition: 'baseline',
    score,
    exactMatch: score === 1,
    extractedNumbers: numbers,
    coveredKeyFacts: [],
    missedKeyFacts: score === 1 ? [] : task.keyFacts,
    hallucinationFlags: flags,
    containsContradiction,
    rationale: details.join('; '),
  };
}


function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Finds a whole-word (or whole-phrase) occurrence of `fact` at or after `from`. */
function findFactFrom(haystack: string, fact: string, from: number): number {
  const pattern = new RegExp(`(?:^|[^a-z0-9])(${escapeRegExp(fact)})(?=$|[^a-z0-9])`, 'g');
  const match = pattern.exec(haystack.slice(Math.max(from, 0)));
  if (!match) {
    return -1;
  }
  return Math.max(from, 0) + match.index + (match[0].length - match[1].length);
}

function collectHallucinationFlags(task: BenchTask, answer: string): string[] {
  if (!task.forbiddenPatterns || task.forbiddenPatterns.length === 0) {
    return [];
  }
  const normalizedAnswer = normalizeText(answer);
  return task.forbiddenPatterns.filter(pattern =>
    containsNormalizedFact(normalizedAnswer, pattern),
  );
}

function gradeCoverage(task: BenchTask, answer: string): TaskScore {
  const normalizedAnswer = normalizeText(answer);
  const covered: string[] = [];
  const missed: string[] = [];
  for (const fact of task.keyFacts) {
    if (containsNormalizedFact(normalizedAnswer, fact)) {
      covered.push(fact);
    } else {
      missed.push(fact);
    }
  }
  const flags = collectHallucinationFlags(task, answer);

  let score: number;
  let rationale: string;

  if (task.orderedFacts && task.orderedFacts.length > 0) {
    let cursor = -1;
    let ordered = true;
    let presentCount = 0;
    for (const fact of task.orderedFacts) {
      const normalizedFact = normalizeText(fact);
      const position = normalizedFact ? findFactFrom(normalizedAnswer, normalizedFact, cursor + 1) : -1;
      if (position < 0) {
        ordered = false;
      } else {
        presentCount += 1;
        cursor = position;
      }
    }
    if (ordered) {
      score = 1;
      rationale = 'ordre correct';
    } else {
      score = Math.round((presentCount / task.orderedFacts.length) * 50) / 100;
      rationale = `ordre incorrect (${presentCount}/${task.orderedFacts.length} présents)`;
    }
  } else if (task.expectedLetter) {
    const letter = task.expectedLetter.toLowerCase();
    const letterRe = new RegExp(
      `(?:^|\\s|\\(|réponse|reponse|choix|option|answer)\\s*:?\\s*\\(?${letter}\\)?(?:\\s|$|[.,;])`,
      'i',
    );
    const letterOk =
      normalizedAnswer === letter || letterRe.test(` ${normalizedAnswer} `);
    score = letterOk ? 1 : Math.round((covered.length / Math.max(task.keyFacts.length, 1)) * 50) / 100;
    rationale = letterOk
      ? `choix ${task.expectedLetter.toUpperCase()}`
      : `faits ${covered.length}/${task.keyFacts.length}`;
  } else {
    const total = task.keyFacts.length;
    score = total === 0 ? (answer.trim() ? 1 : 0) : Math.round((covered.length / total) * 100) / 100;
    rationale = `faits ${covered.length}/${total}`;
  }

  return {
    taskId: task.id,
    category: task.category,
    condition: 'baseline',
    score,
    exactMatch: score === 1,
    extractedNumbers: extractNumbers(answer),
    coveredKeyFacts: covered,
    missedKeyFacts: missed,
    hallucinationFlags: flags,
    containsContradiction: flags.length > 0 || CONTRADICTION_RE.test(answer),
    rationale: `${rationale}${flags.length > 0 ? `; hallucinations: ${flags.join(', ')}` : ''}`,
  };
}

export function gradeAnswer(task: BenchTask, answer: string, condition: TaskScore['condition'] = 'baseline'): TaskScore {
  const score =
    task.category === 'arithmetic' ? gradeArithmetic(task, answer) : gradeCoverage(task, answer);
  return { ...score, condition };
}

export function gradeAll(
  tasks: BenchTask[],
  answers: Array<{ task: BenchTask; answer: string; condition: TaskScore['condition'] }>,
): TaskScore[] {
  const byId = new Map(tasks.map(task => [task.id, task]));
  return answers.map(entry => {
    const task = byId.get(entry.task.id) ?? entry.task;
    return gradeAnswer(task, entry.answer, entry.condition);
  });
}
