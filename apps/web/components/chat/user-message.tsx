'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface UserMessageProps {
  content: string;
  className?: string;
}

export function UserMessage({ content, className }: UserMessageProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className={cn('flex justify-end', className)}
    >
      <div className="max-w-[85%]">
        <div
          className={cn(
            'px-5 py-3.5 rounded-2xl rounded-br-md',
            'bg-accent text-accent-foreground',
            'whitespace-pre-wrap break-words',
            'text-lg leading-relaxed',
          )}
        >
          {content}
        </div>
      </div>
    </motion.div>
  );
}
