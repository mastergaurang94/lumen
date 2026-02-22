# Lumen SwiftUI Native Mac App — Implementation Plan

Last Updated: 2026-02-22
Status: Reviewed (feedback applied from Claude + Codex debate, 4 rounds)

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline. This is how the next session picks up context.

---

## Running Updates

- 2026-02-22: Added UI Verification section — Peekaboo MCP for runtime inspection, Xcode 26.3 agent for compile-time verification, swift-snapshot-testing for visual regression. Created generic agent verification doc at `docs/architecture/agent-verification.md`.
- 2026-02-22: Added Mac app completeness items: os_log convention (Phase 1), app lifecycle edge cases (sleep/wake, force-quit, network drop), Sparkle auto-updates (Phase 6), expanded accessibility (reduce motion, contrast, tab order). No analytics/Firebase — privacy-first, single user. Reviewed steipete/agent-scripts Swift skills — swift-concurrency-expert and swiftui-performance-audit are useful implementation-time references but not plan items.
- 2026-02-22: Applied review feedback from Claude + Codex async debate (4 rounds, 23 consensus items). Key changes: 5 backend changes (added Bearer logout), ChatViewModel split into 3 components, SSE event accumulator spec, Claude Code identity injection for OAuth, HTTPS auth fallback, SealedBox.combined crypto format, passphrase recovery added to Phase 6, concurrency invariants added to Phase 1. Prompts duplicated in Swift (no shared/ directory). Full debate trail at `docs/implementation/review/`.
- 2026-02-22: Plan created. Full native SwiftUI app replacing the original WKWebView approach from MVP 3 Tier 1. See conversation context for design decisions and rationale.

---

## Context

Lumen is pivoting from a browser-based web app to a **native SwiftUI Mac app**. The web app (Next.js + React) has proven the product — chat with streaming, session notebooks, the Arc, encrypted local storage, context assembly. MVP 3's north star is "Make this the reflection corner of my life," and a native Mac app is how that happens.

This plan replaces MVP 3 Tier 1 items (1.1–1.6). Instead of migrating IndexedDB → SQLite-in-browser → static export → WKWebView wrapper, we're going **straight to native SwiftUI**. No WKWebView. No React in the loop. Full rewrite of the UI and business logic in Swift.

The web app (`apps/web`) stays as-is during development. Once the Mac app reaches parity, the web app becomes a landing page.

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│  Lumen.app (SwiftUI, macOS 14+)                         │
│                                                          │
│  ┌──────────────────────────────────────────────────┐    │
│  │  SwiftUI Views (MVVM)                            │    │
│  │  Chat, History, Setup, Unlock, Session, Settings │    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │  ViewModels + Coordinators (@Observable)           │    │
│  │  ChatVM, SessionMgr, StreamCoord, VaultVM, ...   │    │
│  └────────────────────┬─────────────────────────────┘    │
│                       │                                  │
│  ┌────────────────────▼─────────────────────────────┐    │
│  │  Services (actors / classes)                     │    │
│  │  AnthropicService   — SSE streaming to Anthropic │    │
│  │  DatabaseService    — SQLite via GRDB.swift      │    │
│  │  CryptoService      — PBKDF2 + AES-GCM          │    │
│  │  KeychainService    — Vault key + OAuth token    │    │
│  │  ContextAssembly    — Budget-aware context build │    │
│  │  ClosureService     — Notebook + Arc generation  │    │
│  │  AuthService        — Magic link + deep linking  │    │
│  │  OutboxService      — Session metadata sync      │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  Storage: ~/Library/Application Support/Lumen/lumen.db   │
│  Keychain: vault derived key + OAuth token + session     │
│  Prompts: duplicated in Swift, synced from web constants  │
└──────────────────────────────────────────────────────────┘
          │                              │
          ▼                              ▼
  api.anthropic.com              lumen-api.fly.dev
  (LLM, direct call)            (auth + session metadata)
```

**Key difference from web**: No proxy layer for LLM calls. The web app routes through `/api/llm/anthropic` because browsers have CORS restrictions. A native Mac app calls `https://api.anthropic.com/v1/messages` directly. The same OAuth headers (`Authorization: Bearer sk-ant-oat-*`, `anthropic-beta`, `user-agent`) must be replicated.

