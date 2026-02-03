'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getAuthSession } from '@/lib/api/auth';

type AuthStatus = 'checking' | 'authed' | 'unauth';

/**
 * Ensures the user has a valid auth session cookie before proceeding.
 */
export function useAuthSessionGuard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = React.useState<AuthStatus>('checking');

  React.useEffect(() => {
    let isActive = true;
    const bypassAuth =
      process.env.NODE_ENV === 'development' &&
      (searchParams.get('dev_auth') === '1' ||
        (typeof window !== 'undefined' && window.location.href.includes('dev_auth=1')));

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
  }, [router, searchParams]);

  return { status, isAuthed: status === 'authed' };
}
