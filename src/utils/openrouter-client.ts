import { FeatureFlags } from '../feature-flags';

let warnedExternalLlm = false;

function warnExternalDisabled(): void {
  if (!warnedExternalLlm) {
    if (FeatureFlags.externalLlmEnabled) {
      console.warn('Aucun fournisseur LLM externe n\'est configuré. Les appels internes retournent null.');
    } else {
      console.warn('Les intégrations LLM externes sont désactivées (FeatureFlags.externalLlmEnabled=false).');
    }
    warnedExternalLlm = true;
  }
}

export async function callInternalLlm(
  _systemPrompt: string,
  _userPrompt: string,
  _maxTokens: number = 3000
): Promise<string | null> {
  warnExternalDisabled();
  return null;
}
