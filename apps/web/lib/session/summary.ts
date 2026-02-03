export type LlmSummaryResponse = {
  summary_text: string;
  recognition_moment: string | null;
  action_steps: string[];
  open_threads: string[];
};

// Parse LLM summary response, tolerating markdown code fences that models sometimes emit.
export function parseSummaryResponse(raw: string): LlmSummaryResponse {
  const trimmed = raw.trim();
  const withoutFence = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(withoutFence) as Partial<LlmSummaryResponse>;
  if (!parsed || typeof parsed.summary_text !== 'string') {
    throw new Error('Summary response missing summary_text.');
  }
  const recognition =
    parsed.recognition_moment === null || typeof parsed.recognition_moment === 'string'
      ? (parsed.recognition_moment ?? null)
      : null;
  const actionSteps = Array.isArray(parsed.action_steps)
    ? parsed.action_steps.filter((step) => typeof step === 'string')
    : [];
  const openThreads = Array.isArray(parsed.open_threads)
    ? parsed.open_threads.filter((thread) => typeof thread === 'string')
    : [];

  return {
    summary_text: parsed.summary_text.trim(),
    recognition_moment: recognition?.trim() ?? null,
    action_steps: actionSteps.map((step) => step.trim()).filter(Boolean),
    open_threads: openThreads.map((thread) => thread.trim()).filter(Boolean),
  };
}
