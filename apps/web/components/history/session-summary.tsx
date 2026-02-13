'use client';

import * as React from 'react';
import type { SessionSummary as SessionSummaryType } from '@/types/storage';

type SessionSummaryProps = {
  summary: SessionSummaryType;
};

// Summary block displayed at the top of a transcript detail view.
// Mirrors the visual language of ClosureFinal in session-closure.tsx.
export function SessionSummary({ summary }: SessionSummaryProps) {
  const { parting_words, action_steps } = summary;
  const hasContent = parting_words || action_steps.length > 0;

  if (!hasContent) return null;

  return (
    <div className="space-y-6">
      {/* Parting words as blockquote */}
      {parting_words && (
        <div className="relative py-4">
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-px bg-border" />
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-px bg-border" />
          <blockquote className="py-4 px-4 text-center">
            <p className="font-display text-xl leading-relaxed text-foreground italic">
              &ldquo;{parting_words}&rdquo;
            </p>
          </blockquote>
        </div>
      )}

      {/* Action steps as numbered list */}
      {action_steps.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            What came up
          </h3>
          <ul className="space-y-2">
            {action_steps.map((step, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center text-xs text-accent font-medium">
                  {index + 1}
                </span>
                <span className="text-sm text-foreground leading-relaxed">{step}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
