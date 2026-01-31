# Frontend Implementation Plan

Last Updated: 2026-01-31

---

## Current Phase: Phase 5 — Backend Foundation (Auth + Session Metadata + LLM Proxy)

**Status: 🔄 Not Started**

### Running Updates

- 2026-01-31: Phase 5 plan drafted.

### In Progress / Next Up

- Step 1: API scaffolding + config.

### Goals

- Stand up a Go API with chi/v5 and versioned `/v1` routes.
- Add magic link auth foundations (request + verify endpoints).
- Record session metadata (start/end timestamps, transcript hash) with no transcripts stored server-side.
- Add an LLM proxy endpoint with a provider interface and policy layer separation.
- Propagate request IDs and add structured logs + OpenTelemetry hooks.

### Non-Goals (Phase 5)

- Server-side session spacing enforcement (conversational only).
- Server-side transcript or summary storage.
- Zero-knowledge sync.
- Full email deliverability hardening (DKIM/DMARC) beyond MVP.

### Constraints (Must Match Docs)

- No PII in logs; only timings, token counts, status, and error class.
- Metadata only: `session_id`, `user_id`, timestamps, `transcript_hash`.
- Keep API contracts versioned under `/v1`.
- Keep governance/policy logic separate from provider proxy logic.
- Magic link delivery can be stubbed in MVP (dev-only link capture), but prod requires a real provider.

### Progress Summary

| Step | Status | Notes                                        |
| ---- | ------ | -------------------------------------------- |
| 1    | ⬜     | API scaffolding + config                     |
| 2    | ⬜     | Magic link auth foundation                   |
| 3    | ⬜     | Session metadata endpoints + DB schema       |
| 4    | ⬜     | LLM proxy foundation + provider abstraction  |
| 5    | ⬜     | Observability (request IDs + OTel hooks)     |
| 6    | ⬜     | Integration tests for auth + sessions + LLM  |

---

### Step 1: API Scaffolding + Config

**Status: ⬜ Not Started**

Set up the Go service structure and core middleware.

Tasks:

- [ ] Create `/v1` router group with health endpoint (`GET /v1/health`).
- [ ] Add config loading (env + defaults) for API, DB, Redis, and provider keys.
- [ ] Add CORS config for the web app origin.
- [ ] Add request ID middleware (generate if missing, echo in response).
- [ ] Add JSON error helpers (consistent error envelope).

Files to modify/create:

- `apps/api/cmd/api/main.go`
- `apps/api/internal/server/router.go`
- `apps/api/internal/middleware/request_id.go`
- `apps/api/internal/config/config.go`

---

### Step 2: Magic Link Auth Foundation

**Status: ⬜ Not Started**

Implement minimal auth endpoints and token verification.

Tasks:

- [ ] `POST /v1/auth/request-link` to issue a login token.
- [ ] `POST /v1/auth/verify` to exchange token for a session.
- [ ] Store auth tokens with expiry; invalidate on use.
- [ ] Email provider stub (log link for now; swap in real provider later).
- [ ] Dev-only link capture (optional): return the magic link in response when `APP_ENV=development`.
- [ ] Issue a session cookie or JWT on verify (HTTP-only, short TTL).

Files to modify/create:

- `apps/api/internal/handlers/auth.go`
- `apps/api/internal/store/auth_tokens.go`
- `apps/api/internal/email/provider.go`

---

### Step 3: Session Metadata API + Schema

**Status: ⬜ Not Started**

Record session start/end without storing transcripts or summaries.

Tasks:

- [ ] Create DB table for `sessions` (ids + timestamps + transcript hash).
- [ ] `POST /v1/sessions/start` (record `started_at`).
- [ ] `POST /v1/sessions/end` (record `ended_at`, `transcript_hash`).
- [ ] Ensure auth context is required for session writes.

Files to modify/create:

- `apps/api/internal/store/sessions.go`
- `apps/api/internal/handlers/sessions.go`
- `apps/api/migrations/` (new migration)

---

### Step 4: LLM Proxy Foundation

**Status: ⬜ Not Started**

Add a proxy endpoint with provider abstraction and policy hook points.

Tasks:

- [ ] `POST /v1/llm/chat` endpoint.
- [ ] Provider interface + single provider implementation (Opus 4.5).
- [ ] Policy pre-check hook and response post-check hook (no-op for now).
- [ ] Forward request IDs to provider logs where possible.

Files to modify/create:

- `apps/api/internal/handlers/llm.go`
- `apps/api/internal/llm/provider.go`
- `apps/api/internal/llm/opus.go`
- `apps/api/internal/policy/policy.go`

---

### Step 5: Observability

**Status: ⬜ Not Started**

Add structured logs and OpenTelemetry hooks.

Tasks:

- [ ] Structured logging with request ID + route + status.
- [ ] OTel spans for session start/end and LLM calls.
- [ ] Ensure no PII is logged.

Files to modify/create:

- `apps/api/internal/observability/logger.go`
- `apps/api/internal/observability/otel.go`

---

### Step 6: Integration Tests

**Status: ⬜ Not Started**

Add smoke-level integration tests for the API.

Tasks:

- [ ] Auth request/verify flow tests.
- [ ] Session start/end API tests.
- [ ] LLM proxy test with stubbed provider.

Files to modify/create:

- `apps/api/internal/handlers/auth_test.go`
- `apps/api/internal/handlers/sessions_test.go`
- `apps/api/internal/handlers/llm_test.go`

---

## Previous Phases

| Phase | Status      | Description                                       | Archive     |
| ----- | ----------- | ------------------------------------------------- | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only)                           | `phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP                    | `phase3.md` |
| 4     | ✅ Complete | Conversational spacing + context assembly         | `phase4.md` |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm lint
pnpm --filter web test -- --run
```

### API Commands

```bash
cd apps/api && go run ./cmd/api
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.

### File Structure (Backend)

```
apps/api/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
│   ├── config/
│   ├── handlers/
│   ├── llm/
│   ├── middleware/
│   ├── observability/
│   ├── policy/
│   └── store/
└── migrations/
```
