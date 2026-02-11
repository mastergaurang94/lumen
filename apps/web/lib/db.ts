import Dexie, { type Table } from 'dexie';
import type {
  EncryptedUserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  EncryptedSessionSummary,
  EncryptedLlmProviderKey,
  VaultMetadata,
  SessionOutboxEvent,
} from '@/types/storage';

const DB_PREFIX = 'lumen-db';
const DEFAULT_SCOPE = 'default';

// Dexie schema for local encrypted storage (chunked transcripts).
export class LumenDB extends Dexie {
  userProfiles!: Table<EncryptedUserProfile, string>;
  sessionTranscripts!: Table<SessionTranscript, string>;
  sessionTranscriptChunks!: Table<SessionTranscriptChunk, [string, number]>;
  sessionSummaries!: Table<EncryptedSessionSummary, string>;
  llmProviderKeys!: Table<EncryptedLlmProviderKey, string>;
  vaultMetadata!: Table<VaultMetadata, string>;
  sessionOutbox!: Table<SessionOutboxEvent, string>;

  constructor(name: string) {
    super(name);

    // Composite keys keep chunks ordered and queryable by session.
    this.version(1).stores({
      userProfiles: '&user_id',
      sessionTranscripts: '&session_id, user_id, started_at',
      sessionTranscriptChunks: '&[session_id+chunk_index], session_id, created_at',
      sessionSummaries: '&session_id, user_id, created_at',
      llmProviderKeys: '&provider',
      vaultMetadata: '&id',
      sessionOutbox: '&id, status, available_at, created_at, session_id',
    });
  }
}

const dbInstances = new Map<string, LumenDB>();
let activeScope = DEFAULT_SCOPE;

function dbNameForScope(scope: string) {
  return `${DB_PREFIX}-${scope}`;
}

function getOrCreateDb(scope: string): LumenDB {
  const existing = dbInstances.get(scope);
  if (existing) return existing;

  const created = new LumenDB(dbNameForScope(scope));
  dbInstances.set(scope, created);
  return created;
}

// Legacy/default DB handle used by existing tests and tooling.
export const db = getOrCreateDb(DEFAULT_SCOPE);

export function setActiveDbScope(scope: string) {
  activeScope = scope.trim() || DEFAULT_SCOPE;
  getOrCreateDb(activeScope);
}

export function getActiveDb(): LumenDB {
  return getOrCreateDb(activeScope);
}
