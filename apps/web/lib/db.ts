import Dexie, { type Table } from 'dexie';
import type {
  EncryptedUserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  EncryptedSessionSummary,
  VaultMetadata,
  SessionOutboxEvent,
} from '@/types/storage';

// Dexie schema for local encrypted storage (chunked transcripts).
export class LumenDB extends Dexie {
  userProfiles!: Table<EncryptedUserProfile, string>;
  sessionTranscripts!: Table<SessionTranscript, string>;
  sessionTranscriptChunks!: Table<SessionTranscriptChunk, [string, number]>;
  sessionSummaries!: Table<EncryptedSessionSummary, string>;
  vaultMetadata!: Table<VaultMetadata, string>;
  sessionOutbox!: Table<SessionOutboxEvent, string>;

  constructor() {
    super('lumen-db');

    // Composite keys keep chunks ordered and queryable by session.
    this.version(1).stores({
      userProfiles: '&user_id',
      sessionTranscripts: '&session_id, user_id, started_at',
      sessionTranscriptChunks: '&[session_id+chunk_index], session_id, created_at',
      sessionSummaries: '&session_id, user_id, created_at',
      vaultMetadata: '&id',
      sessionOutbox: '&id, status, available_at, created_at, session_id',
    });
  }
}

export const db = new LumenDB();
