import type { StorageService } from '@/lib/storage';
import type { SessionSummary, SessionTranscript } from '@/types/storage';

// Returns recent summaries for context assembly.
export async function getRecentSummaries(
  storage: StorageService,
  userId: string,
  limit = 3,
): Promise<SessionSummary[]> {
  return storage.listSummaries(userId, limit);
}

// Returns the most recent completed session, if any.
export async function getLastSession(
  storage: StorageService,
  userId: string,
): Promise<SessionTranscript | null> {
  const transcripts = await storage.listTranscripts(userId);
  return transcripts.find((transcript) => transcript.ended_at !== null) ?? null;
}

// Returns true when the user has completed at least one session.
export async function hasCompletedSessions(
  storage: StorageService,
  userId: string,
): Promise<boolean> {
  const lastSession = await getLastSession(storage, userId);
  return lastSession !== null;
}
