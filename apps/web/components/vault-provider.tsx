'use client';

import * as React from 'react';
import { clearKey } from '@/lib/crypto/key-context';

// Clears sensitive keys on page unload to reduce exposure window.
export function VaultProvider({ children }: { children: React.ReactNode }) {
  React.useEffect(() => {
    const handleUnload = () => {
      clearKey();
    };

    window.addEventListener('beforeunload', handleUnload);
    window.addEventListener('pagehide', handleUnload);

    return () => {
      window.removeEventListener('beforeunload', handleUnload);
      window.removeEventListener('pagehide', handleUnload);
    };
  }, []);

  return <>{children}</>;
}
