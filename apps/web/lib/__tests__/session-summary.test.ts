import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { SessionSummary } from '@/components/history/session-summary';
import type { SessionSummary as SessionSummaryType } from '@/types/storage';

const now = new Date().toISOString();

function makeSummary(overrides: Partial<SessionSummaryType> = {}): SessionSummaryType {
  return {
    session_id: 'session-1',
    user_id: 'user-1',
    summary_text: 'A good conversation.',
    parting_words: null,
    action_steps: [],
    open_threads: [],
    notes: null,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

describe('SessionSummary', () => {
  it('returns null when no parting_words and no action_steps', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionSummary, { summary: makeSummary() }),
    );
    expect(markup).toBe('');
  });

  it('renders parting words as blockquote', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionSummary, {
        summary: makeSummary({ parting_words: 'You are enough.' }),
      }),
    );
    expect(markup).toContain('<blockquote');
    expect(markup).toContain('You are enough.');
  });

  it('renders action steps as numbered list', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionSummary, {
        summary: makeSummary({ action_steps: ['Journal daily', 'Take a walk'] }),
      }),
    );
    expect(markup).toContain('1');
    expect(markup).toContain('Journal daily');
    expect(markup).toContain('2');
    expect(markup).toContain('Take a walk');
  });

  it('renders both parting words and action steps together', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionSummary, {
        summary: makeSummary({
          parting_words: 'Keep going.',
          action_steps: ['Breathe deeply'],
        }),
      }),
    );
    expect(markup).toContain('Keep going.');
    expect(markup).toContain('Breathe deeply');
    expect(markup).toContain('<blockquote');
  });

  it('does NOT render open_threads even when present', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionSummary, {
        summary: makeSummary({
          parting_words: 'Hello.',
          open_threads: ['Explore identity', 'Family patterns'],
        }),
      }),
    );
    expect(markup).not.toContain('Explore identity');
    expect(markup).not.toContain('Family patterns');
  });
});
