'use client';

import * as React from 'react';
import { lockVault } from '@/lib/crypto/key-context';

const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;

function getIdleTimeoutMs(): number {
  const raw = process.env.NEXT_PUBLIC_VAULT_IDLE_TIMEOUT_MINUTES;
  if (!raw) return DEFAULT_IDLE_TIMEOUT_MS;

  const minutes = Number(raw);
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_IDLE_TIMEOUT_MS;
  }

  return Math.floor(minutes * 60 * 1000);
}

// Keeps the in-memory key across brief tab switches and backgrounding, then locks after idle.
// We still lock immediately on full unload events.
export function VaultProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const idleTimeoutMs = getIdleTimeoutMs();
    let idleTimer: number | null = null;

    const clearIdleTimer = () => {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
    };

    const scheduleIdleLock = () => {
      clearIdleTimer();
      idleTimer = window.setTimeout(() => {
        void lockVault();
      }, idleTimeoutMs);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        scheduleIdleLock();
        return;
      }
      clearIdleTimer();
    };

    const handleUnload = () => {
      clearIdleTimer();
      void lockVault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearIdleTimer();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return <>{children}</>;
}
