# Lumen MVP Product Spec v0.1 (Locked)

Date: 2026-01-26
Status: Locked for MVP build-out

## Vision

A companion for the journey. Weekly conversations that walk you back to the world of living — restoring self-trust.

## Inspirations

- **"The Greatest Miracle in the World" by Og Mandino** — The ragpicker Simon Potter helps people see they are "part of the living dead" and guides them back to the world of the living. He sees value in what others have discarded — including people who have discarded themselves. The core insight: you don't teach people something new, you help them _remember_ who they truly are.

## Core Principles

- Autonomy by design: sessions are designed for a weekly rhythm, encouraged conversationally.
- Persistent memory: lumen knows the user's story across sessions.
- Personalization: grounded in the user's influences and what resonates.
- Privacy: no training usage of user data; local-first MVP with a path to zero-knowledge encrypted sync (v1.1).
- Action-first: momentum precedes reflection.
- Pattern recognition: naming loops and dynamics without over-indexing on advice.
- Challenge with care: hold users accountable when slipping.
- The lever: recognition, not prescriptions.

## MVP Scope

### Conversational Interface

- Web-based chat with an AI-powered companion.
- Freeform sessions (not time-boxed) but that feel like 45-60 minutes.
- UI prompts user to set aside ~60 minutes before starting a session.
- Clear privacy line in the UI that sessions are stored locally and not used for training.
- Session ends when the user clicks End Session.
  - The assistant may offer a closure suggestion, but the user decides.
- Explicit session-closure UX (e.g., "Ready to wrap?" prompt + End Session action).
- Primary product target is desktop, with a web app used as the MVP starting point.

### Intake and Ongoing Sessions

- First session starts off guided for intake.
- Subsequent sessions are dynamic and context-aware.
- Lumen accounts for time and seasonal context (holidays, summer, etc.) if
  available.

### Session Spacing

- Strong encouragement: sessions are designed for a 7-day rhythm.
- Enforced conversationally by lumen, not hard-blocked by the system.
- Lumen acknowledges early returns, gently redirects, and models healthy boundaries.
- If user insists on proceeding early, lumen may note the pattern but continues.

### Privacy and Data Ownership

- Conversations are not used for model training.
- Default: data stored locally in the browser profile.
- Local encryption at rest for stored data.
- Passphrase required before first session to unlock local data.
- UX must warn users that the passphrase cannot be recovered; losing it means losing access to local data.
  - Suggested copy: "Only you can unlock your data. We can't recover this passphrase—lose it and your sessions are gone."
- Raw session transcripts are retained to allow re-summarization as models
  improve.

#### Privacy, Storage, and Sync

- Local encrypted storage in the browser.
- Passphrase required before first session.
- Planned v1.1: zero-knowledge encrypted sync (ciphertext only, no server-side plaintext).

## Memory (v0)

Goal: Keep memory simple, high-signal, and future-proof.

Golden path (no setup required):

- Raw session transcript (immutable)
- Session summary (short, actionable)
- User profile (minimal, stable, low-noise)

## AI Provider

- Primary provider: Opus 4.5
- Minimal provider abstraction in MVP to allow fallback later.
- Lumen unavailable UI message when the model is down or unavailable.

## Vector Search / Retrieval

- Not required for MVP.
- Use rolling summaries and careful context selection within large model
  context windows.
- Plan to add embeddings later if needed.

## Conversational Harness (Best Practices)

As we build, incorporate best practices for conversational harnesses (or, more
likely, invent new best practices) with the intention to potentially open-source
this layer. This should draw from frontier-lab patterns (like coding harnesses)
but adapted for conversations: context curation, memory hygiene, session closure
behavior, and safety-aware governance.

- Treat the harness as product-critical: tests, prompt versioning, and deterministic context assembly.
  - Minimal evaluation harness for summaries and session-closure quality.

### Context Assembly (MVP)

- Model-aware context budgeting (default 200K window, 60K reserved for live session + system prompt).
- Prefer raw transcripts (up to 10 recent sessions) before falling back to summaries.
- Context preamble uses Markdown with YAML front matter metadata for clarity and determinism.

## Auth

- Email + magic link for MVP.
- Google/Apple as near-term additions.

## Tech Stack (MVP)

- Web: Next.js + React + TypeScript.
- Storage: IndexedDB via Dexie (encrypted with WebCrypto AES-GCM + PBKDF2).
- Storage abstraction layer to support browser storage now and desktop filesystem later.
- LLM: Opus 4.5.
- Backend: Go with policy/governance separated from proxy logic.

## Deployment

- Local-first data storage, minimal server footprint.
- Server responsibilities:
  - auth
  - session metadata recording (timestamps/insights, no blocking)
  - model orchestration
  - governance/policy logic
  - observability scope -- specify what gets logged without violating privacy (timings, token counts, status, error class) and structured logs

---
