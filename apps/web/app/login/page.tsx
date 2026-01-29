'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type ViewState = 'form' | 'loading' | 'sent';

export default function LoginPage() {
  const [email, setEmail] = React.useState('');
  const [viewState, setViewState] = React.useState<ViewState>('form');

  const isValidEmail = email.includes('@') && email.includes('.');
  const canSubmit = email.length > 0 && isValidEmail;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setViewState('loading');

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setViewState('sent');
  };

  return (
    <div className="atmosphere min-h-screen flex flex-col">
      {/* Back link */}
      <div className="p-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <div className="relative z-10 w-full max-w-sm">
          <AnimatePresence mode="wait">
            {viewState === 'form' || viewState === 'loading' ? (
              <motion.div
                key="form"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-8"
              >
                {/* Header with icon */}
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                      <Mail className="h-6 w-6 text-accent" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
                      Welcome back
                    </h1>
                    <p className="text-muted-foreground">Enter your email to sign in</p>
                  </div>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="sr-only">
                      Email address
                    </label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={viewState === 'loading'}
                      autoFocus
                      autoComplete="email"
                      aria-describedby="email-hint"
                    />
                    <p id="email-hint" className="sr-only">
                      We will send a magic link to this email
                    </p>
                  </div>

                  <Button
                    type="submit"
                    disabled={!canSubmit || viewState === 'loading'}
                    className="w-full h-12 text-base"
                  >
                    {viewState === 'loading' ? (
                      <span className="flex items-center gap-2">
                        <Spinner size="md" />
                        <span>Sending...</span>
                      </span>
                    ) : (
                      'Continue with email'
                    )}
                  </Button>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="sent"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                className="space-y-8 text-center"
              >
                {/* Success icon */}
                <div className="flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-accent" />
                  </div>
                </div>

                {/* Header */}
                <div className="space-y-3">
                  <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
                    Check your email
                  </h1>
                  <p className="text-muted-foreground">
                    We sent a sign-in link to{' '}
                    <span className="text-foreground font-medium">{email}</span>
                  </p>
                </div>

                {/* Help text */}
                <p className="text-sm text-muted-foreground/70">
                  Click the link in the email to sign in.
                  <br />
                  It may take a minute to arrive.
                </p>

                {/* Try again */}
                <button
                  onClick={() => {
                    setViewState('form');
                    setEmail('');
                  }}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  Use a different email
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center">
        <p className="text-sm text-muted-foreground/70 max-w-xs mx-auto leading-relaxed">
          Your sessions are stored locally and encrypted.
          <br />
          We never use your data for training.
        </p>
      </footer>
    </div>
  );
}
