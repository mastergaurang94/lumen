'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';
import { AuthPageLayout, PrivacyFooter } from '@/components/auth-page-layout';
import { Spinner } from '@/components/ui/spinner';
import { verifyMagicLink } from '@/lib/api/auth';
import { ApiError } from '@/lib/api/client';

type VerifyState = 'verifying' | 'error';

// Prevent double verification in dev StrictMode remounts.
const attemptedTokens = new Set<string>();

export default function LoginCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [state, setState] = React.useState<VerifyState>('verifying');
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  // Verify the token once and route the user into the app on success.
  React.useEffect(() => {
    if (!token) {
      setState('error');
      setErrorMessage('Missing sign-in token. Please request a new link.');
      return;
    }
    if (attemptedTokens.has(token)) {
      return;
    }
    attemptedTokens.add(token);

    const verify = async () => {
      try {
        await verifyMagicLink(token);
        router.replace('/session');
      } catch (error) {
        const message =
          error instanceof ApiError
            ? error.message
            : 'Unable to verify the sign-in link. Please try again.';
        setErrorMessage(message);
        setState('error');
      }
    };

    void verify();
  }, [router, token]);

  return (
    <AuthPageLayout
      progress={{ current: 1, total: 2, label: 'Onboarding' }}
      footer={<PrivacyFooter />}
      showBack={false}
    >
      <div className="relative z-10 w-full max-w-sm space-y-8 text-center">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
            <Mail className="h-6 w-6 text-accent" />
          </div>
        </div>

        {state === 'verifying' ? (
          <div className="space-y-3">
            <div className="flex justify-center">
              <Spinner size="md" />
            </div>
            <p className="text-muted-foreground">Verifying your sign-in link…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-light tracking-tight text-foreground">
                Link expired
              </h1>
              <p className="text-muted-foreground">{errorMessage}</p>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm text-foreground transition-colors hover:bg-muted"
            >
              Return to login
            </Link>
          </div>
        )}
      </div>
    </AuthPageLayout>
  );
}