---

## Key Decisions

| Decision           | Choice                                       | Rationale                                                                       |
| ------------------ | -------------------------------------------- | ------------------------------------------------------------------------------- |
| UI framework       | SwiftUI (no WKWebView)                       | Native performance, native scroll/text/animations                               |
| Min macOS          | 14.0 (Sonoma)                                | Required for `@Observable`, `onScrollGeometryChange`                            |
| SQLite library     | **GRDB.swift**                               | Best migration system, type-safe, observation, WAL mode                         |
| Markdown rendering | **swift-markdown-ui**                        | Full block-level markdown as native SwiftUI views                               |
| Keychain library   | **KeychainAccess**                           | Clean API over verbose Security.framework                                       |
| Key derivation     | **CommonCrypto** `CCKeyDerivationPBKDF`      | CryptoKit lacks PBKDF2; CommonCrypto is built-in                                |
| Encryption         | **CryptoKit** AES-GCM (`SealedBox.combined`) | Native, no deps, 256-bit AES-GCM, single blob (nonce+ct+tag)                    |
| Streaming          | **URLSession.bytes** + `AsyncThrowingStream` | Modern async/await, SSE event accumulator                                       |
| State management   | **@Observable** (Observation framework)      | Replaces ObservableObject; simpler, more performant                             |
| Concurrency        | **Swift actors** for services                | Thread-safe mutable state without manual locking                                |
| Prompts            | **Duplicated in Swift**                      | Manually synced from web TypeScript constants. Golden parity tests catch drift. |
| Design             | Hybrid: SF Pro + morning (teal) palette      | Native Mac feel with warm Lumen design principles                               |
| Auth deep link     | **`lumen://` URL scheme**                    | Standard macOS deep linking for magic link callback                             |
| Encryption format  | **Own format** (not web-compatible)          | Simpler CryptoKit-native format; no cross-platform sync needed                  |

---

## Data Migration

Mac app starts with a clean database. No web vault migration — encryption formats are incompatible. Transcript import from markdown files (`~/Documents/conversations/`) is a post-parity task (see MVP 3 Tier 1 original item 1.6).

---

## Monorepo Structure Changes

### New directories

```
apps/apple/
  Lumen/
    LumenApp.swift
    Info.plist
    Lumen.entitlements
    Assets.xcassets/
    Models/
    Services/
    ViewModels/
    Views/
    Views/Components/
    Theme/
    Prompts/             # Swift prompt constants (synced manually from web)
  LumenTests/
  LumenUITests/
  Lumen.xcodeproj/
```

### Prompts

Prompt text is duplicated in Swift constants (in `Prompts/`), manually synced from the web's TypeScript constants in `apps/web/lib/llm/prompts.ts`, `apps/web/lib/session/summary.ts`, and `apps/web/lib/session/arc.ts`. Golden parity tests (fixture-based comparison of rendered prompt output) catch drift between the two codebases. No `shared/prompts/` directory — web app stays untouched.

---

## Go Backend Changes

Five changes to support the native app. All backward-compatible with the web app.

### 1. Return session token in verify response body

**File**: `apps/api/internal/handlers/auth.go` — `Verify` handler

Currently returns `{ "status": "ok" }` with the session ID only in the `Set-Cookie` header. Add the session token and user info to the response body so the Mac app can read it:

```go
httpx.WriteJSON(w, http.StatusOK, map[string]string{
    "status":        "ok",
    "session_token": sessionID,  // NEW
    "user_id":       userID,     // NEW
})
```

Web app ignores extra fields. Mac app reads `session_token`, stores in Keychain, sends as `Authorization: Bearer <token>` on subsequent requests.

### 2. Accept Bearer token in auth middleware

**File**: `apps/api/internal/middleware/auth.go` — `RequireAuthSession`

Currently reads session ID from cookie only. Add fallback to `Authorization: Bearer` header:

```go
// Try cookie first (web app)
cookie, err := r.Cookie(cfg.AuthCookieName)
sessionToken := ""
if err == nil { sessionToken = cookie.Value }

// Fall back to Authorization header (native app)
if sessionToken == "" {
    if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
        sessionToken = strings.TrimPrefix(auth, "Bearer ")
    }
}
```

### 3. Support native magic link URL format

