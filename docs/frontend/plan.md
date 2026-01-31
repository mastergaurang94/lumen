# Frontend Implementation Plan

Last Updated: 2026-01-30

---

## Current Phase: Phase 4 — Conversational Session Spacing + Backend Foundation

**Status: 🔄 Not Started**

### Running Updates

- 2026-01-30: Phase 4 scaffold initialized.
- 2026-01-30: Revised approach — session spacing enforced conversationally by coach, not hard server-side gating. Server records timestamps but doesn't block access.
- 2026-01-31: Step 1 complete — session page now shows soft advisory for early returns, button always enabled, wired to real storage. Added `SessionSpacing` type, `getDaysSinceLastSession` + related query helpers. Fixed `registerLockHandler` return type. Also updated end-session dialog and session closure copy to use softer "suggested" language.

### In Progress / Next Up

- Step 3 complete. Next: Step 4 (context assembly code)

### Edge Cases to Consider (Phase 4)

- User returns after 2 days: coach should acknowledge and gently redirect, not block
- User returns after 7+ days with no action steps completed: coach should explore what happened
- User's first session: no spacing context, intake flow only
- Active session exists: resume flow unchanged (no spacing check needed)
- Clock manipulation: accept client timestamp, reconcile server-side later if needed

### Goals

- Replace hard UI gate with soft advisory nudge
- Enable coach to enforce session spacing conversationally (via system prompt + context injection)
- Inject `days_since_last_session` and `last_session_action_steps` into context assembly
- Update `system-prompts-v0.md` with spacing enforcement instructions
- Update `harness-flow-v0.md` to remove server-side gating requirement

### Non-Goals (Phase 4)

- Hard server-side session blocking (removed from scope)
- Privacy-preserving metadata collection (backlogged)
- Auth implementation (separate backend phase)
- LLM proxy implementation (separate backend phase)

### Constraints (Must Match Docs)

- System prompt must strongly encourage 7-day spacing without being preachy
- Coach may decline to proceed if user returns too early, but framed as coaching, not enforcement
- Context assembly must be deterministic and testable
- Privacy promises in UI remain unchanged

### Progress Summary

| Step | Status | Notes                                          |
| ---- | ------ | ---------------------------------------------- |
| 1    | ✅     | Update session page: soft gate                 |
| 2    | ✅     | Update system prompts: spacing enforcement     |
| 3    | ✅     | Update harness flow doc: remove server gating  |
| 4    | ⬜     | Context assembly: inject spacing data          |
| 5    | ⬜     | Storage queries: add `getDaysSinceLastSession` |
| 6    | ⬜     | Chat page: pass spacing context to LLM         |

---

### Step 1: Update Session Page — Soft Gate

**Status: ✅ Complete**

Convert `/session` page from hard locked/unlocked states to soft advisory.

Tasks:

- [x] Remove `LockedState` component (replaced with soft advisory)
- [x] Replace `SessionGateState` type: added `SessionSpacingState` = 'early_return' | 'ready'
- [x] Update interface: new `SessionSpacing` with `daysSinceLastSession`, `isFirstSession`
- [x] Show advisory message when `daysSinceLastSession < 7` (not a blocker)
- [x] Keep "Begin session" button enabled regardless of spacing
- [x] Update footer copy to soften "spaced 7 days apart" to "designed for weekly rhythm"
- [x] Wire to real storage: compute days from `getLastSession().ended_at`

Files to modify:

- `apps/web/app/session/page.tsx`
- `apps/web/types/session.ts`
- `apps/web/lib/storage/queries.ts` (add helper)

---

### Step 2: Update System Prompts — Spacing Enforcement

**Status: ✅ Complete**

Add spacing awareness to coaching prompts in `docs/system-prompts-v0.md`.

Tasks:

- [x] Add new section: "Session Spacing Awareness"
- [x] Define behavior when `days_since_last_session < 7`:
  - Acknowledge the early return warmly
  - Ask what prompted returning early
  - Gently suggest waiting ("I'm here, but the space between sessions is where growth happens")
  - If user insists, proceed but note the pattern
