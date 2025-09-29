import { ReasoningOrchestrator } from '../reasoning-orchestrator';
import { SimilarityEngine } from '../similarity-engine';
import { QualityEvaluator } from '../quality-evaluator';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { Visualizer } from '../visualizer';
import { ServiceContainer } from '../services/service-container';
import { VerificationMemory } from '../verification-memory';
import { MemoryItem, SmartThinkingParams } from '../types';

class InMemoryMemoryManager {
  private graphStates = new Map<string, string>();
  private memories: MemoryItem[] = [];

  async loadGraphState(sessionId: string): Promise<string | null> {
    return this.graphStates.get(sessionId) ?? null;
  }

  async saveGraphState(sessionId: string, data: string): Promise<void> {
    this.graphStates.set(sessionId, data);
  }

  addMemory(content: string, tags: string[], sessionId: string): void {
    this.memories.push({
      id: `${sessionId}-${this.memories.length}`,
      content,
      tags,
      timestamp: new Date(),
      metadata: { sessionId }
    });
  }

  async getRelevantMemories(_content: string, limit: number, sessionId: string): Promise<MemoryItem[]> {
    return this.memories.filter(memory => memory.metadata?.sessionId === sessionId).slice(0, limit);
  }
}

describe('ReasoningOrchestrator', () => {
  beforeEach(() => {
    ServiceContainer.resetInstance();
    VerificationMemory.resetInstance();
  });

  afterEach(() => {
    VerificationMemory.resetInstance();
  });

  it('produces a reasoning trace with annotated thoughts', async () => {
    const similarityEngine = new SimilarityEngine();
    const metricsCalculator = new MetricsCalculator();
    const qualityEvaluator = new QualityEvaluator();
    const toolIntegrator = new ToolIntegrator();
    const visualizer = new Visualizer();

    const serviceContainer = ServiceContainer.getInstance();
    serviceContainer.initializeServices(toolIntegrator, metricsCalculator, similarityEngine);
    const verificationService = serviceContainer.getVerificationService();

    qualityEvaluator.setVerificationService(verificationService);
    VerificationMemory.getInstance().setSimilarityEngine(similarityEngine);

    const memoryManager = new InMemoryMemoryManager();

    const orchestrator = new ReasoningOrchestrator({
      similarityEngine,
      qualityEvaluator,
      verificationService,
      toolIntegrator,
      metricsCalculator,
      visualizer,
      memoryManager
    });

    const params: SmartThinkingParams = {
      thought: 'Comparer deux approches pour structurer le raisonnement interne.',
      thoughtType: 'regular',
      generateVisualization: false,
      suggestTools: true
    };

    const { response, thoughtGraph } = await orchestrator.run(params);

    expect(response.sessionId).toBeDefined();
    expect(response.reasoningTrace).toBeDefined();
    expect(response.reasoningTrace && response.reasoningTrace.length).toBeGreaterThan(0);
    expect(response.reasoningTimeline && response.reasoningTimeline.length).toBeGreaterThan(0);

    const thought = thoughtGraph.getThought(response.thoughtId);
    expect(thought?.reasoning?.justifications?.length).toBeGreaterThan(0);
    expect(thought?.reasoning?.heuristicWeights?.length).toBeGreaterThan(0);
  });

  it('supports visualization generation when requested', async () => {
    const similarityEngine = new SimilarityEngine();
    const metricsCalculator = new MetricsCalculator();
    const qualityEvaluator = new QualityEvaluator();
    const toolIntegrator = new ToolIntegrator();
    const visualizer = new Visualizer();

    const serviceContainer = ServiceContainer.getInstance();
    serviceContainer.initializeServices(toolIntegrator, metricsCalculator, similarityEngine);
    const verificationService = serviceContainer.getVerificationService();

    qualityEvaluator.setVerificationService(verificationService);
    VerificationMemory.getInstance().setSimilarityEngine(similarityEngine);

    const memoryManager = new InMemoryMemoryManager();

    const orchestrator = new ReasoningOrchestrator({
      similarityEngine,
      qualityEvaluator,
      verificationService,
      toolIntegrator,
      metricsCalculator,
      visualizer,
      memoryManager
    });

    const params: SmartThinkingParams = {
      thought: 'Créer une représentation graphique des arguments en faveur du plan.',
      thoughtType: 'regular',
      generateVisualization: true
    };

    const { response } = await orchestrator.run(params);
    expect(response.visualization).toBeDefined();
    expect(response.visualization?.nodes.length).toBeGreaterThan(0);
  });
});