**File**: `apps/api/internal/handlers/auth.go` — `RequestLink` handler

Add `client_type` field to the request payload:

```go
type requestLinkPayload struct {
    Email      string `json:"email"`
    ClientType string `json:"client_type"` // "web" (default) or "native"
}
```

When `client_type == "native"`, generate magic link as `lumen://auth/callback?token=<token>` instead of `https://mylumen.ai/login/callback?token=<token>`.

**Note**: The `magicLink()` helper method (`auth.go:223-225`) hardcodes the web URL format. It needs a `clientType` parameter to conditionally return the `lumen://` vs web URL.

### 4. Update email template

When `client_type == "native"`, the email body should say "Click to open in Lumen" instead of "Click to sign in" and use the `lumen://` URL.

### 5. Bearer-aware Logout handler

**File**: `apps/api/internal/handlers/auth.go` — `Logout` handler

Currently reads `r.Cookie(h.cfg.AuthCookieName)` to find the session to delete. The Mac app sends `Authorization: Bearer <token>`, not cookies. Apply the same cookie-first / Bearer-fallback pattern from the middleware change:

```go
// Try cookie first (web app)
cookie, err := r.Cookie(h.cfg.AuthCookieName)
sessionToken := ""
if err == nil { sessionToken = cookie.Value }

// Fall back to Authorization header (native app)
if sessionToken == "" {
    if auth := r.Header.Get("Authorization"); strings.HasPrefix(auth, "Bearer ") {
        sessionToken = strings.TrimPrefix(auth, "Bearer ")
    }
}
```

---

## Implementation Phases

### Phase 1: Foundation — Xcode project, crypto, SQLite, Keychain

**No UI. All services with unit tests.**

**Create**:

- Xcode project at `apps/apple/` targeting macOS 14.0+
- SPM dependencies: GRDB.swift, swift-markdown-ui, KeychainAccess
- `Models/` — Swift structs matching web types (`Message`, `SessionTranscript`, `SessionNotebook`, `UserArc`, `VaultMetadata`, `EncryptionHeader`, `LlmProviderKey`, etc.)
- `CryptoService` — port from `apps/web/lib/crypto.ts`:
  - `deriveKey(passphrase:salt:iterations:)` via CommonCrypto PBKDF2
  - `encrypt(data:key:)` → `AES.GCM.seal()` returns `SealedBox.combined` (nonce + ciphertext + tag as single `Data`)
  - `decrypt(combinedData:key:)` → `AES.GCM.SealedBox(combined:)` + `AES.GCM.open()`. No separate nonce param.
  - `hash(ciphertext:header:)` via SHA-256
  - Salt generation (16 bytes). No separate `generateIV()` — CryptoKit generates nonce internally.
- `DatabaseService` — port schema from `apps/web/lib/db.ts`:
  - GRDB migration for all tables (vault_metadata, session_transcripts, session_transcript_chunks, session_notebooks, user_arcs, user_profiles, llm_provider_keys, session_outbox)
  - CRUD matching `StorageService` interface from `apps/web/lib/storage/index.ts`
  - Encrypt-before-write / decrypt-on-read pattern from `apps/web/lib/storage/dexie-storage.ts`
  - Database at `~/Library/Application Support/Lumen/lumen.db`
- `KeychainService` — store/retrieve: derived vault key, OAuth token, auth session token
  - Use `kSecAttrAccessibleWhenUnlockedThisDeviceOnly` to prevent iCloud Keychain sync of encryption key
  - Detect stale Keychain entries on reinstall (DB gone but Keychain persists) — clear and re-setup
  - Clear all Keychain entries on logout (vault key, OAuth token, session token)
- Unit tests: round-trip encryption, CRUD operations, Keychain persistence

**Logging convention** (establish in Phase 1, used by all services):

- Use `os_log` with subsystem `com.lumen.app` and per-service categories (`crypto`, `database`, `anthropic`, `auth`, `outbox`, `session`)
- Structured key-value logging for debuggability. No third-party logging dependency.
- Debug builds log at `.debug` level; release builds at `.info` and above

**Concurrency and state invariants** (define before Phase 3):

