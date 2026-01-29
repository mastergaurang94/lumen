'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthPageLayoutProps {
  children: React.ReactNode;
  backHref?: string;
  backLabel?: string;
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
  footer,
}: AuthPageLayoutProps) {
  return (
    <div className="atmosphere min-h-screen flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{backLabel}</span>
        </Link>
      </div>

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
