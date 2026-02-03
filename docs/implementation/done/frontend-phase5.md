# Phase 5: Client Integration (Auth + Session Metadata)

**Status: ✅ Complete**

Archived: 2026-02-03

---

## Overview

Wire the frontend to the Go API for auth and session metadata, plus direct client-to-LLM calls with BYOK (Bring Your Own Key).

---

## Running Updates

- 2026-02-02: Phase 5 drafted for client integration.
- 2026-02-02: Step 1 complete — wired magic link request/verify with shared API client and login callback flow.
- 2026-02-02: Added auth session check endpoint + client guards for setup/unlock/session/chat.
- 2026-02-02: Step 2 complete — added session metadata outbox, retries, and API sync wiring.
- 2026-02-02: Step 3 complete — client LLM calls with BYOK key (encrypted), retry/backoff, and provider unavailable handling.
- 2026-02-02: LLM integration polish — provider key gate, initial coach prompt, summary generation, abort handling, and LLM client/storage tests.

---

## Step 1: Magic Link Request + Verify

**Status: ✅ Complete**

Wire the login flow to the Go API.

Tasks:

- [x] Call `POST /v1/auth/request-link` from `apps/web/app/login/page.tsx`.
- [x] Add a `/login` callback handler to exchange token via `POST /v1/auth/verify`.
- [x] Store session cookie (HTTP-only) implicitly; no client storage needed.
- [x] Ensure API fetches include `credentials: 'include'` for cookie auth.
- [x] Handle errors with friendly retry UX.

Files modified/created:

- `apps/web/app/login/page.tsx`
- `apps/web/app/login/callback/page.tsx` (new)
- `apps/web/lib/api/auth.ts` (new)
- `apps/web/lib/api/client.ts` (new)

---

## Step 2: Session Metadata Sync

**Status: ✅ Complete**

Send start/end metadata to the API while keeping transcripts local.

Tasks:

- [x] On session start, call `POST /v1/sessions/start` with `session_id`.
- [x] On session end, call `POST /v1/sessions/end` with `session_id` + `transcript_hash`
      (SHA-256 over `serialize(encryption_header) || encrypted_blob`).
- [x] Ensure calls do not include plaintext transcript content.
- [x] Retry on transient errors with backoff (UI should remain usable).
- [x] Add a lightweight client "outbox" queue (IndexedDB) for pending start/end
      events and flush on reconnect/app start.

Files modified/created:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/api/sessions.ts` (new)
- `apps/web/lib/outbox/session-outbox.ts` (new)
- `apps/web/lib/db.ts`
- `apps/web/types/storage.ts`

---

## Step 3: Client-to-LLM Calls (No Server Proxy)

**Status: ✅ Complete**

Call the LLM provider directly from the client while preserving privacy guarantees.

Tasks:

- [x] Route LLM calls from the browser (temporary Next API proxy required for Claude Code OAuth in MVP).
- [x] Ensure only client-assembled context + user messages are sent.
- [x] BYOK MVP: prompt user for provider API key, store locally encrypted, and
      use it for LLM calls.
- [x] Add retry/backoff and "coach unavailable" handling for provider outages.
- [x] Avoid logging or persisting plaintext outside the local vault.

Files modified/created:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/llm/client.ts` (new)
- `apps/web/lib/storage/dexie-storage.ts`
- `apps/web/lib/storage/index.ts`
- `apps/web/lib/db.ts`
- `apps/web/types/storage.ts`
