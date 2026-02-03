import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callLlmWithRetry,
  LlmAbortError,
  LlmInvalidKeyError,
} from '@/lib/llm/client';

beforeAll(() => {
  if (!globalThis.window) {
    globalThis.window = { setTimeout, clearTimeout } as unknown as Window & typeof globalThis;
  }
});

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('llm client', () => {
  it('throws LlmInvalidKeyError on 401 responses', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'bad token' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
    const fetchMock = vi.fn().mockResolvedValue(response);
    globalThis.fetch = fetchMock;

    await expect(
      callLlmWithRetry(
        {
          apiKey: 'sk-ant-oat-bad',
          modelId: 'opus-4.5',
          systemPrompt: '',
          messages: [{ role: 'user', content: 'Hello' }],
        },
        0,
      ),
    ).rejects.toBeInstanceOf(LlmInvalidKeyError);
  });

  it('throws LlmAbortError when the request is aborted', async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock;
    const controller = new AbortController();
    controller.abort();

    await expect(
      callLlmWithRetry(
        {
          apiKey: 'sk-ant-oat-test',
          modelId: 'opus-4.5',
          systemPrompt: '',
          messages: [{ role: 'user', content: 'Hello' }],
          signal: controller.signal,
        },
        0,
      ),
    ).rejects.toBeInstanceOf(LlmAbortError);

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
