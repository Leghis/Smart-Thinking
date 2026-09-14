/**
 * v13 benchmark — real model providers (network is opt-in only).
 *
 * - OpenAICompatibleProvider: POST {baseUrl}/chat/completions via global fetch,
 *   supports native tool/function calling, timeouts and token usage.
 * - OpenCodeCliProvider: shells out to the `opencode` CLI (non-interactive
 *   `opencode run`) and implements a fenced text tool protocol:
 *     ```tool
 *     {"name":"...","arguments":{...}}
 *     ```
 *     ```answer
 *     ...final answer...
 *     ```
 *   Fallback: the whole output is treated as the answer. Credentials are never
 *   logged (there are none for the CLI; the OpenAI key stays in headers only).
 */

import { execFile, spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type {
  ChatRequest,
  ChatResponse,
  GenerateRequest,
  GenerateResponse,
  ModelProvider,
  ModelMessage,
  ToolCall,
  ToolSchema,
} from './types';

const DEFAULT_TIMEOUT_MS = 120_000;

// ---------------------------------------------------------------------------
// OpenAI-compatible HTTP provider
// ---------------------------------------------------------------------------

export interface OpenAICompatibleOptions {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs?: number;
  temperature?: number;
  maxTokens?: number;
  /** DeepSeek V4: 'disabled' skips internal reasoning so tokens go to tool calls/content. */
  thinking?: 'enabled' | 'disabled';
}

interface OpenAIToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

interface OpenAIMessage {
  content?: string | null;
  tool_calls?: OpenAIToolCall[];
}

interface OpenAIResponse {
  choices?: Array<{ message?: OpenAIMessage; finish_reason?: string }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message?: string };
}

export class OpenAICompatibleProvider implements ModelProvider {
  readonly name: string;
  readonly agentic = true;
  readonly supportsTools = true;
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly temperature: number;
  private readonly maxTokens: number;
  private readonly thinking?: 'enabled' | 'disabled';

  constructor(options: OpenAICompatibleOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.apiKey = options.apiKey;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.temperature = options.temperature ?? 0;
    this.maxTokens = options.maxTokens ?? 4096;
    this.thinking = options.thinking;
    this.name = `openai:${options.model}`;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const started = Date.now();
    const payload = await this.request(request);
    return {
      text: payload.choice?.message?.content ?? '',
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
      latencyMs: Date.now() - started,
    };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const started = Date.now();
    const payload = await this.request(request);
    const choice = payload.choice;
    const toolCalls = normalizeToolCalls(choice?.message?.tool_calls ?? []);
    return {
      text: choice?.message?.content ?? '',
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      inputTokens: payload.usage?.prompt_tokens,
      outputTokens: payload.usage?.completion_tokens,
      latencyMs: Date.now() - started,
      meta: {
        finishReason: choice?.finish_reason,
        hadReasoning: Boolean((choice?.message as { reasoning_content?: string } | undefined)?.reasoning_content),
      },
    };
  }

  private async request(
    request: GenerateRequest & { tools?: ToolSchema[] },
  ): Promise<{
    choice?: { message?: OpenAIMessage; finish_reason?: string };
    usage?: OpenAIResponse['usage'];
  }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const body = {
        model: this.model,
        temperature: this.temperature,
        max_tokens: this.maxTokens,
        ...(this.thinking ? { thinking: { type: this.thinking } } : {}),
        messages: [
          { role: 'system', content: request.system },
          ...request.messages.map(toOpenAIMessage),
        ],
        ...(request.tools && request.tools.length > 0
          ? {
              tools: request.tools.map(tool => ({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.parameters,
                },
              })),
              tool_choice: 'auto',
            }
          : {}),
      };
      let data: OpenAIResponse | undefined;
      for (let attempt = 0; ; attempt += 1) {
        const response = await fetch(`${this.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          const retryable = [429, 500, 502, 503, 504].includes(response.status);
          if (retryable && attempt < 4) {
            await new Promise(resolve => setTimeout(resolve, 1500 * (attempt + 1)));
            continue;
          }
          throw new Error(
            `OpenAI-compatible endpoint ${response.status}: ${text.slice(0, 300)}`,
          );
        }
        data = (await response.json()) as OpenAIResponse;
        break;
      }
      if (!data) {
        throw new Error('OpenAI-compatible empty response');
      }
      if (data.error?.message) {
        throw new Error(`OpenAI-compatible error: ${data.error.message}`);
      }
      return { choice: data.choices?.[0], usage: data.usage };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`OpenAI-compatible request timed out after ${this.timeoutMs}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}

function toOpenAIMessage(message: ModelMessage): Record<string, unknown> {
  if (message.role === 'tool') {
    return {
      role: 'tool',
      tool_call_id: message.toolCallId,
      content: message.content,
    };
  }
  if (message.role === 'assistant' && message.toolCalls && message.toolCalls.length > 0) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map(call => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.arguments ?? {}) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function normalizeToolCalls(raw: OpenAIToolCall[]): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const entry of raw) {
    if (!entry.function?.name) {
      continue;
    }
    let args: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(entry.function.arguments ?? '{}');
      if (parsed && typeof parsed === 'object') {
        args = parsed as Record<string, unknown>;
      }
    } catch {
      args = {};
    }
    calls.push({ id: entry.id, name: entry.function.name, arguments: args });
  }
  return calls;
}

