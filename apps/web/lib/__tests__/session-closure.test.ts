import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => {
  const motion = new Proxy(
    {},
    {
      get: (_, tag) => {
        const MotionTag = (props: React.HTMLAttributes<HTMLElement>) =>
          React.createElement(tag as string, props, props.children);
        MotionTag.displayName = `MockMotion(${String(tag)})`;
        return MotionTag;
      },
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});

import { SessionClosure } from '@/components/chat/session-closure';

describe('SessionClosure summary error feedback', () => {
  it('renders summary failure message and retry CTA when summaryError is provided', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionClosure, {
        sessionDate: new Date('2026-02-12T00:00:00.000Z'),
        closureStep: 'done',
        summaryError: 'Reflection failed, but your conversation is saved.',
        actionSteps: [],
        onRetrySummary: () => {},
      }),
    );

    expect(markup).toContain('Reflection failed, but your conversation is saved.');
    expect(markup).toContain('Try reflection again');
  });

  it('renders retry loading label while summary retry is in progress', () => {
    const markup = renderToStaticMarkup(
      React.createElement(SessionClosure, {
        sessionDate: new Date('2026-02-12T00:00:00.000Z'),
        closureStep: 'done',
        summaryError: 'Reflection failed, but your conversation is saved.',
        isRetryingSummary: true,
        actionSteps: [],
        onRetrySummary: () => {},
      }),
    );

    expect(markup).toContain('Retrying...');
  });
});
