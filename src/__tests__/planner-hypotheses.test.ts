import { createPlan, suggestPlanQueries, updatePlanStep } from '../planner';
import {
  createHypothesis,
  deriveHypothesisReport,
  recordHypothesisEvidence,
  upsertHypotheses,
} from '../hypotheses';
import type { EvidenceItem } from '../types';

const MATH_GOAL = 'Calculer le coût total du projet';
const SEARCH_GOAL = "Rechercher les sources récentes sur l'actualité climatique";
const DECISION_GOAL = 'Choisir la meilleure option entre deux stratégies';

describe('planner', () => {
  test('selects goal-specific templates for math, search and decision goals', () => {
    const math = createPlan(MATH_GOAL);
    expect(math.steps[0].description).toContain('grandeurs connues');
    expect(math.template).toBe('math');

    const search = createPlan(SEARCH_GOAL);
    expect(search.steps[0].description).toContain('requêtes de recherche');
    expect(search.template).toBe('research');

    const decision = createPlan(DECISION_GOAL);
    expect(decision.steps[0].description).toContain('critères de décision');
    expect(decision.template).toBe('decision');
  });

  test('never turns a goal that merely mentions research into a literature review', () => {
    const plan = createPlan(
      'Évaluer la fiabilité du serveur MCP smart-thinking sur une tâche arithmétique, une tâche symbolique et une tâche de recherche documentaire',
    );

    expect(plan.template).toBe('generic');
    expect(plan.steps.map(step => step.description).join(' ')).not.toContain('requêtes de recherche');
    expect(plan.steps[0].description).toContain('sujet exact');
    expect(plan.signals).toEqual([]);
  });

  test('exposes match metadata and accepts a forced template', () => {
    const forced = createPlan('Objectif ambigu à cadrer', [], 'balanced', 5, 'decision');

    expect(forced.template).toBe('decision');
    expect(forced.matchConfidence).toBe(1);
    expect(forced.signals).toContain('template forcé');
    expect(forced.steps[0].description).toContain('critères de décision');
  });

  test('respects maxSteps and depth profile limits', () => {
    expect(createPlan(MATH_GOAL, [], 'balanced', 3).steps).toHaveLength(3);
    expect(createPlan(MATH_GOAL, [], 'balanced', 1).steps).toHaveLength(2);
    expect(createPlan(MATH_GOAL, [], 'fast').steps).toHaveLength(4);
    expect(createPlan(MATH_GOAL, [], 'deep').steps).toHaveLength(5);
  });

  test('builds ordered steps with dependencies and trims constraints', () => {
    const plan = createPlan(MATH_GOAL, ['  budget fixe  ', '   '], 'balanced', 3);

    expect(plan.goal).toBe(MATH_GOAL);
    expect(plan.constraints).toEqual(['budget fixe']);
    expect(plan.steps.map(step => step.id)).toEqual(['step-1', 'step-2', 'step-3']);
    expect(plan.steps.map(step => step.index)).toEqual([1, 2, 3]);
    expect(plan.steps[0].dependsOn).toEqual([]);
    expect(plan.steps[1].dependsOn).toEqual(['step-1']);
    expect(plan.steps.every(step => step.status === 'pending')).toBe(true);
    expect(plan.steps.every(step => step.successCriteria.length > 0)).toBe(true);
  });

  test('updates a single plan step without touching the others', () => {
    const plan = createPlan(MATH_GOAL, [], 'balanced', 3);
    const updated = updatePlanStep(plan, 'step-2', 'completed', ['ev-1', 'ev-2']);

    expect(updated.steps[1].status).toBe('completed');
    expect(updated.steps[1].evidenceIds).toEqual(['ev-1', 'ev-2']);
    expect(updated.steps[0].status).toBe('pending');
    expect(updated.steps[2].status).toBe('pending');
    expect(updated.updatedAt >= plan.updatedAt).toBe(true);
  });

  test('suggests search queries from the goal keywords', () => {
    const queries = suggestPlanQueries('Réduire le coût total du projet logistique', 3);

    expect(queries.length).toBeGreaterThan(0);
    expect(queries.length).toBeLessThanOrEqual(3);
    expect(queries.every(query => query.length > 0)).toBe(true);
  });
});

