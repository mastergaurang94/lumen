'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, Sun, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { formatDaysAgo, getTimeGreeting } from '@/lib/format';
import { isUnlocked } from '@/lib/crypto/key-context';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { getLastSession, getDaysSinceLastSession } from '@/lib/storage/queries';
import type { SessionSpacing } from '@/types/session';

const SESSION_SPACING_DAYS = 7;
const DEFAULT_USER_ID = 'local-user';

// Mock toggle for testing early return state
const MOCK_EARLY_RETURN = process.env.NEXT_PUBLIC_MOCK_EARLY_RETURN === 'true';

export default function SessionPage() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const [spacing, setSpacing] = React.useState<SessionSpacing | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [vaultReady, setVaultReady] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkVaultAndLoadSpacing = async () => {
      const storage = storageRef.current;

      // Gate access until the vault is initialized and unlocked.
      const metadata = await storage.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace('/setup');
        return;
      }
      if (!isUnlocked()) {
        router.replace('/unlock');
        return;
      }
      setVaultReady(true);

      // Load session spacing data from storage
      const [lastSession, daysSince] = await Promise.all([
        getLastSession(storage, DEFAULT_USER_ID),
        getDaysSinceLastSession(storage, DEFAULT_USER_ID),
      ]);

      // Check for active (incomplete) session
      const transcripts = await storage.listTranscripts(DEFAULT_USER_ID);
      const hasActiveSession = transcripts.some((t) => t.ended_at === null);

      const lastSessionDate = lastSession?.ended_at ? new Date(lastSession.ended_at) : null;
      const isFirstSession = !lastSession && !hasActiveSession;

      // Determine spacing state (mock override for testing)
      const isEarlyReturn = MOCK_EARLY_RETURN || (daysSince !== null && daysSince < SESSION_SPACING_DAYS);
      const state: SessionSpacing['state'] = isEarlyReturn ? 'early_return' : 'ready';

      setSpacing({
        state,
        daysSinceLastSession: MOCK_EARLY_RETURN ? 3 : daysSince, // Mock 3 days for testing
        lastSessionDate,
        hasActiveSession,
        isFirstSession,
      });
    };

    checkVaultAndLoadSpacing();
  }, [router]);

  // Loading state
  if (!mounted || !vaultReady || !spacing) {
    return (
      <AuthPageLayout
        footer={
          <p className="text-sm text-muted-foreground/70">
            Sessions are designed for a weekly rhythm — space to reflect and act.
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
      showMenu
      showBack={false}
      footer={
        <p className="text-sm text-muted-foreground/70">
          Sessions are designed for a weekly rhythm — space to reflect and act.
        </p>
      }
    >
      <div className="relative z-10 w-full max-w-md">
        <SessionContent spacing={spacing} />
      </div>
    </AuthPageLayout>
  );
}

function SessionContent({ spacing }: { spacing: SessionSpacing }) {
  const [greeting, setGreeting] = React.useState('');

  React.useEffect(() => {
    setGreeting(getTimeGreeting());
  }, []);

  const { isFirstSession, hasActiveSession, state, daysSinceLastSession, lastSessionDate } =
    spacing;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-8 text-center"
    >
      {/* Icon */}
      <div className="flex justify-center">
        <div className="relative">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center">
            {isFirstSession ? (
              <Sparkles className="h-9 w-9 text-accent" />
            ) : state === 'early_return' ? (
              <Calendar className="h-9 w-9 text-accent" />
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
          {hasActiveSession
            ? 'Welcome back'
            : isFirstSession
              ? 'Welcome'
              : greeting || 'Welcome'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {hasActiveSession
            ? 'Your session is waiting for you'
            : isFirstSession
              ? "Let's begin your first session"
              : 'Your session is ready'}
        </p>
      </div>

      {/* Early return advisory - soft nudge, not a block */}
      {state === 'early_return' && !hasActiveSession && daysSinceLastSession !== null && (
        <div className="bg-muted/50 border border-muted-foreground/10 rounded-xl p-5 space-y-3 text-left">
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="space-y-2">
              <p className="font-medium text-foreground">
                It&apos;s been{' '}
                {daysSinceLastSession === 0
                  ? 'less than a day'
                  : daysSinceLastSession === 1
                    ? '1 day'
                    : `${daysSinceLastSession} days`}{' '}
                since your last session.
              </p>
              <p className="text-sm text-muted-foreground">
                Your coach suggests waiting about a week. The space in between is where growth
                happens — time to act on what came up, notice patterns, and return with fresh
                perspective.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-session prompt card - only show for new sessions when ready */}
      {!hasActiveSession && state === 'ready' && !isFirstSession && (
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3 text-left">
            <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Set aside about 60 minutes.</p>
              <p className="text-sm text-muted-foreground">
                Find a quiet space where you can reflect without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* First session prompt */}
      {isFirstSession && (
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-6 space-y-4">
          <div className="flex items-start gap-3 text-left">
            <Clock className="h-5 w-5 text-accent shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Set aside about 60 minutes.</p>
              <p className="text-sm text-muted-foreground">
                Find a quiet space where you can reflect without interruption.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Begin/Resume button - always enabled */}
      <Link href="/chat" className="block">
        <Button className="w-full h-14 text-lg font-medium">
          {hasActiveSession ? 'Resume session' : 'Begin session'}
        </Button>
      </Link>

      {/* Context text */}
      {!hasActiveSession && !isFirstSession && lastSessionDate && state === 'ready' && (
        <p className="text-sm text-muted-foreground/70">
          Your last session was {formatDaysAgo(lastSessionDate)}.
          <br />
          What&apos;s been on your mind?
        </p>
      )}
    </motion.div>
  );
}
