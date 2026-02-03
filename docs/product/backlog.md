# Lumen Backlog

Last Updated: 2026-02-03

Items are organized by time horizon (Now → Soon → Later) and category. Effort markers: `[S]`mall, `[M]`edium, `[L]`arge.

---

## Now (Bugs & Polish)

Immediate fixes and polish to ship a solid MVP.

### LLM Integration

- [ ] `[M]` **Real LLM streaming**: Replace mock word-by-word streaming with Anthropic SSE endpoint for true incremental response display.
  - _Code ref: `apps/web/app/chat/page.tsx:118`_
- [ ] `[S]` **Abort signal propagation**: Pass client disconnect signal to upstream LLM requests; optionally queue pending responses for session resume.
  - _Code ref: `apps/web/app/api/llm/anthropic/route.ts:85`_

### Auth & Session

- [ ] `[S]` **Sidebar auth state**: Add signed-in indicator to sidebar showing current user.
- [ ] `[S]` **Logout action**: Add logout button to sidebar.
  - _Depends on: logout endpoint_
- [ ] `[S]` **Logout endpoint**: Add `POST /v1/auth/logout` to clear the session cookie.
  - _Backend task_

### UX

- [ ] `[M]` **Coach message scroll behavior**: When a coach message appears, auto-scroll so the message is prominent (top 2/3 of viewport). Add sufficient whitespace below the last coach message so input field doesn't obscure it as user types longer responses.

  <details>
  <summary>Implementation prompt</summary>

  As more text fills the input, it covers the message from the coach. Add whitespace or scroll the page down so that when a coach message appears, it scrolls down and puts that coaching message as the only message visible on screen. There should be enough whitespace after the last coaching message (even after scrolling to the bottom of a long one) so that it only takes up ~2/3 of the page. The remaining whitespace at the bottom is intentional breathing room.

  </details>

- [ ] `[S]` **Warm up pre-session copy**: "Set aside 60 min to reflect" feels like preparing for an exam. Rewrite to feel more like a friendly conversation — approachable, not clinical.

### Harness

- [ ] `[S]` **Coach time awareness**: Coach should be aware of session duration. Around 50-60 min, start naturally wrapping up unless user indicates the timer is wrong. For short sessions (5-10 min), gently explore if there's more to discuss, but respect when user is genuinely done.
  - _Likely a system prompt addition with elapsed time in context._

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

### UX

- [ ] `[M]` **View past session transcripts**: Users should be able to review their own conversation history. It's their data. Add a session history view with decrypted transcript display.

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

- [ ] `[L]` **Pattern index**: Track loops and dynamics across sessions for coach awareness.
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

- [ ] `[M]` **Define coaching boundaries**: Clear non-therapeutic positioning in product and prompts.
- [ ] `[L]` **Crisis UX**: Immediate resources and escalation guidance when distress detected.
- [ ] `[M]` **User reporting and content flagging**: Mechanism for users to report issues.
- [ ] `[S]` **Safety policy references in system prompts**: Ensure coach knows boundaries.
- [ ] `[M]` **Governance checks for high-risk content**: Guardrails for sensitive topics.

---

## Notes

- **Dependencies** are noted inline with _Depends on:_ markers.
- **Code refs** link TODOs in source to backlog items.
- **Backend tasks** are marked; coordinate with `docs/implementation/backend/plan.md`.
- Items may move between tiers as priorities shift.
