'use client';

import * as React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
  /** When false, renders a static (non-pulsing) lightbulb. Defaults to true. */
  pulsing?: boolean;
}

const bulbClasses =
  'h-6 w-6 fill-amber-400/30 stroke-amber-500 dark:fill-amber-300/30 dark:stroke-amber-400';
const shadowClass = 'drop-shadow-[0_0_6px_rgba(210,170,60,0.5)]';

// Lightbulb indicator — pulses during streaming, stays static afterward.
export function TypingIndicator({ className, pulsing = true }: TypingIndicatorProps) {
  const shouldReduceMotion = useReducedMotion();

  if (!pulsing) {
    return (
      <div className={cn('flex items-center', className)}>
        <div className={shadowClass}>
          <Lightbulb className={bulbClasses} strokeWidth={2.5} />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: shouldReduceMotion ? 0 : 0.2 }}
      className={cn('flex items-center', className)}
    >
      <motion.div
        animate={
          shouldReduceMotion
            ? { opacity: 1, scale: 1 }
            : {
                opacity: [0.5, 1, 0.5],
                scale: [0.95, 1.1, 0.95],
              }
        }
        transition={
          shouldReduceMotion
            ? { duration: 0 }
            : { duration: 2, repeat: Infinity, ease: 'easeInOut' }
        }
        className={shadowClass}
      >
        <Lightbulb className={bulbClasses} strokeWidth={2.5} />
      </motion.div>
    </motion.div>
  );
}
