# Round 1 — claude

Subject: `docs/implementation/swift-mac-app.md`

I've read the subject document, all 7 design/architecture docs, and all 17 source code files listed in the brief. Assessments below reference specific code and line numbers.

---

## 1. Architecture

**Assessment: Sound overall, with one structural concern.**

The MVVM + `@Observable` + Swift actors + GRDB + CryptoKit stack is well-chosen. `@Observable` (macOS 14+) eliminates the boilerplate of `ObservableObject`/`@Published`, and Swift actors are the right concurrency primitive for services that hold mutable state (like `DatabaseService` with an open GRDB connection).

**Structural concern: ChatViewModel is going to be massive.** The web app's chat orchestration spans three separate files:

- `apps/web/app/chat/page.tsx` — 683 lines (closure flow, key management, scroll, state)
- `apps/web/lib/hooks/use-llm-conversation.ts` — 370 lines (streaming, message commit, retry)
- `apps/web/lib/hooks/use-session-lifecycle.ts` — 392 lines (vault gate, transcript persistence, chunk flushing)

That's ~1,445 lines of carefully interleaved logic funneled into a single `ChatViewModel`. Swift ViewModels tend to bloat faster than React hooks because they combine state + side effects + lifecycle in one type. **Recommendation: Split into `ChatViewModel` (UI state + send/receive) + `SessionManager` (transcript persistence, chunk flushing, context assembly) + `StreamingCoordinator` (SSE stream lifecycle, abort, retry).** This mirrors the web's separation and keeps each type testable in isolation.

**Direct Anthropic calls (no proxy)**: Correct and simpler. But the plan inherits the web proxy's Claude Code compatibility headers (`user-agent: claude-cli/2.1.2`, `anthropic-beta: claude-code-20250219,...`). These headers are specific to Claude Code OAuth tokens — see `apps/web/app/api/llm/anthropic/route.ts:14-17`. The Swift app MUST replicate these exact headers for `sk-ant-oat-*` tokens to work. The plan mentions this but should be explicit that these headers are **required, not optional** — Anthropic's API will reject OAuth tokens without the correct beta flags and user-agent.

---

## 2. Phasing

**Assessment: Ordering is correct. Two dependency issues.**

The phase order (Foundation → Auth → Chat → Context → History → Polish) correctly builds upward. Phase 1 has zero UI dependencies, Phase 2 delivers a working auth flow, Phase 3 requires Phase 1 (crypto, storage) + Phase 2 (auth session for API calls, vault unlock for key access).

**Issue 1: Shared prompts extraction timing is ambiguous.** The plan says "Extract shared prompts to `shared/prompts/`" in Phase 3 but doesn't specify when the **web app** gets refactored to read from `shared/prompts/`. This is non-trivial — `buildSystemPrompt()` in `apps/web/lib/llm/prompts.ts` is used client-side (called from `useLlmConversation`). Moving the prompt text to external files requires a build-time import mechanism in Next.js (raw-loader, webpack config, or server component restructuring). **Recommendation: Defer web-side shared prompts to after the Mac app ships. For Phase 3, copy the prompt text into `shared/prompts/` and have Swift read from there. Refactor the web app to use `shared/prompts/` as a separate task — it's not on the critical path.**

**Issue 2: Passphrase recovery is listed in MVP3 Tier 1 but missing from all 6 phases.** The MVP3 overview (`docs/implementation/mvp3.md`) mentions "passphrase recovery" as a Tier 1 item. The Swift plan doesn't address it anywhere. If the Keychain stores the derived key, and the user loses their passphrase, they can still unlock via Keychain — but if the Keychain entry is lost (new machine, Keychain reset), the data is gone. This should either be explicitly in Phase 2 or marked as deferred.

---

## 3. Risk

**Highest-risk items, ordered by impact:**

### Risk 1: SSE parsing is more complex than "line-by-line" (High)

The plan says `URLSession.bytes` with "line-by-line SSE parsing." But SSE events are **multi-line**. An Anthropic event looks like:

```
event: content_block_delta
data: {"type":"content_block_delta","delta":{"text":"Hello"}}

```

The blank line terminates the event. The web's parser (`client.ts:167-186`) splits on `\r?\n\r?\n` (double newline) to find event boundaries, then parses `event:` and `data:` lines within each chunk. With `URLSession.bytes.lines`, you get individual lines — you must buffer lines until a blank line, then process the accumulated event. The implementer needs a proper SSE event accumulator, not just per-line parsing.

