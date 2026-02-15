import type { LlmProvider } from '@/types/storage';

// Centralized model budgets so context assembly can be model-aware and plug-and-play.
export type ModelConfig = {
  id: string;
  provider: LlmProvider;
  // Product-facing ID mapped to the provider's actual model identifier.
  providerModelId: string;
  contextWindowTokens: number;
  // Optional fixed reservation for system prompt + response budget.
  reservedTokens?: number;
  // Optional ratio-based reservation. Falls back to DEFAULT_RESERVED_TOKENS_RATIO.
  reservedTokensRatio?: number;
};

const DEFAULT_RESERVED_TOKENS_RATIO = 0.3;
const FALLBACK_MODEL_ID = 'opus-4.6';

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'opus-4.5': {
    id: 'opus-4.5',
    provider: 'anthropic',
    // Maps to claude-opus-4-5 per Anthropic's model naming. Variants like
    // claude-opus-4-5-20251101 exist; use base ID for latest.
    providerModelId: 'claude-opus-4-5',
    contextWindowTokens: 200000,
  },
  'opus-4.6': {
    id: 'opus-4.6',
    provider: 'anthropic',
    // Maps to claude-opus-4-6 per Anthropic's model naming. Variants like
    // claude-opus-4-6-20260115 may exist; use base ID for latest.
    // We currently budget this model at 200K context for stability/cost control.
    providerModelId: 'claude-opus-4-6',
    contextWindowTokens: 200000,
  },
};

export function resolveDefaultModelId(preferredModelId?: string): string {
  if (!preferredModelId) return FALLBACK_MODEL_ID;
  return MODEL_CONFIGS[preferredModelId] ? preferredModelId : FALLBACK_MODEL_ID;
}

// Default provider and model for MVP.
export const DEFAULT_MODEL_ID = resolveDefaultModelId(process.env.NEXT_PUBLIC_DEFAULT_MODEL_ID);
export const DEFAULT_PROVIDER: LlmProvider =
  MODEL_CONFIGS[DEFAULT_MODEL_ID]?.provider ?? MODEL_CONFIGS[FALLBACK_MODEL_ID].provider;

// Return null when unknown to force explicit configuration by callers.
export function getModelConfig(modelId: string): ModelConfig | null {
  return MODEL_CONFIGS[modelId] ?? null;
}

export function getModelContextBudget(modelId: string): {
  totalTokens: number;
  reservedTokens: number;
} {
  const modelConfig = getModelConfig(modelId) ?? MODEL_CONFIGS[FALLBACK_MODEL_ID];
  const totalTokens = modelConfig.contextWindowTokens;
  const reservedTokens =
    modelConfig.reservedTokens ??
    Math.round(totalTokens * (modelConfig.reservedTokensRatio ?? DEFAULT_RESERVED_TOKENS_RATIO));

  return {
    totalTokens,
    reservedTokens: Math.max(0, Math.min(totalTokens, reservedTokens)),
  };
}

// Resolve a product-facing model ID to the provider's actual identifier.
export function resolveProviderModelId(modelId: string): string {
  const config = getModelConfig(modelId) ?? MODEL_CONFIGS[FALLBACK_MODEL_ID];
  return config?.providerModelId ?? modelId;
}
