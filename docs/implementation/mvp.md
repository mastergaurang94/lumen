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

### 6. Conversational harness (core quality) 🔶

_Partially complete — needs evaluation harness_

- [x] Deterministic context assembly _(Frontend Phase 4)_
- [x] Summary generation + closure formatting _(Frontend Phase 5)_
- [ ] Prompt versioning (track prompt changes for reproducibility)
- [ ] Minimal evaluation harness for summary/closure quality

---

### 7. Observability 🔶

_Backend complete — frontend minimal_

- [x] Structured logs with trace IDs _(Backend Phase 5)_
- [x] OTel spans for session start/stop _(Backend Phase 5)_
- [ ] Frontend error tracking / observability (optional for MVP?)
- [ ] LLM call observability (latency, token usage, errors)

---

### 8. Tests & QA 🔶

_Core tests exist — harness tests needed_

- [x] Unit tests: encryption, storage _(Frontend Phase 3)_
- [x] Integration tests: auth + gating _(Frontend Phase 5)_
- [ ] Harness tests: deterministic context assembly verification
- [ ] Harness tests: summary format validation
- [ ] E2E smoke test: full session flow

---

## Summary

| Step | Description | Status |
|------|-------------|--------|
| 1 | Repo scaffolding | ✅ Complete |
| 2 | Web app shell | ✅ Complete |
| 3 | Local storage + encryption | ✅ Complete |
| 4 | API / Go service | ✅ Complete |
| 5 | Client + LLM Integration | ✅ Complete |
| 6 | Conversational harness | 🔶 Partial |
| 7 | Observability | 🔶 Partial |
| 8 | Tests & QA | 🔶 Partial |

**MVP Completion: ~75%** — Steps 6-8 have remaining items before MVP is shippable.
