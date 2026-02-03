import type { LlmProvider } from '@/types/storage';

// Centralized model budgets so context assembly can be model-aware and plug-and-play.
export type ModelConfig = {
  id: string;
  // Product-facing ID mapped to the provider's actual model identifier.
  providerModelId: string;
  contextTokens: number;
  reservedTokens: number;
};

// Default provider and model for MVP.
export const DEFAULT_PROVIDER: LlmProvider = 'anthropic';
export const DEFAULT_MODEL_ID = 'opus-4.5';

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'opus-4.5': {
    id: 'opus-4.5',
    // Maps to claude-opus-4-5 per Anthropic's model naming. Variants like
    // claude-opus-4-5-20251101 exist; use base ID for latest.
    providerModelId: 'claude-opus-4-5',
    contextTokens: 200000,
    reservedTokens: 60000,
  },
};

// Return null when unknown to force explicit configuration by callers.
export function getModelConfig(modelId: string): ModelConfig | null {
  return MODEL_CONFIGS[modelId] ?? null;
}

// Resolve a product-facing model ID to the provider's actual identifier.
export function resolveProviderModelId(modelId: string): string {
  const config = MODEL_CONFIGS[modelId];
  return config?.providerModelId ?? modelId;
}
