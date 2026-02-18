import { cn } from '@/lib/utils';
import { formatSessionDate } from '@/lib/format';

type ChatHeaderProps = {
  sessionDate: Date;
  elapsedTime: string;
  sessionNumber: number;
  compact?: boolean;
};

// Displays the session title and elapsed active time.
// The elapsed-time line is always rendered (with a non-breaking space placeholder)
// to reserve vertical space and prevent layout shift when the timer starts.
export function ChatHeader({
  sessionDate,
  elapsedTime,
  sessionNumber,
  compact = false,
}: ChatHeaderProps) {
  return (
    <div className={cn('text-center', compact ? 'pt-3 pb-1' : 'pt-16 pb-4')}>
      <h1 className={cn('font-display text-foreground', compact ? 'text-base' : 'text-lg')}>
        Conversation {sessionNumber} - {formatSessionDate(sessionDate)}
      </h1>
      <p
        className={cn(
          compact ? 'text-[11px] mt-0.5' : 'text-xs mt-1',
          elapsedTime ? 'text-muted-foreground' : 'invisible',
        )}
      >
        {elapsedTime || '\u00A0'}
      </p>
    </div>
  );
}
