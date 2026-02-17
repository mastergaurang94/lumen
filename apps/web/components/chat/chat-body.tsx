import { useRef, useEffect, useState, type RefObject } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Shield } from 'lucide-react';

import { LumenMessage, TypingIndicator, UserMessage } from '@/components/chat';
import { MessageActions } from '@/components/chat/message-actions';
import { ProviderGate } from '@/components/chat/provider-gate';
import { Button } from '@/components/ui/button';
import type { Message } from '@/types/session';

// Imperative handle for temporarily inflating the scroll spacer during
// pin-to-top scroll animations. inflate(scrollTarget) expands to the scroll
// area height and enters "recovering" mode — the ResizeObserver then gradually
// shrinks the spacer as response content fills the space, never dropping below
// what the scroll target needs so the smooth scroll isn't clamped.
export type SpacerControl = {
  inflate: (scrollTarget: number) => void;
};

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
  spacerControlRef?: RefObject<SpacerControl | null>;
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
  spacerControlRef,
}: ChatBodyProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const spacerRef = useRef<HTMLDivElement>(null);
  const shouldReduceMotion = useReducedMotion();
  const isStreamingActive = isTyping || streamingContent !== null;
  const [liveAnnouncement, setLiveAnnouncement] = useState('');
  const wasStreamingRef = useRef(isStreamingActive);

  useEffect(() => {
    let clearAnnouncementTimer: ReturnType<typeof setTimeout> | undefined;

    if (wasStreamingRef.current && !isStreamingActive) {
      setLiveAnnouncement('Response complete');
      clearAnnouncementTimer = setTimeout(() => setLiveAnnouncement(''), 1500);
    }

    wasStreamingRef.current = isStreamingActive;
    return () => {
      if (clearAnnouncementTimer) {
        clearTimeout(clearAnnouncementTimer);
      }
    };
  }, [isStreamingActive]);

  // Dynamic spacer with recovering mode for pin-to-top scroll animations.
  //
  // Normal mode: max(64px, scrollAreaHeight - contentHeight)
  //   Short content → large spacer (natural scroll room for pin-to-top)
  //   Long content  → 64px (just a small gap above the input)
  //
  // Recovering mode (after inflate):
  //   The spacer was inflated to the scroll area height for pin-to-top. Instead of snapping
  //   back (which would cause a scroll jump), we let the ResizeObserver
  //   gradually shrink it: on each content resize, the spacer is set to
  //   max(baseFormula, scrollTop + clientHeight - contentHeight). As the
  //   response streams in and content grows, the "needed" value drops until
  //   it falls below the base formula — at which point recovery exits and
  //   the normal formula takes over. No visible jump at any point.
  useEffect(() => {
    const content = contentRef.current;
    const spacer = spacerRef.current;
    if (!content || !spacer) return;

    let recovering = false;
    let scrollTarget = 0;

    const scrollArea = spacer.closest('.chat-scroll-area') as HTMLElement | null;

    const update = () => {
      const h = content.offsetHeight;
      // Use the scroll container's height, not the full viewport — the scroll
      // area is shorter than 100vh because of the header and input footer.
      const scrollH = scrollArea?.clientHeight ?? window.innerHeight;
      const baseMin = Math.max(64, scrollH - h);

      if (recovering) {
        if (scrollArea) {
          // Use the larger of the pin-to-top target and the current scrollTop.
          // During the smooth scroll animation, scrollTop may be at an
          // intermediate value — using just scrollTop would shrink the spacer
          // below what the animation needs, clamping the scroll before it
          // reaches its target.
          const effectiveScroll = Math.max(scrollTarget, scrollArea.scrollTop);
          const needed = effectiveScroll + scrollArea.clientHeight - h;
          if (needed > baseMin) {
            spacer.style.minHeight = `${Math.ceil(needed)}px`;
            return;
          }
        }
        // Content has grown enough — exit recovery
        recovering = false;
      }

      spacer.style.minHeight = `${baseMin}px`;
    };

    if (spacerControlRef) {
      (spacerControlRef as React.MutableRefObject<SpacerControl | null>).current = {
        inflate: (target: number) => {
          recovering = true;
          scrollTarget = target;
          const scrollH = scrollArea?.clientHeight ?? window.innerHeight;
          spacer.style.minHeight = `${scrollH}px`;
        },
      };
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(content);
    return () => {
      ro.disconnect();
      if (spacerControlRef) {
        (spacerControlRef as React.MutableRefObject<SpacerControl | null>).current = null;
      }
    };
  }, [spacerControlRef]);

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
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </p>
      <div>
        <div ref={contentRef} className="max-w-3xl mx-auto px-6 pt-8">
          {/* Empty state before first message */}
          {messages.length === 0 && !isTyping && streamingContent === null && (
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
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

            {/* Streaming response + typing indicator — kept as a single
                block so the lightbulb doesn't jump when streaming begins.
                Text grows above the indicator within the same wrapper. */}
            {isStreamingActive && (
              <div>
                {streamingContent !== null && (
                  <LumenMessage key="streaming" content={streamingContent} />
                )}
                <TypingIndicator key="typing" className="mt-2" />
                {/* Invisible placeholder matching MessageActions height —
                    ensures zero content-height delta at commit time. */}
                {streamingContent !== null && (
                  <div className="flex items-center pt-1.5 invisible" aria-hidden="true">
                    <div className="h-8 w-8" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Height reservation matching the indicator — present when not
              streaming to keep content height stable at commit time. */}
          {!isStreamingActive && <div className="h-8" aria-hidden="true" />}
        </div>

        {/* Scroll spacer — dynamically sized via ResizeObserver above.
            Short content → large spacer (scroll room for pin-to-top).
            Long content → 64px gap (minimal breathing room above input).
            Temporarily inflated to scroll area height during pin-to-top. */}
        <div ref={spacerRef} data-scroll-spacer aria-hidden="true" />
      </div>
    </div>
  );
}