describe('hypotheses', () => {
  test('creates a hypothesis with clamped confidence and trimmed statement', () => {
    const hypothesis = createHypothesis({ statement: '  Hypothèse A  ', confidence: 2 });

    expect(hypothesis.statement).toBe('Hypothèse A');
    expect(hypothesis.confidence).toBe(1);
    expect(hypothesis.status).toBe('open');
    expect(hypothesis.evidenceFor).toEqual([]);
    expect(hypothesis.evidenceAgainst).toEqual([]);
  });

  test('upserts existing hypotheses by id and appends new ones', () => {
    const existing = createHypothesis({ statement: 'Hypothèse initiale', confidence: 0.4 });

    const updated = upsertHypotheses([existing], [
      { id: existing.id, statement: 'Hypothèse affinée', confidence: 0.9 },
      { statement: 'Hypothèse concurrente' },
    ]);

    expect(updated).toHaveLength(2);
    const refined = updated.find(hypothesis => hypothesis.id === existing.id);
    expect(refined?.statement).toBe('Hypothèse affinée');
    expect(refined?.confidence).toBe(0.9);
    expect(updated.some(hypothesis => hypothesis.statement === 'Hypothèse concurrente')).toBe(true);
  });

  test('derives refuted and supported statuses from recorded evidence', () => {
    const hypothesis = createHypothesis({ statement: 'La méthode A est plus rapide', confidence: 0.5 });

    const refuted = recordHypothesisEvidence([hypothesis], {
      id: hypothesis.id,
      contradict: 'contre-preuve',
    });
    expect(refuted[0].status).toBe('refuted');
    expect(refuted[0].confidence).toBeCloseTo(0.35, 5);

    const once = recordHypothesisEvidence([hypothesis], { id: hypothesis.id, support: 'preuve 1' });
    const twice = recordHypothesisEvidence(once, { id: hypothesis.id, support: 'preuve 2' });
    expect(twice[0].status).toBe('supported');
    expect(twice[0].confidence).toBeCloseTo(0.8, 5);
    expect(twice[0].evidenceFor).toEqual(['preuve 1', 'preuve 2']);
  });

  test('ranks supported hypotheses first and warns on untested supports', () => {
    const supportedBase = createHypothesis({ statement: 'Soutenue', confidence: 0.5 });
    const supported = recordHypothesisEvidence(
      recordHypothesisEvidence([supportedBase], { id: supportedBase.id, support: 'preuve 1' }),
      { id: supportedBase.id, support: 'preuve 2' },
    )[0];
    const refutedBase = createHypothesis({ statement: 'Réfutée', confidence: 0.5 });
    const refuted = recordHypothesisEvidence([refutedBase], {
      id: refutedBase.id,
      contradict: 'contre-preuve',
    })[0];
    const openHigh = createHypothesis({ statement: 'Ouverte haute', confidence: 0.9 });
    const openLow = createHypothesis({ statement: 'Ouverte basse', confidence: 0.2 });

    const { ranked, warnings } = deriveHypothesisReport([openLow, refuted, supported, openHigh], []);

    expect(ranked.map(hypothesis => hypothesis.status)).toEqual(['supported', 'open', 'open', 'refuted']);
    expect(ranked[1].id).toBe(openHigh.id);
    expect(ranked[2].id).toBe(openLow.id);
    expect(warnings.length).toBeGreaterThan(0);
  });

  test('attaches matching session evidence to the derived hypothesis', () => {
    const hypothesis = createHypothesis({ statement: 'La méthode A réduit le coût total' });
    const evidence: EvidenceItem = {
      id: 'ev-hyp',
      claim: 'La méthode A réduit le coût total',
      quote: 'Benchmark interne',
      sourceType: 'internal',
      source: 'session',
      stance: 'supports',
      confidence: 0.7,
      retrievedAt: '2026-01-01T00:00:00.000Z',
    };

    const { ranked } = deriveHypothesisReport([hypothesis], [evidence]);

    expect(ranked[0].evidenceFor).toContain('ev-hyp');
  });
});
