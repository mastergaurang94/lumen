import { webcrypto } from 'crypto';
// Use fake IndexedDB for Node test environment.
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { decrypt, deriveKey, encrypt, generateIV, generateSalt, hashTranscript } from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { serializeMessages, deserializeMessages } from '@/lib/storage/transcript';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import type { SessionTranscript, SessionTranscriptChunk } from '@/types/storage';

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

afterEach(async () => {
  db.close();
  await db.delete();
});

describe('storage integration', () => {
  it('persists and reloads encrypted transcript chunks', async () => {
    const storage = createStorageService();
    const salt = generateSalt();
    const iterations = 10;
    const key = await deriveKey('passphrase', salt, iterations);

    const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
    await storage.saveVaultMetadata(
      buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck }),
    );

    const sessionId = 'session-1';
    const transcript: SessionTranscript = {
      session_id: sessionId,
      user_id: 'user-1',
      started_at: new Date().toISOString(),
      ended_at: null,
      timezone: 'UTC',
      locale_hint: 'en-US',
      system_prompt_version: 'intake-v0.1',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.saveTranscript(transcript);

    const messages = [
      { id: 'm1', role: 'user' as const, content: 'Hello', timestamp: new Date() },
      { id: 'm2', role: 'coach' as const, content: 'Hi there', timestamp: new Date() },
    ];

    const iv = generateIV();
    const header = {
      kdf: 'PBKDF2' as const,
      kdf_params: { hash: 'SHA-256' as const, iterations },
      salt,
      cipher: 'AES-GCM' as const,
      iv,
      version: 'enc-v0.1',
    };

    const ciphertext = await encrypt(serializeMessages(messages), key, iv);
    const transcript_hash = await hashTranscript(ciphertext, header);
    const chunk: SessionTranscriptChunk = {
      session_id: sessionId,
      chunk_index: 0,
      encrypted_blob: ciphertext,
      encryption_header: header,
      transcript_hash,
      created_at: new Date().toISOString(),
    };

    await storage.saveTranscriptChunk(chunk);

    const storedChunks = await storage.listTranscriptChunks(sessionId);
    expect(storedChunks).toHaveLength(1);

    const decrypted = await decrypt(
      storedChunks[0].encrypted_blob,
      key,
      storedChunks[0].encryption_header.iv,
    );
    const restored = deserializeMessages(decrypted);
    expect(restored[0].content).toBe('Hello');
    expect(restored[1].content).toBe('Hi there');
  });
});
