export type LlmSummaryResponse = {
  summary_text: string;
  parting_words: string | null;
  action_steps: string[];
  open_threads: string[];
};

/**
 * Prompt for generating session summaries.
 * Uses explicit JSON framing to override conversational system prompt.
 * Keep in sync with docs/mentoring/summary-prompt.md.
 */
export const SUMMARY_PROMPT = `[SYSTEM: Output JSON only. Do not include any text before or after the JSON object.]

Generate a session summary as a JSON object with these exact keys:
{
  "summary_text": "8-12 line summary of what was explored — capture the emotional arc, not just the topics",
  "parting_words": "A single insight, piece of wisdom, or unexpected observation they haven't heard yet in this conversation. Not a summary of what was discussed — something NEW that they'll carry with them. The kind of thing a wise friend says at the door that stops you in your tracks.",
  "action_steps": ["something you mentioned wanting to try or explore — addressed directly to the person, only if it emerged naturally from the conversation"],
  "open_threads": ["something left unfinished or worth returning to next time"]
}

Rules:
- Output ONLY the JSON object, nothing else
- No markdown code fences
- No conversational text before or after
- parting_words should be 1-2 sentences max — pithy, warm, and specific to THIS conversation. Not generic inspiration. Not a recap. Something they'll still be thinking about in three days
- action_steps should be written in second person ("you"), as gentle reminders directed at the person — only include things that came up naturally; empty array is fine
- open_threads should capture genuine loose ends, not forced cliffhangers; empty array is fine`;

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
