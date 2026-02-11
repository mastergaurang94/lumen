# Lumen Backlog

Last Updated: 2026-02-10

Items are organized by time horizon (Now → Soon → Later) and category. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge. Items tagged `MVP 3` are candidates for the next milestone. Items in the current sprint are tracked in `mvp2.md`.

---

## Now

_Empty — all current work tracked in `mvp2.md`._

---

## Soon

Near-term improvements.

### Harness

- [ ] `[S]` **Prompt versioning**: Track prompt changes for reproducibility. Correlate prompt versions with quality shifts.
- [ ] `[M]` **Evaluation harness**: Minimal tooling to assess summary and closure quality. Define rubric or golden outputs for comparison.
- [ ] `[M]` **Harness tests**: Deterministic context assembly verification and summary format validation.

### Observability

- [ ] `[M]` **Privacy-preserving session insights endpoint**: `POST /v1/session-insights` for aggregate learning without PII.
  - _Collect: session duration bucket, days since last session, turn count, closure type, optional user rating, action step count._
  - _No plaintext content; purely metadata for product analytics._
- [ ] `[S]` **Wire client analytics events to session insights endpoint**: send share/copy events with safe scalar properties.

### Design

- [ ] `[M]` **Theme iteration**: Current dawn/dusk/afternoon palettes need refinement. Incorporate more atmospheric elements like OmmWriter — richer backgrounds, subtle textures, more immersive feel.

---

## Later

Longer-term features that expand Lumen's capabilities.

### LLM Integration

- [ ] `[L]` **Client-side model orchestration**: Policy enforcement entirely on client; no server-side plaintext handling.
- [ ] `[L]` **Provider auth + billing options**: `MVP 3`
  - _Monetizable path_: Hosted token broker that swaps user auth for scoped API tokens (server-held provider keys; billing/quotas enforced server-side). Includes ephemeral, short-lived, scope-limited tokens for LLM auth.
  - _Power-user path_: Continue supporting BYOK API keys as alternative.
- [ ] `[M]` **Fallback provider abstraction**: Graceful failover between LLM providers on outage.

### Sync & Export

- [ ] `[L]` **Zero-knowledge encrypted sync**: Ciphertext-only server storage enabling multi-device access. `MVP 3`
  - Client sync queue for encrypted blobs (push/pull).
  - Server endpoints: upload/download ciphertext + metadata.
  - Server stores only ciphertext and headers (no plaintext).
  - Conflict strategy: last-write-wins (v1.1).
  - _Includes multi-device edit resolution — merge strategy (LWW vs CRDT vs user prompts on conflict)._

### Memory

- [ ] `[L]` **Pattern index**: Track loops and dynamics across sessions for lumen awareness.
- [ ] `[M]` **Commitments tracker**: Log commitments with outcomes; surface in context when relevant.
- [ ] `[S]` **Recognition moment index**: Quick recall of past recognition moments for reinforcement.
- [ ] `[L]` **Retrieval layer (embeddings)**: Long-horizon context via semantic search over session history.

### Harness

- [ ] `[M]` **Context and summary compaction**: Compress older context and merge old summaries to fit more history in token budget. Less urgent with 1M context window (Opus 4.6) — relevant once users accumulate 100+ sessions.
- [ ] `[L]` **Topic-based retrieval or thread pinning**: Long-horizon continuity for specific themes.
- [ ] `[M]` **Priority weighting**: Boost commitments, recurring themes, recognition moments in context assembly.
- [ ] `[S]` **Session boundary validation**: Avoid accidental context carryover between sessions.
- [ ] `[M]` **Hallucination guards for memory**: Cite source session when recalling facts; flag uncertain memories.

### Harness Evaluation

- [ ] `[M]` **Define evaluation flow and rubric**: Summary quality, closure quality, context assembly correctness.
- [ ] `[S]` **Decide eval infrastructure**: Local vs CI; how results are stored and compared.
- [ ] `[M]` **Deterministic replay fixtures**: Golden outputs for regression testing harness changes.

### Trust & Safety

- [ ] `[M]` **Define boundaries and governance**: Clear non-therapeutic positioning in product and prompts. Includes guardrails for sensitive topics.
- [ ] `[L]` **Crisis UX**: Immediate resources and escalation guidance when distress detected.

### Prompt Security

- [ ] `[M]` **System prompt protection**: Prevent system prompt leakage in production. Remove from public GitHub (move to env/secrets), strip from client-visible payloads, and add prompt-level instruction for Lumen to not reveal system prompt contents. The mentoring philosophy and prompt architecture is core IP.

### Voice

- [ ] `[M]` **Voice input (speech-to-text)**: Native microphone input in chat UI. Browser Web Speech API for web; native STT for desktop wrapper. Reduces friction for users who prefer talking over typing. `MVP 3`

### Desktop & Sync

- [ ] `[L]` **Tauri desktop wrapper**: Native app shell enabling local filesystem vault, CLI/tool-calling extensibility, and foundation for zero-knowledge sync. `MVP 3`
  - _Enables: zero-knowledge sync, local file storage, voice integration._
  - [ ] `[M]` OS keychain / WebAuthn vault unlock (complements idle timeout from MVP 2).

### CLI

- [ ] `[M]` **CLI entry point**: Terminal-based interface for Lumen conversations. Enables power users and developers to interact with Lumen from the command line. Natural fit with Tauri desktop wrapper and OpenClaw plugin distribution.

---

## Notes

- **Dependencies** are noted inline with _Depends on:_ markers.
- **Backend tasks** are marked; coordinate with `backend-plan.md`.
- Items may move between tiers as priorities shift.
- **Completion tracking**:
  - Items done directly from backlog → Log in `done/backlog.md`, remove from this file.
  - Items that grow into full phases → Move to `frontend-plan.md` or `backend-plan.md`, archive in their `done/` docs.
  - Items moved into MVP plans → Track in the respective `mvp*.md` doc.