Additionally, the web's stream reader handles partial UTF-8 decoding (`decoder.decode(value, { stream: true })` at `client.ts:471`). `URLSession.bytes.lines` handles this natively, which is an advantage — but the line-based approach means the SSE buffering logic is different from the web's chunk-based approach. This needs a clean abstraction: an `SSEParser` that accepts lines and emits complete events.

### Risk 2: CryptoKit SealedBox format confusion (Medium)

The plan's `CryptoService` API shows `decrypt(data:key:nonce:)` with a separate nonce parameter. But CryptoKit's `AES.GCM.SealedBox` has a `.combined` representation that includes nonce(12 bytes) + ciphertext + tag(16 bytes) in a single `Data`. Since the plan explicitly states "own format (not web-compatible)," using `SealedBox.combined` as the storage format is simpler:

- Encrypt: `AES.GCM.seal(plaintext, using: key)` → store `sealedBox.combined`
- Decrypt: `AES.GCM.SealedBox(combined: storedData)` → `AES.GCM.open(sealedBox, using: key)`

No separate nonce storage, no IV column in the database. The encryption header simplifies to `{kdf, kdf_params, salt, cipher, version}` — the IV is embedded in the combined blob. **If the plan keeps separate nonce storage (matching the web's structure), it works but adds unnecessary complexity for no cross-platform benefit.**

### Risk 3: ChatViewModel complexity (Medium)

As discussed in Architecture. Merging 1,445 lines of orchestration into one ViewModel without a clear separation strategy risks creating an untestable monolith.

### Risk 4: Claude Code header compatibility (Medium)

If the beta flags or user-agent format change on Anthropic's side, the Mac app will break. The web proxy (`route.ts:14-17`) hardcodes `claude-cli/2.1.2`. The Mac app will also hardcode these values. There's no discovery mechanism for the correct headers — it's a silent breaking change if Anthropic updates their OAuth token validation. Consider making these values configurable in Settings.

---

## 4. Gaps

### Gap 1: No web → Mac data migration path

The plan says "own encryption format (not web-compatible)" (settled decision). This means existing web app data (conversations, notebooks, Arc) cannot be imported. For Gaurang as the sole user who has existing sessions, this is a real loss. The plan should explicitly state: **"Web data is not migrated. The Mac app starts fresh. If transcript import is desired, add it as a post-parity task."** Or, if `transcript import` (listed in MVP3 overview) is meant to cover this, it should be a named phase item.

### Gap 2: App Sandbox and distribution

No mention of App Sandbox entitlements, code signing, or notarization. For macOS, any app distributed outside the Mac App Store needs to be notarized by Apple, or users get Gatekeeper warnings. Even for personal use, running an unsigned app requires `xattr -d com.apple.quarantine` every download. The plan should note whether this app will be:

- Run from Xcode directly (development only)
- Distributed via GitHub releases (needs signing + notarization)
- Distributed via Mac App Store (needs full sandbox compliance)

### Gap 3: Auto-update mechanism

No mention of how the app gets updated. Options: Sparkle framework, manual download, TestFlight. For a personal tool, manual is fine — but it should be stated.

### Gap 4: Anthropic OAuth token refresh/expiry

`sk-ant-oat-*` tokens have an expiration. The plan doesn't address what happens when a token expires mid-session or between sessions. The web app handles this via `LlmInvalidKeyError` → prompt user to re-enter. The Mac app should do the same, but the plan should call this out explicitly, especially the UX flow: token expired → Settings opens → re-enter token → resume.

### Gap 5: Logout handler needs Bearer support

The plan's Go backend changes (Section "Go Backend Changes") modify the Verify handler and auth middleware, but the `Logout` handler (`auth.go:195-215`) reads the session from `r.Cookie()` only. The Mac app sends Bearer tokens, not cookies. **The Logout handler also needs the Bearer header fallback,** or the Mac app can't log out via the API. This is a missing 5th backend change.

### Gap 6: `magicLink()` method modification

Backend change #3 describes adding `client_type` to `requestLinkPayload`, but the actual magic link URL is constructed in `auth.go:223-225` by the `magicLink()` method, which hardcodes the web URL format. The plan should explicitly note that `magicLink()` needs to accept a `clientType` parameter and conditionally return `lumen://auth/callback?token=` vs the web URL.

---

## 5. Scope

**Over-engineered for a single-user tool:**

- **OutboxService with exponential backoff** (Phase 5): The web app needed outbox-based session metadata sync because it runs in a browser with unreliable connectivity. For a Mac app used by one person on their home network, a simple synchronous POST with a single retry would suffice. The exponential backoff (2s base, 60s max, 6 attempts) and `NWPathMonitor` integration is enterprise-grade plumbing for a personal journal. **Recommendation: Start with `URLSession.data` + 1 retry. Add outbox if it proves necessary.**

- **8 distinct services**: `AnthropicService`, `DatabaseService`, `CryptoService`, `KeychainService`, `ContextAssembly`, `ClosureService`, `AuthService`, `OutboxService`. For a single-user app, some of these could be methods on fewer types. But this is a matter of taste — the separation does help testability. Keep it if the implementer finds it clean.

**Under-specified:**

- **SwiftUI theme system**: The plan says "port values from `apps/web/app/globals.css` (morning palette section)" but doesn't describe how the CSS variable system maps to SwiftUI. The web uses HSL values in CSS variables (`--accent`, `--muted-foreground`, etc.) consumed by Tailwind classes. SwiftUI uses `Color` values, either from Asset Catalogs or code. The plan should specify: (a) define colors in `Assets.xcassets` with light/dark variants, or (b) define in code via `Color(hue:saturation:brightness:)`. Option (a) is better for maintenance.

- **Memory management during context assembly**: `buildSessionContext()` (`assembly.ts:116-226`) decrypts and loads multiple transcripts + notebooks into memory. With 50+ sessions, this could mean decrypting and holding tens of megabytes of text. The web app discards this after building the context string. The Swift app should do the same — load, build string, release. Not a problem if done correctly, but the plan should note this isn't "keep everything in memory."

---

## 6. Go Backend Changes

**Assessment: Correct direction, but incomplete. 5 changes needed, not 4.**

The 4 listed changes are correct and backward-compatible:

1. **Verify returns session_token in body** — `auth.go:177` changes from `{"status": "ok"}` to include `session_token` and `user_id`. Web ignores extras. Correct.
2. **Middleware accepts Bearer header** — `middleware/auth.go:22-28` adds fallback after cookie check. Correct.
3. **client_type in request-link** — `auth.go:62-63` adds field. Correct, but requires `magicLink()` (`auth.go:223`) to also accept the parameter.
4. **Email template for native links** — Correct.

**Missing change #5: Logout handler Bearer support.** The `Logout` handler (`auth.go:195-215`) reads `r.Cookie(h.cfg.AuthCookieName)` to find the session to delete. A Mac app sending `Authorization: Bearer <token>` will hit this handler with no cookie. The handler should extract the session token from the Bearer header (same pattern as the middleware change) and call `h.sessions.Delete(sessionToken)`.

---

## 7. Shared Prompts

**Assessment: Sound in principle. Web-side extraction is more complex than described.**

Extracting prompt text to `shared/prompts/` is the right idea for a single source of truth. The notebook, arc-creation, and arc-update prompts are simple string constants — easy to extract.

**The system prompt is harder.** `buildSystemPrompt()` (`prompts.ts:198-224`) concatenates 11 section constants and appends session-specific hints (session number, context). The extracted `system-prompt.txt` would be the concatenated sections, and both apps would need their own `buildSystemPrompt()` function that appends the runtime hints. This is fine — just be explicit that `shared/prompts/system-prompt.txt` contains only the static soul/presence/voice sections, and each app adds the session metadata independently.

**Web-side refactoring is non-trivial.** `buildSystemPrompt()` is imported client-side by `useLlmConversation`. In Next.js, `fs.readFileSync` only works server-side. To use shared prompt files on the client, you'd need:

- A webpack raw-loader for `.txt` imports
- Or a build-time code generation step
- Or restructure the prompt builder as a server component / API route

**Recommendation: Don't refactor the web app's prompt loading as part of the Mac app build. Keep the web's current TypeScript constants. Let `shared/prompts/` be the canonical source that gets manually synced to the TypeScript constants. Automate this later. The risk of breaking the working web app while building the Mac app is not worth the DRY benefit.**

---

## 8. Crypto

**Assessment: Correct approach. Two implementation details to get right.**

### PBKDF2: CommonCrypto → CryptoKit bridge

The flow is:

```
passphrase (String) + salt (Data) + iterations (Int)
  → CCKeyDerivationPBKDF(kCCPRFHmacAlgSHA256, ...)
  → 32 bytes (Data)
  → SymmetricKey(data:)
  → AES.GCM.seal() / AES.GCM.open()
```

This is correct. `CCKeyDerivationPBKDF` with `kCCPRFHmacAlgSHA256` produces identical output to WebCrypto's `PBKDF2-HMAC-SHA256` given the same inputs. The plan correctly identifies that CryptoKit lacks PBKDF2 natively.

### AES-GCM: Simplify with SealedBox.combined

Since the encryption format is explicitly "not web-compatible," use CryptoKit's native `SealedBox.combined` format:

- `SealedBox.combined` = nonce(12) + ciphertext + tag(16)
- Store the combined `Data` as a single BLOB in GRDB
- No separate IV/nonce column needed in the encryption header
- Decrypt: `AES.GCM.SealedBox(combined: blob)` → `AES.GCM.open(box, using: key)`

This eliminates the `generateIV()` function, the `iv` field in the header, and the `decrypt(data:key:nonce:)` three-parameter variant. CryptoKit generates a random nonce internally when you call `seal()`.

### Integrity hash

The web computes `hashTranscript(ciphertext, header)` via SHA-256 (`crypto.ts:120-130`). In Swift, use `SHA256.hash(data:)` from CryptoKit. The hash should cover the same inputs (serialized header + ciphertext) for consistency, even though the formats differ. Note: `AES.GCM` already provides authentication via the GCM tag — the separate SHA-256 hash is for **server-side integrity verification** (the transcript hash is sent to the Go backend). If the Mac app doesn't send transcript hashes to the server, this hash may be unnecessary. The plan should clarify whether the Mac app's outbox includes transcript hashes.

### Keychain storage

Store the raw 32 bytes of the derived key in Keychain (via `KeychainAccess`). On app launch, retrieve the key bytes → `SymmetricKey(data:)` → skip passphrase entry. The Keychain item should be set with `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` to prevent iCloud Keychain sync of the encryption key.

---

## 9. Streaming

**Assessment: Right approach. SSE parser needs careful design.**

`URLSession.bytes` is the correct modern API. The streaming chain would be:

```swift
let (bytes, response) = try await URLSession.shared.bytes(for: request)
// bytes: URLSession.AsyncBytes — an AsyncSequence of UInt8
// bytes.lines — an AsyncSequence of String (one per line)
```

**SSE parser design:** Use `bytes.lines` and accumulate lines into an event buffer. When a blank line is received, parse the buffer as one SSE event, then clear it. This is different from the web's chunk-based approach but architecturally cleaner.

```
Line: "event: content_block_delta" → buffer
Line: "data: {...}"                → buffer
Line: ""                           → flush buffer as event, clear
```

**Timeout handling:** `URLSession` supports `timeoutIntervalForRequest` (time to first byte) and `timeoutIntervalForResource` (total transfer time). For streaming, you want the **resource** timeout set to 120s. But you also want an **inactivity** timeout — if no data arrives for N seconds, cancel. This requires a custom `Task` that monitors the last-received timestamp and cancels the URLSession task on inactivity. The web handles this via `fetchWithTimeout` wrapping the entire stream.

**Cancellation:** `URLSession` tasks support `task.cancel()` which will cause the `bytes` sequence to throw `URLError.cancelled`. Map this to `LlmAbortError` equivalent in Swift. The web's `AbortController` pattern maps cleanly to Swift's `Task.cancel()`.

**Retry after partial streaming:** The web's `streamLlmWithRetry` (`client.ts:604-671`) tracks `hasYielded` and skips retry if data was already emitted. The Swift implementation must replicate this — once you've yielded partial text to the UI, you cannot cleanly retry (the user has already seen content).

---

## 10. Auth Flow

**Assessment: Complete for the happy path. Two edge cases to address.**

The `lumen://auth/callback?token=<token>` deep link approach is standard for macOS. Registration in Info.plist, handling via `.onOpenURL()` in SwiftUI — all correct.

**Edge case 1: Cold start deep link.** If the app isn't running when the user clicks the magic link, macOS launches the app and delivers the URL. SwiftUI's `.onOpenURL()` fires after the view hierarchy is set up, so this should work. But: if the app has a loading state (checking Keychain, initializing DB), the auth callback might arrive before the app is ready. **The deep link handler should queue the token and process it after initialization completes.**

**Edge case 2: Web-based email clients.** Gmail in a browser will see `lumen://auth/callback?token=...` as a link. Clicking it should trigger the macOS URL scheme handler. Most browsers prompt "Open Lumen?" — this is fine. But some web-based email clients may not render custom URL schemes as clickable links. The email template should include both the `lumen://` link and a fallback note: "If the link doesn't work, copy this token: [TOKEN] and paste it in the app." This fallback covers edge cases without adding significant complexity.

**Security note:** The `lumen://` URL scheme is not encrypted (no TLS for custom schemes), but the token is a one-time-use string consumed immediately by the verify endpoint. The exposure window is minimal. For a personal tool, this is acceptable.

---

## Status

REVIEWING — Awaiting other agent's round 1.
