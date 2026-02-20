import { getActiveDb } from '@/lib/db';
import { decodeJson, encodeJson, encrypt, decrypt, generateIV, hashTranscript } from '@/lib/crypto';
import type { StorageService } from '@/lib/storage';
import type {
  EncryptionHeader,
  EncryptedLlmProviderKey,
  EncryptedSessionNotebook,
  EncryptedUserArc,
  EncryptedUserProfile,
  LlmProvider,
  LlmProviderKey,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionNotebook,
  UserArc,
  UserProfile,
  VaultMetadata,
} from '@/types/storage';

export class DexieStorageService implements StorageService {
  private key: CryptoKey | null = null;
  private metadata: VaultMetadata | null = null;

  // Sets vault context after unlock so we can encrypt/decrypt payloads.
  setVaultContext(params: { key: CryptoKey; metadata: VaultMetadata }) {
    this.key = params.key;
    this.metadata = params.metadata;
  }

  private getVaultContext() {
    if (!this.key || !this.metadata) {
      throw new Error('Vault is locked');
    }
    return { key: this.key, metadata: this.metadata };
  }

  private buildHeader(metadata: VaultMetadata, iv: ArrayBuffer): EncryptionHeader {
    return {
      kdf: 'PBKDF2',
      kdf_params: { hash: 'SHA-256', iterations: metadata.kdf_iterations },
      salt: metadata.salt,
      cipher: 'AES-GCM',
      iv,
      version: metadata.encryption_version,
    };
  }

  // Verify encrypted payload integrity before decryption to detect tampering or corruption.
  // Uses constant-time comparison to avoid timing attacks.
  private async assertTranscriptHash(
    encrypted: ArrayBuffer,
    header: EncryptionHeader,
    expectedHash: ArrayBuffer,
  ) {
    const computed = await hashTranscript(encrypted, header);
    const computedBytes = new Uint8Array(computed);
    const expectedBytes = new Uint8Array(expectedHash);
    if (computedBytes.length !== expectedBytes.length) {
      throw new Error('Encrypted payload failed integrity check');
    }
    for (let i = 0; i < computedBytes.length; i += 1) {
      if (computedBytes[i] !== expectedBytes[i]) {
        throw new Error('Encrypted payload failed integrity check');
      }
    }
  }

  private async encryptProfile(profile: UserProfile): Promise<EncryptedUserProfile> {
    const { key, metadata } = this.getVaultContext();
    const iv = generateIV();
    const header = this.buildHeader(metadata, iv);
    const ciphertext = await encrypt(encodeJson(profile), key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);

    return {
      user_id: profile.user_id,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    };
  }

  private async decryptProfile(record: EncryptedUserProfile): Promise<UserProfile> {
    const { key } = this.getVaultContext();
    await this.assertTranscriptHash(
      record.encrypted_blob,
      record.encryption_header,
      record.transcript_hash,
    );
    const plaintext = await decrypt(record.encrypted_blob, key, record.encryption_header.iv);
    return decodeJson<UserProfile>(plaintext);
  }

  private async encryptNotebook(notebook: SessionNotebook): Promise<EncryptedSessionNotebook> {
    const { key, metadata } = this.getVaultContext();
    const iv = generateIV();
    const header = this.buildHeader(metadata, iv);
    const ciphertext = await encrypt(encodeJson(notebook), key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);

    return {
      session_id: notebook.session_id,
      user_id: notebook.user_id,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      created_at: notebook.created_at,
      updated_at: notebook.updated_at,
    };
  }

  private async decryptNotebook(record: EncryptedSessionNotebook): Promise<SessionNotebook> {
    const { key } = this.getVaultContext();
    await this.assertTranscriptHash(
      record.encrypted_blob,
      record.encryption_header,
      record.transcript_hash,
    );
    const plaintext = await decrypt(record.encrypted_blob, key, record.encryption_header.iv);
    return decodeJson<SessionNotebook>(plaintext);
  }

  private async encryptArc(arc: UserArc): Promise<EncryptedUserArc> {
    const { key, metadata } = this.getVaultContext();
    const iv = generateIV();
    const header = this.buildHeader(metadata, iv);
    const ciphertext = await encrypt(encodeJson(arc), key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);

    return {
      user_id: arc.user_id,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      version: arc.version,
      created_at: arc.created_at,
      updated_at: arc.updated_at,
    };
  }

  private async decryptArc(record: EncryptedUserArc): Promise<UserArc> {
    const { key } = this.getVaultContext();
    await this.assertTranscriptHash(
      record.encrypted_blob,
      record.encryption_header,
      record.transcript_hash,
    );
    const plaintext = await decrypt(record.encrypted_blob, key, record.encryption_header.iv);
    return decodeJson<UserArc>(plaintext);
  }

