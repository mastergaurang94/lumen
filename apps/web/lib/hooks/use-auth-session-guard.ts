'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getAuthSessionInfo, type SessionStatusResponse } from '@/lib/api/auth';
import { setStorageScopeForUser } from '@/lib/storage/scope';

type AuthStatus = 'checking' | 'authed' | 'unauth';

/**
 * Ensures the user has a valid auth session cookie before proceeding.
 */
export function useAuthSessionGuard() {
  const router = useRouter();
  const [status, setStatus] = React.useState<AuthStatus>('checking');
  const [session, setSession] = React.useState<SessionStatusResponse | null>(null);

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
        const devUserId = 'dev-user';
        const devSession: SessionStatusResponse = {
          status: 'ok',
          user_id: devUserId,
          email: 'dev@example.com',
        };
        setStorageScopeForUser(devUserId);
        setSession(devSession);
        setStatus('authed');
        return;
      }

      try {
        const authSession = await getAuthSessionInfo();
        if (!isActive) return;

        if (!authSession.user_id) {
          setStatus('unauth');
          setSession(null);
          router.replace('/login');
          return;
        }

        setStorageScopeForUser(authSession.user_id);
        setSession(authSession);
        setStatus('authed');
      } catch {
        if (!isActive) return;
        setStatus('unauth');
        setSession(null);
        router.replace('/login');
      }
    };

    void check();

    return () => {
      isActive = false;
    };
  }, [router]);

  return { status, isAuthed: status === 'authed', session };
}