- [x] Define behavior when `days_since_last_session >= 7`:
  - Normal session start
  - Reference last session's action steps if available
  - Ask what they tried, noticed, or learned in the gap
- [x] Add to "Ongoing Prompt" key moves: check action step follow-through
- [x] Add "Modeling Healthy Boundaries" section with example coach responses

Files modified:

- `docs/system-prompts-v0.md`

---

### Step 3: Update Harness Flow Doc

**Status: ✅ Complete**

Remove server-side gating requirement from `docs/harness-flow-v0.md`.

Tasks:

- [x] Remove "Enforce 7-day session spacing gate server-side" from Safety & Governance
- [x] Add "Session spacing enforced conversationally via system prompt" to Safety & Governance
- [x] Update Context Selection inputs to include:
  - `days_since_last_session: number | null`
  - `last_session_action_steps: string[]`
  - `session_number: number`

Files modified:

- `docs/harness-flow-v0.md`

---

### Step 4: Context Assembly — Inject Spacing Data

**Status: ⬜ Not Started**

Build context assembly logic that injects spacing-related data for the LLM.

Tasks:

- [ ] Create `lib/context/assembly.ts` with `buildSessionContext()` function
- [ ] Include in context object:
  - `days_since_last_session: number | null`
  - `last_session_action_steps: string[]` (from last summary)
  - `last_session_open_threads: string[]` (from last summary)
  - `session_number: number` (1 for intake, 2+ for ongoing)
  - `current_date: string` (ISO date for seasonal awareness)
- [ ] Format context as structured preamble for system prompt injection
- [ ] Add unit tests for context assembly (deterministic output for given inputs)

Files to create:

- `apps/web/lib/context/assembly.ts`
- `apps/web/lib/context/assembly.test.ts`

---

### Step 5: Storage Queries — Add Spacing Helpers

**Status: ⬜ Not Started**

Add query helpers for spacing-related data.

Tasks:

- [ ] Add `getDaysSinceLastSession(storage, userId): Promise<number | null>`
  - Returns `null` if no completed sessions
  - Computes days from `last_session.ended_at` to now
- [ ] Add `getLastSessionActionSteps(storage, userId): Promise<string[]>`
  - Returns action steps from most recent summary, or empty array
- [ ] Add `getSessionNumber(storage, userId): Promise<number>`
  - Returns count of completed sessions + 1

Files to modify:

- `apps/web/lib/storage/queries.ts`

---

### Step 6: Chat Page — Pass Spacing Context to LLM

**Status: ⬜ Not Started**

Wire context assembly into the chat flow.

Tasks:

- [ ] On session start, call `buildSessionContext()` with storage data
- [ ] Include context in system prompt sent to LLM
- [ ] Store `session_number` in `SessionTranscript` for future reference
- [ ] Log context assembly decisions for debugging (non-PII only)

Files to modify:

- `apps/web/app/chat/page.tsx` (or relevant chat hook/service)
- `apps/web/types/storage.ts` (add `session_number` to `SessionTranscript` if needed)

---

## Previous Phases

| Phase | Status      | Description                    | Archive     |
| ----- | ----------- | ------------------------------ | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only)        | `phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP | `phase3.md` |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm --filter web dev     # Start dev server
pnpm --filter web build   # Build for production
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.

### Dependencies (Installed)

```
tailwindcss@4.1.18
@tailwindcss/postcss
postcss
next-themes
lucide-react
clsx
tailwind-merge
class-variance-authority
framer-motion
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-slot
react-markdown
remark-gfm
@tailwindcss/typography
dexie
dexie-react-hooks
fake-indexeddb
@playwright/test
vitest
```

### File Structure

```
apps/web/
├── app/
│   ├── globals.css      # Tailwind + palettes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── login/page.tsx   # Email login
│   ├── setup/page.tsx   # Passphrase setup
│   ├── session/page.tsx # Session spacing
│   └── chat/page.tsx    # Chat interface
├── components/
│   ├── layout-shell.tsx
│   ├── sidebar.tsx
│   ├── theme-provider.tsx
│   ├── auth-page-layout.tsx
│   ├── coach-unavailable.tsx
│   ├── error-boundary.tsx
│   ├── chat/
│   │   ├── index.ts
│   │   ├── coach-message.tsx
│   │   ├── user-message.tsx
│   │   ├── typing-indicator.tsx
│   │   ├── chat-input.tsx
│   │   ├── session-closure.tsx
│   │   └── end-session-dialog.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── spinner.tsx
│       └── skeleton.tsx
├── lib/
│   ├── utils.ts
│   ├── format.ts
│   └── z-index.ts
└── types/
    └── session.ts
