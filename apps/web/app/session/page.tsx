'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Sun, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthPageLayout } from '@/components/auth-page-layout';
import {
  formatSessionDate,
  formatRelativeTime,
  formatDaysAgo,
  getTimeGreeting,
} from '@/lib/format';
import { isUnlocked } from '@/lib/crypto/key-context';
import { createStorageService } from '@/lib/storage/dexie-storage';
import type { SessionGate } from '@/types/session';

// Mock toggles - use env vars in production
const MOCK_UNLOCKED = process.env.NEXT_PUBLIC_MOCK_SESSION_UNLOCKED !== 'false';
const MOCK_ACTIVE_SESSION = process.env.NEXT_PUBLIC_MOCK_ACTIVE_SESSION === 'true';

function getMockSessionGate(): SessionGate {
  if (MOCK_UNLOCKED) {
    return {
      state: 'unlocked',
      nextAvailable: null,
      lastSessionDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      hasActiveSession: MOCK_ACTIVE_SESSION,
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
  };
}

export default function SessionPage() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const [sessionGate, setSessionGate] = React.useState<SessionGate | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [vaultReady, setVaultReady] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkVault = async () => {
      // Gate access until the vault is initialized and unlocked.
      const metadata = await storageRef.current.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace('/setup');
        return;
      }
      if (!isUnlocked()) {
        router.replace('/unlock');
        return;
      }
      setVaultReady(true);
      // Simulate API call
      const gate = getMockSessionGate();
      setSessionGate(gate);
    };

    checkVault();
  }, [router]);

  // Loading state
  if (!mounted || !vaultReady || !sessionGate) {
    return (
      <AuthPageLayout
        footer={
          <p className="text-sm text-muted-foreground/70">
            Sessions are spaced 7 days apart to give you time to reflect and act.
          </p>
        }
      >
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        </div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout
      footer={
        <p className="text-sm text-muted-foreground/70">
          Sessions are spaced 7 days apart to give you time to reflect and act.
        </p>
      }
    >
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
    </AuthPageLayout>
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
  const formattedDate = formatSessionDate(nextAvailable);

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
        This space between sessions is intentional — use it to act on what came up, notice patterns,
        and return with fresh perspective.
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
  // Only compute greeting on client to avoid hydration mismatch
  const [greeting, setGreeting] = React.useState('');
  const isFirstSession = !lastSessionDate && !hasActiveSession;

  React.useEffect(() => {
    setGreeting(getTimeGreeting());
  }, []);

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
          {hasActiveSession ? 'Welcome back' : isFirstSession ? 'Welcome' : greeting || 'Welcome'}
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
      {!hasActiveSession && !isFirstSession && lastSessionDate && (
        <p className="text-sm text-muted-foreground/70">
          It&apos;s been a week since we last spoke.
          <br />
          What&apos;s been on your mind?
        </p>
      )}
    </motion.div>
  );
}
