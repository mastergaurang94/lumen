'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomProps {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

// Distance from the actual content bottom (px) below which we hide the button.
const SCROLL_THRESHOLD = 100;

// Small circular button that appears when the user has scrolled away from
// the bottom of the actual conversation content. Uses the flex spacer's
// height to distinguish real content from breathing room.
//
// The button stays in the DOM at all times — only opacity and scale change.
// Removing it via AnimatePresence caused a 32px footer-height swing which
// resized the scroll area and produced a visible "bounce" at the bottom.
export function ScrollToBottom({ scrollAreaRef, className }: ScrollToBottomProps) {
  const [show, setShow] = React.useState(false);
  const shouldReduceMotion = useReducedMotion();

  React.useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const handleScroll = () => {
      const spacer = el.querySelector('[data-scroll-spacer]') as HTMLElement | null;
      const spacerHeight = spacer ? spacer.offsetHeight : 0;

      const contentEnd = el.scrollHeight - spacerHeight;
      const viewportBottom = el.scrollTop + el.clientHeight;
      setShow(contentEnd - viewportBottom > SCROLL_THRESHOLD);
    };

    // Check initial state
    handleScroll();

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [scrollAreaRef]);

  const scrollToBottom = React.useCallback(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const spacer = el.querySelector('[data-scroll-spacer]') as HTMLElement | null;
    const spacerHeight = spacer ? spacer.offsetHeight : 0;

    const target = el.scrollHeight - spacerHeight - el.clientHeight;
    el.scrollTo({ top: Math.max(0, target), behavior: shouldReduceMotion ? 'auto' : 'smooth' });
  }, [scrollAreaRef, shouldReduceMotion]);

  return (
    <motion.button
      animate={{ opacity: show ? 1 : 0, scale: show ? 1 : 0.8 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
      onClick={scrollToBottom}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      className={cn(
        'h-11 w-11 rounded-full',
        'flex items-center justify-center',
        'bg-muted/80 text-muted-foreground backdrop-blur-sm',
        'hover:bg-muted hover:text-foreground',
        'border border-border/50',
        'shadow-sm',
        'transition-colors duration-150',
        !show && 'pointer-events-none',
        className,
      )}
      aria-label="Scroll to bottom"
    >
      <ArrowDown className="h-5 w-5" />
    </motion.button>
  );
}
