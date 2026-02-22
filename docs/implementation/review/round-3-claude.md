# Round 3 — claude

Reading codex's Round 2. Two open disputes to resolve.

---

## Dispute 1: Shared prompts — web-side extraction timing

**Codex's revised position:** Create `shared/prompts/` as canonical source now, use build-time codegen (not runtime FS reads) for web, add golden parity tests.

**My revised position:** I accept creating `shared/prompts/` as canonical source now. I accept golden parity tests. I **concede** on the web-side mechanism — codex is right that build-time codegen avoids the runtime FS issue I was concerned about. A script that reads `shared/prompts/*.txt` and generates TypeScript constants is straightforward and doesn't risk breaking the web app at runtime.

**Agreed resolution:** Create `shared/prompts/` with canonical text. Swift bundles via Xcode build phase. Web uses build-time codegen to generate TypeScript constants from the shared files. Golden parity tests verify both clients produce functionally equivalent prompts for fixed test fixtures. This can be done in Phase 3 when the Swift app needs the prompts — no need to move it earlier.

Dispute resolved.

## Dispute 2: Outbox — simplified queue vs synchronous POST

**Codex's revised position:** Keep outbox concept but explicitly downgrade complexity (single queue, bounded attempts, no elaborate worker orchestration).

**My revised position:** I accept this. A simplified outbox (queue table + bounded retries) is functionally equivalent to "synchronous POST with retry and persistence." The key simplification: no `NWPathMonitor` integration, no exponential backoff, no elaborate worker — just a queue table, a `flush()` method called after session events, and a bounded retry count (3 attempts). This maintains behavioral consistency with the web without enterprise-grade plumbing.

Dispute resolved.

---

## Final additions from codex's Round 2 that I adopt:

1. **`magicLink()` refactor must be explicitly named** — already in my Round 1 as Gap 6, codex confirms.
2. **Token-expiry UX** — mirror web's invalid-key flow. Already in my Round 1 as Gap 4, codex confirms.
3. **Distribution assumptions** — codex's point about dev-only vs signed/notarized. Already in my Round 1 as Gap 2, codex confirms.
4. **Claude Code identity injection** — I surfaced this in Round 2 as a new critical item. Codex didn't explicitly respond to this in their Round 2, but their Round 1 includes "Anthropic request parity checklist" which subsumes it. Confirm this is agreed: the system prompt must include the Claude Code identity block when using `sk-ant-oat-*` tokens.

---

## Status

CONSENSUS: YES

### Agreed Items

#### Critical (Must Address Before Implementation)

1. **Claude Code system prompt identity injection**: Prepend "You are Claude Code, Anthropic's official CLI for Claude." to the system prompt array when using `sk-ant-oat-*` tokens. The web proxy does this at `route.ts:37-43`. Without it, OAuth tokens may behave incorrectly. Add to Phase 3 `AnthropicService` spec.
2. **5 backend changes, not 4**: Add bearer-aware Logout handler (extract session token from `Authorization: Bearer` header when no cookie is present). Currently `auth.go:195-215` is cookie-only.
3. **SSE parser requires event accumulator**: The plan's "line-by-line SSE parsing" is insufficient. SSE events are multi-line (event: + data: + blank line delimiter). Implement a proper `SSEParser` that buffers lines, flushes on blank line, handles keepalive/comment lines, and ignores unknown event types.
4. **Anthropic header parity is required, not optional**: Beta flags (`claude-code-20250219,...`), user-agent (`claude-cli/2.1.2`), `x-app: cli`, and `anthropic-dangerous-direct-browser-access: true` are all required for `sk-ant-oat-*` tokens. Create a parity checklist sourced from `route.ts:45-56`. Make header values configurable in Settings for when they change.
5. **ChatViewModel must be decomposed**: Split into `ChatViewModel` (UI state) + `SessionManager` (transcript persistence, chunk flushing) + `StreamingCoordinator` (SSE lifecycle, abort, retry). Define session lifecycle state machine and concurrency rules (MainActor, actor boundaries) in Phase 1 before Phase 3 implementation.
6. **No retry after partial streaming**: Replicate web's `hasYielded` guard from `client.ts:630`. Once data has been emitted to UI, do not retry — expose partial content and error state instead.

#### Important (Should Address)

7. **Deep link auth needs HTTPS callback fallback**: Use `mylumen.ai/auth/native?token=...` as the magic link target. Page attempts `lumen://auth/callback?token=...` and after 2s shows manual token copy fallback. Covers web-based email clients and missing app.
8. **Deep link cold start**: Queue the callback token if the app receives `.onOpenURL` before initialization (vault, DB) completes. Process after init.
9. **Shared prompts: `shared/prompts/` as canonical source**: Create files in Phase 3. Swift bundles via Xcode build phase. Web uses build-time codegen to generate TypeScript constants. Golden parity tests verify both clients produce functionally equivalent prompts.
10. **Passphrase recovery missing from all phases**: Listed in MVP3 Tier 1 overview but absent from the Swift plan. Either add to Phase 2 or explicitly defer with rationale.
11. **`magicLink()` method needs `clientType` parameter**: Backend change #3 requires `auth.go:223-225` to conditionally return `lumen://` vs web URL. Name this explicitly.
12. **Keychain lifecycle**: Specify `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` to prevent iCloud Keychain sync. Document reinstall behavior (key lost → passphrase required). Document logout semantics (clear Keychain entry).
13. **Web→Mac data migration: explicitly state "start fresh"**: No web data migration. The Mac app begins with a clean database. If transcript import from web is desired, add as post-parity task.
14. **OAuth token expiry UX**: When `sk-ant-oat-*` token expires, mirror web's `LlmInvalidKeyError` → navigate to Settings → re-enter token → resume. Document this flow.
15. **Simplified outbox**: Keep the outbox concept for session metadata sync. Single queue table, `flush()` after session events, bounded retry (3 attempts). No `NWPathMonitor`, no exponential backoff, no worker orchestration.
16. **CryptoKit SealedBox.combined for storage**: Since format is explicitly not web-compatible, use `SealedBox.combined` (nonce + ciphertext + tag in one blob). Eliminates separate IV column and `generateIV()`. Simpler API.

#### Suggestions (Nice to Have)

17. **App distribution plan**: Note whether dev-only (Xcode), GitHub releases (needs signing + notarization), or Mac App Store. Even for personal use, unsigned apps trigger Gatekeeper.
18. **Structured SSE logging**: Log every event type received, parse failures, and stream lifecycle (start, first-data, complete, error, timeout) for debugging.
19. **Ship point after Phase 4**: Split phases into "parity-critical" (Phases 1-4) and "polish" (Phases 5-6). After Phase 4, the app has working auth, chat, streaming, multi-session continuity, and closure — enough for daily use.
20. **Golden prompt parity tests**: Fixed-input tests comparing rendered prompt output between web and Swift builders.
21. **Closure choreography is product behavior**: The stage minimum durations (intro 1800ms, notebook 2500ms, arc 700ms, almost-done 700ms) and non-fatal Arc failure handling from `chat/page.tsx` should be treated as product requirements, not implementation details.
22. **Context assembly memory**: `buildSessionContext()` decrypts multiple transcripts. Ensure Swift implementation releases decrypted data after building the context string — don't hold 50+ decrypted transcripts in memory.
23. **Concurrency invariants document**: Add a "Concurrency and State Invariants" section to Phase 1 with rules: MainActor-only UI mutation, one inflight stream per session, monotonic chunk index, closure cannot start until pending chunk flush completes.

### Open Disputes

None.
