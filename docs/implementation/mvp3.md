# MVP 3 Implementation

Last Updated: 2026-02-22
Status: In progress (restructured)

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline. This is how the next session picks up context.

---

## Running Updates

- 2026-02-22: Second restructure pass. Moved billing (4.2), managed sync (4.3), folder sync (3.1), and system prompt protection (4.4) to `backlog.md` Later. Rationale: Lumen will be a local open-source app before any monetization. Encrypted sync and billing are future paid-tier features. Voice input stays — natural fit for the Mac app experience. MVP 3 is now 3 tiers, 7 items.
- 2026-02-22: First restructure. Moved old Tier 2 (prompt quality, eval harness, design polish) to `backlog.md` under Soon (MVP 4). Moved all Soul Vault integration items (old 1.2, 4.1, 4.2) to `backlog.md` under Later. Lumen will use local file storage rather than depending on Soul Vault as a separate app. Renumbered remaining tiers.
- 2026-02-20: Completed old 1.1 (seed arc import). Simpler approach than planned: reuses `UserArc` with `last_session_number: 0` instead of new `SeedArc` type — no schema migration, no new Dexie table. Collapsible card on session page for first-time users with copyable helper prompt. Auto-saves on unmount if user clicks "Let's go" without explicit save. Added `seed_context` hint to context assembly YAML front matter so Lumen greets warmly and acknowledges prior context. Also shipped voice dictation tip in chat footer.
- 2026-02-20: Completed old 2.3 (legacy sessionSummaries removal). Dropped Dexie table via v3 schema, removed types/methods/component/tests (~470 lines). Updated E2E mocks from legacy JSON to notebook markdown format. Also changed share button from "Share reflection" to "Share Lumen" (app link instead of private content).
- 2026-02-18: Added system prompt leakage protection to prompt quality observations. Moved design polish into Tier 2. Added Open Questions section (free-to-paid transition).
- 2026-02-18: Restructured tiers. Split context import from prompt quality. Removed iOS (deferred to Later). Replaced biometric unlock with Keychain-only unlock.
- 2026-02-18: Finalized for execution. Added: evaluation harness + prompt versioning, legacy schema cleanup, passphrase recovery, design + atmospheric polish. Reconciled with backlog.
- 2026-02-17: Initial plan created. Scope defined from MVP 2 deferrals + backlog items + architectural decisions from desktop/mobile/storage conversations.

---

## North Star

> **"Make this the reflection corner of my life."**

MVP 1 answered: _"Can this exist?"_
MVP 2 answered: _"Does this change someone?"_
MVP 3 answers: **"Can I build my life around this?"**

The pivot: Lumen is a personal tool — a journaling companion for self-reflection, conversation, and feedback on where I'm at and what I'm thinking. Not a public product yet. Build something I absolutely love using every day, and the rest follows.

### Design Targets

| #   | Target                      | How We Hit It                                       |
| --- | --------------------------- | --------------------------------------------------- |
| 1   | _"It lives on my machine"_  | Swift native Mac app — real app, not a tab          |
| 2   | _"It feels like talking"_   | Voice input — speak, don't type                     |
| 3   | _"It keeps getting better"_ | Prompt quality, individual mentors, natural closure |

---

## Tier 1 — "It lives on my machine"

**Goal**: Lumen moves from a browser tab to a native Mac app. Storage moves from IndexedDB to SQLite.

### 1.1 Migrate storage: IndexedDB → SQLite `[L]`

**Problem**: IndexedDB is browser-controlled, non-portable, and has eviction risks. A SQLite file is portable, powerful, and works everywhere.

**Approach**:

- Define `VaultStore` interface matching current Dexie usage patterns
- Implement `SQLiteVaultStore` using wa-sqlite + OPFS for web
- Keep `DexieVaultStore` as fallback during migration
- Migration path: on first load with SQLite, detect Dexie data, offer one-time migration
- Encryption: AES-GCM at the application layer (encrypt before writing to SQLite, decrypt on read). Same PBKDF2 key derivation

**Schema** (derived from current Dexie tables):

```sql
-- Core tables (encrypted content stored as blobs)
CREATE TABLE transcripts (id TEXT PRIMARY KEY, session_id TEXT, data BLOB, created_at TEXT);
CREATE TABLE session_notebooks (id TEXT PRIMARY KEY, session_id TEXT, data BLOB, created_at TEXT);
CREATE TABLE user_arcs (id TEXT PRIMARY KEY, data BLOB, updated_at TEXT);
-- Note: seed arcs are stored as regular user_arcs with last_session_number=0 (no separate table needed)
CREATE TABLE vault_meta (key TEXT PRIMARY KEY, value TEXT);
```

**Code refs**:

