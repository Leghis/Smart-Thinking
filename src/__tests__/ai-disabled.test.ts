import { promises as fs } from 'fs';
import path from 'path';
import { FeatureFlags } from '../feature-flags';
import { EmbeddingService } from '../embedding-service';
import { analyzeForMetric, callInternalLlm, suggestLlmImprovements, verifyWithLlm } from '../utils/openrouter-client';

describe('Phase 1 AI disablement', () => {
  it('keeps external feature flags disabled by default', () => {
    expect(FeatureFlags.externalEmbeddingEnabled).toBe(false);
    expect(FeatureFlags.externalLlmEnabled).toBe(false);
  });

  it('provides deterministic local embeddings without external calls', async () => {
    const service = new EmbeddingService();
    const vector = await service.getEmbedding('Texte de test pour le mode local.');
    expect(Array.isArray(vector)).toBe(true);
    expect(vector.length).toBeGreaterThan(0);
    expect(vector.every(value => typeof value === 'number')).toBe(true);

    const comparison = await service.findSimilarTexts('test local', ['autre texte', 'test local ici'], 2, 0);
    expect(comparison.length).toBeGreaterThan(0);
  });

  it('replaces LLM-dependent utilities with heuristics', async () => {
    const llmResult = await callInternalLlm('system', 'user');
    expect(llmResult).toBeNull();

    const confidence = await analyzeForMetric('Cette affirmation est claire et précise.', 'confidence');
    expect(confidence).not.toBeNull();
    if (confidence !== null) {
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }

    const suggestions = await suggestLlmImprovements('Proposition courte et incertaine');
    expect(suggestions).toBeInstanceOf(Array);
    expect(suggestions?.length).toBeGreaterThan(0);

    const verification = await verifyWithLlm('Il est certain que 2+2=4.');
    expect(verification).not.toBeNull();
    expect(verification?.status).toBeDefined();
  });

  it('does not contain residual hard-coded API keys', async () => {
    const root = path.resolve(__dirname, '../..');
    const forbidden = [/sk-[a-z0-9]/i, /cohere_api_key/i, /openrouter_api_key/i];

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
