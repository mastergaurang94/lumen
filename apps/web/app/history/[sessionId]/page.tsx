'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TranscriptViewer } from '@/components/history/transcript-viewer';
import { withDevAuth } from '@/lib/hooks/dev-auth';
import { formatShortDate } from '@/lib/format';
import { getKey, isUnlocked } from '@/lib/crypto/key-context';
import { useAuthSessionGuard } from '@/lib/hooks/use-auth-session-guard';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { Z_INDEX } from '@/lib/z-index';
import type { SessionTranscript } from '@/types/storage';

export default function HistoryDetailPage() {
  const router = useRouter();
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const storageRef = React.useRef(createStorageService());
  const { isAuthed, session } = useAuthSessionGuard();
  const [mounted, setMounted] = React.useState(false);
  const [vaultReady, setVaultReady] = React.useState(false);
  const [transcript, setTranscript] = React.useState<SessionTranscript | null>(null);
  const [sessionNumber, setSessionNumber] = React.useState<number | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const loadTranscript = async () => {
      if (!isAuthed) return;

      const storage = storageRef.current;

      // Gate access until the vault is initialized and unlocked.
      const metadata = await storage.getVaultMetadata();
      if (!metadata?.vault_initialized) {
        router.replace(withDevAuth('/setup'));
        return;
      }
      const key = getKey();
      if (!isUnlocked() || !key) {
        router.replace(withDevAuth('/unlock'));
        return;
      }

      // Each StorageService instance needs vault context for decryption.
      storage.setVaultContext({ key, metadata });
      setVaultReady(true);

      const userId = session?.user_id;
      if (!userId) {
        router.replace(withDevAuth('/login'));
        return;
      }

      const transcriptData = await storage.getTranscript(sessionId);
      if (!transcriptData) {
        router.replace(withDevAuth('/history'));
        return;
      }
      setTranscript(transcriptData);

      // Derive session number from completed transcripts in chronological order
      const allTranscripts = await storage.listTranscripts(userId);
      const completed = allTranscripts.filter((t) => t.ended_at !== null).reverse(); // chronological (oldest first)
      const index = completed.findIndex((t) => t.session_id === sessionId);
      setSessionNumber(index >= 0 ? index + 1 : (transcriptData.session_number ?? 1));
    };

    loadTranscript();
  }, [isAuthed, router, session?.user_id, sessionId]);

  // Loading state
  if (!mounted || !isAuthed || !vaultReady || !transcript || sessionNumber === null) {
    return (
      <div className="atmosphere min-h-screen flex flex-col items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
      </div>
    );
  }

  const sessionDate = new Date(transcript.started_at);

  return (
    <div className="atmosphere h-screen flex flex-col overflow-hidden">
      {/* Hamburger menu - top left */}
      <div className="fixed top-4 left-4" style={{ zIndex: Z_INDEX.navigation }}>
        <Sidebar />
      </div>

      {/* Back link - top right */}
      <div className="fixed top-4 right-4" style={{ zIndex: Z_INDEX.navigation }}>
        <Link
          href={withDevAuth('/history')}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          History
        </Link>
      </div>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="pt-16 pb-4 text-center"
      >
        <h1 className="font-display text-lg text-foreground">
          Conversation {sessionNumber} &mdash; {formatShortDate(sessionDate)}
        </h1>
      </motion.div>

      {/* Scrollable transcript */}
      <main className="flex-1 min-h-0 overflow-y-auto">
        <TranscriptViewer sessionId={sessionId} />
      </main>
    </div>
  );
}
