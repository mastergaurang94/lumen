'use client';

import * as React from 'react';
import Link from 'next/link';
import { formatShortDate } from '@/lib/format';
import { withDevAuth } from '@/lib/hooks/dev-auth';
import { cn } from '@/lib/utils';

type SessionCardProps = {
  sessionId: string;
  sessionNumber: number;
  startedAt: Date;
  partingWords?: string | null;
};

// Journal-style card for each past session in the history list.
export function SessionCard({
  sessionId,
  sessionNumber,
  startedAt,
  partingWords,
}: SessionCardProps) {
  const truncatedWords =
    partingWords && partingWords.length > 80
      ? `${partingWords.slice(0, 80).trimEnd()}...`
      : partingWords;

  return (
    <Link href={withDevAuth(`/history/${sessionId}`)}>
      <div
        className={cn(
          'rounded-xl border border-border/20 p-5 transition-all duration-200',
          'hover:border-border/40 hover:bg-muted/30',
        )}
      >
        <h3 className="font-display text-lg text-foreground">Conversation {sessionNumber}</h3>
        <p className="text-sm text-muted-foreground mt-1">{formatShortDate(startedAt)}</p>
        {truncatedWords && (
          <p className="text-sm text-muted-foreground/70 italic mt-3 leading-relaxed">
            &ldquo;{truncatedWords}&rdquo;
          </p>
        )}
      </div>
    </Link>
  );
}
