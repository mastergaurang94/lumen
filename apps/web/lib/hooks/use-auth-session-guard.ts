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
    // Read dev_auth from window.location to avoid useSearchParams (which requires Suspense).
    // This only matters in development mode for bypassing auth.
    const bypassAuth =
      process.env.NODE_ENV === 'development' &&
      typeof window !== 'undefined' &&
      window.location.search.includes('dev_auth=1');

    const check = async () => {
      if (bypassAuth) {
        setStatus('authed');
        return;
      }

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
