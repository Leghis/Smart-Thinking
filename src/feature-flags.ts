/**
 * feature-flags.ts
 *
 * Centralise the runtime feature toggles for Smart-Thinking.
 * Phase 1 explicitly disables any external AI integrations.
 */
export const FeatureFlags = {
  /**
   * Controls access to remote embedding providers (e.g. Cohere).
   * Phase 1 keeps this disabled while the similarity engine is refactored.
   */
  externalEmbeddingEnabled: false,

  /**
   * Controls access to remote LLM providers (e.g. OpenRouter / OpenAI).
   * Phase 1 keeps this disabled so reasoning relies on internal heuristics.
   */
  externalLlmEnabled: false,
};
