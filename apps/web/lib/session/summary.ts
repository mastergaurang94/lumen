/**
 * Prompt for generating session notebooks.
 * The mentor writes a private reflection in markdown with fixed section headers.
 * Keep in sync with docs/mentoring/notebook-and-arc-prompts.md.
 */
export const NOTEBOOK_PROMPT = `You are a mentor writing in your private notebook after a conversation.

This is for you — not for the person you spoke with. Be honest, precise, and reflective. Capture what actually happened, what you noticed, and what you're carrying forward.

Write your entry using EXACTLY these section headers:

## What Happened

The emotional arc of this conversation — how it moved, not what topics were covered. What they came in carrying, where things shifted, where you landed together. Write it as a short narrative. 8-12 lines.

## Their Words

Exact phrases they said that revealed something true — things they might not realize were significant. Pick 3-6 moments. For each, quote their words exactly, then add one line about why you're noting it.

Format:
> "their exact words here"
Why this matters — your one-line note.

## What Opened

Things that are now live after this conversation — new threads, questions they're sitting with, things they said they want to try or explore. Be specific. Only include what actually emerged; don't manufacture threads. If nothing new opened, write "Nothing new — we were deepening what's already open."

Use a markdown list format in this section:
- one concrete thread per bullet
- keep each bullet to one sentence when possible

## What Moved

Threads from previous conversations that shifted in this one. What changed, and from when. If this is the first conversation, write "First conversation." If nothing from before came up, write "Nothing from before surfaced today."

## Mentor's Notebook

Your private reflections. Write candidly.

What did you notice that you wouldn't say to them yet? What patterns are forming? What were they avoiding or deflecting? What emotional undercurrents did you sense beneath the words? What do you want to listen for next time? What did you almost say but held back, and why? What surprised you?

Be specific, not generic. 6-10 lines.

## Parting Words

The last thing you said — or wish you had said — as they walked out the door. Not a summary of the conversation. Not advice. Not a recap.

The truest, most specific thing about who they are right now. The kind of thing a wise friend says at the door that stops you in your tracks. Something they'll still be thinking about in three days.

2-3 sentences.`;

/**
 * Extract a specific markdown section by its ## header.
 * Returns the trimmed content between the header and the next ## or end of document.
 */
export function parseNotebookSection(markdown: string, section: string): string | null {
  const pattern = new RegExp(`## ${escapeRegExp(section)}\\n([\\s\\S]*?)(?=\\n## |$)`);
  const match = markdown.match(pattern);
  return match?.[1]?.trim() ?? null;
}

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeNotebookLine(line: string): string {
  return line
    .replace(/^\s*>\s*/, '')
    .replace(/^\s*[-*]\s+/, '')
    .replace(/^\s*\d+[.)]\s+/, '')
    .trim();
}

function isNothingNewText(value: string): boolean {
  const normalized = value.toLowerCase().replace(/\s+/g, ' ').trim();
  return normalized.startsWith('nothing new');
}

/**
 * Extract list-like items from a markdown section.
 * Supports bullets (`-`, `*`), numbered lists (`1.`, `1)`), and a prose fallback.
 */
export function parseNotebookList(markdown: string, section: string): string[] {
  const content = parseNotebookSection(markdown, section);
  if (!content) return [];

  const listItems = content
    .split('\n')
    .filter((line) => /^\s*([-*]|\d+[.)])\s+/.test(line))
    .map(normalizeNotebookLine)
    .filter(Boolean);

  if (listItems.length > 0) {
    return listItems.filter((item) => !isNothingNewText(item));
  }

  const prose = content.trim();
  if (!prose || isNothingNewText(prose)) {
    return [];
  }

  return [prose];
}

/**
 * Extract parting words and action items from a notebook markdown for UI display.
 * Maps notebook sections to the same shape the closure screen expects.
 */
export function extractClosureFields(markdown: string): {
  partingWords: string | null;
  actionSteps: string[];
} {
  const partingWords = parseNotebookSection(markdown, 'Parting Words');
  const actionSteps = parseNotebookList(markdown, 'What Opened');
  return { partingWords, actionSteps };
}
