import type { RefObject } from 'react';
import { ChatInput } from '@/components/chat/chat-input';
import { ScrollToBottom } from '@/components/chat/scroll-to-bottom';
import { Z_INDEX } from '@/lib/z-index';

type ChatFooterProps = {
  onSend: (content: string) => void;
  onStop?: () => void;
  isStreaming?: boolean;
  disabled: boolean;
  scrollAreaRef: RefObject<HTMLDivElement | null>;
  compact?: boolean;
};

// Input footer with sticky positioning, scroll-to-bottom button, and session hints.
export function ChatFooter({
  onSend,
  onStop,
  isStreaming,
  disabled,
  scrollAreaRef,
  compact = false,
}: ChatFooterProps) {
  return (
    <footer className="sticky bottom-0" style={{ zIndex: Z_INDEX.sticky }}>
      {!compact && (
        <div
          className="absolute inset-x-0 -top-16 h-16 pointer-events-none"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
      )}
      <div
        className={
          compact
            ? 'relative bg-background border-t border-border/40'
            : 'relative bg-background/80 backdrop-blur-md'
        }
      >
        <div
          className={
            compact ? 'max-w-3xl mx-auto px-3 pt-1 pb-2' : 'max-w-3xl mx-auto px-6 pt-4 pb-6'
          }
        >
          {/* Scroll-to-bottom — floats above the input when user has scrolled up */}
          <div className={compact ? 'flex justify-center mb-1' : 'flex justify-center mb-2'}>
            <ScrollToBottom scrollAreaRef={scrollAreaRef} />
          </div>
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            isStreaming={isStreaming}
            disabled={disabled}
            placeholder="Reply..."
            compact={compact}
          />
          {!compact && (
            <p className="mt-3 text-xs text-muted-foreground text-center">
              <span className="md:hidden">Lumen is AI-powered and can make mistakes</span>
              <span className="hidden md:inline">
                Enter to send · Shift+Enter for new line · Lumen is AI-powered and can make mistakes
              </span>
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
