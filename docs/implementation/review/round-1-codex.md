# Round 1 — codex

## 1. Architecture

Assessment: The stack choice is sound for the settled constraints (SwiftUI + GRDB + CryptoKit/CommonCrypto + actors), but the plan needs clearer concurrency boundaries and a stricter data-layer contract to avoid subtle correctness bugs.

What looks strong:

- `@Observable` + MVVM aligns with macOS 14 and reduces boilerplate for view updates.
- GRDB is the right SQLite choice for migrations/observability and is better than raw SQLite for this codebase size.
- Crypto stack maps correctly to current web primitives (`apps/web/lib/crypto.ts`, `apps/web/lib/storage/dexie-storage.ts`).
- The existing web orchestration complexity in `apps/web/app/chat/page.tsx` and hooks justifies a real service/viewmodel split in Swift.

What needs to be added in the plan:

- Define actor boundaries explicitly: `DatabaseService`, `AnthropicService`, `OutboxService`, `AuthService` as actors; UI-facing VMs isolated to `@MainActor`. Without this, reentrancy + UI races are very likely once streaming and closure overlap.
- Define one source of truth for session lifecycle state transitions (locked/loading/active/reflecting/complete) before Phase 3. Web currently splits this logic across `chat/page.tsx`, `use-session-lifecycle.ts`, `use-llm-conversation.ts`; replicating ad hoc will regress behavior.
- Add an explicit storage protocol parity checklist against `StorageService` (`apps/web/lib/storage/index.ts`) including sort order invariants and chunk ordering assumptions.

Concrete suggestion:

- Add a short "Concurrency and State Invariants" subsection in Phase 1 with 8-10 rules (MainActor-only UI mutation, one inflight stream per session, monotonic chunk index, closure cannot start until pending chunk flush completes, etc.).

## 2. Phasing

Assessment: The six phases are mostly in the right order, but there are two dependency mismatches.

Mismatch A:

- Shared prompts are introduced in Phase 3, but prompt-dependent behavior starts earlier (session setup/login copy and eventual closure logic assumptions). Also extraction changes web behavior risk.
- Move `shared/prompts/` extraction and parity tests into late Phase 1 or early Phase 2.

Mismatch B:

- Backend changes are listed in Phase 2, but auth UI/deep-linking depends on those contracts being settled and deployed.
- Add a "Phase 0.5 backend contract landing" gate: implement + deploy + verify `request-link`/`verify`/middleware before Swift auth UI wiring.

Recommended reorder:

1. Phase 1 foundation + prompt extraction + backend contract changes
2. Phase 2 auth/vault UI on stable backend contract
3. Phase 3 chat streaming
4. Phase 4 context + closure
5. Phase 5 history/settings/outbox
6. Phase 6 polish

## 3. Highest Risks

Top blockers/rework risks:

1. Anthropic OAuth compatibility drift:

- Current web proxy has specific headers and compatibility shaping (`apps/web/app/api/llm/anthropic/route.ts`):
  - `anthropic-beta` flags
  - `user-agent` format
  - `x-app: cli`
  - prepended Claude Code identity block in system prompt
- The Swift plan calls out some headers but omits full parity and system injection behavior. This is high risk for 401/403 or behavior drift.

2. Session orchestration port risk:

- Web chat behavior is distributed and carefully sequenced across `chat/page.tsx` + hooks; naive port will lose edge-case behavior (resume logic, flush-before-lock, interrupted stream retry partials).

3. Deep-link auth fragility:

- `lumen://` links can fail in some email clients and environments. No fallback UX is specified.

4. Context assembly performance:

- Web `buildSessionContext()` decrypts transcript chunks and constructs large strings in loop (`apps/web/lib/context/assembly.ts`). Swift must avoid main-thread work and memory spikes for 50+ sessions.

## 4. Missing Gaps

Critical missing implementation details:

- Migration/import strategy from existing web local vault to Swift DB is under-specified (format, tooling, failure UX).
- Keychain lifecycle policy is underspecified: app reinstall, keychain item accessibility class, iCloud keychain behavior, logout semantics.
- Token/session invalidation semantics for native flow are incomplete: logout/session-status should handle bearer token path, not just cookie assumptions.
- Observability/debug strategy for native networking/stream failures is missing (needed for hard-to-repro SSE bugs).
- Prompt parity testing is missing: no CI check to guarantee `shared/prompts/*` stay functionally equivalent to web builder output.

## 5. Scope Calibration

Over-engineered for immediate personal-tool MVP:

- Full menu-bar command surface + broad accessibility + heavy polish in same release train could delay functional parity.

