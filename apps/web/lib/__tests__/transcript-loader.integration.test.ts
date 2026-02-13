import { webcrypto } from 'crypto';
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { getActiveDb } from '@/lib/db';
import {
  decrypt,
  deriveKey,
  encrypt,
  generateIV,
  generateSalt,
  hashTranscript,
} from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { serializeMessages, deserializeMessages } from '@/lib/storage/transcript';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import type { Message } from '@/types/session';
import type { SessionSummary, SessionTranscript, SessionTranscriptChunk } from '@/types/storage';

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

beforeEach(async () => {
  await getActiveDb().open();
});

afterEach(async () => {
  await getActiveDb().delete();
});

// Helpers to reduce boilerplate across tests.
async function setupVault(passphrase = 'passphrase') {
  const storage = createStorageService();
  const salt = generateSalt();
  const iterations = 10;
  const key = await deriveKey(passphrase, salt, iterations);

  const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
  const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
  await storage.saveVaultMetadata(metadata);
  storage.setVaultContext({ key, metadata });

  return { storage, key, salt, iterations };
}

async function saveTranscript(storage: ReturnType<typeof createStorageService>, sessionId: string) {
  const transcript: SessionTranscript = {
    session_id: sessionId,
    user_id: 'user-1',
    started_at: new Date().toISOString(),
    ended_at: null,
    session_number: null,
    timezone: 'UTC',
    locale_hint: 'en-US',
    system_prompt_version: 'intake-v0.1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  await storage.saveTranscript(transcript);
}

async function encryptAndSaveChunk(
  storage: ReturnType<typeof createStorageService>,
  key: CryptoKey,
  sessionId: string,
  messages: Message[],
  chunkIndex: number,
  iterations: number,
  salt: ArrayBuffer,
) {
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
    chunk_index: chunkIndex,
    encrypted_blob: ciphertext,
    encryption_header: header,
    transcript_hash,
    created_at: new Date().toISOString(),
  };

  await storage.saveTranscriptChunk(chunk);
}

describe('transcript loader decrypt pipeline', () => {
  it('decrypts single chunk into messages', async () => {
    const { storage, key, salt, iterations } = await setupVault();
    const sessionId = 'session-1';
    await saveTranscript(storage, sessionId);

    const messages: Message[] = [
      { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
      { id: 'm2', role: 'lumen', content: 'Hi there', timestamp: new Date() },
    ];

    await encryptAndSaveChunk(storage, key, sessionId, messages, 0, iterations, salt);

    const chunks = await storage.listTranscriptChunks(sessionId);
    expect(chunks).toHaveLength(1);

    const decrypted = await decrypt(chunks[0].encrypted_blob, key, chunks[0].encryption_header.iv);
    const restored = deserializeMessages(decrypted);

    expect(restored).toHaveLength(2);
    expect(restored[0].content).toBe('Hello');
    expect(restored[0].role).toBe('user');
    expect(restored[1].content).toBe('Hi there');
    expect(restored[1].role).toBe('lumen');
  });

  it('decrypts multiple chunks and concatenates in order', async () => {
    const { storage, key, salt, iterations } = await setupVault();
    const sessionId = 'session-1';
    await saveTranscript(storage, sessionId);

    const chunk0: Message[] = [
      { id: 'm1', role: 'user', content: 'First message', timestamp: new Date() },
      { id: 'm2', role: 'lumen', content: 'First reply', timestamp: new Date() },
    ];
    const chunk1: Message[] = [
      { id: 'm3', role: 'user', content: 'Second message', timestamp: new Date() },
      { id: 'm4', role: 'lumen', content: 'Second reply', timestamp: new Date() },
    ];

    await encryptAndSaveChunk(storage, key, sessionId, chunk0, 0, iterations, salt);
    await encryptAndSaveChunk(storage, key, sessionId, chunk1, 1, iterations, salt);

    const chunks = await storage.listTranscriptChunks(sessionId);
    expect(chunks).toHaveLength(2);

    // Replicate the hook's decrypt-and-concatenate logic.
    const allMessages: Message[] = [];
    for (const chunk of chunks) {
      const decrypted = await decrypt(chunk.encrypted_blob, key, chunk.encryption_header.iv);
      allMessages.push(...deserializeMessages(decrypted));
    }

    expect(allMessages).toHaveLength(4);
    expect(allMessages[0].content).toBe('First message');
    expect(allMessages[1].content).toBe('First reply');
    expect(allMessages[2].content).toBe('Second message');
    expect(allMessages[3].content).toBe('Second reply');
  });

  it('loads summary alongside chunks', async () => {
    const { storage, key, salt, iterations } = await setupVault();
    const sessionId = 'session-1';
    await saveTranscript(storage, sessionId);

    const messages: Message[] = [
      { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
    ];
    await encryptAndSaveChunk(storage, key, sessionId, messages, 0, iterations, salt);

    const summary: SessionSummary = {
      session_id: sessionId,
      user_id: 'user-1',
      summary_text: 'A meaningful conversation.',
      parting_words: 'You are enough.',
      action_steps: ['Journal daily'],
      open_threads: [],
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await storage.saveSummary(summary);

    // Parallel load — mirrors the hook's Promise.all pattern.
    const [chunks, loadedSummary] = await Promise.all([
      storage.listTranscriptChunks(sessionId),
      storage.getSummary(sessionId),
    ]);

    expect(chunks).toHaveLength(1);
    expect(loadedSummary).toBeTruthy();
    expect(loadedSummary!.parting_words).toBe('You are enough.');
    expect(loadedSummary!.action_steps).toEqual(['Journal daily']);
  });

  it('returns empty messages when no chunks exist', async () => {
    const { storage } = await setupVault();
    const sessionId = 'session-empty';
    await saveTranscript(storage, sessionId);

    const chunks = await storage.listTranscriptChunks(sessionId);
    expect(chunks).toHaveLength(0);
  });

  it('returns null summary when none saved', async () => {
    const { storage } = await setupVault();
    const sessionId = 'session-no-summary';
    await saveTranscript(storage, sessionId);

    const summary = await storage.getSummary(sessionId);
    expect(summary).toBeNull();
  });

  it('throws on wrong decryption key', async () => {
    const { storage, key, salt, iterations } = await setupVault('correct-passphrase');
    const sessionId = 'session-1';
    await saveTranscript(storage, sessionId);

    const messages: Message[] = [
      { id: 'm1', role: 'user', content: 'Secret', timestamp: new Date() },
    ];
    await encryptAndSaveChunk(storage, key, sessionId, messages, 0, iterations, salt);

    // Derive a different key with a wrong passphrase.
    const wrongKey = await deriveKey('wrong-passphrase', salt, iterations);

    const chunks = await storage.listTranscriptChunks(sessionId);
    expect(chunks).toHaveLength(1);

    await expect(
      decrypt(chunks[0].encrypted_blob, wrongKey, chunks[0].encryption_header.iv),
    ).rejects.toThrow();
  });
});
