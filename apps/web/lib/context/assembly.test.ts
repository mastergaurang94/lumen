import { webcrypto } from 'crypto';
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { db } from '@/lib/db';
import { deriveKey, encrypt, generateIV, generateSalt, hashTranscript } from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import { serializeMessages } from '@/lib/storage/transcript';
import { buildSessionContext } from '@/lib/context/assembly';
import type { SessionSummary, SessionTranscript, SessionTranscriptChunk } from '@/types/storage';

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

async function setupVault(storage: ReturnType<typeof createStorageService>, passphrase: string) {
  const salt = generateSalt();
  const iterations = 10;
  const key = await deriveKey(passphrase, salt, iterations);
  const keyCheck = await createKeyCheck(key, salt, iterations, 'enc-v0.1');
  const metadata = buildVaultMetadata({ salt, iterations, version: 'enc-v0.1', keyCheck });
  await storage.saveVaultMetadata(metadata);
  storage.setVaultContext({ key, metadata });
  return { key };
}

async function saveTranscriptWithMessages(
  storage: ReturnType<typeof createStorageService>,
  params: {
    sessionId: string;
    userId: string;
    startedAt: string;
    endedAt: string;
    messages: { id: string; role: 'user' | 'coach'; content: string; timestamp: Date }[];
    key: CryptoKey;
  },
) {
  const transcript: SessionTranscript = {
    session_id: params.sessionId,
    user_id: params.userId,
    started_at: params.startedAt,
    ended_at: params.endedAt,
    session_number: null,
    timezone: 'UTC',
    locale_hint: 'en-US',
    system_prompt_version: 'intake-v0.1',
    created_at: params.startedAt,
    updated_at: params.startedAt,
  };
  await storage.saveTranscript(transcript);

  const plaintext = serializeMessages(params.messages);
  const iv = generateIV();
  const encrypted = await encrypt(plaintext, params.key, iv);
  const header = {
    kdf: 'PBKDF2' as const,
    kdf_params: { hash: 'SHA-256' as const, iterations: 10 },
    salt: generateSalt(),
    cipher: 'AES-GCM' as const,
    iv,
    version: 'enc-v0.1',
  };
  const chunk: SessionTranscriptChunk = {
    session_id: params.sessionId,
    chunk_index: 0,
    encrypted_blob: encrypted,
    encryption_header: header,
    transcript_hash: await hashTranscript(encrypted, header),
    created_at: params.startedAt,
  };
  await storage.saveTranscriptChunk(chunk);
}

async function saveSummary(
  storage: ReturnType<typeof createStorageService>,
  summary: SessionSummary,
) {
  await storage.saveSummary(summary);
}

describe('buildSessionContext', () => {
  it('prefers transcripts and includes spacing metadata', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    const sessionId = 'session-1';
    await saveTranscriptWithMessages(storage, {
      sessionId,
      userId: 'user-1',
      startedAt: '2026-01-05T10:00:00.000Z',
      endedAt: '2026-01-05T11:00:00.000Z',
      messages: [
        { id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() },
        { id: 'm2', role: 'coach', content: 'Welcome back', timestamp: new Date() },
      ],
      key,
    });

    await saveSummary(storage, {
      session_id: sessionId,
      user_id: 'user-1',
      summary_text: 'Summary text.',
      recognition_moment: null,
      action_steps: ['Do the thing'],
      open_threads: ['Thread A'],
      coach_notes: null,
      created_at: '2026-01-05T11:05:00.000Z',
      updated_at: '2026-01-05T11:05:00.000Z',
    });

    const context = await buildSessionContext({
      storage,
      userId: 'user-1',
      key,
      now: new Date('2026-01-10T00:00:00.000Z'),
      options: { maxTokens: 2000 },
    });

    expect(context).toContain('session_number: 2');
    expect(context).toContain('days_since_last_session: 5');
    expect(context).toContain('## Recent Transcripts');
    expect(context).toContain('**user:** Hello');
    expect(context).toContain('**coach:** Welcome back');
  });

  it('falls back to summaries when transcripts exceed budget', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    const sessionId = 'session-2';
    const longContent = 'Long message '.repeat(200);
    await saveTranscriptWithMessages(storage, {
      sessionId,
      userId: 'user-2',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T11:00:00.000Z',
      messages: [{ id: 'm1', role: 'user', content: longContent, timestamp: new Date() }],
      key,
    });

    await saveSummary(storage, {
      session_id: sessionId,
      user_id: 'user-2',
      summary_text: 'Short summary.',
      recognition_moment: null,
      action_steps: [],
      open_threads: [],
      coach_notes: null,
      created_at: '2026-01-01T11:05:00.000Z',
      updated_at: '2026-01-01T11:05:00.000Z',
    });

    const context = await buildSessionContext({
      storage,
      userId: 'user-2',
      key,
      now: new Date('2026-01-02T00:00:00.000Z'),
      options: { maxTokens: 120 },
    });

    expect(context).toContain('## Recent Summaries');
    expect(context).not.toContain('## Recent Transcripts');
    expect(context).toContain('Short summary.');
  });
});
