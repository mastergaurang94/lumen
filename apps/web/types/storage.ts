// EncryptionHeader is stored alongside each encrypted blob/chunk.
export interface EncryptionHeader {
  kdf: 'PBKDF2';
  kdf_params: { hash: 'SHA-256'; iterations: number };
  salt: ArrayBuffer;
  cipher: 'AES-GCM';
  iv: ArrayBuffer;
  version: string;
}

// UserProfile is the decrypted runtime shape used by the app.
export interface UserProfile {
  user_id: string;
  preferred_name: string | null;
  goals: string[];
  recurring_themes: string[];
  preferences: string[];
  created_at: string;
  updated_at: string;
}

// SessionTranscript stores session metadata; content lives in chunks.
export interface SessionTranscript {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  session_number?: number | null;
  timezone: string | null;
  locale_hint: string | null;
  system_prompt_version: string;
  created_at: string;
  updated_at: string;
}

// Chunks are append-only to support future sync and incremental writes.
export interface SessionTranscriptChunk {
  session_id: string;
  chunk_index: number;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
  created_at: string;
}

// SessionSummary is the decrypted runtime shape used by the app.
// Kept for backward compatibility with existing stored data.
export interface SessionSummary {
  session_id: string;
  user_id: string;
  summary_text: string;
  parting_words: string | null;
  action_steps: string[];
  open_threads: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// SessionNotebook is the mentor's private reflection after a session (markdown).
// Replaces SessionSummary for new sessions going forward.
export interface SessionNotebook {
  session_id: string;
  user_id: string;
  session_number: number;
  markdown: string;
  created_at: string;
  updated_at: string;
}

// UserArc is the mentor's evolving understanding of a person (markdown).
// One per user, rewritten after each session.
export interface UserArc {
  user_id: string;
  arc_markdown: string;
  last_session_number: number;
  version: number;
  created_at: string;
  updated_at: string;
}

// EncryptedUserProfile is the on-disk shape stored in IndexedDB.
export interface EncryptedUserProfile {
  user_id: string;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
  created_at: string;
  updated_at: string;
}

// EncryptedSessionSummary is the on-disk shape stored in IndexedDB.
export interface EncryptedSessionSummary {
  session_id: string;
  user_id: string;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
  created_at: string;
  updated_at: string;
}

// EncryptedSessionNotebook is the on-disk shape stored in IndexedDB.
export interface EncryptedSessionNotebook {
  session_id: string;
  user_id: string;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
  created_at: string;
  updated_at: string;
}

// EncryptedUserArc is the on-disk shape stored in IndexedDB.
export interface EncryptedUserArc {
  user_id: string;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
  version: number;
  created_at: string;
  updated_at: string;
}

export type LlmProvider = 'anthropic';

// LlmProviderKey stores the decrypted API key for a provider (runtime only).
export interface LlmProviderKey {
  provider: LlmProvider;
  api_key: string;
  created_at: string;
  updated_at: string;
}

// EncryptedLlmProviderKey is the at-rest representation of provider keys.
export interface EncryptedLlmProviderKey {
  provider: LlmProvider;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  key_hash: ArrayBuffer;
  created_at: string;
  updated_at: string;
}

// Sentinel used to validate a passphrase without decrypting transcripts.
export interface VaultKeyCheck {
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  transcript_hash: ArrayBuffer;
}

// Single-record metadata for vault setup and unlock.
export interface VaultMetadata {
  id: 'vault';
  vault_initialized: boolean;
  salt: ArrayBuffer;
  kdf_iterations: number;
  encryption_version: string;
  // Encrypted sentinel used to validate a passphrase.
  key_check: VaultKeyCheck | null;
  created_at: string;
  updated_at: string;
}

export type SessionOutboxEventType = 'session_start' | 'session_end';

// SessionOutboxEvent stores pending metadata sync events for the API.
export interface SessionOutboxEvent {
  id: string;
  type: SessionOutboxEventType;
  session_id: string;
  transcript_hash: string | null;
  status: 'pending' | 'failed';
  attempts: number;
  available_at: string;
  created_at: string;
  updated_at: string;
  last_error: string | null;
}
