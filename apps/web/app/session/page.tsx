'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Clock, Sun, Sparkles, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { withDevAuth } from '@/lib/hooks/dev-auth';
import { formatDaysAgo, getTimeGreeting } from '@/lib/format';
import { isUnlocked } from '@/lib/crypto/key-context';
import { useAuthSessionGuard } from '@/lib/hooks/use-auth-session-guard';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { getLastSession, getDaysSinceLastSession } from '@/lib/storage/queries';
import { getOrCreateUserId } from '@/lib/storage/user';
import type { SessionSpacing } from '@/types/session';

const SESSION_SPACING_DAYS = 7;

// Mock toggle for testing early return state
const MOCK_EARLY_RETURN = process.env.NEXT_PUBLIC_MOCK_EARLY_RETURN === 'true';

export default function SessionPage() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const { isAuthed } = useAuthSessionGuard();
  const [spacing, setSpacing] = React.useState<SessionSpacing | null>(null);
  const [mounted, setMounted] = React.useState(false);
  const [vaultReady, setVaultReady] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    const checkVaultAndLoadSpacing = async () => {
      if (!isAuthed) return;

      const storage = storageRef.current;

      // Gate access until the vault is initialized and unlocked.
      const metadata = await storage.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace(withDevAuth('/setup'));
        return;
      }
      if (!isUnlocked()) {
        router.replace(withDevAuth('/unlock'));
        return;
      }
      setVaultReady(true);

      // Load session spacing data from storage
      const userId = getOrCreateUserId();
      const [lastSession, daysSince] = await Promise.all([
        getLastSession(storage, userId),
        getDaysSinceLastSession(storage, userId),
      ]);

      // Check for active (incomplete) session
      const transcripts = await storage.listTranscripts(userId);
      const hasActiveSession = transcripts.some((t) => t.ended_at === null);

      const lastSessionDate = lastSession?.ended_at ? new Date(lastSession.ended_at) : null;
      const isFirstSession = !lastSession && !hasActiveSession;

      // Determine spacing state (mock override for testing)
      const isEarlyReturn =
        MOCK_EARLY_RETURN || (daysSince !== null && daysSince < SESSION_SPACING_DAYS);
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
  }, [isAuthed, router]);

  // Loading state
  if (!mounted || !isAuthed || !vaultReady || !spacing) {
    return (
      <AuthPageLayout
        footer={
          <p className="text-sm text-muted-foreground/70">The good stuff happens in between.</p>
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
        <p className="text-sm text-muted-foreground/70">The good stuff happens in between.</p>
      }
    >
      <div className="relative z-10 w-full max-w-md">
        <SessionContent spacing={spacing} chatHref={withDevAuth('/chat')} />
      </div>
    </AuthPageLayout>
  );
}

function SessionContent({ spacing, chatHref }: { spacing: SessionSpacing; chatHref: string }) {
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
          {hasActiveSession ? 'Welcome back' : isFirstSession ? 'Welcome' : greeting || 'Welcome'}
        </h1>
        <p className="text-lg text-muted-foreground">
          {hasActiveSession
            ? 'Ready when you are'
            : isFirstSession
              ? "I've been expecting you. Come on in!"
              : 'Ready when you are'}
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
                since we last talked.
              </p>
              <p className="text-sm text-muted-foreground">
                The time between is where things settle. No rush — but a week between often helps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pre-session prompt card - only show for new sessions when ready */}
      {!hasActiveSession && state === 'ready' && !isFirstSession && (
        <div className="bg-accent/5 border border-accent/10 rounded-xl p-5 text-center">
          <p className="text-muted-foreground">Like catching up with an old friend.</p>
        </div>
      )}

      {/* Begin/Resume button - always enabled */}
      <Link href={chatHref} className="block">
        <Button className="w-full h-14 text-lg font-medium">
          {hasActiveSession ? 'Continue' : "Let's go"}
        </Button>
      </Link>

      {/* Context text */}
      {!hasActiveSession && !isFirstSession && lastSessionDate && state === 'ready' && (
        <p className="text-sm text-muted-foreground/70">
          We last talked {formatDaysAgo(lastSessionDate)}.
          <br />
          What&apos;s been on your mind?
        </p>
      )}
    </motion.div>
  );
}
