import { db } from '@/lib/db';
import type { StorageService } from '@/lib/storage';
import type {
  UserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
  VaultMetadata,
} from '@/types/storage';

export class DexieStorageService implements StorageService {
  async getProfile(userId: string): Promise<UserProfile | null> {
    return (await db.userProfiles.get(userId)) ?? null;
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    await db.userProfiles.put(profile);
  }

  async getTranscript(sessionId: string): Promise<SessionTranscript | null> {
    return (await db.sessionTranscripts.get(sessionId)) ?? null;
  }

  async saveTranscript(transcript: SessionTranscript): Promise<void> {
    await db.sessionTranscripts.put(transcript);
  }

  async listTranscripts(userId: string): Promise<SessionTranscript[]> {
    // Reverse + sort ensures newest-first ordering for session history.
    return db.sessionTranscripts.where('user_id').equals(userId).reverse().sortBy('started_at');
  }

  async saveTranscriptChunk(chunk: SessionTranscriptChunk): Promise<void> {
    await db.sessionTranscriptChunks.put(chunk);
  }

  async listTranscriptChunks(sessionId: string): Promise<SessionTranscriptChunk[]> {
    // Ensure chunks are returned in write order.
    return db.sessionTranscriptChunks.where('session_id').equals(sessionId).sortBy('chunk_index');
  }

  async getSummary(sessionId: string): Promise<SessionSummary | null> {
    return (await db.sessionSummaries.get(sessionId)) ?? null;
  }

  async saveSummary(summary: SessionSummary): Promise<void> {
    await db.sessionSummaries.put(summary);
  }

  async listSummaries(userId: string, limit = 10): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummaries
      .where('user_id')
      .equals(userId)
      .reverse()
      .sortBy('created_at');
    return summaries.slice(0, limit);
  }

  async getVaultMetadata(): Promise<VaultMetadata | null> {
    return (await db.vaultMetadata.get('vault')) ?? null;
  }

  async saveVaultMetadata(metadata: VaultMetadata): Promise<void> {
    await db.vaultMetadata.put(metadata);
  }
}

export function createStorageService(): StorageService {
  return new DexieStorageService();
}
