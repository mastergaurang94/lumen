'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToBottomProps {
  scrollAreaRef: React.RefObject<HTMLDivElement | null>;
  className?: string;
}

// Distance from the actual content bottom (px) below which we hide the button.
const SCROLL_THRESHOLD = 100;

// Small circular button that appears when the user has scrolled away from
// the bottom of the actual conversation content. Ignores the pb-[80vh]
// padding that exists for scroll-stability purposes.
export function ScrollToBottom({ scrollAreaRef, className }: ScrollToBottomProps) {
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const el = scrollAreaRef.current;
    if (!el) return;

    const handleScroll = () => {
      // The content wrapper uses pb-[80vh] for scroll stability. We need
      // to subtract that padding so the button only appears when real
      // message content is above the viewport, not empty padding.
      const contentWrapper = el.firstElementChild as HTMLElement | null;
      const paddingBottom = contentWrapper
        ? parseFloat(getComputedStyle(contentWrapper).paddingBottom)
        : 0;

      const contentEnd = el.scrollHeight - paddingBottom;
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

    // Scroll to the actual content end, not the padded bottom.
    const contentWrapper = el.firstElementChild as HTMLElement | null;
    const paddingBottom = contentWrapper
      ? parseFloat(getComputedStyle(contentWrapper).paddingBottom)
      : 0;

    const target = el.scrollHeight - paddingBottom - el.clientHeight;
    el.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
  }, [scrollAreaRef]);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{ duration: 0.15 }}
          onClick={scrollToBottom}
          className={cn(
            'h-8 w-8 rounded-full',
            'flex items-center justify-center',
            'bg-muted/80 text-muted-foreground backdrop-blur-sm',
            'hover:bg-muted hover:text-foreground',
            'border border-border/50',
            'shadow-sm',
            'transition-colors duration-150',
            className,
          )}
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
