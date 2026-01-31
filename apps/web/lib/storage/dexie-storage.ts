import { db } from '@/lib/db';
import { decodeJson, encodeJson, encrypt, decrypt, generateIV, hashTranscript } from '@/lib/crypto';
import type { StorageService } from '@/lib/storage';
import type {
  EncryptionHeader,
  EncryptedSessionSummary,
  EncryptedUserProfile,
  SessionTranscript,
  SessionTranscriptChunk,
  SessionSummary,
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

  private async encryptSummary(summary: SessionSummary): Promise<EncryptedSessionSummary> {
    const { key, metadata } = this.getVaultContext();
    const iv = generateIV();
    const header = this.buildHeader(metadata, iv);
    const ciphertext = await encrypt(encodeJson(summary), key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);

    return {
      session_id: summary.session_id,
      user_id: summary.user_id,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      created_at: summary.created_at,
      updated_at: summary.updated_at,
    };
  }

  private async decryptSummary(record: EncryptedSessionSummary): Promise<SessionSummary> {
    const { key } = this.getVaultContext();
    await this.assertTranscriptHash(
      record.encrypted_blob,
      record.encryption_header,
      record.transcript_hash,
    );
    const plaintext = await decrypt(record.encrypted_blob, key, record.encryption_header.iv);
    return decodeJson<SessionSummary>(plaintext);
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    const record = await db.userProfiles.get(userId);
    if (!record) return null;
    return this.decryptProfile(record);
  }

  async saveProfile(profile: UserProfile): Promise<void> {
    const encrypted = await this.encryptProfile(profile);
    await db.userProfiles.put(encrypted);
  }

  async getTranscript(sessionId: string): Promise<SessionTranscript | null> {
    return (await db.sessionTranscripts.get(sessionId)) ?? null;
  }

  async saveTranscript(transcript: SessionTranscript): Promise<void> {
    await db.sessionTranscripts.put(transcript);
  }

  async listTranscripts(userId: string): Promise<SessionTranscript[]> {
    // Sort by started_at then reverse to keep newest-first ordering.
    const transcripts = await db.sessionTranscripts
      .where('user_id')
      .equals(userId)
      .sortBy('started_at');
    return transcripts.reverse();
  }

  async saveTranscriptChunk(chunk: SessionTranscriptChunk): Promise<void> {
    await db.sessionTranscriptChunks.put(chunk);
  }

  async listTranscriptChunks(sessionId: string): Promise<SessionTranscriptChunk[]> {
    // Ensure chunks are returned in write order.
    return db.sessionTranscriptChunks.where('session_id').equals(sessionId).sortBy('chunk_index');
  }

  async getSummary(sessionId: string): Promise<SessionSummary | null> {
    const record = await db.sessionSummaries.get(sessionId);
    if (!record) return null;
    return this.decryptSummary(record);
  }

  async saveSummary(summary: SessionSummary): Promise<void> {
    const encrypted = await this.encryptSummary(summary);
    await db.sessionSummaries.put(encrypted);
  }

  async listSummaries(userId: string, limit = 10): Promise<SessionSummary[]> {
    const summaries = await db.sessionSummaries
      .where('user_id')
      .equals(userId)
      .sortBy('created_at');
    const newestFirst = summaries.reverse().slice(0, limit);
    return Promise.all(newestFirst.map((record) => this.decryptSummary(record)));
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
