'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UserMessageProps {
  content: string;
  className?: string;
}

// Height threshold (px) above which user messages collapse.
// Lower on mobile where screen real estate is limited.
const COLLAPSE_THRESHOLD_MOBILE = 150;
const COLLAPSE_THRESHOLD_DESKTOP = 200;

function useCollapseThreshold() {
  const [threshold, setThreshold] = React.useState(COLLAPSE_THRESHOLD_DESKTOP);
  React.useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () =>
      setThreshold(mq.matches ? COLLAPSE_THRESHOLD_MOBILE : COLLAPSE_THRESHOLD_DESKTOP);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return threshold;
}

// Subtle opacity-only entrance — no vertical shift that would displace sibling content.
export function UserMessage({ content, className }: UserMessageProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const contentId = React.useId();
  const [isCollapsible, setIsCollapsible] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();
  const collapseThreshold = useCollapseThreshold();

  // Observe the natural height of the inner text to decide if collapse is needed.
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setIsCollapsible(entry.contentRect.height > collapseThreshold);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [collapseThreshold]);

  const collapsed = isCollapsible && !isExpanded;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      data-message-role="user"
      className={cn('flex justify-end', className)}
    >
      <div className="max-w-[85%]">
        <div
          className={cn(
            'rounded-3xl',
            'bg-accent text-accent-foreground',
            'text-[19px] leading-snug',
          )}
        >
          {/* Text area — clipped with thin gradient when collapsed */}
          <div className="relative">
            <div
              id={contentId}
              style={collapsed ? { maxHeight: `${collapseThreshold}px` } : undefined}
              className={cn(
                'px-5 py-3 md:py-3.5 break-words [overflow-wrap:anywhere]',
                collapsed && 'overflow-hidden',
              )}
            >
              <div ref={contentRef} className="break-words [overflow-wrap:anywhere]">
                {/* Split on double-newlines into paragraphs with controlled spacing,
                    matching the assistant message's prose-p:my-2 margins. Single
                    newlines within a paragraph are preserved via whitespace-pre-wrap. */}
                {content.split(/\n\n+/).map((para, i) => (
                  <p key={i} className={cn('whitespace-pre-wrap', i > 0 && 'mt-2')}>
                    {para}
                  </p>
                ))}
              </div>
            </div>

            {/* Thin gradient — fades the last line into the card background */}
            {collapsed && (
              <div
                className="absolute bottom-0 inset-x-0 h-10 pointer-events-none"
                style={{
                  background: 'linear-gradient(to bottom, transparent, hsl(var(--accent)))',
                }}
              />
            )}
          </div>

          {/* "Show more" / "Show less" — own row inside the card, left-aligned */}
          {isCollapsible && (
            <div className="px-5 pb-3">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="text-base text-accent-foreground/80 hover:text-accent-foreground transition-colors duration-150"
                aria-expanded={!collapsed}
                aria-controls={contentId}
              >
                {collapsed ? 'Show more' : 'Show less'}
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
