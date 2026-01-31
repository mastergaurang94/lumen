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

// Returns days since the last completed session, or null if no sessions exist.
export async function getDaysSinceLastSession(
  storage: StorageService,
  userId: string,
): Promise<number | null> {
  const lastSession = await getLastSession(storage, userId);
  if (!lastSession?.ended_at) return null;

  const endedAt = new Date(lastSession.ended_at);
  const now = new Date();
  const diffMs = now.getTime() - endedAt.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Returns action steps from the most recent session summary, or empty array.
export async function getLastSessionActionSteps(
  storage: StorageService,
  userId: string,
): Promise<string[]> {
  const summaries = await storage.listSummaries(userId, 1);
  return summaries[0]?.action_steps ?? [];
}

// Returns the session number (count of completed sessions + 1 for the upcoming session).
export async function getSessionNumber(
  storage: StorageService,
  userId: string,
): Promise<number> {
  const transcripts = await storage.listTranscripts(userId);
  const completedCount = transcripts.filter((t) => t.ended_at !== null).length;
  return completedCount + 1;
}
