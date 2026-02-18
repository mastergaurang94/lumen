# Lumen Backlog

Last Updated: 2026-02-18

Items NOT tracked in any active sprint plan. For MVP 3 items, see `mvp3.md`. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge.

---

## Now

_Empty_

---

## Soon

_Empty_

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
