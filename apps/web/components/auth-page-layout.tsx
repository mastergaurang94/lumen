'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';

interface AuthPageLayoutProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  showMenu?: boolean;
  progress?: {
    current: number;
    total: number;
    label?: string;
  };
  footer?: React.ReactNode;
}

/**
 * Shared layout for auth-flow pages (login, setup, session).
 * Provides consistent structure: back link, centered content with atmosphere, footer.
 */
export function AuthPageLayout({
  children,
  backHref = '/',
  backLabel = 'Back',
  showBack = true,
  showMenu = false,
  progress,
  footer,
}: AuthPageLayoutProps) {
  return (
    <div className="atmosphere min-h-screen flex flex-col">
      {showMenu && (
        <div className="fixed top-6 left-6 z-50">
          <Sidebar />
        </div>
      )}
      {/* Back link + onboarding progress */}
      {(showBack || progress) && (
        <div className="p-6 flex items-center justify-between">
          <div>
            {showBack && (
              <Link
                href={backHref}
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="text-sm">{backLabel}</span>
              </Link>
            )}
          </div>
          {progress && (
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-muted-foreground/70">
                {progress.label ?? 'Onboarding'}
              </p>
              <p className="text-sm text-foreground/80">
                Step {progress.current} of {progress.total}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        {children}
      </main>

      {/* Footer */}
      {footer && <footer className="py-8 text-center px-6">{footer}</footer>}
    </div>
  );
}

/**
 * Standard privacy footer used across auth pages.
 */
export function PrivacyFooter({ children }: { children?: React.ReactNode }) {
  return (
    <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
      {children || (
        <>
          Your sessions are stored locally and encrypted.
          <br />
          We never use your data for training.
        </>
      )}
    </p>
  );
}
