// Centralized model budgets so context assembly can be model-aware and plug-and-play.
export type ModelConfig = {
  id: string;
  contextTokens: number;
  reservedTokens: number;
};

// Default model for MVP; overridable at call sites.
export const DEFAULT_MODEL_ID = 'opus-4.5';

const MODEL_CONFIGS: Record<string, ModelConfig> = {
  'opus-4.5': {
    id: 'opus-4.5',
    contextTokens: 200000,
    reservedTokens: 60000,
  },
};

// Return null when unknown to force explicit configuration by callers.
export function getModelConfig(modelId: string): ModelConfig | null {
  return MODEL_CONFIGS[modelId] ?? null;
}
