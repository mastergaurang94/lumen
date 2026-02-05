'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { CloudOff, ArrowLeft, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sidebar } from '@/components/sidebar';

interface LumenUnavailableProps {
  onRetry?: () => void;
  isRetrying?: boolean;
}

export function LumenUnavailable({ onRetry, isRetrying = false }: LumenUnavailableProps) {
  return (
    <div className="atmosphere min-h-screen flex flex-col">
      {/* Hamburger menu - top left */}
      <div className="fixed top-4 left-4 z-30">
        <Sidebar />
      </div>

      {/* Back link */}
      <div className="p-6 pt-16">
        <Link
          href="/session"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back</span>
        </Link>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-20">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-md text-center space-y-8"
        >
          {/* Icon with gentle pulse */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
                <CloudOff className="h-9 w-9 text-muted-foreground" />
              </div>
              {/* Subtle breathing animation */}
              <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/10 animate-[gentle-pulse_3s_ease-in-out_infinite]" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="font-display text-3xl font-light tracking-tight text-foreground">
              Taking a moment
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Lumen is temporarily unavailable. This usually resolves within a few minutes.
            </p>
          </div>

          {/* Reassurance card */}
          <div className="bg-muted/50 rounded-xl p-6 text-left space-y-3">
            <p className="text-sm text-foreground font-medium">While you wait:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>Your previous sessions are safely stored</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>Take a breath and check in with yourself</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-accent mt-1">•</span>
                <span>You can return anytime today</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            {onRetry && (
              <Button onClick={onRetry} disabled={isRetrying} className="w-full h-12 text-base">
                {isRetrying ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Try again
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" asChild className="w-full h-12 text-base">
              <Link href="/">Return home</Link>
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center px-6">
        <p className="text-sm text-muted-foreground/60">
          If this persists, please try again later or contact support.
        </p>
      </footer>
    </div>
  );
}
