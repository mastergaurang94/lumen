# MVP 3 Implementation

Last Updated: 2026-02-17
Status: Planning

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline. This is how the next session picks up context.

---

## Running Updates

- 2026-02-17: Initial plan created. Scope defined from MVP 2 deferrals + backlog items + architectural decisions from desktop/mobile/storage conversations.

---

## North Star

> **"Make this a real product people pay for."**

MVP 1 answered: _"Can this exist?"_
MVP 2 answered: _"Does this change someone?"_
MVP 3 answers: **"Can someone build their life around this?"**

The signal: users trust Lumen enough to make it a habit, bring it to a new device, and recommend it to someone specific.

### Design Targets

| #   | Target                      | How We Hit It                                    |
| --- | --------------------------- | ------------------------------------------------ |
| 1   | _"It already knew me"_      | Soul Vault import seeds the Arc before session 1 |
| 2   | _"It lives on my machine"_  | Swift native app — real app, not a browser tab   |
| 3   | _"My data goes where I go"_ | Encrypted SQLite file + folder-based sync        |
| 4   | _"I can talk to it"_        | Voice input — speak instead of type              |
| 5   | _"I'd pay for this"_        | Provider billing + managed sync tier             |

---

## Tier 1 — "Know me from day one"

**Goal**: New users don't start from zero. Soul Vault seeds Lumen's understanding.

### 1.1 Soul Vault import — web (file upload) `[M]`

**Problem**: Every new Lumen user starts as a stranger. If they have a Soul Vault with months of AI conversation history, that context should bootstrap the relationship.

**Design target**: Target #1 — _"It already knew me."_

**Approach**:

- Add "Import from Soul Vault" to Lumen's setup flow or settings
- User runs `soul query --profile lumen` on their machine, gets a seed Arc markdown file
- User uploads the file to Lumen via file picker
- Lumen stores it as a `SeedArc` entry in the vault
- Context assembly includes the seed Arc for the first session (and until the living Arc absorbs it)

**Code refs**:

- New: settings UI for import, `SeedArc` type in `types/storage.ts`
- Modified: `assembly.ts` (include seed Arc in context), Dexie schema (or SQLite if migration lands first)

**Integration doc**: `docs/architecture/soul-vault-integration.md`

**Note**: This is the web-only version. Desktop gets direct filesystem access (see 3.1).

---

### 1.2 Lumen → Soul Vault export — web (download) `[S]`

**Problem**: Lumen's session insights should flow back to the user's Soul Vault, enriching their unified self-knowledge.

**Approach**:

- After session closure, offer "Save to Soul Vault" download button for the session notebook
- User drops the file into `~/soul-vault/.inbox/lumen/`
- `soul watch` ingests it automatically

**Note**: On desktop, this becomes automatic (no download step). See 3.2.

---

## Tier 2 — "It lives on my machine"

**Goal**: Lumen moves from a browser tab to a native app. Storage moves from IndexedDB to SQLite.

### 2.1 Migrate storage: IndexedDB → SQLite `[L]`