// ---------------------------------------------------------------------------
// OpenCode CLI provider (text tool protocol)
// ---------------------------------------------------------------------------

export interface OpenCodeCliOptions {
  model?: string;
  timeoutMs?: number;
  cliPath?: string;
}

export class OpenCodeCliProvider implements ModelProvider {
  readonly name: string;
  readonly agentic = true;
  readonly supportsTools = true;
  private readonly model?: string;
  private readonly timeoutMs: number;
  private readonly cliPath: string;

  constructor(options: OpenCodeCliOptions = {}) {
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.cliPath = options.cliPath ?? 'opencode';
    this.name = `opencode-cli${options.model ? `:${options.model}` : ''}`;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const started = Date.now();
    const output = await this.runCli(renderPrompt(request, []));
    const parsed = parseTextProtocol(output);
    return { text: parsed.answer, latencyMs: Date.now() - started, meta: { cli: true } };
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const started = Date.now();
    const output = await this.runCli(renderPrompt(request, request.tools ?? []));
    const parsed = parseTextProtocol(output);
    return {
      text: parsed.answer,
      toolCalls: parsed.toolCalls.length > 0 ? parsed.toolCalls : undefined,
      latencyMs: Date.now() - started,
    };
  }

  private runCli(prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const args = ['run'];
      if (this.model) {
        args.push('--model', this.model);
      }
      args.push(prompt);
      execFile(
        this.cliPath,
        args,
        { timeout: this.timeoutMs, maxBuffer: 16 * 1024 * 1024, killSignal: 'SIGKILL' },
        (error, stdout, stderr) => {
          const output = (stdout || '').trim();
          if (error) {
            if (output) {
              resolve(output);
              return;
            }
            const reason = error.killed ? `timed out after ${this.timeoutMs}ms` : error.message;
            reject(new Error(`opencode CLI failed: ${reason}${stderr ? ` (${stderr.slice(0, 300)})` : ''}`));
            return;
          }
          resolve(output || (stderr || '').trim());
        },
      );
    });
  }
}

function renderPrompt(
  request: GenerateRequest,
  tools: ToolSchema[],
): string {
  const toolDocs = tools
    .map(
      tool =>
        `- ${tool.name}: ${tool.description}\n  parameters: ${JSON.stringify(tool.parameters)}`,
    )
    .join('\n');
  const protocol = [
    'TOOL PROTOCOL (follow exactly):',
    'To call a tool, emit a fenced block:',
    '```tool',
    '{"name":"tool_name","arguments":{...}}',
    '```',
    'When you are ready, emit ONLY the final answer inside:',
    '```answer',
    '...',
    '```',
    tools.length > 0 ? `Available tools:\n${toolDocs}` : 'No tools are available.',
  ].join('\n');

  const transcript = request.messages
    .map(message => {
      const label =
        message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Assistant' : 'Tool';
      return `${label}: ${message.content}`;
    })
    .join('\n\n');

  return [
    '[SYSTEM]',
    request.system,
    '',
    '[INSTRUCTIONS]',
    protocol,
    '',
    '[CONVERSATION]',
    transcript,
    '',
    'Assistant:',
  ].join('\n');
}

interface ParsedTextProtocol {
  answer: string;
  toolCalls: ToolCall[];
}