- All UI mutation is `@MainActor`-only
- One inflight LLM stream per session (no concurrent streams)
- Monotonic chunk index for transcript chunk flushing
- Closure cannot start until pending chunk flush completes
- Session lifecycle state machine: locked → loading → active → reflecting → complete
- Actor isolation: `DatabaseService`, `AnthropicService`, `OutboxService`, `AuthService` as actors; ViewModels on `@MainActor`

**Port from web**:
| Web source | Swift target |
|---|---|
| `apps/web/lib/crypto.ts` | `Services/CryptoService.swift` |
| `apps/web/lib/storage/index.ts` (interface) | `Services/DatabaseService.swift` (protocol) |
| `apps/web/lib/storage/dexie-storage.ts` (encrypt/decrypt) | `Services/DatabaseService.swift` (impl) |
| `apps/web/lib/db.ts` (schema) | `Services/DatabaseService.swift` (GRDB migration) |
| `apps/web/types/storage.ts` | `Models/Storage.swift` |

### Phase 2: Auth + Vault UI

**Working login → setup → unlock → auto-unlock flow.**

**Create**:

- `AuthService` — HTTP client for Go backend (request-link, verify, session check, logout)
  - Magic link uses HTTPS callback fallback: email links to `mylumen.ai/auth/native?token=...` which auto-opens `lumen://auth/callback?token=...` and after 2s shows manual token copy fallback (covers web-based email clients and missing app)
  - Deep link handler for `lumen://auth/callback?token=...` via `.onOpenURL()`
  - Cold-start handling: queue deep link token if received before app init (DB, Keychain) completes, process after
  - Session token stored in Keychain (replaces web's HTTP cookie)
  - Port API from `apps/web/lib/api/auth.ts` and `apps/web/lib/api/client.ts`
- `VaultViewModel` — state machine: locked → unlocking → unlocked, idle timeout
- `LoginView` — email input, "Magic link sent" state, dev shortcut
  - Port from `apps/web/app/login/page.tsx`
- `SetupView` — passphrase creation with strength indicator, confirmation
  - Port from `apps/web/app/setup/page.tsx`
- `UnlockView` — passphrase entry, error handling, "wrong passphrase"
  - Port from `apps/web/app/unlock/page.tsx`
- Keychain auto-unlock: on launch, check Keychain for derived key → skip unlock
- Idle timeout (30 min): clear in-memory key when app is backgrounded too long
  - Port from `apps/web/components/vault-provider.tsx`
- `LumenTheme` — morning palette (teal accent, light + dark mode), font setup
  - Port values from `apps/web/app/globals.css` (morning palette section)
  - SF Pro for body (replacing Lato), bundle Fraunces for display headings
- Register `lumen://` URL scheme in Info.plist
- App entitlements: Keychain access, outgoing network

**Go backend changes** (items 1–5 from above):

- Verify returns session_token in body
- Middleware accepts Bearer header
- request-link supports client_type=native (+ `magicLink()` refactor)
- Email template for native links
- Logout handler accepts Bearer header

### Phase 3: LLM Client + Chat Core

**Working chat with streaming responses.**

**Create**:

- `AnthropicService` — SSE streaming + non-streaming calls
  - Port from `apps/web/lib/llm/client.ts`
  - `streamMessages()` → `AsyncThrowingStream<String, Error>`
  - `callMessages()` → `String` (for notebook/arc generation)
  - **Claude Code identity injection**: Prepend `"You are Claude Code, Anthropic's official CLI for Claude."` as first system text block when using `sk-ant-oat-*` tokens (replicates `buildClaudeCodeSystemPrompt()` from `route.ts:37-43`)
  - **Required headers** (hardcoded constants, sourced from `route.ts:45-56`):
    - `Authorization: Bearer <token>`
    - `anthropic-version: 2023-06-01`
    - `anthropic-beta: claude-code-20250219,oauth-2025-04-20,interleaved-thinking-2025-05-14,fine-grained-tool-streaming-2025-05-14`
    - `user-agent: claude-cli/2.1.2 (external, cli)`
    - `x-app: cli`
    - `anthropic-dangerous-direct-browser-access: true`
  - **SSE event accumulator** (`SSEParser`): buffer lines via `URLSession.bytes.lines`, flush on blank line delimiter, handle `:` keepalive/comment lines, ignore unknown event types. Events: `message_start`, `content_block_start`, `content_block_delta`, `message_delta`, `message_stop`, `error`
  - **Structured SSE logging**: log every event type received, parse failures, stream lifecycle (start, first-data, complete, error, timeout) via `os_log`
  - Retry with exponential backoff (900ms base, 5s max, 2 retries). **No retry after partial streaming**: once data emitted to UI, expose partial content + error state (replicate web's `hasYielded` guard from `client.ts:630`)
  - Error classification: unavailable, invalid key, abort, response error
  - **Token expiry UX**: detect invalid/expired `sk-ant-oat-*` token → navigate to Settings → re-enter → validate → resume
  - Timeout: 120s streaming, 30s non-streaming
- `SystemPrompt.swift` — `buildSystemPrompt(sessionNumber:sessionContext:)`
  - Port from `apps/web/lib/llm/prompts.ts`
  - Prompt text duplicated as Swift constants (manually synced from web TypeScript)
- **Chat orchestration split** (port from `apps/web/app/chat/page.tsx` + `use-llm-conversation.ts` + `use-session-lifecycle.ts`):
  - `ChatViewModel` (`@MainActor`) — UI state: messages, streamingContent, isTyping, llmKey. Send/receive orchestration. Initial Lumen greeting on new session.
  - `SessionManager` (actor) — transcript persistence, chunk flushing (debounced 1.2s, encrypted), session lifecycle state machine (locked → loading → active → reflecting → complete), session init (new or resume)
  - `StreamingCoordinator` — SSE stream lifecycle, abort/interrupt handling with partial content recovery, `hasYielded` guard
- `ChatView` — main chat interface
  - `ScrollViewReader` with scroll-to-top on user message send
  - Port from `apps/web/components/chat/chat-body.tsx`
- `MessageBubble` — user + Lumen message rendering
  - Lumen: `MarkdownView` with themed styling
  - User: right-aligned, with collapse on long messages (>200px)
  - Port from `apps/web/components/chat/lumen-message.tsx` + `user-message.tsx`
- `ChatInputView` — auto-resize TextEditor, Enter=send, Shift+Enter=newline
  - Port from `apps/web/components/chat/chat-input.tsx`
- `TypingIndicator` — pulsing lightbulb (SF Symbol `lightbulb.fill`)
  - Pulse: opacity 0.5→1→0.5, scale 0.95→1.1→0.95, 2s loop
  - Static after streaming ends
  - Port from `apps/web/components/chat/typing-indicator.tsx`
- `ProviderGateView` — OAuth token entry + validation
  - Port from `apps/web/components/chat/provider-gate.tsx`
- Token entry validates with a test API call before saving to Keychain
- **Prompt parity tests**: golden fixture-based tests comparing rendered prompt output between web TypeScript builder and Swift builder for identical inputs. Catches drift since prompts aren't shared.

### Phase 4: Context Assembly + Session Closure — PARITY SHIP CHECKPOINT

**Multi-session continuity. The heart of Lumen.**

> After Phase 4 completes, the app has working auth, chat, streaming, multi-session continuity, and closure — enough for daily use. Phases 5-6 are polish. This is the ship checkpoint.

**Create**:

- `ContextAssemblyService` — budget-aware context builder
  - Port from `apps/web/lib/context/assembly.ts` (226 lines)
  - Assembly order: YAML front matter → Arc → notebooks (newest first) → recent transcripts → random older (Fisher-Yates)
  - Budget: 200K total, 60K reserved, 140K available ≈ 560K chars (4 chars/token)
  - Seed context detection (arc exists + session 1)
  - **Memory management**: decrypt transcripts, build context string, then release decrypted data. Don't hold 50+ decrypted transcripts in memory simultaneously.
- `ClosureService` — notebook + arc generation
  - Port prompts from `apps/web/lib/session/summary.ts` (NOTEBOOK_PROMPT) + `apps/web/lib/session/arc.ts`
  - `generateNotebook()` — non-streaming LLM call, 4096 max tokens, 120s timeout
  - `createArc()` / `updateArc()` — non-streaming, same params
  - `extractClosureFields()` — parse parting words + action steps from notebook markdown
  - Port from `apps/web/app/chat/page.tsx` `generateNotebookAndArc()`
- `SessionClosureView` — 4-step choreographed closure UI
  - Steps: wrapping-up (600ms min) → storing (600ms min) → reflecting (sub-stages: intro 1800ms, notebook 2500ms, arc 700ms, almost-done 700ms) → done
  - **These stage minimum durations and non-fatal Arc failure handling are product requirements**, not just implementation details. Port exactly.
  - Done state: parting words blockquote, action steps, share button, return home
  - Port from `apps/web/components/chat/session-closure.tsx`
- `SessionStartView` — pre-chat landing
  - Time-based greeting, active session detection, "Let's go" button
  - Seed arc import (collapsible textarea, helper prompt, auto-save)
  - Port from `apps/web/app/session/page.tsx` + `apps/web/components/seed-arc-import.tsx`
- `EndSessionDialog` — confirmation before wrapping up
  - Port from `apps/web/components/chat/end-session-dialog.tsx`
- Wire session context into `ChatViewModel.buildSystemPrompt()`

### Phase 5: History + Settings + Outbox

**Feature-complete.**

**Create**:

- `HistoryViewModel` + `HistoryView` — list past sessions
  - Session cards: number, date, truncated parting words (80 chars)
  - Newest first, empty state
  - Port from `apps/web/app/history/page.tsx`
- `TranscriptView` — read-only session transcript viewer
  - Decrypt + display full conversation
  - Parting words blockquote, action steps
  - Port from `apps/web/app/history/[sessionId]/page.tsx`
- `SettingsView` — app preferences
  - OAuth token: view (masked), change, validate
  - Appearance: system / light / dark
  - Account: email display, auth status
  - Lock vault button
  - About / version
  - Port settings from `apps/web/components/sidebar.tsx`
- `OutboxService` — background session metadata sync
  - Port from `apps/web/lib/outbox/session-outbox.ts`
  - Queue session_start / session_end events
  - Exponential backoff (2s base, 60s max, 6 attempts)
  - Flush on network availability (NWPathMonitor)
- Navigation: `NavigationSplitView` sidebar
  - Chat (current session or start)
  - History
  - Settings
- macOS menu bar: File > New Session, View > Lock Vault, etc.
- `ChatTopBar` — session number, date, elapsed time, wrap-up button
  - Port from `apps/web/components/chat/chat-top-bar.tsx`
- `ScrollToBottomButton` — floating button when scrolled away from bottom
  - Port from `apps/web/components/chat/scroll-to-bottom.tsx`
- Message actions: copy via right-click context menu
  - Port from `apps/web/components/chat/message-actions.tsx`

### Phase 6: Polish + Testing

**Production-quality.**

- **Passphrase recovery mechanism**: Recovery key (24-word mnemonic or base64) shown at setup. Encrypted blob stored in vault metadata. "Forgot passphrase?" link on unlock page → enter recovery key → decrypt stored key blob → vault unlocks → set new passphrase. No server involvement.
- **App distribution**: Clarify target — dev-only (run from Xcode), GitHub releases (needs signing + notarization), or Mac App Store (full sandbox). Even for personal use, unsigned apps trigger Gatekeeper warnings (`xattr -d com.apple.quarantine` required).
- **Sparkle auto-updates**: If distributing via GitHub releases, add [Sparkle](https://sparkle-project.org/) (SPM) for automatic update checks. Appcast XML hosted alongside releases. Without this, every update means manually downloading and replacing the app.
- **App lifecycle edge cases**:
  - Mac sleep/wake during active stream → detect via `NSWorkspace.willSleepNotification`, pause/resume or cancel stream gracefully
  - Force-quit during closure → on next launch, detect incomplete closure (notebook saved but no Arc) and offer to retry
  - Network drop mid-stream → map to timeout/unavailable error, not silent hang
  - `scenePhase` changes → trigger idle timeout check, flush pending chunks
- Keyboard shortcuts: Cmd+N (new session), Cmd+L (lock), Cmd+, (settings), Esc (dismiss)
- Window management: remember size/position, minimum size
- Accessibility: VoiceOver labels, Dynamic Type, keyboard navigation, tab order, `@Environment(\.accessibilityReduceMotion)` to disable pulse animations, increased contrast support
- Error states: unavailable, connection error, invalid key, interrupted stream, reflection failed
  - Port error handling patterns from `apps/web/app/chat/page.tsx`
- App icon
- Unit tests: CryptoService, DatabaseService, AnthropicService (SSE parsing), ContextAssemblyService, ClosureService (markdown parsing)
- **Visual regression tests**: swift-snapshot-testing for key views (ChatView, SessionClosureView, HistoryView, SettingsView). Reference images recorded on first run; subsequent runs diff against them.
- UI tests: auth flow, chat flow, end session, history navigation (XCUITest)
- Verify: scroll is smooth with 50+ messages, streaming doesn't drop frames

---

## SPM Dependencies (3 core + 2 optional)

| Package                                                                         | Version | Purpose                                                                   |
| ------------------------------------------------------------------------------- | ------- | ------------------------------------------------------------------------- |
| [GRDB.swift](https://github.com/groue/GRDB.swift)                               | 7.x     | SQLite: migrations, type-safe queries, WAL mode, observation              |
| [swift-markdown-ui](https://github.com/gonzalezreal/swift-markdown-ui)          | 2.x     | Full markdown rendering as native SwiftUI views                           |
| [KeychainAccess](https://github.com/kishikawakatsumi/KeychainAccess)            | 4.x     | Clean API for Keychain CRUD (vault key, OAuth token, session)             |
| [Sparkle](https://github.com/sparkle-project/Sparkle)                           | 2.x     | _(Phase 6, if distributing outside App Store)_ Auto-update framework      |
| [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing) | 1.17+   | _(Phase 6, test target only)_ Visual regression testing for SwiftUI views |

**System frameworks (no SPM)**: CryptoKit (AES-GCM), CommonCrypto (PBKDF2), Network (NWPathMonitor), Security (Keychain fallback), os (structured logging).

---

## Verification Plan

| Phase           | How to verify                                                                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Foundation   | Unit tests pass: encrypt/decrypt round-trip, SQLite CRUD, Keychain store/retrieve                                                               |
| 2. Auth + Vault | Launch app → login via magic link → setup passphrase → lock → relaunch → auto-unlock from Keychain                                              |
| 3. Chat         | Send message → see streaming response → send another → verify conversation state persists across app relaunch                                   |
| 4. Context      | End session → verify notebook + arc generated in SQLite → start new session → verify context includes previous session data in Lumen's greeting |
| 5. History      | View past sessions → open transcript → verify all messages rendered → verify outbox syncs to Go backend                                         |
| 6. Polish       | Keyboard shortcuts work, VoiceOver reads correctly, scroll smooth with many messages, error states display properly                             |

---

## UI Verification (Agent Feedback Loop)

The web app uses Playwright + SweetLink for agent-driven UI verification. The Mac app equivalent is a two-loop system combining Xcode 26.3 agents with Peekaboo MCP.

### Compile-Time Loop: Xcode 26.3 Agentic Coding

Xcode 26.3 (RC Feb 2026) embeds Claude Agent + OpenAI Codex directly in the IDE with native tools:

- Create/modify files and examine project structure
- Build the project, read build logs, iterate on errors autonomously
- Run tests and read results
- Capture **Xcode Preview snapshots** for visual verification
- Access full Apple developer documentation (formatted for AI)
- Full agent transcript with undo capability

Xcode exposes these tools via **MCP**, so any MCP-compatible agent can access them.

### Runtime Loop: Peekaboo MCP

[Peekaboo](https://github.com/steipete/Peekaboo) (by steipete, 2,300+ stars) is the Playwright equivalent for native Mac apps. It provides an MCP server with 25+ tools:

- `see --app LumenApp` → accessibility tree snapshot + screenshot with element IDs
- `click` / `type` / `scroll` → interact with specific elements by ID
- `hotkey` / `press` → keyboard shortcuts
- `window` / `menu` / `menubar` → window and menu management

**Setup**:

```bash
brew install steipete/tap/peekaboo
# Add as MCP server for Claude Code
```

**Requirements**: macOS 15+ (Sequoia), Screen Recording + Accessibility permissions granted to Terminal.

**Agent workflow** (same as Playwright's snapshot → act → verify):

1. Build and launch: `xcodebuild ... && open .../LumenApp.app`
2. `see --app LumenApp` → get accessibility tree + screenshot
3. Inspect: "Is chat input visible? Does session list show 3 items?"
4. `click` / `type` to interact
5. `see` again to verify result

### Supplementary Tools

| Tool                                                                            | Phase     | Purpose                                                                           |
| ------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| [swift-snapshot-testing](https://github.com/pointfreeco/swift-snapshot-testing) | 6         | Visual regression — diff SwiftUI views against reference images via `swift test`  |
| XCUITest                                                                        | 6         | Full E2E test suite — structured UI tests with screenshots in `.xcresult` bundles |
| [ViewInspector](https://github.com/nalexn/ViewInspector)                        | As needed | Assert on SwiftUI view hierarchy structure without rendering                      |

### How the Loops Combine

| Loop           | Tool                   | Verifies                                           | Equivalent on web                   |
| -------------- | ---------------------- | -------------------------------------------------- | ----------------------------------- |
| Compile-time   | Xcode 26.3 agent       | Code compiles, tests pass, Previews render         | `pnpm build && pnpm test`           |
| Runtime        | Peekaboo MCP           | Running app works end-to-end, interactions correct | `pnpm sweetlink smoke` / Playwright |
| Regression     | swift-snapshot-testing | No unintended visual changes across builds         | Screenshot diff tests               |
| Structured E2E | XCUITest               | Repeatable test suites with screenshots            | `chat-regression.spec.ts`           |

> See also: `docs/architecture/agent-verification.md` for the cross-platform verification approach.

---

## Critical Web Files to Port (Reference)

| Web file                                      | What to port                    | Swift target                                   |
| --------------------------------------------- | ------------------------------- | ---------------------------------------------- |
| `apps/web/lib/crypto.ts`                      | PBKDF2 + AES-GCM + SHA-256      | `CryptoService.swift`                          |
| `apps/web/lib/storage/index.ts`               | StorageService interface        | `DatabaseService.swift` (protocol)             |
| `apps/web/lib/storage/dexie-storage.ts`       | Encrypt/decrypt + CRUD          | `DatabaseService.swift` (implementation)       |
| `apps/web/lib/db.ts`                          | Dexie schema (tables, indexes)  | `DatabaseService.swift` (GRDB migration)       |
| `apps/web/types/storage.ts`                   | All data types                  | `Models/Storage.swift`                         |
| `apps/web/lib/llm/client.ts`                  | SSE streaming + retry           | `AnthropicService.swift`                       |
| `apps/web/lib/llm/prompts.ts`                 | System prompt builder           | `Prompts/SystemPrompt.swift`                   |
| `apps/web/lib/context/assembly.ts`            | Context assembly + budget       | `ContextAssemblyService.swift`                 |
| `apps/web/lib/session/summary.ts`             | Notebook prompt + parsing       | `ClosureService.swift`                         |
| `apps/web/lib/session/arc.ts`                 | Arc prompts + message builders  | `ClosureService.swift`                         |
| `apps/web/app/chat/page.tsx`                  | Chat orchestration (683 lines)  | `ChatViewModel.swift` + `SessionManager.swift` |
| `apps/web/lib/hooks/use-llm-conversation.ts`  | Streaming + message mgmt        | `StreamingCoordinator.swift`                   |
| `apps/web/lib/hooks/use-session-lifecycle.ts` | Session init + chunk flush      | `SessionManager.swift`                         |
| `apps/web/app/api/llm/anthropic/route.ts`     | Anthropic headers + body format | `AnthropicService.swift` (direct, no proxy)    |
| `apps/web/lib/api/auth.ts`                    | Auth HTTP calls                 | `AuthService.swift`                            |
| `apps/web/components/vault-provider.tsx`      | Idle timeout logic              | `VaultViewModel.swift`                         |
| `apps/web/app/globals.css` (morning palette)  | Color values (HSL)              | `Theme/LumenTheme.swift`                       |
| `apps/web/components/chat/*.tsx`              | All chat UI components          | `Views/` directory                             |
| `apps/web/app/session/page.tsx`               | Session start page              | `SessionStartView.swift`                       |
| `apps/web/app/history/*.tsx`                  | History pages                   | `HistoryView.swift` + `TranscriptView.swift`   |
| `apps/web/lib/outbox/session-outbox.ts`       | Outbox queue + retry            | `OutboxService.swift`                          |
