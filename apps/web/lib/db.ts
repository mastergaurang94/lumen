import Dexie, { type Table } from 'dexie';
import type {
  UserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
  VaultMetadata,
} from '@/types/storage';

// Dexie schema for local encrypted storage (chunked transcripts).
export class LumenDB extends Dexie {
  userProfiles!: Table<UserProfile, string>;
  sessionTranscripts!: Table<SessionTranscript, string>;
  sessionTranscriptChunks!: Table<SessionTranscriptChunk, [string, number]>;
  sessionSummaries!: Table<SessionSummary, string>;
  vaultMetadata!: Table<VaultMetadata, string>;

  constructor() {
    super('lumen-db');

    // Composite keys keep chunks ordered and queryable by session.
    this.version(1).stores({
      userProfiles: '&user_id',
      sessionTranscripts: '&session_id, user_id, started_at',
      sessionTranscriptChunks: '&[session_id+chunk_index], session_id, created_at',
      sessionSummaries: '&session_id, user_id, created_at',
      vaultMetadata: '&id',
    });
  }
}

export const db = new LumenDB();
