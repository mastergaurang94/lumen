# Lumen Backlog

Last Updated: 2026-02-16

Items are organized by time horizon (Now → Soon → Later) and category. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge. Items tagged `MVP 3` are candidates for the next milestone. Items in the current sprint are tracked in `mvp2.md`.

---

## Now

_Empty — all current work tracked in `mvp2.md`._

---

## Soon

Near-term improvements.

### Storage

- [ ] `[S]` **Remove legacy sessionSummaries schema**: Drop Dexie v1 `sessionSummaries` table and related code (`parseSummaryResponse`, `SessionSummary` type, `getSummary`/`saveSummary`/`listSummaries` storage methods). Replaced by `sessionNotebooks` + `userArcs` in v2. Wait until no users have legacy-only data (or provide a one-time migration).

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
- [ ] `[S]` **Base text + icon scale pass**: Increase body text and icon sizing across chat/auth/sidebar surfaces as part of the same atmospheric polish pass, keeping touch targets comfortable and proportions consistent.

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
- [ ] `[M]` **Passphrase recovery mechanism**: Deferred from MVP 2 (`3.3`). Pull this forward when opening to broader beta or once testers accumulate meaningful multi-week history.
  - _Problem_: If a tester forgets their passphrase, their entire conversation history is permanently inaccessible. The unlock page already warns about this ("It can't be recovered yet"), and the setup page has a prominent warning.
  - _Prior art_: LastPass and Obsidian both generate a recovery key at setup time that the user stores offline.
  - _Code refs_: `apps/web/app/setup/page.tsx` (vault initialization, passphrase setup), `apps/web/lib/crypto.ts` (key derivation), `apps/web/app/unlock/page.tsx` (unlock flow).
  - _Approach_:
    - At setup: After deriving the encryption key from the passphrase, generate a random recovery key (e.g., 24-word mnemonic or base64 string). Encrypt the derived key with the recovery key and store the encrypted blob alongside the vault metadata.
    - Show once: Display the recovery key to the user with clear instructions: "Save this somewhere safe. It's the only way to recover your vault if you forget your passphrase." Require acknowledgment (checkbox: "I've saved my recovery key") before proceeding.
    - On recovery: Add a "Forgot passphrase?" link on the unlock page. User enters recovery key -> decrypts the stored key blob -> vault unlocks -> user sets a new passphrase.
    - No server involvement: Recovery key is generated and used entirely client-side.
  - _UX note_: The recovery key display should feel important but not scary. Frame it as empowerment: "This is your backup key. Keep it somewhere safe - a password manager, a note in your desk, wherever you won't lose it."

### Mentoring

- [ ] `[L]` **Individual mentor mode**: `MVP 3` — Per-mentor voices (one perspective each) alongside unified Lumen. Each mentor gets their own voice/style wrapper around a single perspective domain. Includes: `buildSystemPrompt()` mode parameter (unified vs. individual), mentor selection UI, session tagging by mentor type for context assembly, domain-specific tracking instructions, depth escalation across sessions. Source prompts at `~/Documents/conversations/mentoring-prompts/`. Deferred from MVP 2 (`2.9`) — unified voice quality comes first.

### Memory

- [ ] `[L]` **Pattern index**: Track loops and dynamics across sessions for lumen awareness.
- [ ] `[M]` **Commitments tracker**: Log commitments with outcomes; surface in context when relevant.
- [ ] `[S]` **Recognition moment index**: Quick recall of past recognition moments for reinforcement.
- [ ] `[L]` **Retrieval layer (embeddings)**: Long-horizon context via semantic search over session history.

### Harness

- [ ] `[M]` **Context compaction**: Compress older notebooks and transcripts to fit more history in token budget. Less urgent with notebook/arc system (200K window handles 50+ sessions comfortably) — relevant once users accumulate 100+ sessions.
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
- **Backend tasks** are marked; coordinate with active sprint plan.
- Items may move between tiers as priorities shift.
- **Completion tracking**:
  - Items done directly from backlog → Log in `done/backlog.md`, remove from this file.
  - Items that grow into full sprints → Create a new `mvp*.md` plan, archive in `done/` when complete.
  - Items moved into MVP plans → Track in the respective `mvp*.md` doc.
- **Phase plan templates**: See `done/frontend-plan-template.md` and `done/backend-plan-template.md` for the phase-based pattern used during MVP 1.
