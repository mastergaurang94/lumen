'use client';

import * as React from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, Sun, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Mock session state - in real app this would come from the API
type SessionState = 'locked' | 'unlocked';

interface SessionGate {
  state: SessionState;
  nextAvailable: Date | null;
  lastSessionDate: Date | null;
  hasActiveSession: boolean; // Is there an in-progress session?
  sessionPreview: string | null; // Brief context for active session
}

// Mock data for development - toggle these to test different states
const MOCK_UNLOCKED = true;
const MOCK_ACTIVE_SESSION = true; // Set to true to test "Resume session"
const MOCK_SESSION_PREVIEW = "You were exploring what's holding you back at work..."; // Preview of active session

function getMockSessionGate(): SessionGate {
  if (MOCK_UNLOCKED) {
    return {
      state: 'unlocked',
      nextAvailable: null,
      lastSessionDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      hasActiveSession: MOCK_ACTIVE_SESSION,
      sessionPreview: MOCK_ACTIVE_SESSION ? MOCK_SESSION_PREVIEW : null,
    };
  }

  // Locked state - next session in 3 days
  const nextAvailable = new Date();
  nextAvailable.setDate(nextAvailable.getDate() + 3);
  nextAvailable.setHours(10, 0, 0, 0);

  return {
    state: 'locked',
    nextAvailable,
    lastSessionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
    hasActiveSession: false,
    sessionPreview: null,
  };
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.ceil(diffMs / (1000 * 60 * 60));

  if (diffDays > 1) {
    return `${diffDays} days`;
  } else if (diffDays === 1) {
    return 'tomorrow';
  } else if (diffHours > 1) {
    return `${diffHours} hours`;
  } else if (diffHours === 1) {
    return '1 hour';
  } else {
    return 'soon';
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatDaysAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return 'a week ago';
  return `${Math.floor(diffDays / 7)} weeks ago`;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function SessionPage() {
  const [sessionGate, setSessionGate] = React.useState<SessionGate | null>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Simulate API call
    const gate = getMockSessionGate();
    setSessionGate(gate);
  }, []);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !sessionGate) {
    return (
      <div className="atmosphere min-h-screen flex flex-col">
        <div className="p-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">Back</span>
          </Link>
        </div>
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        </main>
      </div>
    );
  }

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
        <div className="relative z-10 w-full max-w-md">
          <AnimatePresence mode="wait">
            {sessionGate.state === 'locked' ? (
              <LockedState
                key="locked"
                nextAvailable={sessionGate.nextAvailable!}
                lastSessionDate={sessionGate.lastSessionDate}
              />
            ) : (
              <UnlockedState
                key="unlocked"
                lastSessionDate={sessionGate.lastSessionDate}
                hasActiveSession={sessionGate.hasActiveSession}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center px-6">
        <p className="text-sm text-muted-foreground/70">
          Sessions are spaced 7 days apart to give you time to reflect and act.
        </p>
      </footer>
    </div>
  );
}

function LockedState({
  nextAvailable,
  lastSessionDate,
}: {
  nextAvailable: Date;
  lastSessionDate: Date | null;
}) {
  const relativeTime = formatRelativeTime(nextAvailable);
  const formattedDate = formatDate(nextAvailable);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 text-center"
    >
      {/* Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="h-9 w-9 text-muted-foreground" />
          </div>
          {/* Subtle ring animation */}
          <div className="absolute inset-0 rounded-full border-2 border-muted-foreground/20 animate-[gentle-pulse_3s_ease-in-out_infinite]" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
          Your next session
        </h1>
        <p className="text-lg text-muted-foreground">
          Available in <span className="text-foreground font-medium">{relativeTime}</span>
        </p>
      </div>

      {/* Date card */}
      <div className="bg-muted/50 rounded-xl p-6 space-y-1">
        <p className="text-sm text-muted-foreground uppercase tracking-wide">Opens on</p>
        <p className="text-xl font-display text-foreground">{formattedDate}</p>
      </div>

      {/* Context about last session */}
      {lastSessionDate && (
        <p className="text-sm text-muted-foreground/70">
          Your last session was {formatDaysAgo(lastSessionDate)}
        </p>
      )}

      {/* Disabled button */}
      <Button disabled className="w-full h-12 text-base opacity-50 cursor-not-allowed">
        <Clock className="h-4 w-4 mr-2" />
        Session locked
      </Button>

      {/* Encouragement */}
      <p className="text-sm text-muted-foreground/80 leading-relaxed max-w-sm mx-auto">
        This space between sessions is intentional — use it to act on what came up,
        notice patterns, and return with fresh perspective.
      </p>
    </motion.div>
  );
}

function UnlockedState({
  lastSessionDate,
  hasActiveSession,
}: {
  lastSessionDate: Date | null;
  hasActiveSession: boolean;
}) {
  const greeting = getTimeGreeting();
  const isFirstSession = !lastSessionDate && !hasActiveSession;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 text-center"
    >
      {/* Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
            {isFirstSession ? (
              <Sparkles className="h-9 w-9 text-accent" />
            ) : (
              <Sun className="h-9 w-9 text-accent" />
            )}
          </div>
          {/* Ambient glow */}
          <div className="absolute inset-0 rounded-full bg-accent/5 blur-xl scale-150" />
        </div>
      </div>

      {/* Header */}
      <div className="space-y-3">
        <h1 className="font-display text-4xl font-light tracking-tight text-foreground">
          {hasActiveSession ? 'Welcome back' : isFirstSession ? 'Welcome' : greeting}
        </h1>
        <p className="text-lg text-muted-foreground">
          {hasActiveSession
            ? 'Your session is waiting for you'
            : isFirstSession
              ? "Let's begin your first session"
              : 'Your session is ready'}
        </p>
      </div>

      {/* Pre-session prompt card - only show for new sessions */}
      {!hasActiveSession && (
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3 text-left">
            <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Set aside about 60 minutes</p>
              <p className="text-sm text-muted-foreground">
                Find a quiet space where you can reflect without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Begin/Resume button */}
      <Link href="/chat" className="block">
        <Button className="w-full h-14 text-lg font-medium">
          {hasActiveSession ? 'Resume session' : 'Begin session'}
        </Button>
      </Link>

      {/* Context text */}
      {!hasActiveSession &&
        !isFirstSession &&
        lastSessionDate && (
          <p className="text-sm text-muted-foreground/70">
            It&apos;s been a week since we last spoke.
            <br />
            What&apos;s been on your mind?
          </p>
        )}
    </motion.div>
  );
}
