# Backend Implementation Plan

Last Updated: 2026-01-31

---

## Current Phase: Phase 5 — Backend Foundation (Auth + Session Metadata + Observability)

**Status: 🔄 Not Started**

### Running Updates

- 2026-01-31: Backend plan split out from frontend plan.
- 2026-01-31: LLM proxy moved to Phase 4; observability promoted into Phase 5.
- 2026-02-02: Step 1 scaffolding completed (router, config, CORS, request IDs).
- 2026-02-02: Step 2 magic link auth foundation completed.

### In Progress / Next Up

- Step 3: Session metadata API + schema.

### Goals

- Stand up a Go API with chi/v5 and versioned `/v1` routes.
- Add magic link auth foundations (request + verify endpoints).
- Record session metadata (start/end timestamps, transcript hash) with no transcripts stored server-side.
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
- Magic link delivery can be stubbed in MVP (dev-only link capture), but prod requires a real provider.
- Auth must include rate limiting, single-use tokens, and secure session cookies.
- Transcript hash is a canonicalized hash of the session message list (no PII, no plaintext storage).

### Progress Summary

| Step | Status | Notes                                    |
| ---- | ------ | ---------------------------------------- |
| 1    | ✅     | API scaffolding + config                 |
| 2    | ✅     | Magic link auth foundation               |
| 3    | ⬜     | Session metadata endpoints + DB schema   |
| 4    | ⬜     | Observability (request IDs + OTel hooks) |
| 5    | ⬜     | Integration tests for auth + sessions    |

---

### Step 1: API Scaffolding + Config

**Status: ✅ Complete**

Set up the Go service structure and core middleware.

Tasks:

- [x] Create `/v1` router group with health endpoint (`GET /v1/health`).
- [x] Add config loading (env + defaults) for API, DB, Redis, and provider keys.
- [x] Add CORS config for the web app origin.
- [x] Add request ID middleware (generate if missing, echo in response).
- [x] Add JSON error helpers (consistent error envelope).

Files to modify/create:

- `apps/api/cmd/api/main.go`
- `apps/api/internal/server/router.go`
- `apps/api/internal/middleware/request_id.go`
- `apps/api/internal/config/config.go`

---

### Step 2: Magic Link Auth Foundation

**Status: ✅ Complete**

Implement minimal auth endpoints and token verification.

Tasks:

- [x] `POST /v1/auth/request-link` to issue a login token.
- [x] `POST /v1/auth/verify` to exchange token for a session.
- [x] Store auth tokens hashed (HMAC or bcrypt) with expiry; invalidate on use.
- [x] Rate limit by IP + email (per-minute and per-hour).
- [x] Session cookies: `HttpOnly`, `Secure`, `SameSite=Lax`, short TTL, rotation on login.
- [x] Explicitly log auth events without PII (token requests and verifies only).
- [x] Email provider stub (log link for now; swap in real provider later).
- [x] Dev-only link capture (optional): return the magic link in response when `APP_ENV=development`.
- [x] Issue a session cookie or JWT on verify (HTTP-only, short TTL).

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
- [ ] Define transcript hash contract (ordered message list, role+content, normalized whitespace).
- [ ] `POST /v1/sessions/start` (record `started_at`).
- [ ] `POST /v1/sessions/end` (record `ended_at`, `transcript_hash`).
- [ ] Ensure auth context is required for session writes.

Transcript hash contract (MVP):

- Canonical payload is an ordered list of messages.
- Each message string is: `${role}\n${normalized_content}`.
- `normalized_content` trims leading/trailing whitespace, converts `\r\n` to `\n`,
  and collapses multiple whitespace to a single space.
- Join messages with `\n---\n` and compute SHA-256 hex digest.
- Include system messages only if they are part of the stored session transcript
  (note this explicitly to avoid drift across clients).

Example (canonical payload string):

```
system
You are Lumen.
---
user
I want to feel calmer today.
---
assistant
Let's take a breath together.
```

Files to modify/create:

- `apps/api/internal/store/sessions.go`
- `apps/api/internal/handlers/sessions.go`
- `apps/api/migrations/` (new migration)

---

### Step 4: Observability

**Status: ⬜ Not Started**

Add structured logs and OpenTelemetry hooks.

Tasks:

- [ ] Structured logging with request ID + route + status.
- [ ] OTel spans for session start/end.
- [ ] Ensure no PII is logged.
- [ ] Define log schema fields (env, request_id, route, status, latency_ms).
- [ ] Default exporter: OTLP/HTTP to `OTEL_EXPORTER_OTLP_ENDPOINT` (no-op if unset).
- [ ] Sampling: default to parent-based 10% unless `OTEL_TRACES_SAMPLER` set.

Files to modify/create:

- `apps/api/internal/observability/logger.go`
- `apps/api/internal/observability/otel.go`

---

### Step 5: Integration Tests

**Status: ⬜ Not Started**

Add smoke-level integration tests for the API.

Tasks:

- [ ] Auth request/verify flow tests.
- [ ] Session start/end API tests.

Files to modify/create:

- `apps/api/internal/handlers/auth_test.go`
- `apps/api/internal/handlers/sessions_test.go`

---

## Previous Phases (Backend)

| Phase | Status      | Description          | Archive     |
| ----- | ----------- | -------------------- | ----------- |
| 4     | ✅ Complete | LLM proxy foundation | `phase4.md` |

Phase 4 LLM proxy requirements (for reference):

- Require auth for all LLM proxy calls.
- Validate request payload shape (model, messages, max tokens).
- Enforce per-user quotas and basic rate limiting.

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
