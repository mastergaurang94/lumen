# Lumen Backlog

Last Updated: 2026-02-18

Items NOT tracked in any active sprint plan. For MVP 3 items, see `mvp3.md`. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge.

---

## Now

_Empty_

---

## Soon

### Auth

- [ ] `[M]` **Investigate magic link cross-device issue**: Magic links sent via Resend don't work when opened on a different device/browser than the one that initiated the auth flow (link says "expired"). Discovered during Meg's in-person test — email arrived on phone, copied link to desktop, failed. Investigate whether the session token or cookie is device-bound. At minimum, provide clear UX guidance ("open on the same device"). Ideally, magic links should work cross-device. See `docs/feedback/2026-02-18-meg-in-person.md`.

### Session Closure

- [ ] `[M]` **Natural session wrap-up — surface closure at the right moment**: Users don't click the wrap-up button, which means they miss the best part of the experience (parting words, "what opened," the notebook). The closure content is a goldmine, but it's gated behind a manual action that feels like an interruption. Need a way to wrap up that feels natural and not premature. Options: (a) Lumen detects a natural ending in the conversation and suggests closing ("This feels like a good place to pause — want me to wrap up our session?"), (b) a gentle visual nudge surfaces at the bottom of the chat after conversational signals (farewell language, gratitude, energy dropping), (c) time-based hint after 15-20+ minutes of conversation, (d) Lumen's closing message itself triggers the closure flow automatically. The key constraint: it must feel _natural_, not robotic or early. Users should feel like the session concluded, not that it was cut off. See `docs/feedback/2026-02-18-meg-in-person.md`.

### Onboarding

- [ ] `[M]` **Improve onboarding for non-technical users**: Current flow assumes comfort with email auth + passphrase creation. A 55-year-old first-time AI user needed hand-holding through every step. Consider: simpler language, fewer steps before first chat, guided walkthrough, optional passphrase (defer to Keychain/device-level security on desktop), and gentle hints about how to talk to Lumen (e.g., "it's okay to say 'I don't know'"). See `docs/feedback/2026-02-18-meg-in-person.md`.

---

## Later

Longer-term features beyond MVP 3.

### LLM Integration

- [ ] `[L]` **Client-side model orchestration**: Policy enforcement entirely on client; no server-side plaintext handling.
- [ ] `[M]` **Fallback provider abstraction**: Graceful failover between LLM providers on outage.

### Mentoring

- [ ] `[L]` **Individual mentor mode**: Per-mentor voices (one perspective each) alongside unified Lumen. Each mentor gets their own voice/style wrapper around a single perspective domain. Includes: `buildSystemPrompt()` mode parameter (unified vs. individual), mentor selection UI, session tagging by mentor type for context assembly, domain-specific tracking instructions, depth escalation across sessions. Source prompts at `~/Documents/conversations/mentoring-prompts/`. Unified voice quality comes first.

### Memory

- [ ] `[L]` **Retrieval layer (embeddings)**: Long-horizon context via semantic search over session history. Not needed until context window is consistently full (100+ sessions with large transcripts).

### Harness

- [ ] `[M]` **Async Arc update after closure**: Decouple Arc generation from blocking closure UI. End session after notebook save, then enqueue Arc create/update in background (retryable outbox/worker) with a lightweight "reflection still finalizing" state.
- [ ] `[M]` **Context compaction**: Compress older notebooks and transcripts to fit more history in token budget. Relevant once users accumulate 100+ sessions.
- [ ] `[M]` **Priority weighting**: Boost commitments, recurring themes, recognition moments in context assembly.
- [ ] `[M]` **Hallucination guards for memory**: Cite source session when recalling facts; flag uncertain memories.

### Trust & Safety

- [ ] `[M]` **Define boundaries and governance**: Clear non-therapeutic positioning in product and prompts. Includes guardrails for sensitive topics. Reference resources and escalation guidance when distress detected. (Basic safety already in system prompt v2 §2.8.)

### Observability

- [ ] `[L]` **Iterative self-improvement feedback**: In-conversation feedback mechanism (e.g., 0-3 rating at random points) so users can signal how Lumen is doing. Challenge: conversations are encrypted client-side, so server-side analysis isn't possible. Needs a privacy-preserving approach — possibly aggregate scalar signals only.
- [ ] `[M]` **Privacy-preserving session insights endpoint**: `POST /v1/session-insights` for aggregate learning without PII.
  - _Collect: session duration bucket, days since last session, turn count, closure type, optional user rating, action step count._
  - _No plaintext content; purely metadata for product analytics._
- [ ] `[S]` **Wire client analytics events to session insights endpoint**: Send share/copy events with safe scalar properties.

### CLI

- [ ] `[M]` **CLI entry point**: Terminal-based interface for Lumen conversations. Enables power users and developers to interact with Lumen from the command line.

---

## Notes

- **Dependencies** are noted inline with _Depends on:_ markers.
- Items may move between tiers as priorities shift.
- **Completion tracking**:
  - Items done directly from backlog → Log in `done/backlog.md`, remove from this file.
  - Items that grow into full sprints → Create a new `mvp*.md` plan, archive in `done/` when complete.
  - Items moved into MVP plans → Remove from this file (MVP plan is the source of truth).
- **Phase plan templates**: See `done/frontend-plan-template.md` and `done/backend-plan-template.md` for the phase-based pattern used during MVP 1.