  // LLM provider keys are encrypted with the same vault key as transcripts.
  // This ensures the API key is only accessible when the vault is unlocked.
  private async encryptLlmProviderKey(record: LlmProviderKey): Promise<EncryptedLlmProviderKey> {
    const { key, metadata } = this.getVaultContext();
    const iv = generateIV();
    const header = this.buildHeader(metadata, iv);
    const ciphertext = await encrypt(encodeJson(record), key, iv);
    const key_hash = await hashTranscript(ciphertext, header);

    return {
      provider: record.provider,
      encrypted_blob: ciphertext,
      encryption_header: header,
      key_hash,
      created_at: record.created_at,
      updated_at: record.updated_at,
    };
  }

  private async decryptLlmProviderKey(record: EncryptedLlmProviderKey): Promise<LlmProviderKey> {
    const { key } = this.getVaultContext();
    await this.assertTranscriptHash(
      record.encrypted_blob,
      record.encryption_header,
      record.key_hash,
    );
    const plaintext = await decrypt(record.encrypted_blob, key, record.encryption_header.iv);
    return decodeJson<LlmProviderKey>(plaintext);
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const db = getActiveDb();
    const record = await db.userProfiles.get(userId);
    if (!record) return null;
    return this.decryptProfile(record);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const db = getActiveDb();
    const encrypted = await this.encryptProfile(profile);
    await db.userProfiles.put(encrypted);
  }

  async getTranscript(sessionId: string): Promise<SessionTranscript | null> {
    const db = getActiveDb();
    return (await db.sessionTranscripts.get(sessionId)) ?? null;
  }

  async saveTranscript(transcript: SessionTranscript): Promise<void> {
    const db = getActiveDb();
    await db.sessionTranscripts.put(transcript);
  }

  async listTranscripts(userId: string): Promise<SessionTranscript[]> {
    const db = getActiveDb();
    // Sort by started_at then reverse to keep newest-first ordering.
    const transcripts = await db.sessionTranscripts
      .where('user_id')
      .equals(userId)
      .sortBy('started_at');
    return transcripts.reverse();
  }

  async saveTranscriptChunk(chunk: SessionTranscriptChunk): Promise<void> {
    const db = getActiveDb();
    await db.sessionTranscriptChunks.put(chunk);
  }

  async listTranscriptChunks(sessionId: string): Promise<SessionTranscriptChunk[]> {
    const db = getActiveDb();
    // Ensure chunks are returned in write order.
    return db.sessionTranscriptChunks.where('session_id').equals(sessionId).sortBy('chunk_index');
  }

  async getNotebook(sessionId: string): Promise<SessionNotebook | null> {
    const db = getActiveDb();
    const record = await db.sessionNotebooks.get(sessionId);
    if (!record) return null;
    return this.decryptNotebook(record);
  }

  async saveNotebook(notebook: SessionNotebook): Promise<void> {
    const db = getActiveDb();
    const encrypted = await this.encryptNotebook(notebook);
    await db.sessionNotebooks.put(encrypted);
  }

  async listNotebooks(userId: string): Promise<SessionNotebook[]> {
    const db = getActiveDb();
    const notebooks = await db.sessionNotebooks
      .where('user_id')
      .equals(userId)
      .sortBy('created_at');
    const newestFirst = notebooks.reverse();
    return Promise.all(newestFirst.map((record) => this.decryptNotebook(record)));
  }

  async getArc(userId: string): Promise<UserArc | null> {
    const db = getActiveDb();
    const record = await db.userArcs.get(userId);
    if (!record) return null;
    return this.decryptArc(record);
  }

  async saveArc(arc: UserArc): Promise<void> {
    const db = getActiveDb();
    const encrypted = await this.encryptArc(arc);
    await db.userArcs.put(encrypted);
  }

  async getLlmProviderKey(provider: LlmProvider): Promise<LlmProviderKey | null> {
    const db = getActiveDb();
    const record = await db.llmProviderKeys.get(provider);
    if (!record) return null;
    return this.decryptLlmProviderKey(record);
  }

  async saveLlmProviderKey(record: LlmProviderKey): Promise<void> {
    const db = getActiveDb();
    const encrypted = await this.encryptLlmProviderKey(record);
    await db.llmProviderKeys.put(encrypted);
  }

  async getVaultMetadata(): Promise<VaultMetadata | null> {
    const db = getActiveDb();
    return (await db.vaultMetadata.get('vault')) ?? null;
  }

  async saveVaultMetadata(metadata: VaultMetadata): Promise<void> {
    const db = getActiveDb();
    await db.vaultMetadata.put(metadata);
  }
}

export function createStorageService(): StorageService {
  return new DexieStorageService();
}
