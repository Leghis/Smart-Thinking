/**
 * v13 benchmark harness — shared types.
 *
 * The harness measures a weak model (baseline) against the same weak model
 * augmented by the REAL Smart-Thinking pipeline (tool condition). Everything
 * here is offline-capable and dependency-free.
 */

export type BenchCategory = 'arithmetic' | 'logic' | 'planning' | 'factual' | 'synthesis';
export type Condition = 'baseline' | 'tool';
export type BenchmarkMode = 'simulate' | 'live';

export interface OfflineEvidence {
  title: string;
  url: string;
  snippet: string;
}

export interface BenchTask {
  id: string;
  category: BenchCategory;
  question: string;
  referenceAnswer: string;
  /** Concrete strings the grader looks for (accent/case-insensitive). */
  keyFacts: string[];
  /** Arithmetic tasks only: expected numeric result. */
  numericAnswer?: number;
  /** Arithmetic tasks only: absolute tolerance (default 1e-6). */
  numericTolerance?: number;
  /** True when the task normally requires web evidence. */
  requiresWeb: boolean;
  difficulty: 1 | 2 | 3;
  /** Simulated web results used offline as a Tavily stand-in (clearly a stub). */
  offlineEvidence?: OfflineEvidence[];
  /** Common wrong answers; used for hallucination checks and baseline guessing. */
  forbiddenPatterns?: string[];
  /** Multiple-choice tasks: the expected option letter (A/B/C/...). */
  expectedLetter?: string;
  /** Ordering tasks: expected order of apparition of these tokens. */
  orderedFacts?: string[];
  /** Provenance of the task (benchmark name) when sampled from a public dataset. */
  source?: string;
}

export interface ModelMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  /** Assistant tool calls (OpenAI-style native function calling). */
  toolCalls?: ToolCall[];
  /** Links a tool result message back to its call. */
  toolCallId?: string;
}

export interface GenerateRequest {
  system: string;
  messages: ModelMessage[];
}

export interface GenerateResponse {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
  latencyMs: number;
  /** Optional provenance (pipeline steps, verification status, seeds). */
  meta?: Record<string, unknown>;
}

export interface ToolSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id?: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatRequest extends GenerateRequest {
  tools?: ToolSchema[];
}

export interface ChatResponse extends GenerateResponse {
  toolCalls?: ToolCall[];
}

export interface ModelProvider {
  name: string;
  /** Minimal uniform surface used by run.ts for both conditions. */
  generate(request: GenerateRequest): Promise<GenerateResponse>;
  /**
   * True when the provider expects the agent-runner tool loop. The simulated
   * tool provider sets this to false because generate() already runs the real
   * pipeline in-process.
   */
  agentic?: boolean;
  supportsTools?: boolean;
  /** Rich surface (native function calling or the text tool protocol). */
  chat?(request: ChatRequest): Promise<ChatResponse>;
  /** Optional cleanup (e.g. stopping an embedded model server). */
  dispose?(): Promise<void> | void;
}

export interface RunResult {
  taskId: string;
  category: BenchCategory;
  condition: Condition;
  provider: string;
  answer: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  toolCalls?: number;
  seed: number;
  error?: string;
  raw?: Record<string, unknown>;
}

export interface TaskScore {
  taskId: string;
  category: BenchCategory;
  condition: Condition;
  score: number;
  exactMatch: boolean;
  extractedNumbers: number[];
  coveredKeyFacts: string[];
  missedKeyFacts: string[];
  hallucinationFlags: string[];
  containsContradiction: boolean;
  rationale: string;
}

export interface ConditionStats {
  condition: Condition;
  tasks: number;
  runs: number;
  accuracy: number;
  exactMatchRate: number;
  meanLatencyMs: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
  wins: number;
  losses: number;
  ties: number;
  hallucinations: number;
  contradictions: number;
}

export interface BenchDelta {
  absolutePp: number;
  relativePct: number | null;
  wins: number;
  losses: number;
  ties: number;
  signTestPValue: number;
}

export interface BenchReport {
  label: string;
  provider: string;
  mode: BenchmarkMode;
  seed: number;
  generatedAt: string;
  tasks: number;
  conditions: Condition[];
  delta?: BenchDelta;
  stats: ConditionStats[];
  results: RunResult[];
  scores: TaskScore[];
  notes: string[];
}

export interface CliOptions {
  provider: 'simulate' | 'openai' | 'opencode' | 'opencode-cli';
  model?: string;
  baseUrl?: string;
  apiKey?: string;
  serverUrl?: string;
  conditions: Condition[];
  category?: BenchCategory;
  prefix?: string;
  limit?: number;
  repeat: number;
  out: string;
  label: string;
}