export function parseTextProtocol(output: string): ParsedTextProtocol {
  const toolCalls: ToolCall[] = [];
  const seen = new Set<string>();

  const pushCall = (rawJson: string): void => {
    try {
      const parsed = JSON.parse(rawJson.trim()) as { name?: string; arguments?: Record<string, unknown> };
      if (parsed.name && !seen.has(`${parsed.name}:${rawJson}`)) {
        seen.add(`${parsed.name}:${rawJson}`);
        toolCalls.push({ name: parsed.name, arguments: parsed.arguments ?? {} });
      }
    } catch {
      // Not a valid tool call: ignore.
    }
  };

  for (const match of output.matchAll(/```(?:tool|json)?\s*([\s\S]*?)```/g)) {
    pushCall(match[1]);
  }

  if (toolCalls.length === 0) {
    for (const candidate of extractJsonObjects(output)) {
      if (candidate.includes('"name"')) {
        pushCall(candidate);
      }
    }
  }

  const answerBlocks = [...output.matchAll(/```answer\s*([\s\S]*?)```/g)];
  if (answerBlocks.length > 0) {
    return { answer: answerBlocks[answerBlocks.length - 1][1].trim(), toolCalls };
  }

  const withoutToolBlocks = output
    .replace(/```(?:tool|json)?[\s\S]*?```/g, ' ')
    .replace(/\{[\s\S]*?"name"\s*:\s*"[\s\S]*?\}/g, ' ')
    .trim();
  return { answer: withoutToolBlocks, toolCalls };
}

/** Extracts top-level `{...}` objects, respecting braces inside strings. */
function extractJsonObjects(text: string): string[] {
  const objects: string[] = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === '{') {
      if (depth === 0) {
        start = index;
      }
      depth += 1;
    } else if (char === '}') {
      depth -= 1;
      if (depth === 0 && start >= 0) {
        objects.push(text.slice(start, index + 1));
        start = -1;
      }
      if (depth < 0) {
        depth = 0;
      }
    }
  }

  return objects;
}

// ---------------------------------------------------------------------------
// OpenCode HTTP provider (headless `opencode serve`, no TTY required)
// ---------------------------------------------------------------------------

const DISABLED_OPENCODE_TOOLS: Record<string, boolean> = {
  bash: false,
  edit: false,
  write: false,
  read: false,
  glob: false,
  grep: false,
  list: false,
  webfetch: false,
  websearch: false,
  task: false,
  patch: false,
  multiedit: false,
  todowrite: false,
  todoread: false,
  skill: false,
  notebook: false,
};

export interface OpenCodeHttpOptions {
  /** Model in `provider/model` form, e.g. `deepseek/deepseek-flash`. */
  model: string;
  /** Attach to an already running server instead of spawning one. */
  serverUrl?: string;
  port?: number;
  timeoutMs?: number;
  /** Optional opencode agent name (defaults to the isolated `bench` agent). */
  agent?: string;
}

const BENCH_AGENT_NAME = 'bench';
const BENCH_AGENT_CONFIG = {
  $schema: 'https://opencode.ai/config.json',
  agent: {
    [BENCH_AGENT_NAME]: {
      description: 'Isolated benchmark answering agent (no tools, no repo access)',
      mode: 'primary',
      prompt:
        'You are a benchmark assistant. Follow the user instructions exactly. Never mention file systems, repositories or coding tools. Answer in the requested language.',
      tools: {
        bash: false,
        edit: false,
        write: false,
        read: false,
        glob: false,
        grep: false,
        list: false,
        webfetch: false,
        websearch: false,
        task: false,
        patch: false,
        multiedit: false,
        todowrite: false,
        todoread: false,
        skill: false,
      },
    },
  },
};

interface OpenCodeMessagePart {
  type?: string;
  text?: string;
  tool?: string;
  state?: { input?: Record<string, unknown> };
}

interface OpenCodeMessageResponse {
  info?: {
    tokens?: { input?: number; output?: number; reasoning?: number };
    error?: { message?: string } | null;
  };
  parts?: OpenCodeMessagePart[];
}

export class OpenCodeHttpProvider implements ModelProvider {
  readonly name: string;
  readonly agentic = true;
  readonly supportsTools = true;
  private readonly model: string;
  private readonly timeoutMs: number;
  private readonly agent?: string;
  private readonly port: number;
  private baseUrl: string;
  private server?: ChildProcess;
  private starting?: Promise<void>;
  private configDir?: string;

