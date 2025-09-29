import path from 'path';
import { readFileSync } from 'fs';
import { FeatureFlags } from '../feature-flags';
import { MemoryManager } from '../memory-manager';
import { MetricsCalculator } from '../metrics-calculator';
import { QualityEvaluator } from '../quality-evaluator';
import { ReasoningOrchestrator } from '../reasoning-orchestrator';
import { SimilarityEngine } from '../similarity-engine';
import { ToolIntegrator } from '../tool-integrator';
import { VerificationMemory } from '../verification-memory';
import { ServiceContainer } from '../services/service-container';
import { Visualizer } from '../visualizer';

export interface SmartThinkingEnvironment {
  similarityEngine: SimilarityEngine;
  metricsCalculator: MetricsCalculator;
  qualityEvaluator: QualityEvaluator;
  toolIntegrator: ToolIntegrator;
  visualizer: Visualizer;
  memoryManager: MemoryManager;
  verificationMemory: VerificationMemory;
  version: string;
  orchestrator: ReasoningOrchestrator;
}

let sharedEnvironment: SmartThinkingEnvironment | null = null;

function loadPackageVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const data = readFileSync(packageJsonPath, 'utf8');
    const parsed = JSON.parse(data) as { version?: string };
    return parsed.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function buildEnvironment(): SmartThinkingEnvironment {
  if (FeatureFlags.externalEmbeddingEnabled) {
    console.warn('FeatureFlags.externalEmbeddingEnabled est activé mais aucun fournisseur externe n\'est disponible.');
  }

  const similarityEngine = new SimilarityEngine();
  const metricsCalculator = new MetricsCalculator();
  const qualityEvaluator = new QualityEvaluator();
  const toolIntegrator = new ToolIntegrator();
  const visualizer = new Visualizer();
  const memoryManager = new MemoryManager(similarityEngine);
  const verificationMemory = VerificationMemory.getInstance();

  verificationMemory.setSimilarityEngine(similarityEngine);

  const serviceContainer = ServiceContainer.getInstance();
  serviceContainer.initializeServices(toolIntegrator, metricsCalculator, similarityEngine);
  const verificationService = serviceContainer.getVerificationService();
  qualityEvaluator.setVerificationService(verificationService);

  const orchestrator = new ReasoningOrchestrator({
    similarityEngine,
    qualityEvaluator,
    verificationService,
    toolIntegrator,
    metricsCalculator,
    visualizer,
    memoryManager
  });

  return {
    similarityEngine,
    metricsCalculator,
    qualityEvaluator,
    toolIntegrator,
    visualizer,
    memoryManager,
    verificationMemory,
    orchestrator,
    version: loadPackageVersion()
  };
}

export function getSmartThinkingEnvironment(): SmartThinkingEnvironment {
  if (!sharedEnvironment) {
    sharedEnvironment = buildEnvironment();
  }
  return sharedEnvironment;
}