```

# Frontend Implementation Plan

Last Updated: 2026-01-30

---

## Current Phase: Phase 3 — Local Storage + Encryption

**Status: ✅ Complete**

### Running Updates

- 2026-01-30: Implemented Dexie schema + storage abstraction, crypto utilities, vault metadata, setup/unlock flows, chunked transcript persistence with debounce, and minimal crypto tests. Added `VaultProvider` to clear keys on unload and a sidebar lock action.
- 2026-01-30: Added storage integration test and Playwright vault smoke flow; scoped vitest to app tests only.
- 2026-01-30: Implemented summary persistence, profile touch updates, and storage queries; marked Phase 3 complete.
- 2026-01-30: Consolidated storage so `StorageService` handles encryption internally (no separate secure wrapper).
- 2026-01-30: Polished onboarding flow: added a 2-step progress indicator for login/setup, removed the back link from `/session` to avoid nav conflict, moved the “forgot passphrase” hint below the unlock CTA, and made the sidebar brand link route home.

### In Progress / Next Up

- Phase 3 complete. Next work: Phase 4 conversational session spacing + backend foundation.

### Edge Cases to Consider (Phase 3)

- User closes tab or crashes mid-session: decide whether to auto-pause and prompt resume/end on next visit.

### Goals

- Encrypted local persistence for transcripts, summaries, and profile data.
- Passphrase-derived key held in memory only (never persisted).
- Clean unlock/lock flow and route protection for vault state.
- Storage abstraction to support desktop filesystem later (single service, encryption handled internally).

### Non-Goals (Phase 3)

- Zero-knowledge sync (v1.1)
- Key rotation / re-encryption (v1.1)
- Conversational session spacing (Phase 4)
- Real LLM summarization (Phase 5)

### Constraints (Must Match Docs)

- Encryption spec from `architecture-v0.md` (PBKDF2-HMAC-SHA256 + AES-GCM).
- Entity shape from `memory-schema.md`.
- Privacy promises in `product-spec.md` must remain visible in the UI.

### Progress Summary

| Step                              | Status      | Notes                                         |
| --------------------------------- | ----------- | --------------------------------------------- |
| 1. Data Model + Dexie Schema      | ✅ Complete | Dexie schema + chunk store + metadata         |
| 2. Crypto Utilities               | ✅ Complete | Key derivation, AES-GCM, header serialization |
| 3. Storage Abstraction            | ✅ Complete | Dexie-backed `StorageService`                 |
| 4. Vault Metadata + Key Context   | ✅ Complete | Key sentinel + in-memory key                  |
| 5. Setup Flow (Vault Init)        | ✅ Complete | Passphrase → key → metadata + profile         |
| 6. Unlock Flow + Route Protection | ✅ Complete | `/unlock`, vault checks, lock button          |
| 7. Encrypted Session Persistence  | ✅ Complete | Chunked transcript save/resume/debounce       |
| 8. Profile + Summary Storage      | ✅ Complete | Profile updates + summary persistence         |
| 9. Tests (Minimal)                | ✅ Complete | Crypto unit, storage integration, E2E smoke   |

---

### Step 1: Data Model + Dexie Schema

**Status: ✅ Complete**

Set up IndexedDB via Dexie using the `memory-schema.md` entities, plus a vault metadata store and transcript chunks.

Tasks:

- [x] Install `dexie` and `dexie-react-hooks`
- [x] Create `lib/db.ts` with Dexie database class + versioned schema
- [x] Define stores:
  - `userProfiles` — encrypted `UserProfile` blobs (stored as `EncryptedUserProfile`)
  - `sessionTranscripts` — `SessionTranscript` (session-level metadata only)
  - `sessionTranscriptChunks` — encrypted transcript chunks (append-only)
  - `sessionSummaries` — encrypted `SessionSummary` blobs (stored as `EncryptedSessionSummary`)
  - `vaultMetadata` — single-record metadata (unencrypted)
- [x] Add indexes: by `user_id`, `session_id`, `started_at` (descending)
- [x] Define chunk record fields: `chunk_index`, `encrypted_blob`, `encryption_header`, `transcript_hash`
- [x] Decide chunk serialization format (UTF-8 JSON array of messages)
- [x] Add `transcript_hash` per chunk (hash over encrypted blob + header)

---

### Step 2: Crypto Utilities

**Status: ✅ Complete**

Implement WebCrypto helpers that are deterministic and testable.

Tasks:

- [x] Create `lib/crypto.ts` with:
  - `deriveKey(passphrase, salt, iterations)` — PBKDF2-HMAC-SHA256 → AES-GCM key
  - `encrypt(plaintext, key)` — AES-GCM with random 12-byte IV
  - `decrypt(ciphertext, key, iv)` — AES-GCM decryption
  - `generateSalt()` — 16+ byte random salt
  - `generateIV()` — 12-byte random IV
  - `hashTranscript(ciphertext, header)` — SHA-256 over encrypted blob + header
- [x] Define `EncryptionHeader` (versioned):
  ```typescript
  interface EncryptionHeader {
    kdf: 'PBKDF2';
    kdf_params: { hash: 'SHA-256'; iterations: number };
    salt: ArrayBuffer;
    cipher: 'AES-GCM';
    iv: ArrayBuffer;
    version: string; // e.g., "enc-v0.1"
  }
  ```
- [x] Add helpers to serialize/deserialize `ArrayBuffer` ↔ base64
- [ ] Performance-tune PBKDF2 iterations (~600k target, <1s on typical hardware)
- [x] Unit tests for encrypt → decrypt round-trip and header serialization

---

### Step 3: Storage Abstraction

**Status: ✅ Complete**

Create a storage interface to allow swapping the backend later.

Tasks:

- [x] Create `lib/storage/index.ts` with `StorageService` interface
- [x] Create `lib/storage/dexie-storage.ts` implementing `StorageService` with internal encryption
- [x] Export factory `createStorageService()` for browser implementation
- [ ] Error handling: quota exceeded, version/migration failures, corrupted records

---

### Step 4: Vault Metadata + Key Context

**Status: ✅ Complete**

Introduce a vault metadata record and an in-memory key context.

Tasks:

- [x] Create `lib/storage/metadata.ts` for unencrypted vault metadata:
  - `vault_initialized: boolean`
  - `salt: ArrayBuffer`
  - `kdf_iterations: number`
  - `encryption_version: string`
  - `key_check` (encrypted sentinel to verify passphrase)
- [x] Create `lib/crypto/key-context.ts` (or `lib/storage/encryption-context.ts`):
  - `setKey()`, `clearKey()`, `getKey()`, `isUnlocked()`
- [x] Clear key on explicit lock and `beforeunload`
- [ ] Add optional idle-timeout lock (configurable)

---

### Step 5: Setup Flow (Vault Initialization)

**Status: ✅ Complete**

Wire `/setup` to initialize the vault.

Tasks:

- [x] On `/setup` submit:
  - Generate salt
  - Derive key from passphrase + salt
  - Store vault metadata
  - Create encrypted `key_check` sentinel
  - Initialize empty `UserProfile` (stored encrypted)
  - Store key in memory
  - Navigate to `/session`
- [x] On app load:
  - If vault exists, route to `/unlock` instead of `/setup`

---

### Step 6: Unlock Flow + Route Protection

**Status: ✅ Complete**

Returning users must unlock with passphrase.

Tasks:

- [x] Create `/unlock` route
- [x] UI: passphrase input, unlock button, error state for wrong passphrase
- [x] On submit:
  - Load salt + iterations from metadata
  - Derive key
  - Decrypt `key_check` sentinel
  - If success: store key in memory and proceed
  - If failure: show error, allow retry
- [x] Add "Forgot passphrase" warning (data is unrecoverable)
- [x] Route protection:
  - If vault exists but locked → `/unlock`
  - If no vault → `/setup`
- [x] Add lock button to sidebar (clears key and redirects to `/unlock`)

---

### Step 7: Encrypted Session Persistence

**Status: ✅ Complete**

Persist transcripts to encrypted storage with chunking + debounced writes.

Tasks:

- [x] On session start:
  - Create new `SessionTranscript` with `session_id`, `started_at`
  - Initialize empty chunk sequence (no blobs yet)
- [x] On each message:
  - Append to in-memory message buffer
  - Debounce and flush to a new encrypted chunk
  - Store chunk with `chunk_index` and hash
- [x] On chunk flush:
  - Clear buffer and increment `chunk_index`
- [x] On session end:
  - Set `ended_at`
  - Final save with transcript metadata
- [x] On refresh during active session:
  - Detect incomplete session
  - Offer resume or discard
- [x] On resume:
  - Load and decrypt chunks in order
  - Reconstruct message list

---

### Step 8: Profile + Summary Storage

**Status: ✅ Complete**

Persist profiles and summaries; use mock summary generation for now.

Tasks:

- [x] UserProfile:
  - Create minimal profile on setup (`user_id`, timestamps)
  - Update `updated_at` after sessions
  - Stored as encrypted blob at rest
- [x] SessionSummary:
  - Create after session closure using mock summary data
  - Store `recognition_moment`, `action_steps`, `open_threads`
  - Stored as encrypted blob at rest
- [x] Add `lib/storage/queries.ts`:
  - `getRecentSummaries(userId, limit)`
  - `getLastSession(userId)`
  - `hasCompletedSessions(userId)`

---

### Step 9: Tests (Minimal)

**Status: ✅ Complete**

Keep coverage minimal but necessary for iteration speed.

Tasks:

- [x] Unit tests: crypto round-trip + header serialization
- [x] Integration test: Dexie storage + encrypted profile/summary payloads
- [x] E2E smoke (single flow): setup → save transcript → lock → unlock → resume

---

### Dependencies (To Install)

```
dexie
dexie-react-hooks
vitest
fake-indexeddb
@playwright/test
```

---

## Previous Phases

| Phase | Status      | Description             | Archive     |
| ----- | ----------- | ----------------------- | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only) | `phase2.md` |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm --filter web dev     # Start dev server
pnpm --filter web build   # Build for production
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.

### Dependencies (Installed)

```
tailwindcss@4.1.18
@tailwindcss/postcss
postcss
next-themes
lucide-react
clsx
tailwind-merge
class-variance-authority
framer-motion
@radix-ui/react-dialog
@radix-ui/react-dropdown-menu
@radix-ui/react-slot
react-markdown
remark-gfm
@tailwindcss/typography
dexie
dexie-react-hooks
fake-indexeddb
@playwright/test
vitest
```

### File Structure

```
apps/web/
├── app/
│   ├── globals.css      # Tailwind + palettes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── login/page.tsx   # Email login
│   ├── setup/page.tsx   # Passphrase setup
│   ├── session/page.tsx # Session spacing
│   └── chat/page.tsx    # Chat interface
├── components/
│   ├── layout-shell.tsx
│   ├── sidebar.tsx
│   ├── theme-provider.tsx
│   ├── auth-page-layout.tsx
│   ├── coach-unavailable.tsx
│   ├── error-boundary.tsx
│   ├── chat/
│   │   ├── index.ts
│   │   ├── coach-message.tsx
│   │   ├── user-message.tsx
│   │   ├── typing-indicator.tsx
│   │   ├── chat-input.tsx
│   │   ├── session-closure.tsx
│   │   └── end-session-dialog.tsx
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── spinner.tsx
│       └── skeleton.tsx
├── lib/
│   ├── utils.ts
│   ├── format.ts
│   └── z-index.ts
└── types/
    └── session.ts
```
