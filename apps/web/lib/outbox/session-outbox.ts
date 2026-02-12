import { getActiveDb } from '@/lib/db';
import { endSession, startSession } from '@/lib/api/sessions';
import type { SessionOutboxEvent, SessionOutboxEventType } from '@/types/storage';

const MAX_ATTEMPTS = 6;
const BASE_DELAY_MS = 2_000;
const MAX_DELAY_MS = 60_000;

// Singleton guard to keep concurrent flushes from interleaving.
let flushPromise: Promise<void> | null = null;

function nowIso() {
  return new Date().toISOString();
}

// Exponential backoff capped to keep retries bounded and UI responsive.
function computeBackoffMs(attempts: number) {
  return Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** Math.max(0, attempts));
}

async function findExistingEvent(sessionId: string, type: SessionOutboxEventType) {
  const matches = await getActiveDb().sessionOutbox.where('session_id').equals(sessionId).toArray();
  return matches.find((event) => event.type === type) ?? null;
}

async function updateEvent(event: SessionOutboxEvent, patch: Partial<SessionOutboxEvent>) {
  const updated: SessionOutboxEvent = {
    ...event,
    ...patch,
    updated_at: nowIso(),
  };
  await getActiveDb().sessionOutbox.put(updated);
  return updated;
}

// Enqueue a start event if one isn't already pending for this session.
export async function enqueueSessionStart(sessionId: string) {
  const existing = await findExistingEvent(sessionId, 'session_start');
  if (existing) {
    return existing;
  }

  const now = nowIso();
  const event: SessionOutboxEvent = {
    id: crypto.randomUUID(),
    type: 'session_start',
    session_id: sessionId,
    transcript_hash: null,
    status: 'pending',
    attempts: 0,
    available_at: now,
    created_at: now,
    updated_at: now,
    last_error: null,
  };

  await getActiveDb().sessionOutbox.put(event);
  return event;
}

// Enqueue (or update) an end event to deliver the final transcript hash.
export async function enqueueSessionEnd(sessionId: string, transcriptHash: string) {
  const existing = await findExistingEvent(sessionId, 'session_end');
  if (existing) {
    return updateEvent(existing, {
      transcript_hash: transcriptHash,
      status: 'pending',
      available_at: nowIso(),
      last_error: null,
    });
  }

  const now = nowIso();
  const event: SessionOutboxEvent = {
    id: crypto.randomUUID(),
    type: 'session_end',
    session_id: sessionId,
    transcript_hash: transcriptHash,
    status: 'pending',
    attempts: 0,
    available_at: now,
    created_at: now,
    updated_at: now,
    last_error: null,
  };

  await getActiveDb().sessionOutbox.put(event);
  return event;
}

async function markFailure(event: SessionOutboxEvent, errorMessage: string) {
  const attempts = event.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    await updateEvent(event, {
      attempts,
      status: 'failed',
      last_error: errorMessage,
    });
    return;
  }

  const backoffMs = computeBackoffMs(attempts);
  const nextAttempt = new Date(Date.now() + backoffMs).toISOString();
  await updateEvent(event, {
    attempts,
    available_at: nextAttempt,
    last_error: errorMessage,
  });
}

// Deliver a single outbox event and reschedule on failure.
async function processEvent(event: SessionOutboxEvent) {
  try {
    if (event.type === 'session_start') {
      await startSession(event.session_id);
    } else {
      if (!event.transcript_hash) {
        throw new Error('Missing transcript hash');
      }
      await endSession(event.session_id, event.transcript_hash);
    }
    await getActiveDb().sessionOutbox.delete(event.id);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await markFailure(event, message);
  }
}

/**
 * Flushes pending session metadata events with exponential backoff retries.
 * Safe to call often; concurrent calls are deduped.
 */
export function flushSessionOutbox() {
  if (flushPromise) {
    return flushPromise;
  }

  flushPromise = (async () => {
    const now = nowIso();
    const due = await getActiveDb()
      .sessionOutbox.where('available_at')
      .belowOrEqual(now)
      .and((event) => event.status === 'pending')
      .sortBy('created_at');

    for (const event of due) {
      await processEvent(event);
    }
  })()
    .catch(() => {
      // Swallow outbox flush errors; retries are scheduled per event.
    })
    .finally(() => {
      flushPromise = null;
    });

  return flushPromise;
}
