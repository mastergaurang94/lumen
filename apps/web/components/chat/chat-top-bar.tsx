import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';
import { cn } from '@/lib/utils';
import { formatSessionDate } from '@/lib/format';
import { Z_INDEX } from '@/lib/z-index';

type ChatTopBarProps = {
  compactLandscapeLayout: boolean;
  sessionNumber: number;
  sessionDate: Date;
  elapsedTime: string;
  showWrapUp: boolean;
  onWrapUp: () => void;
};

export const ChatTopBar = React.forwardRef<HTMLElement, ChatTopBarProps>(function ChatTopBar(
  { compactLandscapeLayout, sessionNumber, sessionDate, elapsedTime, showWrapUp, onWrapUp },
  ref,
) {
  return (
    <header
      ref={ref}
      className={cn(
        'fixed inset-x-0 top-0 flex items-center bg-background/30 backdrop-blur-[2px]',
        compactLandscapeLayout ? 'h-11 px-3' : 'h-14 px-4 pt-1 md:h-16 md:px-6 md:pt-1',
      )}
      style={{ zIndex: Z_INDEX.navigation }}
    >
      <div
        className="absolute inset-x-0 top-full h-16 pointer-events-none"
        style={{
          background:
            'linear-gradient(to bottom, hsl(var(--background) / 0.3) 0%, hsl(var(--background) / 0.15) 40%, transparent 100%)',
        }}
      />
      <Sidebar />

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <p
            className={cn(
              'font-semibold text-foreground leading-tight md:hidden',
              compactLandscapeLayout ? 'text-xs' : 'text-base',
            )}
          >
            Conversation {sessionNumber}
          </p>
          <h1 className="hidden md:block font-display text-lg text-foreground leading-tight">
            Conversation {sessionNumber} &mdash; {formatSessionDate(sessionDate)}
          </h1>
          <p
            className={cn(
              'hidden md:block text-xs mt-0.5',
              elapsedTime ? 'text-muted-foreground' : 'invisible',
            )}
          >
            {elapsedTime || '\u00A0'}
          </p>
        </div>
      </div>

      {showWrapUp && (
        <Button
          variant="outline"
          onClick={onWrapUp}
          className={cn(
            'ml-auto text-foreground',
            compactLandscapeLayout
              ? 'h-9 px-3 text-sm'
              : 'h-9 px-3.5 text-sm md:h-10 md:px-4 md:text-base',
          )}
        >
          Wrap up
        </Button>
      )}
    </header>
  );
});