  constructor(options: OpenCodeHttpOptions) {
    this.model = options.model;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.agent = options.agent ?? BENCH_AGENT_NAME;
    this.port = options.port ?? 4300 + Math.floor(Math.random() * 500);
    this.baseUrl = options.serverUrl?.replace(/\/+$/, '') ?? '';
    this.name = `opencode-http:${options.model}`;
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const response = await this.chat({ ...request, tools: [] });
    return response;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const started = Date.now();
    await this.ensureServer();

    const session = await this.post<{ id: string }>('/session', {});
    try {
      const body: Record<string, unknown> = {
        model: this.parseModel(),
        system: request.system,
        tools: DISABLED_OPENCODE_TOOLS,
        parts: [{ type: 'text', text: renderPrompt(request, request.tools ?? []) }],
        ...(this.agent ? { agent: this.agent } : {}),
      };
      const raw = await this.post<OpenCodeMessageResponse>(`/session/${session.id}/message`, body);

      const textParts = (raw.parts ?? [])
        .filter(part => part.type === 'text' && typeof part.text === 'string')
        .map(part => part.text as string);
      const protocol = parseTextProtocol(textParts.join('\n').trim());
      const toolCallParts = (raw.parts ?? [])
        .filter(part => part.type === 'tool' && typeof part.tool === 'string')
        .map(part => ({ name: part.tool as string, arguments: part.state?.input ?? {} }));

      if (raw.info?.error?.message) {
        throw new Error(`opencode server error: ${raw.info.error.message}`);
      }

      return {
        text: protocol.answer,
        toolCalls: protocol.toolCalls.length > 0 ? protocol.toolCalls : toolCallsOrUndefined(toolCallParts),
        inputTokens: raw.info?.tokens?.input,
        outputTokens: raw.info?.tokens?.output,
        latencyMs: Date.now() - started,
        meta: { cli: false, server: true },
      };
    } finally {
      await this.post(`/session/${session.id}`, undefined, { method: 'DELETE' }).catch(() => undefined);
    }
  }

  async dispose(): Promise<void> {
    if (this.configDir) {
      rmSync(this.configDir, { recursive: true, force: true });
      this.configDir = undefined;
    }
    if (!this.server) {
      return;
    }
    const server = this.server;
    this.server = undefined;
    server.kill('SIGTERM');
    await new Promise<void>(resolve => {
      const timer = setTimeout(() => {
        server.kill('SIGKILL');
        resolve();
      }, 1500);
      timer.unref?.();
      server.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  private parseModel(): { providerID: string; modelID: string } {
    const separator = this.model.indexOf('/');
    if (separator === -1) {
      return { providerID: 'opencode', modelID: this.model };
    }
    return {
      providerID: this.model.slice(0, separator),
      modelID: this.model.slice(separator + 1),
    };
  }

  private async ensureServer(): Promise<void> {
    if (this.baseUrl) {
      return;
    }
    if (!this.starting) {
      this.starting = this.startServer();
    }
    await this.starting;
  }

  private async startServer(): Promise<void> {
    const port = this.port;
    const configHome = mkdtempSync(join(tmpdir(), 'smart-thinking-bench-oc-'));
    mkdirSync(join(configHome, 'opencode'), { recursive: true });
    writeFileSync(
      join(configHome, 'opencode', 'opencode.json'),
      JSON.stringify(BENCH_AGENT_CONFIG, null, 2),
      'utf8',
    );
    this.configDir = configHome;

    const child = spawn('opencode', ['serve', '--port', String(port), '--hostname', '127.0.0.1'], {
      stdio: 'ignore',
      env: { ...process.env, XDG_CONFIG_HOME: configHome },
    });
    this.server = child;

    const baseUrl = `http://127.0.0.1:${port}`;
    const deadline = Date.now() + 20_000;
    let lastError: unknown;
    while (Date.now() < deadline) {
      if (child.exitCode !== null) {
        throw new Error(`opencode serve exited early (code ${child.exitCode}).`);
      }
      try {
        const response = await fetch(`${baseUrl}/doc`, { signal: AbortSignal.timeout(1500) });
        if (response.ok) {
          this.baseUrl = baseUrl;
          return;
        }
      } catch (error) {
        lastError = error;
      }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    child.kill('SIGKILL');
    this.server = undefined;
    throw new Error(
      `opencode serve did not become ready on port ${port}: ${lastError instanceof Error ? lastError.message : 'timeout'}`,
    );
  }

  private async post<T = unknown>(
    pathname: string,
    body?: unknown,
    options: { method?: 'POST' | 'DELETE' } = {},
  ): Promise<T> {
    const response = await fetch(`${this.baseUrl}${pathname}`, {
      method: options.method ?? 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`opencode server ${pathname} -> ${response.status} ${text.slice(0, 300)}`);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}

function toolCallsOrUndefined(calls: ToolCall[]): ToolCall[] | undefined {
  return calls.length > 0 ? calls : undefined;
}
