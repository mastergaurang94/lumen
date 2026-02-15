import { describe, expect, it } from 'vitest';
import {
  getModelConfig,
  getModelContextBudget,
  resolveDefaultModelId,
  resolveProviderModelId,
} from '@/lib/llm/model-config';

describe('model config', () => {
  it('keeps opus-4.6 as the default when no override is provided', () => {
    expect(resolveDefaultModelId(undefined)).toBe('opus-4.6');
  });

  it('uses an explicit supported default model override', () => {
    expect(resolveDefaultModelId('opus-4.6')).toBe('opus-4.6');
  });

  it('falls back to opus-4.6 for unknown override values', () => {
    expect(resolveDefaultModelId('does-not-exist')).toBe('opus-4.6');
  });

  it('derives reserved budget from context window when not explicitly configured', () => {
    expect(getModelContextBudget('opus-4.5')).toEqual({
      totalTokens: 200000,
      reservedTokens: 60000,
    });
    expect(getModelContextBudget('opus-4.6')).toEqual({
      totalTokens: 200000,
      reservedTokens: 60000,
    });
  });

  it('resolves provider ids and falls back to default model mapping', () => {
    expect(resolveProviderModelId('opus-4.5')).toBe('claude-opus-4-5');
    expect(resolveProviderModelId('opus-4.6')).toBe('claude-opus-4-6');
    expect(resolveProviderModelId('unknown-model')).toBe('claude-opus-4-6');
  });

  it('returns null for unknown model config lookups', () => {
    expect(getModelConfig('unknown-model')).toBeNull();
  });
});
