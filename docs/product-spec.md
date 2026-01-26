# Lumen MVP Product Spec v0.1 (Locked)

Date: 2026-01-26
Status: Locked for MVP build-out

## Vision
Lumen offers weekly coaching that builds self-trust -- not dependence -- through sessions that are reflective, actionable, and deeply personal.

## Core Principles
- Autonomy by design: built-in spacing between sessions (7 days minimum).
- Persistent memory: the coach knows the user's story across sessions.
- Personalization: grounded in the user's influences and what resonates.
- Privacy: no training usage of user data; local-first storage.
- Action-first: momentum precedes reflection.
- Pattern recognition: naming loops and dynamics without over-indexing on advice.
- Challenge with care: hold users accountable when slipping.
- The lever: recognition, not prescriptions.

## MVP Scope
### Conversational Interface
- Web-based chat with an AI coach.
- Freeform sessions (not time-boxed) but that feel like 45-60 minutes.
- Clear privacy line in the UI that sessions are stored locally and not used for training.
- Coach senses when a session is complete and closes with:
  - summary
  - closing words
  - action steps (if any)

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
- Raw session transcripts are retained to allow re-summarization as models
  improve.
- User control features (export, delete, forget) are planned post-MVP.

## Memory (v0)
Goal: Keep memory simple, high-signal, and future-proof.

Golden path (no setup required):
- Raw session transcript (immutable)
- Session summary (short, actionable)
- User profile (minimal, stable, low-noise)

Planned later (optional):
- Patterns and loops
- Commitments and outcomes
- Moments of recognition index

## AI Provider
- Primary provider: Opus 4.5
- Model optionality is important long-term, but not expanded in MVP.

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

## Auth
- Email + magic link for MVP.
- Google/Apple as near-term additions.

## Tech Stack (MVP)
- Web: Next.js + React + TypeScript.
- Storage: IndexedDB (encrypted with WebCrypto AES-GCM + PBKDF2).
- LLM: Opus 4.5.
- Backend: Go with policy/governance separated from proxy logic.


## Deployment
- Local-first data storage, minimal server footprint.
- Server responsibilities:
  - auth
  - session spacing
  - model orchestration
  - governance/policy logic

---

## Post-MVP (Planned)
- Desktop wrapper to enable native filesystem access.
- Export/import for cross-browser and device portability.
- User-held-key backups for privacy-max storage.

## Reflection: Are We Building the Right Thing, the Right Way?

This spec is oriented around the core promise: recognition that changes the
user's footing. The MVP keeps the surface area small while protecting the
essentials:

- We are prioritizing safety and privacy (local-first, no training use) which
  enables vulnerability and honest coaching.
- We are preserving raw transcripts, which is crucial for future upgrades and
  preventing rework as models improve.
- We are resisting premature taxonomy decisions, keeping the memory model
  minimal while still delivering personalization through summaries and a
  lightweight profile.
- We are enforcing autonomy structurally with a 7-day cadence, rather than
  relying on user discipline.
- We are designing a conversational harness that can scale in quality without
  locking into vector infrastructure early.

Risks to watch:
- The coach's ability to recognize "session complete" may vary; needs
  calibration in the system prompt and careful UX cues.
- Local-first storage will complicate multi-device support; this should be a
  deliberate tradeoff for MVP.
- Opus 4.5 quality is central; if model quality degrades or access is limited,
  we need a fallback plan.

Overall: This is the right product direction and the right build strategy for
an MVP. It balances depth with simplicity and sets a clean path for future
expansion without compromising the core coaching experience.
