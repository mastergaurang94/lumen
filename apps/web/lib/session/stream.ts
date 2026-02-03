// TODO: Replace with real streaming from Anthropic's SSE endpoint. Currently this
// simulates word-by-word streaming after the full response is received, which adds
// artificial latency (~30-70ms per word). For a 200-word response this is ~10s extra.
export async function* streamText(
  text: string,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const words = text.split(' ');
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) return;
    yield words.slice(0, i + 1).join(' ');
    await new Promise((resolve) => setTimeout(resolve, 30 + Math.random() * 40));
  }
}