Under-specified:

- Error-recovery UX around closure generation failures and partial arc updates (web currently has partial recovery and retry UI in `chat/page.tsx` and `session-closure.tsx`).
- Recovery path when context assembly exceeds practical memory/latency budget.

Recommendation:

- Keep six phases, but split each into "parity-critical" vs "polish" deliverables with a stop-the-line ship point after Phase 4.

## 6. Go Backend Changes (4 items)

Assessment: The four proposed changes are directionally correct but not sufficient on their own.

Correct:

- `Verify` response should include `session_token` and user id for native storage.
- Middleware should accept bearer fallback.
- `request-link` should support native client type.
- Native-specific email copy/link format is reasonable.

Missing additions required for completeness:

- `Logout` should invalidate bearer-token sessions even when no auth cookie is present (`apps/api/internal/handlers/auth.go` currently cookie-only).
- `RequireAuthSession` should define precedence/ambiguity handling when both cookie and bearer are present (avoid accidental session confusion).
- `SessionStatus` should continue to work with bearer path (after middleware change this mostly falls out, but should be explicitly tested).
- Add API contract tests for web cookie flow + native bearer flow side-by-side.

## 7. Shared Prompts Extraction

Assessment: `shared/prompts/` is the right move, but extraction strategy needs stricter guarantees.

Risks shown by current code:

- `apps/web/lib/llm/prompts.ts` is not a static text blob only; it composes sections and appends session hints/context block.
- `apps/web/lib/session/summary.ts` has slight format adjustments (e.g., list formatting guidance in "What Opened") versus docs.

Recommendations:

- Keep "templates + builders" model:
  - shared files store canonical section text/templates
  - each client keeps minimal runtime builder for dynamic interpolation (`sessionNumber`, context block, etc.)
- Add golden tests that compare rendered prompt output between web and Swift for fixed fixtures.

## 8. Crypto Port (PBKDF2 + AES-GCM)

Assessment: The chosen primitives are correct; pitfalls are in serialization and compatibility assumptions.

Key pitfalls to address:

- Preserve deterministic header serialization for transcript hash parity (`serializeEncryptionHeader` behavior in `apps/web/lib/crypto.ts`).
- Explicitly define IV/nonce and tag storage layout in Swift structs (CryptoKit combined representation can hide this if not deliberate).
- Do not hardcode PBKDF2 iterations in Swift; carry `VaultMetadata.kdf_iterations` semantics so future rotation remains possible.
- Use constant-time hash comparison equivalent to web integrity check path (`assertTranscriptHash` in `dexie-storage.ts`).

Recommendation:

- Add test vectors in Phase 1 (fixed salt/iv/plaintext => expected ciphertext hash format) and fuzz round-trip tests.

## 9. Streaming Reliability (URLSession.bytes + AsyncThrowingStream)

Assessment: Feasible and likely reliable if parser behavior matches web nuances, but parser spec must be explicit.

From current web behavior (`apps/web/lib/llm/client.ts`):

- Handles SSE event framing by blank-line separation
- Consumes `message_start`, `content_block_start`, `content_block_delta`, `message_delta`, `message_stop`, `error`
- Emits cumulative partial text and distinguishes abort vs retryable interruption

Swift plan should explicitly include:

- Handling for keepalive/comment lines and unknown event types
- Correct UTF-8 boundary handling on chunk splits
- Clear retry semantics: do not retry after partial output has already streamed
- Stream cancellation path mapped to UI interruption state (not generic failure)

## 10. Auth Flow (lumen:// deep link)

Assessment: Viable but incomplete as documented.

Edge cases not covered yet:

- Email clients that don’t open custom schemes reliably.
- Multiple rapid link clicks creating token races.
- Expired token UX and re-request flow in-app.
- Link interception concerns if token stays in URL and is logged by intermediaries.

Recommendation:

- Use an HTTPS callback fallback page as primary magic-link target that attempts to open `lumen://...` and shows clear manual fallback when app is unavailable.
- Add one-time token consumption + replay-safe UX messaging tests.

## Additional Notes (Cross-cutting)

- Plan currently says direct Anthropic call from native and lists some headers; include a full "Anthropic request parity checklist" sourced from `apps/web/app/api/llm/anthropic/route.ts` to avoid silent mismatch.
- Closure sequencing in web (`generateNotebookAndArc()` in `apps/web/app/chat/page.tsx`) is deliberately choreographed with stage minimum durations and non-fatal Arc failures; this should be treated as product behavior, not implementation detail.

## Status

REVIEWING — Awaiting other agent's round 1.
