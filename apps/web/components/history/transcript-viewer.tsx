'use client';

import * as React from 'react';
import Link from 'next/link';
import { LumenMessage } from '@/components/chat/lumen-message';
import { UserMessage } from '@/components/chat/user-message';
import { SessionSummary } from '@/components/history/session-summary';
import { useTranscriptLoader } from '@/lib/hooks/use-transcript-loader';
import { extractClosureFields } from '@/lib/session/summary';

type TranscriptViewerProps = {
  sessionId: string;
};

// Read-only transcript display using the same message components as the chat.
export function TranscriptViewer({ sessionId }: TranscriptViewerProps) {
  const { messages, summary, notebook, isLoading, error } = useTranscriptLoader(sessionId);

  // Prefer notebook (new format) over summary (legacy) for display.
  const displaySummary = React.useMemo(() => {
    if (notebook) {
      const { partingWords, actionSteps } = extractClosureFields(notebook.markdown);
      return {
        parting_words: partingWords,
        action_steps: actionSteps,
      };
    }
    if (summary) {
      return {
        parting_words: summary.parting_words,
        action_steps: summary.action_steps,
      };
    }
    return null;
  }, [notebook, summary]);

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
      {/* Session summary at top (from notebook or legacy summary) */}
      {displaySummary && (
        <>
          <SessionSummary
            summary={{
              session_id: sessionId,
              user_id: '',
              summary_text: '',
              parting_words: displaySummary.parting_words,
              action_steps: displaySummary.action_steps,
              open_threads: [],
              notes: null,
              created_at: '',
              updated_at: '',
            }}
          />
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
