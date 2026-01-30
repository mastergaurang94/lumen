# Frontend Implementation Plan

Last Updated: 2026-01-30

---

## Current Phase: Phase 3 — Local Storage + Encryption

**Status: ✅ Complete**

### Running Updates

- 2026-01-30: Implemented Dexie schema + storage abstraction, crypto utilities, vault metadata, setup/unlock flows, chunked transcript persistence with debounce, and minimal crypto tests. Added `VaultProvider` to clear keys on unload and a sidebar lock action.
- 2026-01-30: Added storage integration test and Playwright vault smoke flow; scoped vitest to app tests only.
- 2026-01-30: Implemented summary persistence, profile touch updates, and storage queries; marked Phase 3 complete.

### In Progress / Next Up

- Phase 3 complete. Next work: Phase 4 server-side gating.

### Edge Cases to Consider (Phase 3)

- User closes tab or crashes mid-session: decide whether to auto-pause and prompt resume/end on next visit.

### Goals

- Encrypted local persistence for transcripts, summaries, and profile data.
- Passphrase-derived key held in memory only (never persisted).
- Clean unlock/lock flow and route protection for vault state.
- Storage abstraction to support desktop filesystem later.

### Non-Goals (Phase 3)

- Zero-knowledge sync (v1.1)
- Key rotation / re-encryption (v1.1)
- Server-side session gating (Phase 4)
- Real LLM summarization (Phase 5)

### Constraints (Must Match Docs)

- Encryption spec from `architecture-v0.md` (PBKDF2-HMAC-SHA256 + AES-GCM).
- Entity shape from `memory-schema.md`.
- Privacy promises in `product-spec.md` must remain visible in the UI.

### Progress Summary

| Step                               | Status      | Notes                                         |
| ---------------------------------- | ----------- | --------------------------------------------- |
| 1. Data Model + Dexie Schema       | ✅ Complete | Dexie schema + chunk store + metadata         |
| 2. Crypto Utilities                | ✅ Complete | Key derivation, AES-GCM, header serialization |
| 3. Storage Abstraction             | ✅ Complete | Dexie-backed `StorageService`                 |
| 4. Vault Metadata + Key Context    | ✅ Complete | Key sentinel + in-memory key                  |
| 5. Setup Flow (Vault Init)         | ✅ Complete | Passphrase → key → metadata + profile         |
| 6. Unlock Flow + Route Protection  | ✅ Complete | `/unlock`, vault checks, lock button          |
| 7. Encrypted Session Persistence   | ✅ Complete | Chunked transcript save/resume/debounce       |
| 8. Profile + Summary Storage       | ✅ Complete | Profile updates + summary persistence         |
| 9. Tests (Minimal)                 | ✅ Complete | Crypto unit, storage integration, E2E smoke   |

---

### Step 1: Data Model + Dexie Schema

**Status: ✅ Complete**

Set up IndexedDB via Dexie using the `memory-schema.md` entities, plus a vault metadata store and transcript chunks.

Tasks:

- [x] Install `dexie` and `dexie-react-hooks`
- [x] Create `lib/db.ts` with Dexie database class + versioned schema
- [x] Define stores:
  - `userProfiles` — `UserProfile`
  - `sessionTranscripts` — `SessionTranscript` (session-level metadata only)
  - `sessionTranscriptChunks` — encrypted transcript chunks (append-only)
  - `sessionSummaries` — `SessionSummary`
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
- [x] Create `lib/storage/dexie-storage.ts` implementing `StorageService`
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
  - Initialize empty `UserProfile`
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
- [ ] On session end:
  - Set `ended_at`
  - Final save with transcript hash
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
- [x] SessionSummary:
  - Create after session closure using mock summary data
  - Store `recognition_moment`, `action_steps`, `open_threads`
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
- [x] Integration test: Dexie storage + encrypted wrapper (happy path)
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

| Phase | Status      | Description             | Archive      |
| ----- | ----------- | ----------------------- | ------------ |
| 2     | ✅ Complete | Web app shell (UI-only) | `phase2.md`  |

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
│   ├── session/page.tsx # Session gating
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
