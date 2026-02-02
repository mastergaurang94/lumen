'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getAuthSession } from '@/lib/api/auth';

type AuthStatus = 'checking' | 'authed' | 'unauth';

/**
 * Ensures the user has a valid auth session cookie before proceeding.
 */
export function useAuthSessionGuard() {
  const router = useRouter();
  const [status, setStatus] = React.useState<AuthStatus>('checking');

  React.useEffect(() => {
    let isActive = true;

    const check = async () => {
      try {
        const hasSession = await getAuthSession();
        if (!isActive) return;

        if (!hasSession) {
          setStatus('unauth');
          router.replace('/login');
          return;
        }

        setStatus('authed');
      } catch {
        if (!isActive) return;
        setStatus('unauth');
        router.replace('/login');
      }
    };

    void check();

    return () => {
      isActive = false;
    };
  }, [router]);

  return { status, isAuthed: status === 'authed' };
}