- New: `lib/storage/sqlite.ts` (wa-sqlite wrapper), `lib/storage/vault-store.ts` (interface)
- Modified: all storage consumers switch from Dexie direct calls to `VaultStore` interface
- Keep: `lib/storage/dexie.ts` (backward compat + migration source)

**Ripple effects**: Export/import becomes "copy the `.db` file." Sync becomes "sync the `.db` file." Desktop reads the same file natively.

---

### 1.2 Static export for Next.js `[M]`

**Problem**: The Swift desktop app loads the React app from local files. Next.js needs to produce a static build.

**Approach**:

- Add `output: 'export'` to `next.config.mjs` (conditional on build target)
- The one API route (`/api/llm/anthropic`) moves to the Swift native layer for desktop — not needed in static build
- Verify all pages work without a Node.js server (they should — all are `'use client'`)
- Handle the Go backend rewrite (`/v1/:path*`) — on desktop, the Swift layer handles auth directly or the user authenticates via web

**Key consideration**: The web version keeps the current Next.js server setup. Static export is only for the desktop build target.

---

### 1.3 Swift native app — macOS `[L]`

**Problem**: A browser tab isn't a product. A native Mac app is.

**Approach**:

- Single Xcode project with macOS target
- `WKWebView` loads the static-exported React app from app bundle
- Swift native layer handles:
  - **Anthropic API calls**: `URLSession` with SSE streaming. API key stored in macOS Keychain
  - **SQLite**: Native SQLite (built into macOS, zero dependencies). Same schema as wa-sqlite web version
  - **JS ↔ Swift bridge**: `WKScriptMessageHandler` (JS → Swift) and `evaluateJavaScript` (Swift → JS)
  - **Window chrome**: Native menu bar, window management, about dialog
  - **Local data**: All vault data stored in Lumen's app-scoped workspace folder
- Bundle size target: ~5 MB

**Code refs**:

- New: `apps/apple/` — Xcode project with `Shared/`, `macOS/` directories
- `Shared/VaultStore.swift` — SQLite + encryption
- `Shared/AnthropicClient.swift` — streaming API calls
- `Shared/KeychainHelper.swift` — API key + vault key storage
- `Shared/WebBridge.swift` — JS ↔ Swift messaging

**Monorepo integration**: `apps/apple/` sits alongside `apps/web/` and `apps/api/`. Build script copies static web export into the Xcode project's resources.

---

### 1.4 Keychain vault unlock `[S]`

**Problem**: Typing a passphrase every time the app launches is friction. On macOS, the system Keychain is already unlocked when the user logs in — the derived key should live there.

**Approach**:

- After first passphrase entry, offer to store the derived encryption key in macOS Keychain
- On subsequent launches: app retrieves key from Keychain automatically — vault unlocks with zero user interaction
- Fallback: passphrase entry always available (Keychain item missing, user opts out, or Keychain locked)
- Keychain item scoped to the app's bundle ID

**Depends on**: 1.3 (macOS app with Keychain access)

**Note**: No biometric (Touch ID / Face ID) requirement. Standard Keychain access is sufficient — the user's macOS login password already protects the Keychain.

---

### 1.5 Passphrase recovery mechanism `[M]`

**Problem**: If a user forgets their passphrase, their entire conversation history is permanently inaccessible. By MVP 3, testers will have months of meaningful conversation history — losing it would be devastating and trust-destroying.

**Prior art**: LastPass and Obsidian both generate a recovery key at setup time that the user stores offline. Same pattern here.

**Approach**:

- **At setup**: After deriving the encryption key from the passphrase, generate a random recovery key (24-word mnemonic or base64 string). Encrypt the derived key with the recovery key and store the encrypted blob alongside vault metadata.
- **Show once**: Display the recovery key with clear instructions: "Save this somewhere safe. It's the only way to recover your vault if you forget your passphrase." Require acknowledgment (checkbox: "I've saved my recovery key") before proceeding.
- **On recovery**: Add a "Forgot passphrase?" link on the unlock page. User enters recovery key → decrypts the stored key blob → vault unlocks → user sets a new passphrase.
- **No server involvement**: Recovery key generated and used entirely client-side.

**Code refs**:

- `apps/web/app/setup/page.tsx` — vault initialization, passphrase setup
- `apps/web/lib/crypto.ts` — key derivation
- `apps/web/app/unlock/page.tsx` — unlock flow, add recovery path

**UX note**: Frame as empowerment, not fear: "This is your backup key. Keep it somewhere safe — a password manager, a note in your desk, wherever you won't lose it."

**Depends on**: Nothing. Can be implemented on the current web stack before SQLite migration.

---

### 1.6 Transcript import script — developer migration `[S]`

**Problem**: Existing conversation transcripts, notebooks, and Arc stored as local markdown files (e.g., `~/Documents/conversations/`) need to be imported into Lumen's encrypted storage so they appear as native sessions.

