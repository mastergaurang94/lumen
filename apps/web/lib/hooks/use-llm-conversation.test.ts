import { describe, expect, it, vi } from 'vitest';

import { collectStreamingOutcome } from '@/lib/hooks/use-llm-conversation';

function streamFromParts(parts: string[]): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const part of parts) {
        yield part;
      }
    },
  };
}

function interruptedStream(parts: string[], error: Error): AsyncIterable<string> {
  return {
    async *[Symbol.asyncIterator]() {
      for (const part of parts) {
        yield part;
      }
      throw error;
    },
  };
}

describe('collectStreamingOutcome', () => {
  it('captures partial text when streaming is interrupted', async () => {
    const onFirstPartial = vi.fn();
    const onPartial = vi.fn();

    const outcome = await collectStreamingOutcome(
      interruptedStream(['I lost', 'I lost my train of thought'], new Error('network dropped')),
      { onFirstPartial, onPartial },
    );

    expect(outcome.kind).toBe('errored');
    if (outcome.kind !== 'errored') {
      throw new Error('Expected errored outcome');
    }
    expect(outcome.partialText).toBe('I lost my train of thought');
    expect(outcome.hadStreamed).toBe(true);
    expect(onFirstPartial).toHaveBeenCalledTimes(1);
    expect(onPartial).toHaveBeenCalledTimes(2);
  });

  it('supports retry flow: interrupted stream first, completed stream second', async () => {
    const firstAttempt = await collectStreamingOutcome(
      interruptedStream(['Draft'], new Error('temporary failure')),
    );
    const secondAttempt = await collectStreamingOutcome(
      streamFromParts(['Draft complete response']),
    );

    expect(firstAttempt.kind).toBe('errored');
    if (firstAttempt.kind !== 'errored') {
      throw new Error('Expected first attempt to error');
    }
    expect(firstAttempt.partialText).toBe('Draft');

    expect(secondAttempt.kind).toBe('completed');
    if (secondAttempt.kind !== 'completed') {
      throw new Error('Expected second attempt to complete');
    }
    expect(secondAttempt.finalText).toBe('Draft complete response');
  });
});
