import { cn } from '@/lib/utils';
import { formatSessionDate } from '@/lib/format';

type ChatHeaderProps = {
  sessionDate: Date;
  elapsedTime: string;
};

// Displays the session title and elapsed active time.
// The elapsed-time line is always rendered (with a non-breaking space placeholder)
// to reserve vertical space and prevent layout shift when the timer starts.
export function ChatHeader({ sessionDate, elapsedTime }: ChatHeaderProps) {
  return (
    <div className="pt-16 pb-4 text-center">
      <h1 className="font-display text-lg text-foreground">{formatSessionDate(sessionDate)}</h1>
      <p className={cn('text-xs mt-1', elapsedTime ? 'text-muted-foreground/60' : 'invisible')}>
        {elapsedTime || '\u00A0'}
      </p>
    </div>
  );
}
