import { ProviderError } from '../errors';

/**
 * Optional LLM assist: when an API key is configured, Smart-Thinking can run an
 * internal critic/decomposer/judge on top of the calling model. Disabled by
 * default (zero-API-key mode stays intact); enabled per environment.
 */

export interface AssistConfig {
  apiKey?: string;
  baseUrl: string;
  model: string;
  timeoutMs: number;
  maxTokens: number;
}

export interface AssistClient {
  readonly available: boolean;
  readonly model: string;
  complete(
    system: string,
    user: string,
    options?: { maxTokens?: number; temperature?: number },
  ): Promise<string>;
  completeJson<T>(
    system: string,
    user: string,
    options?: { maxTokens?: number },
  ): Promise<T | null>;
}

interface AssistEnv {
  SMART_THINKING_ASSIST_API_KEY?: string;
  DEEPSEEK_API_KEY?: string;
  SMART_THINKING_ASSIST_BASE_URL?: string;
  SMART_THINKING_ASSIST_MODEL?: string;
  SMART_THINKING_ASSIST_DISABLED?: string;
}

const DISABLED_CLIENT: AssistClient = {
  available: false,
  model: 'none',
  async complete() {
    throw new ProviderError('Assist LLM non configuré.', { provider: 'assist' });
  },
  async completeJson() {
    return null;
  },
};

function stripCodeFences(text: string): string {
  return text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

export function createAssistClient(overrides: Partial<AssistConfig> = {}): AssistClient {
  const env = process.env as AssistEnv;
  const disabled = env.SMART_THINKING_ASSIST_DISABLED === 'true';
  const apiKey = overrides.apiKey ?? env.SMART_THINKING_ASSIST_API_KEY ?? env.DEEPSEEK_API_KEY;
  if (disabled || !apiKey?.trim()) {
    return DISABLED_CLIENT;
  }

  const baseUrl = (overrides.baseUrl ?? env.SMART_THINKING_ASSIST_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '');
  const model = overrides.model ?? env.SMART_THINKING_ASSIST_MODEL ?? 'deepseek-flash';
  const timeoutMs = overrides.timeoutMs ?? 60_000;
  const maxTokens = overrides.maxTokens ?? 1_200;

  const call = async (
    system: string,
    user: string,
    options: { maxTokens?: number; temperature?: number } = {},
  ): Promise<string> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user },
          ],
          max_tokens: options.maxTokens ?? maxTokens,
          temperature: options.temperature ?? 0,
          stream: false,
        }),
        signal: controller.signal,
      });
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new ProviderError(`Assist LLM ${response.status}: ${text.slice(0, 200)}`, {
          provider: 'assist',
          status: response.status,
        }, response.status >= 500 || response.status === 429);
      }
      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      return payload.choices?.[0]?.message?.content?.trim() ?? '';
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new ProviderError(`Assist LLM timeout (${timeoutMs}ms).`, { provider: 'assist' }, true);
      }
      throw new ProviderError(
        `Assist LLM error: ${error instanceof Error ? error.message : 'inconnu'}`,
        { provider: 'assist' },
        true,
      );
    } finally {
      clearTimeout(timer);
    }
  };

  return {
    available: true,
    model,
    complete: call,
    async completeJson<T>(system: string, user: string, options?: { maxTokens?: number }): Promise<T | null> {
      const raw = await call(system, user, options);
      const cleaned = stripCodeFences(raw);
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start < 0 || end <= start) {
        return null;
      }
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        return null;
      }
    },
  };
}

export interface DecompositionResult {
  subQuestions: string[];
  searchQueries: string[];
}

export async function assistDecompose(
  assist: AssistClient,
  problem: string,
): Promise<DecompositionResult | null> {
  if (!assist.available) {
    return null;
  }
  return assist.completeJson<DecompositionResult>(
    [
      'Tu es un planificateur de recherche rigoureux.',
      'Décompose la question en 2 à 4 sous-questions indépendantes et en 2 à 4 requêtes de recherche web ciblées.',
      'Réponds STRICTEMENT en JSON: {"subQuestions": ["..."], "searchQueries": ["..."]}.',
    ].join(' '),
    `Question: ${problem}`,
    { maxTokens: 500 },
  );
}

export interface CritiqueResult {
  issues: string[];
  missingEvidence: string[];
  suggestedFix: string;
  confidence: number;
}

export async function assistCritique(
  assist: AssistClient,
  problem: string,
  draft: string,
): Promise<CritiqueResult | null> {
  if (!assist.available) {
    return null;
  }
  return assist.completeJson<CritiqueResult>(
    [
      'Tu es un critique sévère et factuel.',
      'Analyse la réponse proposée : erreurs de calcul, faits non prouvés, contradictions, étapes manquantes.',
      'Réponds STRICTEMENT en JSON: {"issues": ["..."], "missingEvidence": ["..."], "suggestedFix": "...", "confidence": 0.0}.',
    ].join(' '),
    `Question: ${problem}\n\nRéponse proposée:\n${draft}`,
    { maxTokens: 700 },
  );
}

export interface JudgeResult {
  verdict: 'supports' | 'contradicts' | 'insufficient';
  confidence: number;
  reason: string;
}

export async function assistJudge(
  assist: AssistClient,
  claim: string,
  evidenceText: string,
): Promise<JudgeResult | null> {
  if (!assist.available) {
    return null;
  }
  return assist.completeJson<JudgeResult>(
    [
      'Tu es un juge de preuves strict.',
      'Détermine si les extraits soutiennent, contredisent ou sont insuffisants pour l\'affirmation.',
      'Réponds STRICTEMENT en JSON: {"verdict":"supports|contradicts|insufficient","confidence":0.0,"reason":"..."}.',
    ].join(' '),
    `Affirmation: ${claim}\n\nExtraits:\n${evidenceText.slice(0, 4000)}`,
    { maxTokens: 300 },
  );
}
