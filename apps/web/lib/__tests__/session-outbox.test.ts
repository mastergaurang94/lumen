import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { db } from '@/lib/db';
import {
  enqueueSessionEnd,
  enqueueSessionStart,
  flushSessionOutbox,
} from '@/lib/outbox/session-outbox';
import { endSession, startSession } from '@/lib/api/sessions';

vi.mock('@/lib/api/sessions', () => ({
  startSession: vi.fn(),
  endSession: vi.fn(),
}));

beforeEach(async () => {
  await db.open();
  vi.clearAllMocks();
});

afterEach(async () => {
  await db.delete();
});

describe('session outbox', () => {
  it('dedupes start events per session', async () => {
    await enqueueSessionStart('session-1');
    await enqueueSessionStart('session-1');

    const events = await db.sessionOutbox.toArray();
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('session_start');
  });

  it('flushes pending events in order', async () => {
    vi.mocked(startSession).mockResolvedValue({ status: 'ok' });
    vi.mocked(endSession).mockResolvedValue({ status: 'ok' });

    await enqueueSessionStart('session-1');
    await enqueueSessionEnd('session-1', 'hash-1');

    await flushSessionOutbox();

    expect(startSession).toHaveBeenCalledTimes(1);
    expect(endSession).toHaveBeenCalledTimes(1);
    expect(await db.sessionOutbox.count()).toBe(0);
  });

  it('retains events when delivery fails', async () => {
    vi.mocked(startSession).mockRejectedValue(new Error('network'));

    await enqueueSessionStart('session-2');
    await flushSessionOutbox();

    const events = await db.sessionOutbox.toArray();
    expect(events).toHaveLength(1);
    expect(events[0].attempts).toBe(1);
    expect(events[0].status).toBe('pending');
  });
});
