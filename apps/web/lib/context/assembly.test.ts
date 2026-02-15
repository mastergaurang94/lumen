import { webcrypto } from 'crypto';
import 'fake-indexeddb/auto';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { getActiveDb } from '@/lib/db';
import { deriveKey, encrypt, generateIV, generateSalt, hashTranscript } from '@/lib/crypto';
import { createStorageService } from '@/lib/storage/dexie-storage';
import { buildVaultMetadata, createKeyCheck } from '@/lib/storage/metadata';
import { serializeMessages } from '@/lib/storage/transcript';
import { buildSessionContext } from '@/lib/context/assembly';
import type { SessionNotebook, SessionTranscript, SessionTranscriptChunk } from '@/types/storage';

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
    messages: { id: string; role: 'user' | 'lumen'; content: string; timestamp: Date }[];
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

describe('buildSessionContext', () => {
  it('includes transcripts and spacing metadata', async () => {
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
        { id: 'm2', role: 'lumen', content: 'Welcome back', timestamp: new Date() },
      ],
      key,
    });

    const context = await buildSessionContext({
      storage,
      userId: 'user-1',
      key,
      now: new Date('2026-01-10T00:00:00.000Z'),
      options: { maxTokens: 2000 },
    });

    expect(context).toContain('session_number: 2');
    expect(context).toContain('days_since_last_session: 4');
    expect(context).toContain('## Past Conversations');
    expect(context).toContain('**user:** Hello');
    expect(context).toContain('**lumen:** Welcome back');
  });

  it('loads notebooks when available', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    const sessionId = 'session-1';
    await saveTranscriptWithMessages(storage, {
      sessionId,
      userId: 'user-1',
      startedAt: '2026-01-05T10:00:00.000Z',
      endedAt: '2026-01-05T11:00:00.000Z',
      messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() }],
      key,
    });

    const notebook: SessionNotebook = {
      session_id: sessionId,
      user_id: 'user-1',
      session_number: 1,
      markdown: '## What Happened\nA meaningful conversation.\n\n## Parting Words\nYou are enough.',
      created_at: '2026-01-05T11:05:00.000Z',
      updated_at: '2026-01-05T11:05:00.000Z',
    };
    await storage.saveNotebook(notebook);

    const context = await buildSessionContext({
      storage,
      userId: 'user-1',
      key,
      now: new Date('2026-01-10T00:00:00.000Z'),
      options: { maxTokens: 2000 },
    });

    expect(context).toContain('## Session Notebooks');
    expect(context).toContain('A meaningful conversation.');
    expect(context).toContain('You are enough.');
  });

  it('loads arc when available', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    const sessionId = 'session-1';
    await saveTranscriptWithMessages(storage, {
      sessionId,
      userId: 'user-1',
      startedAt: '2026-01-05T10:00:00.000Z',
      endedAt: '2026-01-05T11:00:00.000Z',
      messages: [{ id: 'm1', role: 'user', content: 'Hello', timestamp: new Date() }],
      key,
    });

    await storage.saveArc({
      user_id: 'user-1',
      arc_markdown: '## Who You Are\nA searching soul.',
      last_session_number: 1,
      version: 1,
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

    expect(context).toContain('## Your Understanding of This Person');
    expect(context).toContain('A searching soul.');
  });

  it('respects budget limits for transcripts', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    const longContent = 'Long message '.repeat(200);
    await saveTranscriptWithMessages(storage, {
      sessionId: 'session-2',
      userId: 'user-2',
      startedAt: '2026-01-01T10:00:00.000Z',
      endedAt: '2026-01-01T11:00:00.000Z',
      messages: [{ id: 'm1', role: 'user', content: longContent, timestamp: new Date() }],
      key,
    });

    const context = await buildSessionContext({
      storage,
      userId: 'user-2',
      key,
      now: new Date('2026-01-02T00:00:00.000Z'),
      options: { maxTokens: 120 },
    });

    // Transcript too large for budget — should not appear
    expect(context).not.toContain('## Past Conversations');
    expect(context).toContain('session_number: 2');
  });

  it('keeps recent transcripts prioritized ahead of older randomized transcripts', async () => {
    const storage = createStorageService();
    const { key } = await setupVault(storage, 'passphrase');

    for (let day = 1; day <= 6; day++) {
      const sessionId = `session-${day}`;
      const startedAt = `2026-01-0${day}T10:00:00.000Z`;
      const endedAt = `2026-01-0${day}T11:00:00.000Z`;
      await saveTranscriptWithMessages(storage, {
        sessionId,
        userId: 'user-3',
        startedAt,
        endedAt,
        messages: [
          {
            id: `m-${day}`,
            role: 'user',
            content: `marker-session-${day}`,
            timestamp: new Date(),
          },
        ],
        key,
      });
    }

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999);
    let context = '';
    try {
      context = await buildSessionContext({
        storage,
        userId: 'user-3',
        key,
        now: new Date('2026-01-10T00:00:00.000Z'),
        options: { maxTokens: 20000 },
      });
    } finally {
      randomSpy.mockRestore();
    }

    const idx6 = context.indexOf('marker-session-6');
    const idx5 = context.indexOf('marker-session-5');
    const idx4 = context.indexOf('marker-session-4');
    const idx3 = context.indexOf('marker-session-3');
    const idx2 = context.indexOf('marker-session-2');
    const idx1 = context.indexOf('marker-session-1');

    expect(idx6).toBeGreaterThan(-1);
    expect(idx5).toBeGreaterThan(-1);
    expect(idx4).toBeGreaterThan(-1);
    expect(idx3).toBeGreaterThan(-1);
    expect(idx2).toBeGreaterThan(-1);
    expect(idx1).toBeGreaterThan(-1);

    // Recency order stays stable (newest three first).
    expect(idx6).toBeLessThan(idx5);
    expect(idx5).toBeLessThan(idx4);

    const firstOlder = Math.min(idx3, idx2, idx1);
    expect(idx6).toBeLessThan(firstOlder);
    expect(idx5).toBeLessThan(firstOlder);
    expect(idx4).toBeLessThan(firstOlder);
  });
});
