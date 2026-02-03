# Frontend Implementation Plan

Last Updated: 2026-02-02

---

## Current Phase: Phase 5 — Client Integration (Auth + Session Metadata)

**Status: ✅ Complete**

### Running Updates

- 2026-01-31: Backend plan moved to `docs/implementation/backend/plan.md`.
- 2026-02-02: Phase 5 drafted for client integration.
- 2026-02-02: Step 1 complete — wired magic link request/verify with shared API client and login callback flow.
- 2026-02-02: Added auth session check endpoint + client guards for setup/unlock/session/chat.
- 2026-02-02: Step 2 complete — added session metadata outbox, retries, and API sync wiring.
- 2026-02-02: Step 3 complete — client LLM calls with BYOK key (encrypted), retry/backoff, and provider unavailable handling.

### In Progress / Next Up

- Phase 5 complete. Next step TBD.

### Deferred / If Time

- Add sidebar auth state (signed-in indicator) and logout action.
- Add `POST /v1/auth/logout` endpoint to clear the session cookie.
- Scope vaults by user/email so each login maps to its own local vault.
- Reduce vault unlock churn (idle timeout + OS keychain / WebAuthN unlock).

### Goals (Frontend Focus)

- Session-centric chat UI with pre-session gate and explicit end session flow.
- Passphrase onboarding gate with unrecoverable warning.
- Local storage + encryption (IndexedDB + WebCrypto).
- Conversational harness integration and deterministic context assembly.
- “Coach unavailable” UI state and privacy indicators.
- Client-to-API integration for auth and session metadata.
- Client-to-LLM calls (no server proxy) with privacy-first handling.

---

### Phase 5: Client Integration Plan

#### Step 1: Magic Link Request + Verify

**Status: ✅ Complete**

Wire the login flow to the Go API.

Tasks:

- [x] Call `POST /v1/auth/request-link` from `apps/web/app/login/page.tsx`.
- [x] Add a `/login` callback handler to exchange token via `POST /v1/auth/verify`.
- [x] Store session cookie (HTTP-only) implicitly; no client storage needed.
- [x] Ensure API fetches include `credentials: 'include'` for cookie auth.
- [x] Handle errors with friendly retry UX.

Files to modify/create:

- `apps/web/app/login/page.tsx`
- `apps/web/app/login/callback/page.tsx` (new)
- `apps/web/lib/api/auth.ts` (new)
- `apps/web/lib/api/client.ts` (new)

---

#### Step 2: Session Metadata Sync

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

Files to modify/create:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/api/sessions.ts` (new)
- `apps/web/lib/outbox/session-outbox.ts` (new)
- `apps/web/lib/db.ts`
- `apps/web/types/storage.ts`

---

#### Step 3: Client-to-LLM Calls (No Server Proxy)

**Status: ✅ Complete**

Call the LLM provider directly from the client while preserving privacy guarantees.

Tasks:

- [x] Route LLM calls directly from the browser (no API proxy).
- [x] Ensure only client-assembled context + user messages are sent.
- [x] BYOK MVP: prompt user for provider API key, store locally encrypted, and
      use it for LLM calls.
- [x] Add retry/backoff and “coach unavailable” handling for provider outages.
- [x] Avoid logging or persisting plaintext outside the local vault.

Files to modify/create:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/llm/client.ts` (new)
- `apps/web/lib/storage/dexie-storage.ts`
- `apps/web/lib/storage/index.ts`
- `apps/web/lib/db.ts`
- `apps/web/types/storage.ts`

---

## Previous Phases

| Phase | Status      | Description                               | Archive     |
| ----- | ----------- | ----------------------------------------- | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only)                   | `phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP            | `phase3.md` |
| 4     | ✅ Complete | Conversational spacing + context assembly | `phase4.md` |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm lint
pnpm --filter web test -- --run
```

### Web App Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web start
pnpm --filter web test -- --run
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.
