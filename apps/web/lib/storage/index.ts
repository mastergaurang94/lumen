import type {
  UserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
  VaultMetadata,
} from '@/types/storage';

// StorageService abstracts persistence so we can swap backends later.
export interface StorageService {
  getProfile(userId: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;

  getTranscript(sessionId: string): Promise<SessionTranscript | null>;
  saveTranscript(transcript: SessionTranscript): Promise<void>;
  listTranscripts(userId: string): Promise<SessionTranscript[]>;

  saveTranscriptChunk(chunk: SessionTranscriptChunk): Promise<void>;
  listTranscriptChunks(sessionId: string): Promise<SessionTranscriptChunk[]>;

  getSummary(sessionId: string): Promise<SessionSummary | null>;
  saveSummary(summary: SessionSummary): Promise<void>;
  listSummaries(userId: string, limit?: number): Promise<SessionSummary[]>;

  getVaultMetadata(): Promise<VaultMetadata | null>;
  saveVaultMetadata(metadata: VaultMetadata): Promise<void>;
}

export type StorageFactory = () => StorageService;
