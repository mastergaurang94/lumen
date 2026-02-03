import { formatSessionDate } from '@/lib/format';

type ChatHeaderProps = {
  sessionDate: Date;
  elapsedTime: string;
};

// Displays the session title and elapsed active time.
export function ChatHeader({ sessionDate, elapsedTime }: ChatHeaderProps) {
  return (
    <div className="pt-16 pb-4 text-center">
      <h1 className="font-display text-lg text-foreground">
        Session · {formatSessionDate(sessionDate)}
      </h1>
      {elapsedTime && <p className="text-xs text-muted-foreground/60 mt-1">{elapsedTime}</p>}
    </div>
  );
}
