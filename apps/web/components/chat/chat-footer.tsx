import type { RefObject } from 'react';
import { ChatInput } from '@/components/chat/chat-input';
import { ScrollToBottom } from '@/components/chat/scroll-to-bottom';
import { VoiceDictationTip } from '@/components/chat/voice-dictation-tip';
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
// Mobile: minimal — just the input pill with safe-area bottom padding.
// Desktop: gradient fade, backdrop blur, keyboard hints, generous padding.
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
      {/* Gradient fade — desktop only */}
      {!compact && (
        <div
          className="absolute inset-x-0 -top-16 h-16 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
          }}
        />
      )}
      <div
        className={
          compact
            ? 'relative bg-background border-t border-border/40'
            : 'relative bg-background md:bg-background/80 md:backdrop-blur-md'
        }
      >
        <div
          className={
            compact
              ? 'pointer-events-none absolute inset-x-0 -top-11 z-10 flex justify-center'
              : 'pointer-events-none absolute inset-x-0 -top-12 z-10 flex justify-center md:-top-14'
          }
        >
          <div className="pointer-events-auto">
            <ScrollToBottom scrollAreaRef={scrollAreaRef} />
          </div>
        </div>
        <div
          className={
            compact
              ? 'max-w-3xl mx-auto px-3 pt-1 pb-2'
              : 'max-w-3xl mx-auto px-4 pt-1.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:px-6 md:pt-4 md:pb-6'
          }
        >
          {!compact && <VoiceDictationTip />}
          <ChatInput
            onSend={onSend}
            onStop={onStop}
            isStreaming={isStreaming}
            disabled={disabled}
            placeholder="Reply..."
            compact={compact}
          />
          {/* Desktop-only: keyboard hints + AI disclaimer */}
          {!compact && (
            <p className="mt-3 text-xs text-muted-foreground text-center hidden md:block">
              Enter to send · Shift+Enter for new line · Lumen is AI-powered and can make mistakes
            </p>
          )}
        </div>
      </div>
    </footer>
  );
}
