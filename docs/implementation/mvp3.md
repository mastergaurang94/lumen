# MVP 3 Implementation

Last Updated: 2026-02-18
Status: Ready for execution

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline. This is how the next session picks up context.

---

## Running Updates

- 2026-02-18: Finalized for execution. Added: evaluation harness + prompt versioning (1.5), legacy schema cleanup (1.6), passphrase recovery (2.6), design + atmospheric polish (2.7). Reconciled with backlog — all MVP 3 items removed from `backlog.md`.
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

### 1.1 "Bring context" import — web `[M]`

**Problem**: Every new Lumen user starts as a stranger. Users who've been talking to other AIs for months already have a rich self-model — they shouldn't have to rebuild it from scratch.

**Design target**: Target #1 — _"It already knew me."_

**Default**: Start fresh. No import needed. Lumen works great from session 1.

**Optional import** (settings or setup flow):

- Text box: "Paste anything about yourself — a bio, notes, or output from another AI."
- Collapsible helper: copyable prompt the user can run in Claude/ChatGPT/any AI to generate a summary of who they are
- Soul Vault users: file upload option for `soul query --profile lumen` output
- Result stored as a `SeedArc` — used to prime the first session, then absorbed into the living Arc

**Code refs**:

- New: settings UI for import, `SeedArc` type in `types/storage.ts`
- Modified: `assembly.ts` (include seed Arc in context), Dexie schema (or SQLite if migration lands first)

**Integration doc**: `docs/architecture/soul-vault-integration.md`

**Note**: This is the web-only version. Desktop gets direct filesystem access for Soul Vault (see 3.1).

---

### 1.2 Lumen → Soul Vault export — web (download) `[S]`

**Problem**: Lumen's session insights should flow back to the user's Soul Vault, enriching their unified self-knowledge.

**Approach**:

- After session closure, offer "Save to Soul Vault" download button for the session notebook
- User drops the file into `~/soul-vault/.inbox/lumen/`
- `soul watch` ingests it automatically

**Note**: On desktop, this becomes automatic (no download step). See 3.2.

---

### 1.3 Transcript import script — developer migration `[S]`

**Problem**: Existing conversation transcripts, notebooks, and Arc stored as local markdown files (e.g., `~/Documents/conversations/`) need to be imported into Lumen's encrypted storage so they appear as native sessions.

**Approach**:

- CLI script: `pnpm --filter web import-transcripts --source ~/Documents/conversations`
- Parses `transcripts/` — splits on `**USER:**` / `**ASSISTANT:**` markers → `Message[]` per session
- Parses `notebooks/` — reads matching notebook markdown per session, maps `## Mentor's Notebook` → parting words for closure UI
- Reads `arc.md` → imports as `UserArc` with version set to session count
- Assigns session metadata (session_id, session_number, date) from filenames (e.g., `contribution_5_2026-01-25.md`)
- Encrypts everything with the user's vault passphrase (same PBKDF2 + AES-GCM pipeline)
- Writes to Dexie (or SQLite if migration has landed)
- No LLM calls — direct data hydration
- No UI — run once from terminal, done

**Result**: Lumen sees all imported sessions in history, notebooks feed context assembly, Arc reflects the full journey. Indistinguishable from sessions that happened natively in Lumen.

---

### 1.4 Prompt quality iteration — session feedback `[M]`

**Problem**: After 10+ sessions, several patterns have emerged where Lumen's conversational behavior doesn't match the intended companion experience. These are prompt-level issues — not bugs, but places where the system prompt needs refinement based on real usage.

**Observations from recent sessions**:

#### 1. Rote openings — "sitting with something"

Lumen tends to open with variations of "I've been sitting with something from last time..." or similar formulaic phrasing. It feels repeated and predictable across sessions. The Vitality session opening was particularly off. Openings should feel genuinely varied and responsive to context, not templated.

#### 2. Iterate on session transcripts for insights

Have Lumen iterate on session transcripts to find prompt improvement opportunities. Explore a lightweight "mini evaluation" approach — not a formal harness, but a way to use real transcripts to identify where the prompt falls short and test improvements. A scratchpad or reflection process during sessions could help Lumen self-correct in real time.

#### 3. Story consistency — Lumen's self-referential narratives

In session 10, Lumen mentioned consulting in his late 30s. There's no mechanism to prevent contradicting this in future sessions. **Resolution**: Lumen's stories and anecdotes should NOT be about himself. They should reference other people he's known — patients, friends, colleagues, mentees. This sidesteps the consistency problem entirely and is more aligned with a mentor who draws from a lifetime of witnessing others' journeys.

#### 4. Response verbosity and conversational pacing

Several related issues:

- **Wall of text**: When the user shares a lot, Lumen mirrors that volume back. The assistant should NOT match the user's verbosity — it should distill and respond with intentionality.
- **Too many questions at once**: Lumen sometimes fires multiple questions in a single response, which breaks the natural conversation feel. One thread at a time.
- **Thinking out loud**: Lumen often narrates its own reflections ("I notice that...", "What strikes me is...") instead of keeping those observations internal and communicating directly. Lumen should share what's most meaningful, not everything it's processing.
- **Incentivize natural pacing**: Just because Lumen can process everything at once doesn't mean the human can respond that way. Lumen should model the conversational rhythm it wants — short, direct, one thing at a time. It can hold threads and return to them later.

See the beginning of session 10 for examples of all of the above.

#### 5. Core sessions vs. tactical midweek check-ins

Lumen currently treats every session with equal weight, emphasizing "last session" regardless of its nature. There should be a distinction:

- **Core sessions** (weekly): The main event. "Here's what we're exploring this week." These are the relationship-building conversations.
- **Tactical/midweek sessions**: Quick check-ins, specific questions, lighter touch. These should NOT count as "the last session" in terms of continuity framing.

