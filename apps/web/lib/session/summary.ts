export type LlmSummaryResponse = {
  summary_text: string;
  parting_words: string | null;
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
  "parting_words": "warm, meaningful words to carry forward — an insight, encouragement, or reflection",
  "action_steps": ["something they might try", "only if it emerged naturally"],
  "open_threads": ["something left to explore"]
}

Rules:
- Output ONLY the JSON object, nothing else
- No markdown code fences
- No conversational text before or after
- parting_words should be 1-2 sentences max, heartfelt not clinical
- action_steps should only include things that came up naturally — don't manufacture them; empty array is fine`;

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
  const partingWords =
    parsed.parting_words === null || typeof parsed.parting_words === 'string'
      ? (parsed.parting_words ?? null)
      : null;
  const actionSteps = Array.isArray(parsed.action_steps)
    ? parsed.action_steps.filter((step) => typeof step === 'string')
    : [];
  const openThreads = Array.isArray(parsed.open_threads)
    ? parsed.open_threads.filter((thread) => typeof thread === 'string')
    : [];

  return {
    summary_text: parsed.summary_text.trim(),
    parting_words: partingWords?.trim() ?? null,
    action_steps: actionSteps.map((step) => step.trim()).filter(Boolean),
    open_threads: openThreads.map((thread) => thread.trim()).filter(Boolean),
  };
}
