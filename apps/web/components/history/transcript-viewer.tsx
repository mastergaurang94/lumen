'use client';

import * as React from 'react';
import Link from 'next/link';
import { LumenMessage } from '@/components/chat/lumen-message';
import { UserMessage } from '@/components/chat/user-message';
import { useTranscriptLoader } from '@/lib/hooks/use-transcript-loader';
import { extractClosureFields } from '@/lib/session/summary';

type TranscriptViewerProps = {
  sessionId: string;
};

// Read-only transcript display using the same message components as the chat.
export function TranscriptViewer({ sessionId }: TranscriptViewerProps) {
  const { messages, notebook, isLoading, error } = useTranscriptLoader(sessionId);

  const closureFields = React.useMemo(() => {
    if (!notebook) return null;
    const { partingWords, actionSteps } = extractClosureFields(notebook.markdown);
    if (!partingWords && actionSteps.length === 0) return null;
    return { partingWords, actionSteps };
  }, [notebook]);

  if (isLoading) {
    return (
      <div className="px-6 py-8 space-y-6 max-w-2xl mx-auto">
        {/* Skeleton placeholders */}
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3 animate-pulse">
            <div
              className="h-4 bg-muted/60 rounded"
              style={{ width: i % 2 === 0 ? '60%' : '80%', marginLeft: i % 2 === 0 ? 'auto' : 0 }}
            />
            <div
              className="h-4 bg-muted/40 rounded"
              style={{ width: i % 2 === 0 ? '40%' : '70%', marginLeft: i % 2 === 0 ? 'auto' : 0 }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center space-y-4">
        <p className="text-muted-foreground">{error}</p>
        <Link
          href="/history"
          className="text-sm text-accent hover:text-accent/80 transition-colors"
        >
          Return to history
        </Link>
      </div>
    );
  }

  return (
    <div className="px-6 py-8 max-w-2xl mx-auto">
      {/* Closure fields from notebook */}
      {closureFields && (
        <>
          <div className="space-y-6">
            {closureFields.partingWords && (
              <div className="relative py-4">
                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-16 h-px bg-border" />
                <div className="absolute left-1/2 -translate-x-1/2 bottom-0 w-16 h-px bg-border" />
                <blockquote className="py-4 px-4 text-center">
                  <p className="font-display text-xl leading-relaxed text-foreground italic">
                    &ldquo;{closureFields.partingWords}&rdquo;
                  </p>
                </blockquote>
              </div>
            )}

            {closureFields.actionSteps.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  What came up
                </h3>
                <ul className="space-y-2">
                  {closureFields.actionSteps.map((step, index) => (
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
          <div className="my-8 flex justify-center">
            <div className="w-16 h-px bg-border" />
          </div>
        </>
      )}

      {/* Message list */}
      <div className="space-y-6">
        {messages.map((message) =>
          message.role === 'lumen' ? (
            <LumenMessage key={message.id} content={message.content} />
          ) : (
            <UserMessage key={message.id} content={message.content} />
          ),
        )}
      </div>

      {/* Bottom breathing room */}
      <div className="h-16" />
    </div>
  );
}
