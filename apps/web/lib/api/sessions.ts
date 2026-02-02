import { apiFetch } from '@/lib/api/client';

type SessionStartResponse = {
  status: 'ok';
};

type SessionEndResponse = {
  status: 'ok';
};

/**
 * Records session start metadata with the API.
 */
export function startSession(sessionId: string) {
  return apiFetch<SessionStartResponse>('/v1/sessions/start', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  });
}

/**
 * Records session end metadata with transcript hash only (no plaintext).
 */
export function endSession(sessionId: string, transcriptHash: string) {
  return apiFetch<SessionEndResponse>('/v1/sessions/end', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, transcript_hash: transcriptHash }),
  });
}
