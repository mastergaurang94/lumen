export type LlmSummaryResponse = {
  summary_text: string;
  recognition_moment: string | null;
  action_steps: string[];
  open_threads: string[];
};

/**
 * Prompt for generating session summaries.
 * Uses explicit JSON framing to override conversational system prompt.
 */
export const SUMMARY_PROMPT = `[SYSTEM: Output JSON only. Do not include any text before or after the JSON object.]

Generate a session summary as a JSON object with these exact keys:
{
  "summary_text": "8-12 line summary of what was explored",
  "recognition_moment": "the single most important insight or shift to carry forward",
  "action_steps": ["concrete next step 1", "concrete next step 2"],
  "open_threads": ["unresolved topic to revisit"]
}

Rules:
- Output ONLY the JSON object, nothing else
- No markdown code fences
- No conversational text before or after
- recognition_moment should be 1-2 sentences max`;

/**
 * Parse LLM summary response, tolerating markdown code fences that models sometimes emit.
 */
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
