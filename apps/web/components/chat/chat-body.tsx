import type { RefObject } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield } from 'lucide-react';

import { LumenMessage, TypingIndicator, UserMessage } from '@/components/chat';
import { ProviderGate } from '@/components/chat/provider-gate';
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
          {messages.map((message) =>
            message.role === 'lumen' ? (
              <LumenMessage key={message.id} content={message.content} />
            ) : (
              <UserMessage key={message.id} content={message.content} />
            ),
          )}

          {/* Streaming message */}
          {streamingContent !== null && <LumenMessage key="streaming" content={streamingContent} />}

          {/* Pulsing lightbulb — visible during thinking and streaming */}
          <AnimatePresence>
            {(isTyping || streamingContent !== null) && <TypingIndicator key="typing" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