**Approach**:

- CLI script targeting SQLite directly (runs after 1.1 lands — no Dexie path needed)
- Parses `transcripts/` — splits on `**USER:**` / `**ASSISTANT:**` markers → `Message[]` per session
- Parses `notebooks/` — reads matching notebook markdown per session, maps `## Mentor's Notebook` → parting words for closure UI
- Reads `arc.md` → imports as `UserArc` with version set to session count
- Assigns session metadata (session_id, session_number, date) from filenames (e.g., `contribution_5_2026-01-25.md`)
- Encrypts everything with the vault passphrase (same PBKDF2 + AES-GCM pipeline)
- No LLM calls — direct data hydration
- No UI — run once from terminal, done

**Depends on**: 1.1 (SQLite migration)

**Result**: Lumen sees all imported sessions in history, notebooks feed context assembly, Arc reflects the full journey. Indistinguishable from sessions that happened natively in Lumen.

---

## Tier 2 — "It feels like talking"

**Goal**: Speaking is more natural than typing for reflective conversations.

### 2.1 Voice input (speech-to-text) `[M]`

**Problem**: For a companion app, speaking is more natural than typing — especially for reflective conversations.

**Approach**:

- Web: Browser Web Speech API (Chrome/Edge have good support; Safari is improving)
- Desktop (Swift): Native Speech framework — better accuracy, offline support
- UI: Microphone button next to Send. Tap to start, tap to stop. Transcribed text appears in input area for review before sending
- No voice storage — transcribe in real-time, discard audio

---

## Tier 3 — "Sharpen the experience"

**Goal**: Make conversations better, closure smoother, and the product more distinctive.

### 3.1 Natural session wrap-up `[M]`

**Problem**: Users don't click the wrap-up button, which means they miss the best part of the experience (parting words, "what opened," the notebook). The closure content is a goldmine, but it's gated behind a manual action that feels like an interruption.

**Approach**: Need a way to wrap up that feels natural and not premature. Options: (a) Lumen detects a natural ending and suggests closing ("This feels like a good place to pause — want me to wrap up our session?"), (b) a gentle visual nudge after conversational signals (farewell language, gratitude, energy dropping), (c) time-based hint after 15-20+ minutes, (d) Lumen's closing message triggers the closure flow automatically. The key constraint: it must feel _natural_, not robotic or early. See `docs/feedback/2026-02-18-meg-in-person.md`.

---

### 3.2 Individual mentor mode `[L]`

**Problem**: Unified Lumen listens on 5 lenses but sometimes you want to go deep with a single perspective — the no-BS career guy, the vitality mentor, etc.

**Approach**: Per-mentor voices (one perspective each) alongside unified Lumen. Each mentor gets their own voice/style wrapper around a single perspective domain. Includes: `buildSystemPrompt()` mode parameter (unified vs. individual), mentor selection UI, session tagging by mentor type for context assembly, domain-specific tracking instructions, depth escalation across sessions. Source prompts at `~/Documents/conversations/mentoring-prompts/`. Unified voice quality comes first.

---

### 3.3 Async Arc update after closure `[M]`

**Problem**: "Writing session notebook... and Creating your Arc... took a long time" (Iman). Arc generation blocks the closure UI, adding friction after every session.

**Approach**: Decouple Arc generation from blocking closure UI. End session after notebook save, then enqueue Arc create/update in background (retryable outbox/worker) with a lightweight "reflection still finalizing" state.

**Code refs**:

- `apps/web/app/chat/page.tsx` — `generateNotebookAndArc()`
- `apps/web/lib/session/arc.ts` — Arc creation/update

---

### 3.4 Prompt quality iteration `[M]`

**Problem**: After 10+ sessions, several patterns have emerged where Lumen's conversational behavior doesn't match the intended companion experience.

**Approach**: Address observed issues from real sessions: rote openings, response verbosity, story consistency (no self-referential narratives), conversational pacing (one thread at a time), core vs. tactical session distinction, system prompt leakage defense, and pronoun voice in closure UI. Iterate on `docs/mentoring/system-prompts-v2.md` and `apps/web/lib/llm/prompts.ts`. Use real transcripts as test cases. See mvp3 running updates for full observation detail.

---

---

## Architecture References

| Area                       | Document                                     |
| -------------------------- | -------------------------------------------- |
| Context assembly + closure | `docs/architecture/harness-flow.md`          |
| System architecture        | `docs/architecture/overview.md`              |
| Notebook/Arc prompts       | `docs/mentoring/notebook-and-arc-prompts.md` |
| System prompt v2           | `docs/mentoring/system-prompts-v2.md`        |
| Backlog                    | `docs/implementation/backlog.md`             |
