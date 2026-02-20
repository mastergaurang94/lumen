'use client';

import * as React from 'react';
import { Mic, X } from 'lucide-react';

const STORAGE_KEY = 'lumen-voice-tip-dismissed';

/** Dismissible one-time tip encouraging voice dictation input. */
export function VoiceDictationTip() {
  const [visible, setVisible] = React.useState(false);

  // Only show after mount to avoid SSR/hydration mismatch with localStorage.
  React.useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-accent/8 text-sm text-muted-foreground">
      <Mic className="h-4 w-4 text-accent shrink-0" />
      <span>Try voice dictation for a more natural conversation</span>
      <button
        onClick={dismiss}
        className="ml-auto shrink-0 p-1 rounded-md hover:bg-muted/60 transition-colors"
        aria-label="Dismiss tip"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
