# Lumen Backlog

Last Updated: 2026-02-06

Items are organized by time horizon (Now → Soon → Later) and category. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge. Status: `🔄` = in progress (check before starting).

---

## Now (Bugs & Polish)

Immediate fixes and polish to ship a solid MVP.

### LLM Integration

- [ ] `[S]` **Opening system prompt tone**: Make the opening system prompt less formulaic and more conversational/welcoming to avoid sounding overly AI-like.

### Auth & Session

_No open items._

### UX

- [ ] `[S]` **First Lumen message renders twice briefly**: When the chat UI opens and Lumen sends the initial message, it appears duplicated for a split second before resolving to one. Likely a React state/render race condition.
  - _Code ref: `apps/web/app/chat/page.tsx` or `apps/web/lib/hooks/use-llm-conversation.ts`_
- [ ] `[S]` **Streaming text pushes content upward**: While streaming, the response text shifts upward, making it hard to read in-progress. Stabilize the viewport so the user can comfortably read as tokens arrive.
- [ ] `[M]` **Lumen message scroll behavior**: When a Lumen message appears, auto-scroll so the message is prominent (top 2/3 of viewport). Add sufficient whitespace below the last Lumen message so input field doesn't obscure it as user types longer responses.

  <details>
  <summary>Implementation prompt</summary>

  As more text fills the input, it covers the message from Lumen. Add whitespace or scroll the page down so that when a Lumen message appears, it scrolls down and puts that message as the only message visible on screen. There should be enough whitespace after the last Lumen message (even after scrolling to the bottom of a long one) so that it only takes up ~2/3 of the page. The remaining whitespace at the bottom is intentional breathing room.

  </details>

- [ ] `[M]` **Session closure progress steps**: The "Wrapping up..." screen feels stuck because it doesn't show what's happening. Add animated step transitions to show progress through the closure flow:
  1. "Wrapping up your conversation..."
  2. "Storing locally..." (encryption is fast — AES-GCM is hardware-accelerated, key already derived)
  3. "Reflecting on what we discussed..." (LLM summary call — **this is the slow step**)
  4. Final state with parting words

  Transitions should feel smooth and purposeful. The third step will take longest since it's waiting on LLM inference.
  - _Code ref: `apps/web/app/chat/page.tsx:253-304`, `apps/web/components/chat/session-closure.tsx`_

### Sync & Export

- [ ] `[M]` **View past session transcripts**: Users should be able to review their own conversation history. It's their data. Add a session history view with decrypted transcript display.
- [ ] `[M]` **Export/import for recovery**: User-facing backup and restore of encrypted vault.

---

## Soon (Post-MVP)

Near-term improvements after MVP is complete.

### Harness

- [ ] `[S]` **Prompt versioning**: Track prompt changes for reproducibility. Correlate prompt versions with quality shifts.
- [ ] `[M]` **Evaluation harness**: Minimal tooling to assess summary and closure quality. Define rubric or golden outputs for comparison.
- [ ] `[M]` **Harness tests**: Deterministic context assembly verification and summary format validation.

### Vault & Security

- [ ] `[M]` **Scope vaults by user/email**: Each login should map to its own local vault, preventing data bleed between accounts on shared devices.
- [ ] `[M]` **Reduce vault unlock churn**: Idle timeout + OS keychain / WebAuthn unlock to avoid repeated passphrase entry.
  - _Desktop focus; may require native wrapper for keychain access._
- [ ] `[M]` **Passphrase recovery mechanism**: Generate recovery key at setup, stored offline by user. Enables vault recovery if passphrase forgotten.

### Auth & Session

- [ ] `[M]` **Move auth/session storage to DB/Redis**: Tokens, sessions, and rate limits currently in-memory; move to persistent store for multi-instance deployment.
  - _Backend task_

### Observability

- [ ] `[M]` **Privacy-preserving session insights endpoint**: `POST /v1/session-insights` for aggregate learning without PII.
  - _Collect: session duration bucket, days since last session, turn count, closure type, optional user rating, action step count._
  - _No plaintext content; purely metadata for product analytics._
- [ ] `[S]` **Wire client analytics events to session insights endpoint**: send share/copy events with safe scalar properties.

