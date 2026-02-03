# MVP Implementation

Last Updated: 2026-02-03
Status: In Progress

---

## Plan

### 1. Repo & project scaffolding ✅

- Monorepo layout: `apps/web`, `apps/api`.
- Baseline tooling: TypeScript config, ESLint/Prettier, CI lint/test.
- Env management: `.env.example`, per-app env loading.

---

### 2. Web app MVP shell (Next.js + TS) ✅

_Completed in Frontend Phase 2_

- App shell with auth entry, pre-session gate, and chat UI.
- Passphrase onboarding gate before first session (with warning copy).
- Session spacing advisory UI (7-day rhythm, soft nudge).
- End Session UI + 24-hour auto-close handling.

---

### 3. Local storage + encryption ✅

_Completed in Frontend Phase 3_

- IndexedDB via Dexie with schema for transcripts/summaries/profile.
- WebCrypto AES-GCM + PBKDF2 (per spec).
- Storage service abstraction (browser now, desktop later).
- Encryption header format + versioning.

---

### 4. API / Go service ✅

_Completed in Backend Phase 5_

- Auth (magic link).
- Session timestamp recording (for sync/insights).
- Request ID propagation + OpenTelemetry.

---

### 5. Client + LLM Integration ✅

_Completed in Frontend Phase 5_

- Wire client auth/session flow to API (login, session start/end).
- Keep LLM calls client-to-provider (no server proxy).
- Add minimal API error handling + retry UX in the client.
- LLM proxy + policy layer (separate).

---

### 6. Conversational harness (core quality) ✅

_Core functionality complete — evaluation deferred to backlog_

- [x] Deterministic context assembly _(Frontend Phase 4)_
- [x] Summary generation + closure formatting _(Frontend Phase 5)_
- [ ] ~~Prompt versioning~~ → _Moved to backlog (Soon)_
- [ ] ~~Evaluation harness~~ → _Moved to backlog (Soon)_

---

### 7. Observability 🔶

_Backend complete — frontend in Phase 6_

- [x] Structured logs with trace IDs _(Backend Phase 5)_
- [x] OTel spans for session start/stop _(Backend Phase 5)_
- [ ] LLM call observability (latency, token usage, errors) → _Frontend Phase 6_

---

### 8. Tests & QA 🔶

_Core tests exist — E2E in Phase 6_

- [x] Unit tests: encryption, storage _(Frontend Phase 3)_
- [x] Integration tests: auth + gating _(Frontend Phase 5)_
- [ ] E2E smoke test: full session flow → _Frontend Phase 6_
- [ ] ~~Harness tests: context assembly~~ → _Moved to backlog (Soon)_
- [ ] ~~Harness tests: summary format~~ → _Moved to backlog (Soon)_

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Repo scaffolding | ✅ Complete |
| 2 | Web app shell | ✅ Complete |
| 3 | Local storage + encryption | ✅ Complete |
| 4 | API / Go service | ✅ Complete |
| 5 | Client + LLM Integration | ✅ Complete |
| 6 | Conversational harness | ✅ Complete (eval deferred) |
| 7 | Observability | 🔶 Phase 6 |
| 8 | Tests & QA | 🔶 Phase 6 |

**MVP Completion: ~90%** — Phase 6 (LLM observability + E2E test) completes MVP.
