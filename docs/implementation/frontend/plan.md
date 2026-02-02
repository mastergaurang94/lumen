# Frontend Implementation Plan

Last Updated: 2026-01-31

---

## Current Phase: Phase 5 — Client Integration (Auth + Session Metadata)

**Status: ⬜ Not Started**

### Running Updates

- 2026-01-31: Backend plan moved to `docs/implementation/backend/plan.md`.
- 2026-02-02: Phase 5 drafted for client integration.

### In Progress / Next Up

- Step 1: Wire login to the magic link API.

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

**Status: ⬜ Not Started**

Wire the login flow to the Go API.

Tasks:

- [ ] Call `POST /v1/auth/request-link` from `apps/web/app/login/page.tsx`.
- [ ] Add a `/login` callback handler to exchange token via `POST /v1/auth/verify`.
- [ ] Store session cookie (HTTP-only) implicitly; no client storage needed.
- [ ] Ensure API fetches include `credentials: 'include'` for cookie auth.
- [ ] Handle errors with friendly retry UX.

Files to modify/create:

- `apps/web/app/login/page.tsx`
- `apps/web/app/login/callback/page.tsx` (new)
- `apps/web/lib/api/auth.ts` (new)

---

#### Step 2: Session Metadata Sync

**Status: ⬜ Not Started**

Send start/end metadata to the API while keeping transcripts local.

Tasks:

- [ ] On session start, call `POST /v1/sessions/start` with `session_id`.
- [ ] On session end, call `POST /v1/sessions/end` with `session_id` + `transcript_hash`
      (SHA-256 over `serialize(encryption_header) || encrypted_blob`).
- [ ] Ensure calls do not include plaintext transcript content.
- [ ] Retry on transient errors with backoff (UI should remain usable).
- [ ] Add a lightweight client "outbox" queue (IndexedDB) for pending start/end
      events and flush on reconnect/app start.

Files to modify/create:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/api/sessions.ts` (new)
- `apps/web/lib/api/client.ts` (new)

---

#### Step 3: Client-to-LLM Calls (No Server Proxy)

**Status: ⬜ Not Started**

Call the LLM provider directly from the client while preserving privacy guarantees.

Tasks:

- [ ] Route LLM calls directly from the browser (no API proxy).
- [ ] Ensure only client-assembled context + user messages are sent.
- [ ] BYOK MVP: prompt user for provider API key, store locally encrypted, and
      use it for LLM calls.
- [ ] Add retry/backoff and “coach unavailable” handling for provider outages.
- [ ] Avoid logging or persisting plaintext outside the local vault.

Files to modify/create:

- `apps/web/app/chat/page.tsx`
- `apps/web/lib/llm/client.ts` (new)

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
