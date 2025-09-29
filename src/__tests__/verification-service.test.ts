import { VerificationService } from '../services/verification-service';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { VerificationMemory } from '../verification-memory';
import { SimilarityEngine } from '../similarity-engine';
import { ThoughtNode, ThoughtMetrics } from '../types';

class SilentToolIntegrator extends ToolIntegrator {
  async suggestVerificationTools(): Promise<any[]> {
    return [];
  }

  async executeVerificationTool(): Promise<any> {
    return null;
  }
}

const createThought = (id: string, content: string, type: ThoughtNode['type'] = 'regular'): ThoughtNode => ({
  id,
  content,
  type,
  timestamp: new Date(),
  connections: [],
  metrics: { confidence: 0.5, relevance: 0.5, quality: 0.5 } as ThoughtMetrics,
  metadata: {}
});

describe('VerificationService heuristics integration', () => {
  let service: VerificationService;
  let verificationMemory: VerificationMemory;

  beforeEach(() => {
    VerificationMemory.resetInstance();
    verificationMemory = VerificationMemory.getInstance();
    verificationMemory.setSimilarityEngine(new SimilarityEngine());

    const toolIntegrator = new SilentToolIntegrator();
    const metricsCalculator = new MetricsCalculator();
    service = new VerificationService(toolIntegrator, metricsCalculator, verificationMemory);
  });

  afterEach(() => {
    verificationMemory.stopCleanupTasks();
    VerificationMemory.resetInstance();
  });

  it('returns a coherent verification status without external tools', async () => {
    const thought = createThought('fact-1', 'Il est certain que l\'eau bout à 100 °C au niveau de la mer.');
    const result = await service.deepVerify(thought, false, true, 'test-session');
    expect(result.status).toBeDefined();
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('flags contradictory statements heuristically', async () => {
    const contradictoryThought = createThought('fact-2', 'Il est absolument certain et parfaitement impossible que 2 + 2 soient égaux à 5.');
    const result = await service.deepVerify(contradictoryThought, false, true, 'test-session-2');
    expect(['contradicted', 'uncertain', 'unverified']).toContain(result.status);
  });
});
