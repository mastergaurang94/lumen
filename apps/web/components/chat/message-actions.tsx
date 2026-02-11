'use client';

import * as React from 'react';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessageActionsProps {
  content: string;
  /** When true, actions are always visible (used for the latest message). */
  alwaysVisible?: boolean;
  className?: string;
}

// Action bar below assistant messages — currently just Copy.
// Always visible on the latest message; revealed on hover for older ones.
export function MessageActions({ content, alwaysVisible = false, className }: MessageActionsProps) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail in insecure contexts — silent fallback.
    }
  }, [content]);

  return (
    <div
      className={cn(
        'flex items-center gap-1 pt-1.5',
        !alwaysVisible && 'opacity-0 group-hover:opacity-100 transition-opacity duration-150',
        className,
      )}
    >
      <button
        onClick={handleCopy}
        className={cn(
          'h-8 w-8 rounded-md',
          'flex items-center justify-center',
          'text-muted-foreground/60',
          'hover:text-muted-foreground hover:bg-muted/50',
          'transition-colors duration-150',
        )}
        aria-label={copied ? 'Copied' : 'Copy message'}
      >
        {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}
