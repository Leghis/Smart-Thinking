import { promises as fs } from 'fs';
import path from 'path';
import { FeatureFlags } from '../feature-flags';
import { SimilarityEngine } from '../similarity-engine';
import { callInternalLlm } from '../utils/openrouter-client';
import { MetricsCalculator } from '../metrics-calculator';
import { ThoughtNode } from '../types';

describe('Phase 1 AI disablement', () => {
  it('keeps external feature flags disabled by default', () => {
    expect(FeatureFlags.externalEmbeddingEnabled).toBe(false);
    expect(FeatureFlags.externalLlmEnabled).toBe(false);
  });

  it('expose un moteur de similarité local déterministe', async () => {
    const engine = new SimilarityEngine();
    const [vector] = await engine.generateVectors(['Texte de test pour le mode local.']);
    expect(vector).toBeDefined();
    expect(Object.keys(vector).length).toBeGreaterThan(0);

    const comparison = await engine.findSimilarTexts('test local', ['autre texte', 'test local ici'], 2, 0);
    expect(comparison.length).toBeGreaterThan(0);
    comparison.forEach(result => {
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(1);
    });

    const similarity = await engine.calculateTextSimilarity('Machine learning', 'Apprentissage automatique machine');
    expect(similarity).toBeGreaterThan(0);
  });

  it('replaces LLM-dependent utilities with heuristics', async () => {
    const llmResult = await callInternalLlm('system', 'user');
    expect(llmResult).toBeNull();

    const calculator = new MetricsCalculator();
    const baseThought: ThoughtNode = {
      id: 't-heuristic',
      content: 'Cette affirmation est claire et étayée par deux études publiées en 2023.',
      type: 'regular',
      timestamp: new Date(),
      connections: [],
      metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 },
      metadata: {}
    };

    const confidence = await calculator.calculateConfidence(baseThought, []);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);

    const quality = await calculator.calculateQuality(baseThought, []);
    expect(quality).toBeGreaterThanOrEqual(0);
    expect(quality).toBeLessThanOrEqual(1);

    const breakdown = calculator.getMetricBreakdown(baseThought.id);
    expect(breakdown?.confidence).toBeDefined();
    expect(breakdown?.quality).toBeDefined();
  });

  it('does not contain residual hard-coded API keys', async () => {
    const root = path.resolve(__dirname, '../..');
    const forbidden = [/(?:^|[^a-z])sk-[a-z0-9]/i, /cohere_api_key/i, /openrouter_api_key/i];

    async function walk(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files = await Promise.all(entries.map(async entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'coverage', 'build'].includes(entry.name)) {
            return [];
          }
          return walk(fullPath);
        }
        if (entry.name.endsWith('.ts') || entry.name.endsWith('.js') || entry.name.endsWith('.json')) {
          return [fullPath];
        }
        return [];
      }));
      return files.flat();
    }

    const files = await walk(root);
    for (const file of files) {
      if (path.resolve(file) === path.resolve(__filename)) {
        continue;
      }
      const content = await fs.readFile(file, 'utf8');
      forbidden.forEach(pattern => {
        expect(content).not.toMatch(pattern);
      });
    }
  });
});
