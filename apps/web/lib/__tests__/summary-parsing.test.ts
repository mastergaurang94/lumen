import { describe, expect, it } from 'vitest';
import { extractClosureFields, parseNotebookList } from '@/lib/session/summary';

describe('notebook parsing', () => {
  it('parses bullet lists in "What Opened"', () => {
    const markdown = `## What Opened
- Reach out to my brother this week
- Set one non-negotiable workout block
`;

    expect(parseNotebookList(markdown, 'What Opened')).toEqual([
      'Reach out to my brother this week',
      'Set one non-negotiable workout block',
    ]);
  });

  it('parses numbered lists in "What Opened"', () => {
    const markdown = `## What Opened
1. Ask for feedback on the pitch
2) Rework the opening story
`;

    expect(parseNotebookList(markdown, 'What Opened')).toEqual([
      'Ask for feedback on the pitch',
      'Rework the opening story',
    ]);
  });

  it('falls back to prose when list formatting is missing', () => {
    const markdown = `## What Opened
The big thing is a hard conversation with my dad that I have been avoiding.
`;

    expect(parseNotebookList(markdown, 'What Opened')).toEqual([
      'The big thing is a hard conversation with my dad that I have been avoiding.',
    ]);
  });

  it('treats "Nothing new" as no action items', () => {
    const markdown = `## What Opened
Nothing new — we were deepening what is already open.

## Parting Words
You are already telling the truth more than you think.
`;

    expect(extractClosureFields(markdown)).toEqual({
      partingWords: 'You are already telling the truth more than you think.',
      actionSteps: [],
    });
  });
});