### Design

- [ ] `[M]` **Theme iteration**: Current dawn/dusk/afternoon palettes need refinement. Incorporate more atmospheric elements like OmmWriter — richer backgrounds, subtle textures, more immersive feel.

---

## Later (Post-MVP Vision)

Longer-term features that expand Lumen's capabilities.

### LLM Integration

- [ ] `[L]` **Client-side model orchestration**: Policy enforcement entirely on client; no server-side plaintext handling.
- [ ] `[L]` **Ephemeral token broker**: Short-lived, scope-limited tokens for LLM auth instead of raw API keys.
- [ ] `[L]` **Provider auth + billing options**:
  - _Monetizable path_: Hosted token broker that swaps user auth for scoped API tokens (server-held provider keys; billing/quotas enforced server-side).
  - _Power-user path_: Continue supporting BYOK API keys as alternative.
- [ ] `[M]` **Fallback provider abstraction**: Graceful failover between LLM providers on outage.

### Sync & Export

- [ ] `[L]` **Zero-knowledge encrypted sync**: Ciphertext-only server storage enabling multi-device access.
  - Client sync queue for encrypted blobs (push/pull).
  - Server endpoints: upload/download ciphertext + metadata.
  - Server stores only ciphertext and headers (no plaintext).
  - Conflict strategy: last-write-wins (v1.1).
- [ ] `[M]` **Export/import for recovery**: User-facing backup and restore of encrypted vault.
- [ ] `[L]` **Resolve multi-device edits**: Merge strategy—last-write-wins vs CRDT vs user prompts on conflict.
- [ ] `[M]` **Desktop wrapper**: Native filesystem access for local vault storage outside browser.

### Memory

- [ ] `[L]` **Pattern index**: Track loops and dynamics across sessions for lumen awareness.
- [ ] `[M]` **Commitments tracker**: Log commitments with outcomes; surface in context when relevant.
- [ ] `[S]` **Recognition moment index**: Quick recall of past recognition moments for reinforcement.
- [ ] `[L]` **Retrieval layer (embeddings)**: Long-horizon context via semantic search over session history.

### Harness

- [ ] `[M]` **Context compaction and recap rewriting**: Compress older context to fit more history in token budget.
- [ ] `[M]` **Summary compaction for long histories**: Rolling recap that merges old summaries.
- [ ] `[S]` **Tool-call trimming**: Remove irrelevant metadata before storage.
- [ ] `[M]` **Summarize long pasted inputs**: Compress code/docs before storage to save space.
- [ ] `[L]` **Topic-based retrieval or thread pinning**: Long-horizon continuity for specific themes.
- [ ] `[M]` **Priority weighting**: Boost commitments, recurring themes, recognition moments in context assembly.
- [ ] `[S]` **Session boundary validation**: Avoid accidental context carryover between sessions.
- [ ] `[M]` **Hallucination guards for memory**: Cite source session when recalling facts; flag uncertain memories.

### Harness Evaluation

- [ ] `[M]` **Define evaluation flow and rubric**: Summary quality, closure quality, context assembly correctness.
- [ ] `[S]` **Decide eval infrastructure**: Local vs CI; how results are stored and compared.
- [ ] `[M]` **Deterministic replay fixtures**: Golden outputs for regression testing harness changes.

### Trust & Safety

- [ ] `[M]` **Define boundaries**: Clear non-therapeutic positioning in product and prompts.
- [ ] `[L]` **Crisis UX**: Immediate resources and escalation guidance when distress detected.
- [ ] `[M]` **User reporting and content flagging**: Mechanism for users to report issues.
- [ ] `[S]` **Safety policy references in system prompts**: Ensure lumen knows boundaries.
- [ ] `[M]` **Governance checks for high-risk content**: Guardrails for sensitive topics.

---

## Notes

- **Dependencies** are noted inline with _Depends on:_ markers.
- **Backend tasks** are marked; coordinate with `backend-plan.md`.
- Items may move between tiers as priorities shift.
- **Completion tracking**:
  - Items done directly from backlog → Log in `done/backlog.md`, remove from this file.
  - Items that grow into full phases → Move to `frontend-plan.md` or `backend-plan.md`, archive in their `done/` docs.
