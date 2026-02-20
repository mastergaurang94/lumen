import type {
  UserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionNotebook,
  UserArc,
  LlmProvider,
  LlmProviderKey,
  VaultMetadata,
} from '@/types/storage';

// StorageService handles encrypted payloads internally and exposes decrypted data.
export interface StorageService {
  setVaultContext(params: { key: CryptoKey; metadata: VaultMetadata }): void;

  getProfile(userId: string): Promise<UserProfile | null>;
  saveProfile(profile: UserProfile): Promise<void>;

  getTranscript(sessionId: string): Promise<SessionTranscript | null>;
  saveTranscript(transcript: SessionTranscript): Promise<void>;
  listTranscripts(userId: string): Promise<SessionTranscript[]>;

  saveTranscriptChunk(chunk: SessionTranscriptChunk): Promise<void>;
  listTranscriptChunks(sessionId: string): Promise<SessionTranscriptChunk[]>;

  getNotebook(sessionId: string): Promise<SessionNotebook | null>;
  saveNotebook(notebook: SessionNotebook): Promise<void>;
  listNotebooks(userId: string): Promise<SessionNotebook[]>;

  getArc(userId: string): Promise<UserArc | null>;
  saveArc(arc: UserArc): Promise<void>;

  getLlmProviderKey(provider: LlmProvider): Promise<LlmProviderKey | null>;
  saveLlmProviderKey(record: LlmProviderKey): Promise<void>;

  getVaultMetadata(): Promise<VaultMetadata | null>;
  saveVaultMetadata(metadata: VaultMetadata): Promise<void>;
}

export type StorageFactory = () => StorageService;
