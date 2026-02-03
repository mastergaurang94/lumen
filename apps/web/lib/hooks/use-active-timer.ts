import * as React from 'react';

import { formatElapsedTime } from '@/lib/format';

// Active time lives in localStorage to avoid Dexie schema churn pre-launch.
const ACTIVE_TIME_STORAGE_PREFIX = 'lumen:session:active-time:';

type ActiveTimeRecord = {
  active_ms: number;
  last_active_started_at: string | null;
};

function getActiveTimeKey(sessionId: string): string {
  return `${ACTIVE_TIME_STORAGE_PREFIX}${sessionId}`;
}

// Load persisted active time safely, defaulting to zero on parse errors.
function readActiveTime(sessionId: string): ActiveTimeRecord {
  if (typeof window === 'undefined') {
    return { active_ms: 0, last_active_started_at: null };
  }
  try {
    const raw = window.localStorage.getItem(getActiveTimeKey(sessionId));
    if (!raw) return { active_ms: 0, last_active_started_at: null };
    const parsed = JSON.parse(raw) as Partial<ActiveTimeRecord>;
    return {
      active_ms: typeof parsed.active_ms === 'number' ? parsed.active_ms : 0,
      last_active_started_at:
        parsed.last_active_started_at && typeof parsed.last_active_started_at === 'string'
          ? parsed.last_active_started_at
          : null,
    };
  } catch {
    return { active_ms: 0, last_active_started_at: null };
  }
}

// Persist active time as best-effort local storage (no hard failure).
function writeActiveTime(sessionId: string, record: ActiveTimeRecord): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(getActiveTimeKey(sessionId), JSON.stringify(record));
  } catch {
    // Best-effort only; active time is a convenience, not core data.
  }
}

// Clear local active time for completed sessions.
function clearActiveTime(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(getActiveTimeKey(sessionId));
  } catch {
    // Best-effort only.
  }
}

type UseActiveTimerOptions = {
  sessionId: string | null;
  isSessionActive: boolean;
};

type ActiveTimerControls = {
  elapsedTime: string;
  startActiveSegment: () => void;
  stopActiveSegment: () => void;
  loadActiveTimer: (sessionId: string) => void;
  resetActiveTimer: (sessionId: string) => void;
  clearActiveTimer: (sessionId: string) => void;
};

// Tracks active session time (not idle time), with best-effort persistence.
export function useActiveTimer({
  sessionId,
  isSessionActive,
}: UseActiveTimerOptions): ActiveTimerControls {
  const [elapsedTime, setElapsedTime] = React.useState('');
  const sessionIdRef = React.useRef<string | null>(null);
  const activeMsRef = React.useRef(0);
  const activeSegmentStartRef = React.useRef<Date | null>(null);

  React.useEffect(() => {
    sessionIdRef.current = sessionId;
  }, [sessionId]);

  const persistActiveTimer = React.useCallback(() => {
    const sessionId = sessionIdRef.current;
    if (!sessionId) return;
    writeActiveTime(sessionId, {
      active_ms: activeMsRef.current,
      last_active_started_at: activeSegmentStartRef.current
        ? activeSegmentStartRef.current.toISOString()
        : null,
    });
  }, []);

  const resetActiveTimer = React.useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
    activeMsRef.current = 0;
    activeSegmentStartRef.current = null;
    setElapsedTime('');
    writeActiveTime(sessionId, { active_ms: 0, last_active_started_at: null });
  }, []);

  const loadActiveTimer = React.useCallback((sessionId: string) => {
    sessionIdRef.current = sessionId;
    const record = readActiveTime(sessionId);
    activeMsRef.current = record.active_ms;
    activeSegmentStartRef.current = null;
    if (record.active_ms > 0) {
      setElapsedTime(formatElapsedTime(new Date(Date.now() - record.active_ms)));
    } else {
      setElapsedTime('');
    }
    if (record.last_active_started_at) {
      writeActiveTime(sessionId, {
        active_ms: record.active_ms,
        last_active_started_at: null,
      });
    }
  }, []);

  const startActiveSegment = React.useCallback(() => {
    if (activeSegmentStartRef.current) return;
    activeSegmentStartRef.current = new Date();
    setElapsedTime(formatElapsedTime(activeSegmentStartRef.current));
    persistActiveTimer();
  }, [persistActiveTimer]);

  const stopActiveSegment = React.useCallback(() => {
    const startedAt = activeSegmentStartRef.current;
    if (!startedAt) return;
    const now = Date.now();
    const deltaMs = now - startedAt.getTime();
    if (deltaMs > 0) {
      activeMsRef.current += deltaMs;
    }
    activeSegmentStartRef.current = null;
    setElapsedTime(
      activeMsRef.current > 0 ? formatElapsedTime(new Date(Date.now() - activeMsRef.current)) : '',
    );
    persistActiveTimer();
  }, [persistActiveTimer]);

  const clearActiveTimer = React.useCallback((sessionId: string) => {
    clearActiveTime(sessionId);
  }, []);

  // Update elapsed time every minute while the session is active.
  React.useEffect(() => {
    if (!isSessionActive) return;

    const updateElapsed = () => {
      const now = Date.now();
      const startedAt = activeSegmentStartRef.current;
      if (startedAt) {
        const deltaMs = now - startedAt.getTime();
        if (deltaMs > 0) {
          activeMsRef.current += deltaMs;
          activeSegmentStartRef.current = new Date(now);
        }
      }

      if (activeMsRef.current <= 0 && !activeSegmentStartRef.current) {
        setElapsedTime('');
        return;
      }

      const totalMs = activeMsRef.current;
      setElapsedTime(formatElapsedTime(new Date(now - totalMs)));
      persistActiveTimer();
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 60000);
    return () => clearInterval(interval);
  }, [isSessionActive, persistActiveTimer]);

  // Stop active timing when the session state changes away from active.
  React.useEffect(() => {
    if (isSessionActive) return;
    stopActiveSegment();
  }, [isSessionActive, stopActiveSegment]);

  // Persist active time before unload to avoid inflating idle gaps.
  React.useEffect(() => {
    const handleBeforeUnload = () => {
      stopActiveSegment();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [stopActiveSegment]);

  return {
    elapsedTime,
    startActiveSegment,
    stopActiveSegment,
    loadActiveTimer,
    resetActiveTimer,
    clearActiveTimer,
  };
}
