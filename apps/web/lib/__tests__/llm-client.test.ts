import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  callLlmWithRetry,
  LlmAbortError,
  LlmInvalidKeyError,
  streamLlmWithRetry,
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

  it('stops streaming on message_stop even if the connection stays open', async () => {
    const encoder = new TextEncoder();
    let cancelled = false;
    const buildEvent = (lines: string[]) => `${lines.join('\r\n')}\r\n\r\n`;

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        const payload =
          buildEvent([
            'event: message_start',
            `data: ${JSON.stringify({ message: { usage: { input_tokens: 5 } } })}`,
          ]) +
          buildEvent([
            'event: content_block_start',
            `data: ${JSON.stringify({ content_block: { text: 'Hello' } })}`,
          ]) +
          buildEvent([
            'event: content_block_delta',
            `data: ${JSON.stringify({ delta: { text: ' world' } })}`,
          ]) +
          buildEvent(['event: message_stop', 'data: {}']);
        controller.enqueue(encoder.encode(payload));
        // Intentionally keep the stream open to ensure message_stop ends it client-side.
      },
      cancel() {
        cancelled = true;
      },
    });

    const response = new Response(stream, {
      status: 200,
      headers: { 'content-type': 'text/event-stream' },
    });

    globalThis.fetch = vi.fn().mockResolvedValue(response);

    const chunks: string[] = [];
    for await (const partial of streamLlmWithRetry(
      {
        apiKey: 'sk-ant-oat-test',
        modelId: 'opus-4.5',
        systemPrompt: '',
        messages: [{ role: 'user', content: 'Hello' }],
      },
      0,
    )) {
      chunks.push(partial);
    }

    expect(chunks[chunks.length - 1]).toBe('Hello world');
    expect(cancelled).toBe(true);
  });
});
