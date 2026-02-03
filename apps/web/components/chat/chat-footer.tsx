import { ChatInput } from '@/components/chat/chat-input';
import { Z_INDEX } from '@/lib/z-index';

type ChatFooterProps = {
  onSend: (content: string) => void;
  disabled: boolean;
};

// Input footer with sticky positioning and session hints.
export function ChatFooter({ onSend, disabled }: ChatFooterProps) {
  return (
    <footer className="sticky bottom-0" style={{ zIndex: Z_INDEX.sticky }}>
      {/* Gradient fade for smooth transition */}
      <div
        className="absolute inset-x-0 -top-16 h-16 pointer-events-none"
        style={{
          background: 'linear-gradient(to top, hsl(var(--background)) 0%, transparent 100%)',
        }}
      />
      <div className="relative bg-background/80 backdrop-blur-md">
        <div className="max-w-3xl mx-auto px-6 pt-4 pb-6">
          <ChatInput onSend={onSend} disabled={disabled} placeholder="Reply..." />
          <p className="mt-3 text-xs text-muted-foreground/50 text-center">
            Enter to send · Shift+Enter for new line · Lumen is AI-powered and can make mistakes
          </p>
        </div>
      </div>
    </footer>
  );
}