**Problem**: IndexedDB is browser-controlled, non-portable, and has eviction risks on iOS. A SQLite file is portable, powerful, and works everywhere.

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
CREATE TABLE seed_arcs (id TEXT PRIMARY KEY, source TEXT, data BLOB, imported_at TEXT);
CREATE TABLE vault_meta (key TEXT PRIMARY KEY, value TEXT);
```

**Code refs**:

- New: `lib/storage/sqlite.ts` (wa-sqlite wrapper), `lib/storage/vault-store.ts` (interface)
- Modified: all storage consumers switch from Dexie direct calls to `VaultStore` interface
- Keep: `lib/storage/dexie.ts` (backward compat + migration source)

**Ripple effects**: Export/import becomes "copy the `.db` file." Sync becomes "sync the `.db` file." Desktop reads the same file natively.

---

### 2.2 Static export for Next.js `[M]`

**Problem**: The Swift desktop app loads the React app from local files. Next.js needs to produce a static build.

**Approach**:

- Add `output: 'export'` to `next.config.mjs` (conditional on build target)
- The one API route (`/api/llm/anthropic`) moves to the Swift native layer for desktop — not needed in static build
- Verify all pages work without a Node.js server (they should — all are `'use client'`)
- Handle the Go backend rewrite (`/v1/:path*`) — on desktop, the Swift layer handles auth directly or the user authenticates via web

**Key consideration**: The web version keeps the current Next.js server setup. Static export is only for the desktop/mobile build target.

---

### 2.3 Swift native app — macOS `[L]`

**Problem**: A browser tab isn't a product. A native Mac app is.

**Approach**:

- Single Xcode project with macOS target (iOS target added later)
- `WKWebView` loads the static-exported React app from app bundle
- Swift native layer handles:
  - **Anthropic API calls**: `URLSession` with SSE streaming. API key stored in macOS Keychain
  - **SQLite**: Native SQLite (built into macOS). Same schema as wa-sqlite web version
  - **JS ↔ Swift bridge**: `WKScriptMessageHandler` (JS → Swift) and `evaluateJavaScript` (Swift → JS)
  - **Window chrome**: Native menu bar, window management, about dialog
  - **Soul Vault integration**: Direct filesystem read from `~/soul-vault/.exports/`, subprocess calls to `soul query`
- Bundle size target: ~5 MB

**Code refs**:

- New: `apps/apple/` — Xcode project with `Shared/`, `macOS/` directories
- `Shared/VaultStore.swift` — SQLite + encryption
- `Shared/AnthropicClient.swift` — streaming API calls
- `Shared/KeychainHelper.swift` — API key storage
- `Shared/WebBridge.swift` — JS ↔ Swift messaging

**Monorepo integration**: `apps/apple/` sits alongside `apps/web/` and `apps/api/`. Build script copies static web export into the Xcode project's resources.

---

### 2.4 Swift native app — iOS `[M]`

**Problem**: Users want Lumen on their phone.

**Approach**:

- Add iOS target to the existing Xcode project
- Shares ~80% of Swift code from `Shared/` (VaultStore, AnthropicClient, Keychain, WebBridge)
- iOS-specific: mobile viewport handling, keyboard avoidance (handled by the React app), Face ID / Touch ID for vault unlock
- Native SQLite — same file format as macOS. If user syncs via folder, same encrypted file works on both

**Depends on**: 2.2 (static export), 2.3 (macOS app — shared code established)

---

### 2.5 Keychain / biometric vault unlock `[M]`

**Problem**: Typing a passphrase on mobile is friction. Touch ID / Face ID should unlock the vault.

**Approach**:

- After first passphrase entry, offer to store the derived key in Keychain (protected by biometrics)
- On subsequent launches: biometric prompt → Keychain retrieves key → vault unlocked
- Fallback: passphrase entry always available
- macOS: Touch ID on supported Macs, passphrase on others
- iOS: Face ID / Touch ID

**Depends on**: 2.3/2.4 (Swift app with Keychain access)

---

## Tier 3 — "My data goes where I go"

**Goal**: Users can sync across devices and their data is portable.

### 3.1 Soul Vault import — desktop (direct filesystem) `[S]`

**Problem**: On the desktop app, Soul Vault import should be seamless — no file upload needed.

**Approach**:

- Settings UI: "Connect Soul Vault" — detects `~/soul-vault/` automatically
- Reads `.exports/lumen-arc.md` directly from filesystem
- Or calls `soul query --profile lumen` as subprocess if export doesn't exist yet
- One-click import, no file picker

**Depends on**: 2.3 (macOS app)

---

### 3.2 Lumen → Soul Vault export — desktop (automatic) `[S]`

**Problem**: On desktop, session notebook export to Soul Vault should be automatic.

**Approach**:

- At session closure, Swift writes the notebook markdown to `~/soul-vault/.inbox/lumen/`
- No user action required — `soul watch` picks it up
- Optional: show a subtle "Saved to Soul Vault" toast

**Depends on**: 2.3 (macOS app)

---

### 3.3 Folder-based encrypted sync `[L]`

**Problem**: Users with multiple devices need their conversation history to follow them.

**Approach**:

- Settings: "Sync vault to folder" — user picks a directory (iCloud Drive, Dropbox, NAS, USB, etc.)
- Lumen writes the encrypted SQLite file to the chosen folder after each session
- On launch, Lumen checks the sync folder for a newer file and imports it
- Conflict resolution: last-write-wins (v1). Both devices show a timestamp, user picks which to keep if there's a conflict
- No vendor lock-in — it's just a file in a folder

**Depends on**: 2.1 (SQLite migration)

**Security**: The synced file is encrypted. The folder provider (iCloud, Dropbox, etc.) only sees ciphertext. Passphrase never leaves the device.

---

## Tier 4 — "I'd pay for this"

**Goal**: Revenue path and advanced features.

### 4.1 Voice input (speech-to-text) `[M]`

**Problem**: For a companion app, speaking is more natural than typing — especially for reflective conversations.

**Approach**:

- Web: Browser Web Speech API (Chrome/Edge have good support; Safari is improving)
- Desktop/mobile (Swift): Native Speech framework — better accuracy, offline support
- UI: Microphone button next to Send. Tap to start, tap to stop. Transcribed text appears in input area for review before sending
- No voice storage — transcribe in real-time, discard audio

---

### 4.2 Provider auth + billing `[L]`

**Problem**: Testers use server-managed API tokens. Paying users need their own accounts.

**Approach**:

- Hosted token broker: user authenticates → server issues scoped, short-lived API token
- Server holds the provider key, enforces billing/quotas
- BYOK remains as power-user alternative
- Tier boundary: free tier (limited sessions/month), paid tier (unlimited + managed sync)

---

### 4.3 Managed encrypted sync (server option) `[L]`

**Problem**: Not all users want to configure their own sync folder. Some will pay for convenience.

**Approach**:

- Lumen's Go API stores encrypted SQLite blobs — zero plaintext, zero decryption keys
- Push/pull encrypted file on session start/end
- Natural paid tier: free = folder sync (self-managed), paid = managed sync (we host it)
- Same encryption either way — the server is a dumb bucket

**Depends on**: 2.1 (SQLite migration), 3.3 (sync infrastructure)

---

### 4.4 System prompt protection `[M]`

**Problem**: The mentoring philosophy and prompt architecture is core IP. Currently in the public GitHub repo.

**Approach**:

- Move system prompt to env/secrets (not in source code)
- Strip from client-visible payloads
- Add prompt-level instruction for Lumen to not reveal system prompt contents
- On desktop: prompt bundled in app binary (not in readable JS)

---

## Later (Not in MVP 3)

These remain in the backlog for future consideration:

- **Individual mentor mode** — per-mentor voices alongside unified Lumen
- **Pattern index / commitments tracker / recognition moments** — memory enhancements
- **Context compaction** — relevant at 100+ sessions
- **Retrieval layer (embeddings)** — long-horizon semantic search
- **Crisis UX** — professional escalation guidance
- **CLI entry point** — terminal-based Lumen conversations

---

## What We're NOT Doing (MVP 3 Scope Boundaries)

- **Android** — Mac + iOS only for now. Revisit if demand emerges
- **Windows / Linux** — Same. Swift is the right tool for the Apple ecosystem
- **Full CRDT sync** — Last-write-wins is sufficient for v1. CRDT adds complexity without clear user benefit yet
- **Embedding/RAG** — Context window is large enough for 50+ sessions. Not needed yet
- **Individual mentor mode** — Unified voice quality first. Defer until the companion experience is proven

---

## Architecture References

| Area                       | Document                                      |
| -------------------------- | --------------------------------------------- |
| Soul Vault integration     | `docs/architecture/soul-vault-integration.md` |
| Context assembly + closure | `docs/architecture/harness-flow.md`           |
| System architecture        | `docs/architecture/overview.md`               |
| Notebook/Arc prompts       | `docs/mentoring/notebook-and-arc-prompts.md`  |
| System prompt v2           | `docs/mentoring/system-prompts-v2.md`         |
| Backlog                    | `docs/implementation/backlog.md`              |
