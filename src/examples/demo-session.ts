import { ReasoningOrchestrator } from '../reasoning-orchestrator';
import { SimilarityEngine } from '../similarity-engine';
import { QualityEvaluator } from '../quality-evaluator';
import { ToolIntegrator } from '../tool-integrator';
import { MetricsCalculator } from '../metrics-calculator';
import { Visualizer } from '../visualizer';
import { MemoryManager } from '../memory-manager';
import { ServiceContainer } from '../services/service-container';
import { VerificationMemory } from '../verification-memory';
import { SmartThinkingParams, SmartThinkingResponse, ReasoningStep } from '../types';

interface DemoContext {
  sessionId: string;
  previousThoughtIds: string[];
}

interface DemoStep {
  title: string;
  description: string;
  buildParams: (context: DemoContext) => SmartThinkingParams;
}

function createOrchestrator(): ReasoningOrchestrator {
  const similarityEngine = new SimilarityEngine();
  const metricsCalculator = new MetricsCalculator();
  const qualityEvaluator = new QualityEvaluator();
  const toolIntegrator = new ToolIntegrator();
  const visualizer = new Visualizer();
  const memoryManager = new MemoryManager(similarityEngine);

  const serviceContainer = ServiceContainer.getInstance();
  serviceContainer.initializeServices(toolIntegrator, metricsCalculator, similarityEngine);

  const verificationService = serviceContainer.getVerificationService();
  const verificationMemory = VerificationMemory.getInstance();
  verificationMemory.setSimilarityEngine(similarityEngine);
  qualityEvaluator.setVerificationService(verificationService);

  return new ReasoningOrchestrator({
    similarityEngine,
    qualityEvaluator,
    verificationService,
    toolIntegrator,
    metricsCalculator,
    visualizer,
    memoryManager
  });
}

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function printTimeline(response: SmartThinkingResponse): void {
  const timeline = response.reasoningTimeline || [];
  console.log('  Timeline:');
  for (const step of timeline) {
    console.log(`    [${step.status}] ${step.label} — ${step.timestamp}`);
  }
}

function printHeuristicSummary(trace: ReasoningStep[] | undefined): void {
  if (!trace) {
    return;
  }
  const evaluationStep = trace.find(step => step.kind === 'evaluation' && step.status === 'completed');
  if (!evaluationStep) {
    return;
  }
  const details = evaluationStep.details as Record<string, unknown> | undefined;
  if (!details) {
    return;
  }
  const { confidence, relevance, quality } = details as { confidence?: number; relevance?: number; quality?: number };
  if (typeof confidence === 'number' && typeof relevance === 'number' && typeof quality === 'number') {
    console.log(`  Heuristics → confidence ${formatPercent(confidence)}, relevance ${formatPercent(relevance)}, quality ${formatPercent(quality)}`);
  }
}

async function runDemo(): Promise<void> {
  const orchestrator = createOrchestrator();
  const sessionId = `demo-session-${Date.now()}`;
  const context: DemoContext = {
    sessionId,
    previousThoughtIds: []
  };

  const steps: DemoStep[] = [
    {
      title: 'Baseline observation',
      description: 'Capture an initial fact without triggering deep verification.',
      buildParams: ({ sessionId: sid }) => ({
        sessionId: sid,
        thought: 'The Eiffel Tower stands 324 meters tall and uses two separate elevator systems.',
        thoughtType: 'regular'
      })
    },
    {
      title: 'Cross-check calculation',
      description: 'Add a calculation-oriented thought and request explicit verification.',
      buildParams: ({ sessionId: sid, previousThoughtIds }) => ({
        sessionId: sid,
        thought: 'Maintenance reports indicate that repainting 250,000 square meters with 60 tons of paint every seven years prevents corrosion.',
        thoughtType: 'hypothesis',
        containsCalculations: true,
        requestVerification: true,
        connections: previousThoughtIds.slice(-1).map(id => ({
          targetId: id,
          type: 'supports',
          strength: 0.8
        }))
      })
    },
    {
      title: 'Synthesis and next steps',
      description: 'Produce a follow-up reasoning step connected to previous context.',
      buildParams: ({ sessionId: sid, previousThoughtIds }) => ({
        sessionId: sid,
        thought: 'Given the maintenance cadence, evaluating humidity forecasts could optimise the next repaint window.',
        thoughtType: 'conclusion',
        requestSuggestions: true,
        suggestTools: true,
        connections: previousThoughtIds.map(id => ({
          targetId: id,
          type: 'synthesizes',
          strength: 0.7
        }))
      })
    }
  ];

  console.log('Smart-Thinking progressive reasoning demo');
  console.log(`Session: ${sessionId}`);
  console.log('----------------------------------------');

  for (const step of steps) {
    const params = step.buildParams(context);
    const { response, thoughtGraph } = await orchestrator.run(params);

    console.log(`\nStep: ${step.title}`);
    console.log(`Description: ${step.description}`);
    console.log(`Thought ID: ${response.thoughtId}`);
    console.log(`Metrics → confidence ${formatPercent(response.qualityMetrics.confidence)}, relevance ${formatPercent(response.qualityMetrics.relevance)}, quality ${formatPercent(response.qualityMetrics.quality)}`);
    if (response.verificationStatus) {
      console.log(`Verification status: ${response.verificationStatus}`);
    }
    if (typeof response.reliabilityScore === 'number') {
      console.log(`Reliability score: ${formatPercent(response.reliabilityScore)}`);
    }
    printHeuristicSummary(response.reasoningTrace);
    printTimeline(response);

    const sessionThoughts = thoughtGraph.getAllThoughts(context.sessionId);
    const connectionCount = sessionThoughts.reduce((total, node) => total + node.connections.length, 0);
    console.log(`  Graph snapshot → ${sessionThoughts.length} thoughts, ${connectionCount} connections.`);

    context.previousThoughtIds.push(response.thoughtId);
  }

  console.log('\nDemo complete. Inspect persisted data or run the MCP server to continue the session.');
}

runDemo().catch(error => {
  console.error('Demo failed:', error);
  process.exit(1);
});
