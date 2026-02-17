'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UserMessageProps {
  content: string;
  className?: string;
}

// Height threshold (px) above which user messages collapse.
const COLLAPSE_THRESHOLD = 200;

// Subtle opacity-only entrance — no vertical shift that would displace sibling content.
export function UserMessage({ content, className }: UserMessageProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const contentId = React.useId();
  const [isCollapsible, setIsCollapsible] = React.useState(false);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  // Observe the natural height of the inner text to decide if collapse is needed.
  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setIsCollapsible(entry.contentRect.height > COLLAPSE_THRESHOLD);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
            'rounded-2xl rounded-br-md',
            'bg-accent text-accent-foreground',
            'text-lg leading-relaxed',
          )}
        >
          {/* Text area — clipped with thin gradient when collapsed */}
          <div className="relative">
            <div
              id={contentId}
              style={collapsed ? { maxHeight: `${COLLAPSE_THRESHOLD}px` } : undefined}
              className={cn(
                'px-5 py-3.5 whitespace-pre-wrap break-words',
                collapsed && 'overflow-hidden',
              )}
            >
              <div ref={contentRef}>{content}</div>
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
                className="text-sm text-accent-foreground hover:text-accent-foreground transition-colors duration-150"
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
