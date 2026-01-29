# Architecture v0 (MVP)

Date: 2026-01-26
Status: Draft (MVP)

## Goals

- Browser-first, local-first data storage (MVP) with a path to zero-knowledge encrypted sync.
- Simple, production-ready separation of concerns.
- Enforce 7-day session spacing.
- Maintain privacy (no training use).

## Components

- **Web App (Next.js + React + TS)**
  - Chat UI, session gating UX, summaries.
  - Pre-session UI prompt to set aside ~60 minutes.
  - Explicit session-closure UX (e.g., "Ready to wrap?" prompt + End Session action).
  - Local storage via IndexedDB + Dexie (encrypted with WebCrypto AES-GCM + PBKDF2).
  - Context assembly for model calls (per harness flow).
  - Coach unavailable UI state for model outages.

- **Go Service (API + Governance)**
  - Auth (email magic link).
  - Session spacing enforcement.
  - LLM proxy + policy layer (separate from governance logic).
  - Provider abstraction (single provider now, fallback-ready interface).
  - API versioning (e.g., `/v1`) for stable client-server contracts.
  - Request ID propagation across web app, API, and LLM calls.
  - OpenTelemetry hooks for traceability.
  - Structured logs with trace IDs; observability scope.

- **Redis**
  - Session gating state and rate-limits.

- **Postgres**
  - Minimal user metadata (auth, session timestamps).
  - Session metadata only: session_id, user_id, started_at, ended_at, transcript hash.
  - No transcripts or summaries stored server-side.

## Data Flow

1. User authenticates via magic link.
2. Web app checks session eligibility (7-day gate via Go service).
3. Web app loads local memory and builds context.
4. Web app sends prompt + context to Go service.
5. Go service applies governance/policy, forwards to LLM.
6. Response returns to web app; transcript + summary stored locally.

## Security Notes

- Client-side encryption for local storage.
  - KDF: PBKDF2-HMAC-SHA256 with 16+ byte salt and ~600k iterations (tuned by performance tests).
  - Cipher: AES-GCM with a unique 96-bit (12-byte) IV per encryption.
  - Store encryption header (kdf params, salt, iv, version) with each encrypted blob.
  - Key rotation: versioned KDF params; re-encrypt all local records when version changes.
- Transcript hash computed client-side over the encrypted blob + encryption header.
- No server-side storage of transcripts or summaries.
- Explicit UI line for privacy and local storage.
- Passphrase required before first session to unlock local data.

## Observability

- OpenTelemetry spans for:
  - session start/stop
  - client-side context assembly
  - LLM calls
  - governance decisions
  - session closure decisions
  - session gating responses
  - model unavailability events
  - evaluation harness runs (summary + closure checks)

## Governance (MVP)

- Keep governance minimal in MVP; enforce cadence and routing only.
- Safety, prompt constraints, privacy policy enforcement, and feature flags live in system prompts for now.
