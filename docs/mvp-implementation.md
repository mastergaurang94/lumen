# MVP Implementation

Date: 2026-01-27
Status: Draft

## Plan

1. Repo & project scaffolding

- Monorepo layout: `apps/web`, `apps/api`.
- Baseline tooling: TypeScript config, ESLint/Prettier, CI lint/test.
- Env management: `.env.example`, per-app env loading.

2. Web app MVP shell (Next.js + TS)

- App shell with auth entry, pre-session gate, and chat UI.
- Passphrase onboarding gate before first session (with warning copy).
- Session gating UI (7-day restriction).
- End Session UI + 24-hour auto-close handling.

3. Local storage + encryption

- IndexedDB via Dexie with schema for transcripts/summaries/profile.
- WebCrypto AES-GCM + PBKDF2 (per spec).
- Storage service abstraction (browser now, desktop later).
- Encryption header format + versioning.

4. API / Go service

- Auth (magic link).
- Session spacing enforcement (7-day gate).
- LLM proxy + policy layer (separate).
- Request ID propagation + OpenTelemetry.

5. Conversational harness (core quality)

- Deterministic context assembly.
- Prompt versioning.
- Summary generation + closure formatting (incl. next-session cue).
- Minimal evaluation harness for summary/closure.

6. System prompts + UX copy

- Align prompts with “user ends session.”
- Privacy copy + passphrase warnings.
- “Coach unavailable” UI state.

7. Observability

- Structured logs with trace IDs.
- OTel spans for session start/stop, LLM calls, sync, gating.

8. Tests & QA

- Unit tests: encryption, storage, sync queue.
- Harness tests: deterministic context assembly + summary format.
- Integration tests: auth + gating.

## Post-MVP (v1.1)

- Zero-knowledge encrypted sync:
  - Client sync queue for encrypted blobs (push/pull).
  - Server endpoints: upload/download ciphertext + metadata.
  - Server stores only ciphertext and headers (no plaintext).
  - Conflict strategy: last-write-wins (v1.1).
