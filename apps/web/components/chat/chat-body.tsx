import type { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

import { LumenMessage, TypingIndicator, UserMessage } from '@/components/chat';
import { MessageActions } from '@/components/chat/message-actions';
import { ProviderGate } from '@/components/chat/provider-gate';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types/session';

type ChatBodyProps = {
  showProviderGate: boolean;
  llmKeyInput: string;
  llmKeyError: string | null;
  isSavingKey: boolean;
  onKeyChange: (value: string) => void;
  onKeySubmit: () => void;
  messages: Message[];
  isTyping: boolean;
  streamingContent: string | null;
  streamInterruptedPartial: string | null;
  onRetryInterruptedStream: () => void;
  onDismissInterruptedStream: () => void;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
};

// Main chat body with provider gate, message list, and streaming state.
export function ChatBody({
  showProviderGate,
  llmKeyInput,
  llmKeyError,
  isSavingKey,
  onKeyChange,
  onKeySubmit,
  messages,
  isTyping,
  streamingContent,
  streamInterruptedPartial,
  onRetryInterruptedStream,
  onDismissInterruptedStream,
  scrollAreaRef,
}: ChatBodyProps) {
  if (showProviderGate) {
    return (
      <ProviderGate
        llmKeyInput={llmKeyInput}
        llmKeyError={llmKeyError}
        isSavingKey={isSavingKey}
        onChange={onKeyChange}
        onSubmit={onKeySubmit}
      />
    );
  }

  // Find the last committed Lumen message index for always-visible actions.
  const lastLumenIndex = messages.reduce((acc, msg, i) => (msg.role === 'lumen' ? i : acc), -1);

  return (
    <div ref={scrollAreaRef} className="h-full chat-scroll-area">
      <div className="max-w-3xl mx-auto px-6 pt-8 pb-[80vh]">
        {/* Empty state before first message */}
        {messages.length === 0 && !isTyping && streamingContent === null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <p className="text-muted-foreground text-sm max-w-xs">One moment...</p>
          </motion.div>
        )}

        {/* Message list */}
        <div className="space-y-6">
          {messages.map((message, index) =>
            message.role === 'lumen' ? (
              <div key={message.id} className="group">
                <LumenMessage content={message.content} />
                <MessageActions
                  content={message.content}
                  alwaysVisible={index === lastLumenIndex}
                />
              </div>
            ) : (
              <div key={message.id} className="group">
                <UserMessage content={message.content} />
                <div className="flex justify-end">
                  <MessageActions content={message.content} />
                </div>
              </div>
            ),
          )}

          {/* Streaming message */}
          {streamingContent !== null && <LumenMessage key="streaming" content={streamingContent} />}

          {/* Inline interruption feedback with retry action */}
          {streamInterruptedPartial !== null && (
            <div className="space-y-4">
              {streamInterruptedPartial.length > 0 && (
                <LumenMessage content={streamInterruptedPartial} />
              )}
              <div className="rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
                <p className="text-sm text-foreground">
                  I lost my train of thought. Want me to try again?
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <Button size="sm" onClick={onRetryInterruptedStream}>
                    Try again
                  </Button>
                  <Button size="sm" variant="ghost" onClick={onDismissInterruptedStream}>
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Pulsing lightbulb — visible during thinking and streaming */}
          <AnimatePresence>
            {(isTyping || streamingContent !== null) && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
