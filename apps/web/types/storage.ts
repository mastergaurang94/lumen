// EncryptionHeader is stored alongside each encrypted blob/chunk.
export interface EncryptionHeader {
  kdf: 'PBKDF2';
  kdf_params: { hash: 'SHA-256'; iterations: number };
  salt: ArrayBuffer;
  cipher: 'AES-GCM';
  iv: ArrayBuffer;
  version: string;
}

export interface UserProfile {
  user_id: string;
  preferred_name: string | null;
  goals: string[];
  recurring_themes: string[];
  coach_preferences: string[];
  created_at: string;
  updated_at: string;
}

// SessionTranscript stores session metadata; content lives in chunks.
export interface SessionTranscript {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
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

export interface SessionSummary {
  session_id: string;
  user_id: string;
  summary_text: string;
  recognition_moment: string | null;
  action_steps: string[];
  open_threads: string[];
  coach_notes: string | null;
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
