import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Mock next/link as a plain anchor tag.
vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) =>
    React.createElement('a', { href }, children),
}));

// Mock dev-auth as identity (no-op in test).
vi.mock('@/lib/hooks/dev-auth', () => ({
  withDevAuth: (path: string) => path,
}));

import { SessionCard } from '@/components/history/session-card';

describe('SessionCard', () => {
  it('renders session number and formatted date', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionCard, {
        sessionId: 'session-1',
        sessionNumber: 3,
        startedAt: new Date('2026-02-10T12:00:00.000Z'),
      }),
    );
    expect(markup).toContain('Conversation 3');
    expect(markup).toContain('Feb 10, 2026');
  });

  it('shows full parting words when under 80 chars', () => {
    const words = 'You carry more light than you realize.';
    const markup = renderToStaticMarkup(
      React.createElement(SessionCard, {
        sessionId: 'session-1',
        sessionNumber: 1,
        startedAt: new Date('2026-01-01T12:00:00.000Z'),
        partingWords: words,
      }),
    );
    expect(markup).toContain(words);
    expect(markup).not.toContain('...');
  });

  it('truncates at 80 chars with "..."', () => {
    const words =
      'This is a very long parting message that definitely exceeds the eighty character limit set for truncation.';
    expect(words.length).toBeGreaterThan(80);

    const markup = renderToStaticMarkup(
      React.createElement(SessionCard, {
        sessionId: 'session-1',
        sessionNumber: 1,
        startedAt: new Date('2026-01-01T12:00:00.000Z'),
        partingWords: words,
      }),
    );
    expect(markup).toContain('...');
    expect(markup).not.toContain(words);
    // The truncated text should be the first 80 chars (trimmed) + "..."
    expect(markup).toContain(words.slice(0, 80).trimEnd());
  });

  it('omits parting words block when null', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionCard, {
        sessionId: 'session-1',
        sessionNumber: 1,
        startedAt: new Date('2026-01-01T12:00:00.000Z'),
        partingWords: null,
      }),
    );
    // No italic quote block should be present
    expect(markup).not.toContain('\u201c');
  });

  it('omits parting words block when empty string', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionCard, {
        sessionId: 'session-1',
        sessionNumber: 1,
        startedAt: new Date('2026-01-01T12:00:00.000Z'),
        partingWords: '',
      }),
    );
    expect(markup).not.toContain('\u201c');
  });
});
