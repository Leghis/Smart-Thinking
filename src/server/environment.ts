import path from 'path';
import { readFileSync } from 'fs';
import { MemoryManager } from '../memory-manager';
import { MetricsCalculator } from '../metrics-calculator';
import { QualityEvaluator } from '../quality-evaluator';
import { ReasoningOrchestrator } from '../reasoning-orchestrator';
import { SimilarityEngine } from '../similarity-engine';
import { SessionStore } from '../session-store';
import { VerificationMemory } from '../verification-memory';
import { Visualizer } from '../visualizer';
import { SearchService } from '../search/search-service';
import { WebCreditLedger } from '../search/web-budget';
import { VerificationService } from '../services/verification-service';
import { loadRuntimeConfig, type RuntimeConfig } from '../config';
import { configureLogger, createLogger } from '../utils/logger';
import { createAssistClient, type AssistClient } from '../reasoning/assist';
import { ClaimLedger } from '../reasoning/claims';

const log = createLogger('environment');

export interface SmartThinkingEnvironment {
  runtime: RuntimeConfig;
  similarityEngine: SimilarityEngine;
  metricsCalculator: MetricsCalculator;
  qualityEvaluator: QualityEvaluator;
  visualizer: Visualizer;
  memoryManager: MemoryManager;
  verificationMemory: VerificationMemory;
  verificationService: VerificationService;
  sessionStore: SessionStore;
  searchService: SearchService;
  webCredits: WebCreditLedger;
  assist: AssistClient;
  claims: ClaimLedger;
  orchestrator: ReasoningOrchestrator;
  version: string;
}

export interface EnvironmentOptions {
  dataDir?: string;
  persistenceDisabled?: boolean;
  search?: Partial<RuntimeConfig['search']>;
  runtime?: Partial<RuntimeConfig>;
}

function loadPackageVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, '..', '..', 'package.json');
    const parsed = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: string };
    return parsed.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function createEnvironment(options: EnvironmentOptions = {}): SmartThinkingEnvironment {
  const baseRuntime = loadRuntimeConfig();
  const runtime: RuntimeConfig = {
    ...baseRuntime,
    ...options.runtime,
    search: { ...baseRuntime.search, ...options.search, ...options.runtime?.search },
    persistence: {
      ...baseRuntime.persistence,
      ...options.runtime?.persistence,
      ...(options.dataDir ? { dataDir: options.dataDir } : {}),
      ...(options.persistenceDisabled !== undefined ? { disabled: options.persistenceDisabled } : {}),
    },
  };

  configureLogger({ level: runtime.logLevel, format: runtime.logFormat });

  const similarityEngine = new SimilarityEngine();
  const metricsCalculator = new MetricsCalculator();
  const qualityEvaluator = new QualityEvaluator({ metricsCalculator });
  const visualizer = new Visualizer();
  const memoryManager = new MemoryManager(similarityEngine, {
    dataDir: runtime.persistence.dataDir,
    persistenceDisabled: runtime.persistence.disabled,
  });
  const verificationMemory = VerificationMemory.getInstance({
    dataDir: runtime.persistence.dataDir,
    persistenceDisabled: runtime.persistence.disabled,
  });
  verificationMemory.setSimilarityEngine(similarityEngine);

  const searchService = new SearchService({
    envApiKey: runtime.search.tavilyApiKey,
    defaultProvider: runtime.search.provider,
    defaultDepth: runtime.search.searchDepth,
    timeoutMs: runtime.search.requestTimeoutMs,
  });
  const webCredits = new WebCreditLedger(runtime.search.webCreditBudget);

  const assist = createAssistClient();
  const claims = new ClaimLedger();
  const verificationService = new VerificationService({
    verificationMemory,
    searchService,
    enableWebVerification: runtime.search.provider !== 'off',
    offline: runtime.persistence.disabled,
    assist,
  });
  qualityEvaluator.setVerificationService(verificationService);

  const sessionStore = new SessionStore({
    dataDir: runtime.persistence.dataDir,
    persistenceDisabled: runtime.persistence.disabled,
  });

  const orchestrator = new ReasoningOrchestrator({
    similarityEngine,
    qualityEvaluator,
    verificationService,
    metricsCalculator,
    visualizer,
    memoryManager,
    sessionStore,
    searchService,
    runtime,
  });

  log.info('Environnement Smart-Thinking initialisé', {
    searchProvider: runtime.search.provider,
    tavilyConfigured: Boolean(runtime.search.tavilyApiKey),
    persistence: runtime.persistence.disabled ? 'disabled' : 'enabled',
  });

  return {
    runtime,
    similarityEngine,
    metricsCalculator,
    qualityEvaluator,
    visualizer,
    memoryManager,
    verificationMemory,
    verificationService,
    sessionStore,
    searchService,
    webCredits,
    assist,
    claims,
    orchestrator,
    version: loadPackageVersion(),
  };
}

let sharedEnvironment: SmartThinkingEnvironment | null = null;

export function getSmartThinkingEnvironment(): SmartThinkingEnvironment {
  if (!sharedEnvironment) {
    sharedEnvironment = createEnvironment();
  }
  return sharedEnvironment;
}

export function setSmartThinkingEnvironment(environment: SmartThinkingEnvironment | null): void {
  sharedEnvironment = environment;
}

export function resetSmartThinkingEnvironment(): void {
  sharedEnvironment = null;
  VerificationMemory.resetInstance();
}
