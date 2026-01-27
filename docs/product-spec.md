# Lumen MVP Product Spec v0.1 (Locked)

Date: 2026-01-26
Status: Locked for MVP build-out

## Vision
Lumen offers weekly coaching that builds self-trust -- not dependence -- through sessions that are reflective, actionable, and deeply personal.

## Core Principles
- Autonomy by design: built-in spacing between sessions (7 days minimum).
- Persistent memory: the coach knows the user's story across sessions.
- Personalization: grounded in the user's influences and what resonates.
- Privacy: no training usage of user data; local-first with zero-knowledge encrypted sync in MVP.
- Action-first: momentum precedes reflection.
- Pattern recognition: naming loops and dynamics without over-indexing on advice.
- Challenge with care: hold users accountable when slipping.
- The lever: recognition, not prescriptions.

## MVP Scope
### Conversational Interface
- Web-based chat with an AI coach.
- Freeform sessions (not time-boxed) but that feel like 45-60 minutes.
- UI prompts user to set aside ~60 minutes before starting a session.
- Clear privacy line in the UI that sessions are stored locally and not used for training.
- Session ends when the user clicks End Session.
  - The assistant may offer a closure suggestion, but the user decides.
  - Auto-close if the session remains open for 24 hours.
- Explicit session-closure UX (e.g., "Ready to wrap?" prompt + End Session action).
- Primary product target is desktop, with a web app used as the MVP starting point.

### Intake and Ongoing Sessions
- First session starts off guided for intake.
- Subsequent sessions are dynamic and context-aware.
- Coach accounts for time and seasonal context (holidays, summer, etc.) if
  available.

### Session Spacing
- Hard constraint: next session cannot start until 7 days have passed.
- Enforced server-side.

### Privacy and Data Ownership
- Conversations are not used for model training.
- Default: data stored locally in the browser profile.
- Local encryption at rest for stored data.
- Passphrase required before first session for recovery.
- UX must warn users that the passphrase cannot be recovered; losing it means losing access to local data.
  - Suggested copy: "Only you can unlock your data. We can't recover this passphrase—lose it and your sessions are gone."
- Zero-knowledge encrypted sync (MVP): server stores ciphertext only; keys never leave the client.
- Offline-first: local data is the source of truth; sync happens when a network is available.
- Raw session transcripts are retained to allow re-summarization as models
  improve.

#### Privacy, Storage, and Sync (MVP)
- Local encrypted storage in the browser.
- Zero-knowledge encrypted sync (ciphertext only, no server-side plaintext).
- Passphrase required before first session.

## Memory (v0)
Goal: Keep memory simple, high-signal, and future-proof.

Golden path (no setup required):
- Raw session transcript (immutable)
- Session summary (short, actionable)
- User profile (minimal, stable, low-noise)

## AI Provider
- Primary provider: Opus 4.5
- Minimal provider abstraction in MVP to allow fallback later.
- Coach unavailable UI message when the model is down or unavailable.

## Vector Search / Retrieval
- Not required for MVP.
- Use rolling summaries and careful context selection within large model
  context windows.
- Plan to add embeddings later if needed.

## Conversational Harness (Best Practices)
As we build, incorporate best practices for conversational harnesses (or, more
likely, invent new best practices) with the intention to potentially open-source
this layer. This should draw from frontier-lab patterns (like coding harnesses) 
but adapted for coaching: context curation, memory hygiene, session closure 
behavior, and safety-aware governance.
- Treat the harness as product-critical: tests, prompt versioning, and deterministic context assembly.
  - Minimal evaluation harness for summaries and session-closure quality.

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
  - session spacing
  - model orchestration
  - governance/policy logic
  - observability scope -- specify what gets logged without violating privacy (timings, token counts, status, error class) and structured logs

---