# Architecture v0 (MVP)

Date: 2026-01-26
Status: Draft (MVP)

## Goals
- Browser-first, local-first data storage.
- Simple, production-ready separation of concerns.
- Enforce 7-day session spacing.
- Maintain privacy (no training use).

## Components
- **Web App (Next.js + React + TS)**
  - Chat UI, session gating UX, summaries.
  - Local storage via IndexedDB (encrypted with WebCrypto AES-GCM + PBKDF2).
  - Context assembly for model calls (per harness flow).

- **Go Service (API + Governance)**
  - Auth (email magic link).
  - Session spacing enforcement.
  - LLM proxy + policy layer (separate from governance logic).
  - OpenTelemetry hooks for traceability.

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
- No server-side storage of transcripts or summaries.
- Explicit UI line for privacy and local storage.

## Observability
- OpenTelemetry spans for:
  - session start/stop
  - LLM calls
  - governance decisions

## Constraints
- No cross-device sync in MVP.
- No export/import in MVP.

## Governance (MVP)
- Keep governance minimal in MVP; enforce cadence and routing only.
- Safety, prompt constraints, privacy policy enforcement, and feature flags live in system prompts for now.
