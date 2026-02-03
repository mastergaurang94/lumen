import { webcrypto } from 'crypto';
// Use fake IndexedDB for Node test environment.
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import {
  decodeJson,
  decrypt,
  deriveKey,
  encodeJson,
  encrypt,
  generateIV,
  generateSalt,
  hashTranscript,
} from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { serializeMessages, deserializeMessages } from '@/lib/storage/transcript';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import type {
  EncryptedSessionSummary,
  EncryptedUserProfile,
  EncryptedLlmProviderKey,
  LlmProviderKey,
  SessionSummary,
  SessionTranscript,
  SessionTranscriptChunk,
  UserProfile,
} from '@/types/storage';

beforeAll(() => {
  if (!globalThis.crypto) {
    globalThis.crypto = webcrypto as unknown as Crypto;
  }
});

beforeEach(async () => {
  await db.open();
});

afterEach(async () => {
  await db.delete();
});

describe('storage integration', () => {
  it('persists and reloads encrypted transcript chunks', async () => {
    const storage = createStorageService();
    const salt = generateSalt();
    const iterations = 10;
    const key = await deriveKey('passphrase', salt, iterations);

    const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
    const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
    await storage.saveVaultMetadata(metadata);
    storage.setVaultContext({ key, metadata });
    storage.setVaultContext({ key, metadata });
    storage.setVaultContext({ key, metadata });

    const sessionId = 'session-1';
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

  it('encrypts profiles and summaries at rest', async () => {
    const storage = createStorageService();
    const salt = generateSalt();
    const iterations = 10;
    const key = await deriveKey('passphrase', salt, iterations);

    const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
    const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
    await storage.saveVaultMetadata(metadata);
    storage.setVaultContext({ key, metadata });

    const now = new Date().toISOString();
    const profile: UserProfile = {
      user_id: 'user-1',
      preferred_name: 'Kai',
      goals: ['Trust my gut'],
      recurring_themes: [],
      coach_preferences: [],
      created_at: now,
      updated_at: now,
    };

    await storage.saveProfile(profile);

    const storedProfile = (await db.userProfiles.get(profile.user_id)) as EncryptedUserProfile;
    expect(storedProfile).toBeTruthy();
    expect(new Uint8Array(storedProfile.encrypted_blob)).not.toEqual(
      new Uint8Array(encodeJson(profile)),
    );

    const decryptedProfile = await storage.getProfile(profile.user_id);
    expect(decryptedProfile).toEqual(profile);

    const summary: SessionSummary = {
      session_id: 'session-1',
      user_id: 'user-1',
      summary_text: 'Summary',
      recognition_moment: null,
      action_steps: ['Do the thing'],
      open_threads: [],
      coach_notes: null,
      created_at: now,
      updated_at: now,
    };

    await storage.saveSummary(summary);

    const storedSummary = (await db.sessionSummaries.get(
      summary.session_id,
    )) as EncryptedSessionSummary;
    expect(storedSummary).toBeTruthy();
    expect(new Uint8Array(storedSummary.encrypted_blob)).not.toEqual(
      new Uint8Array(encodeJson(summary)),
    );

    const decryptedSummary = await storage.getSummary(summary.session_id);
    expect(decryptedSummary).toEqual(summary);

    const roundTripProfile = await decrypt(
      storedProfile.encrypted_blob,
      key,
      storedProfile.encryption_header.iv,
    );
    expect(decodeJson<UserProfile>(roundTripProfile).user_id).toBe('user-1');
  });

  it('returns summaries newest-first', async () => {
    const storage = createStorageService();
    const salt = generateSalt();
    const iterations = 10;
    const key = await deriveKey('passphrase', salt, iterations);

    const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
    const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
    await storage.saveVaultMetadata(metadata);
    storage.setVaultContext({ key, metadata });
    const userId = 'user-1';

    const summaries: SessionSummary[] = [
      {
        session_id: 'session-1',
        user_id: userId,
        summary_text: 'Oldest',
        recognition_moment: null,
        action_steps: [],
        open_threads: [],
        coach_notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        session_id: 'session-2',
        user_id: userId,
        summary_text: 'Middle',
        recognition_moment: null,
        action_steps: [],
        open_threads: [],
        coach_notes: null,
        created_at: '2026-01-03T00:00:00.000Z',
        updated_at: '2026-01-03T00:00:00.000Z',
      },
      {
        session_id: 'session-3',
        user_id: userId,
        summary_text: 'Newest',
        recognition_moment: null,
        action_steps: [],
        open_threads: [],
        coach_notes: null,
        created_at: '2026-01-05T00:00:00.000Z',
        updated_at: '2026-01-05T00:00:00.000Z',
      },
    ];

    for (const summary of summaries) {
      await storage.saveSummary(summary);
    }

    const recent = await storage.listSummaries(userId, 2);
    expect(recent).toHaveLength(2);
    expect(recent[0].summary_text).toBe('Newest');
    expect(recent[1].summary_text).toBe('Middle');
  });

  it('returns transcripts newest-first', async () => {
    const storage = createStorageService();

    const transcripts: SessionTranscript[] = [
      {
        session_id: 'session-1',
        user_id: 'user-1',
        started_at: '2026-01-01T00:00:00.000Z',
        ended_at: null,
        timezone: 'UTC',
        locale_hint: 'en-US',
        system_prompt_version: 'intake-v0.1',
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        session_id: 'session-2',
        user_id: 'user-1',
        started_at: '2026-01-05T00:00:00.000Z',
        ended_at: null,
        timezone: 'UTC',
        locale_hint: 'en-US',
        system_prompt_version: 'intake-v0.1',
        created_at: '2026-01-05T00:00:00.000Z',
        updated_at: '2026-01-05T00:00:00.000Z',
      },
    ];

    for (const transcript of transcripts) {
      await storage.saveTranscript(transcript);
    }

    const ordered = await storage.listTranscripts('user-1');
    expect(ordered).toHaveLength(2);
    expect(ordered[0].session_id).toBe('session-2');
    expect(ordered[1].session_id).toBe('session-1');
  });

  it('encrypts LLM provider keys at rest', async () => {
    const storage = createStorageService();
    const salt = generateSalt();
    const iterations = 10;
    const key = await deriveKey('passphrase', salt, iterations);

    const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
    const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
    await storage.saveVaultMetadata(metadata);
    storage.setVaultContext({ key, metadata });

    const now = new Date().toISOString();
    const providerKey: LlmProviderKey = {
      provider: 'anthropic',
      api_key: 'sk-ant-oat-test-token',
      created_at: now,
      updated_at: now,
    };

    await storage.saveLlmProviderKey(providerKey);

    const stored = (await db.llmProviderKeys.get(providerKey.provider)) as EncryptedLlmProviderKey;
    expect(stored).toBeTruthy();
    expect(new Uint8Array(stored.encrypted_blob)).not.toEqual(
      new Uint8Array(encodeJson(providerKey)),
    );

    const decrypted = await storage.getLlmProviderKey(providerKey.provider);
    expect(decrypted).toEqual(providerKey);
  });
});