The system should preserve the primacy of core sessions in how it frames continuity and returning-user openings. A midweek tactical check-in shouldn't reset the "last time we talked about..." anchor.

**Approach**: Iterate on the system prompt (`docs/mentoring/system-prompts-v2.md` and `apps/web/lib/llm/prompts.ts`) to address each observation. Use real session transcripts as test cases — review before/after prompt changes against actual conversation flow. Consider whether session type metadata (core vs. tactical) needs to be stored or if it can be inferred from session length/depth.

**Code refs**:

- `apps/web/lib/llm/prompts.ts` — `buildSystemPrompt()`, all prompt sections
- `docs/mentoring/system-prompts-v2.md` — active prompt reference
- `apps/web/lib/session/arc.ts` — Arc update prompts (relevant to story consistency)
- `apps/web/lib/context/assembly.ts` — context assembly, session ordering

---

### 1.5 Evaluation harness + prompt versioning `[M]`

**Problem**: Prompt quality iteration (1.4) needs tooling to validate improvements. Currently, testing prompt changes means running sessions manually and comparing subjectively. Without reproducible evaluation, prompt regression is invisible.

**Approach**:

- **Prompt versioning**: Tag each prompt version (system prompt, notebook prompt, Arc prompt) with a version identifier. Store version metadata alongside session notebooks so quality shifts correlate to prompt changes.
- **Minimal evaluation harness**: Replay golden transcripts → generate notebook + Arc → score against rubric (specificity, verbatim quotes, natural flow, pattern depth). Local CLI script, results in markdown.
- **Golden fixtures**: 3-5 real session transcripts (anonymized if needed) with hand-scored expected outputs for regression testing.

**Code refs**:

- `apps/web/lib/llm/prompts.ts` — prompt constants (add version metadata)
- `apps/web/lib/session/summary.ts` — notebook generation
- `apps/web/lib/session/arc.ts` — Arc generation
- New: `scripts/eval/` — evaluation runner + fixtures

**Scope note**: Developer tool, not user-facing. A CLI script that runs locally and produces a markdown report. No CI integration needed initially.

---

### 1.6 Remove legacy sessionSummaries schema `[S]`

**Problem**: The Dexie v1 `sessionSummaries` table and related code (`parseSummaryResponse`, `SessionSummary` type, `getSummary`/`saveSummary`/`listSummaries`) are dead weight since the notebook/arc system replaced them. Should be cleaned up before the SQLite migration (2.1) to avoid migrating dead schema.

**Approach**:

- Drop `sessionSummaries` table from Dexie schema
- Remove `SessionSummary` type, parsing, and storage methods
- Verify no users have legacy-only data (or provide a one-time notebook backfill from raw transcripts)
- Keep history UI backward-compatible (already prefers notebooks over summaries)

**Depends on**: No active users with legacy-only data. If testers upgraded during MVP 2, their data is already in notebook format.

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

### 2.6 Passphrase recovery mechanism `[M]`

**Problem**: If a user forgets their passphrase, their entire conversation history is permanently inaccessible. By MVP 3, testers will have months of meaningful conversation history — losing it would be devastating and trust-destroying.

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

### 2.7 Design + atmospheric polish `[M]`

**Problem**: The current design is functional but not yet distinctive. For a product people would pay for, the visual experience needs to feel intentional and immersive — closer to OmmWriter's atmospheric quality than a standard chat interface.

**Approach**:

- **Theme iteration**: Evolve the dawn/afternoon/evening palettes with richer backgrounds, subtle textures, and more atmospheric depth. The palettes work structurally but need warmth and immersion.
- **Base text + icon sizing**: Increase body text and icon scale across chat, auth, and sidebar surfaces. Touch targets should feel comfortable; typography should feel generous and readable.
- **Atmospheric elements**: Subtle background textures or gradients that shift with the time-of-day palette. Breathing animations on idle states. The UI should feel alive, not static.
- **Display typography**: The Fraunces display font is available but underused. Apply it to key moments — session number header, parting words in closure, pre-session screen.

**Design refs**:

- `docs/design/system.md` — current palette and component guidelines
- OmmWriter — distraction-free, atmospheric reference

**Scope note**: Polish pass, not redesign. Layout and component architecture stay the same. The goal is to make the existing structure feel warm, intentional, and worth paying for.

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

- Lumen's Go API stores encrypted SQLite blobs — zero plaintext, zero decryption keys. Server stores ciphertext + metadata headers only
- Client sync queue: push/pull encrypted SQLite blobs with offline resilience (queue operations when offline, flush on reconnect)
- Conflict strategy: last-write-wins (v1). Both devices show a timestamp; user picks which to keep if there's a conflict
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

These remain in the backlog for future consideration. See `backlog.md` for full detail on each item.

- **Android** — Mac + iOS only for now. Revisit if demand emerges
- **Windows / Linux** — Same. Swift is the right tool for the Apple ecosystem
- **Full CRDT sync** — Last-write-wins is sufficient for v1. CRDT adds complexity without clear user benefit yet
- **Embedding/RAG** — Context window is large enough for 50+ sessions. Not needed yet
- **Individual mentor mode** — Unified voice quality first. Defer until the companion experience is proven
- **Client-side model orchestration** — Policy enforcement on client; no server-side plaintext
- **Fallback provider abstraction** — Graceful failover between LLM providers
- **CLI entry point** — Terminal interface for power users
- **Trust & safety governance** — Formal boundary definition beyond current prompt-level safety
- **Observability** — Privacy-preserving session insights endpoint + client analytics events
- **Context compaction** — Compress older context; relevant at 100+ sessions
- **Hallucination guards for memory** — Cite source sessions when recalling facts

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
