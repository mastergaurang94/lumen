'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthPageLayout } from '@/components/auth-page-layout';
import { SessionCard } from '@/components/history/session-card';
import { withDevAuth } from '@/lib/hooks/dev-auth';
import { getKey, isUnlocked } from '@/lib/crypto/key-context';
import { useAuthSessionGuard } from '@/lib/hooks/use-auth-session-guard';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { parseNotebookSection } from '@/lib/session/summary';
import type { SessionTranscript } from '@/types/storage';

type HistoryEntry = {
  transcript: SessionTranscript;
  sessionNumber: number;
  partingWords: string | null;
};

export default function HistoryPage() {
  const router = useRouter();
  const storageRef = React.useRef(createStorageService());
  const { isAuthed, session } = useAuthSessionGuard();
  const [mounted, setMounted] = React.useState(false);
  const [vaultReady, setVaultReady] = React.useState(false);
  const [entries, setEntries] = React.useState<HistoryEntry[] | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const loadHistory = async () => {
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

      // Load completed transcripts (newest first, already sorted by storage)
      const transcripts = await storage.listTranscripts(userId);
      const completed = transcripts.filter((t) => t.ended_at !== null);

      // Load notebooks (new format) and summaries (legacy) for parting words preview.
      // Notebooks take priority; fall back to old summaries for pre-migration sessions.
      const notebooks = await storage.listNotebooks(userId);
      const notebookPartingWords = new Map<string, string | null>();
      for (const nb of notebooks) {
        notebookPartingWords.set(nb.session_id, parseNotebookSection(nb.markdown, 'Parting Words'));
      }

      const summaries = await storage.listSummaries(userId);
      const summaryPartingWords = new Map<string, string | null>();
      for (const s of summaries) {
        summaryPartingWords.set(s.session_id, s.parting_words);
      }

      // Assign session numbers: completed sessions in chronological order
      // (reversed from newest-first to oldest-first for numbering, then reversed back)
      const chronological = [...completed].reverse();
      const historyEntries: HistoryEntry[] = chronological.map((transcript, index) => ({
        transcript,
        sessionNumber: index + 1,
        partingWords:
          notebookPartingWords.get(transcript.session_id) ??
          summaryPartingWords.get(transcript.session_id) ??
          null,
      }));

      // Return to newest-first for display
      setEntries(historyEntries.reverse());
    };

    loadHistory();
  }, [isAuthed, router, session?.user_id]);

  // Loading state
  if (!mounted || !isAuthed || !vaultReady || entries === null) {
    return (
      <AuthPageLayout showBack={false} showMenu>
        <div className="flex items-center justify-center">
          <div className="w-8 h-8 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        </div>
      </AuthPageLayout>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <AuthPageLayout showBack={false} showMenu>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-6 max-w-sm"
        >
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center">
              <BookOpen className="h-7 w-7 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="font-display text-2xl text-foreground">No conversations yet</h1>
            <p className="text-muted-foreground">
              Your past conversations will appear here after your first session.
            </p>
          </div>
          <Button asChild className="h-12 px-8">
            <a href={withDevAuth('/session')}>Start a conversation</a>
          </Button>
        </motion.div>
      </AuthPageLayout>
    );
  }

  return (
    <AuthPageLayout showBack={false} showMenu>
      <div className="w-full max-w-lg">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8"
        >
          <div className="text-center space-y-2">
            <h1 className="font-display text-3xl font-light tracking-tight text-foreground">
              Past conversations
            </h1>
            <p className="text-muted-foreground">
              {entries.length} {entries.length === 1 ? 'conversation' : 'conversations'}
            </p>
          </div>

          <div className="space-y-3">
            {entries.map((entry) => (
              <SessionCard
                key={entry.transcript.session_id}
                sessionId={entry.transcript.session_id}
                sessionNumber={entry.sessionNumber}
                startedAt={new Date(entry.transcript.started_at)}
                partingWords={entry.partingWords}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </AuthPageLayout>
  );
}
