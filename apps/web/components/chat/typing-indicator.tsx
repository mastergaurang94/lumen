'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TypingIndicatorProps {
  className?: string;
}

// Pulsing lightbulb — Lumen's "thinking" indicator.
export function TypingIndicator({ className }: TypingIndicatorProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('flex items-center', className)}
    >
      <motion.div
        animate={{
          opacity: [0.5, 1, 0.5],
          scale: [0.95, 1.1, 0.95],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        className="drop-shadow-[0_0_6px_rgba(210,170,60,0.5)]"
      >
        <Lightbulb
          className="h-6 w-6 fill-amber-400/30 stroke-amber-500 dark:fill-amber-300/30 dark:stroke-amber-400"
          strokeWidth={2.5}
        />
      </motion.div>
    </motion.div>
  );
}
