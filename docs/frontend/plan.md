# Frontend Implementation Plan

Last Updated: 2026-01-29

---

## Current Phase: Phase 3 — Local Storage + Encryption

**Status: Not Started**

### Overview

Implement client-side encrypted storage using IndexedDB (via Dexie) and WebCrypto. All sensitive data (transcripts, summaries, profile) is encrypted at rest with AES-GCM, keyed by a passphrase-derived key (PBKDF2).

See `memory-schema.md` for data schema and `architecture-v0.md` for encryption specs.

### Progress Summary

| Step                         | Status      | Notes                                |
| ---------------------------- | ----------- | ------------------------------------ |
| 1. Dexie Setup & Schema      | Not Started | IndexedDB stores for all entities    |
| 2. Crypto Module             | Not Started | PBKDF2 key derivation + AES-GCM      |
| 3. Storage Service           | Not Started | Abstraction layer for persistence    |
| 4. Encryption Integration    | Not Started | Wire crypto to storage operations    |
| 5. Passphrase Flow           | Not Started | Connect UI to real key derivation    |
| 6. Session Persistence       | Not Started | Encrypted transcript storage         |
| 7. Profile & Summary Storage | Not Started | UserProfile + SessionSummary         |
| 8. Unlock Flow               | Not Started | Returning user passphrase unlock     |

---

### Step 1: Dexie Setup & Schema

**Status: Not Started**

Set up IndexedDB via Dexie with stores matching `memory-schema.md`.

Tasks:

- [ ] Install `dexie` and `dexie-react-hooks`
- [ ] Create `lib/db.ts` with Dexie database class
- [ ] Define stores:
  - `userProfiles` — UserProfile entities
  - `sessionTranscripts` — SessionTranscript entities (encrypted blobs)
  - `sessionSummaries` — SessionSummary entities
- [ ] Add indexes: by `user_id`, `session_id`, `started_at` (descending)
- [ ] Export typed database instance

**Schema reference** (from `memory-schema.md`):

```typescript
interface UserProfile {
  user_id: string;
  preferred_name: string | null;
  goals: string[];
  recurring_themes: string[];
  coach_preferences: string[];
  created_at: string;
  updated_at: string;
}

interface SessionTranscript {
  session_id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  timezone: string | null;
  locale_hint: string | null;
  system_prompt_version: string;
  encrypted_blob: ArrayBuffer;
  encryption_header: EncryptionHeader;
  created_at: string;
}

interface SessionSummary {
  session_id: string;
  user_id: string;
  summary_text: string;
  recognition_moment: string | null;
  action_steps: string[];
  open_threads: string[];
  coach_notes: string | null;
  created_at: string;
  updated_at: string;
}
```

---

### Step 2: Crypto Module

**Status: Not Started**

Implement WebCrypto utilities for encryption/decryption per `architecture-v0.md` specs.

Tasks:

- [ ] Create `lib/crypto.ts` with:
  - `deriveKey(passphrase, salt, iterations)` — PBKDF2-HMAC-SHA256 → AES-GCM key
  - `encrypt(plaintext, key)` — AES-GCM with random 12-byte IV
  - `decrypt(ciphertext, key, iv)` — AES-GCM decryption
  - `generateSalt()` — 16+ byte random salt
  - `generateIV()` — 12-byte random IV
- [ ] Define `EncryptionHeader` type:
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
- [ ] Add helper to serialize/deserialize ArrayBuffer ↔ base64 for storage
- [ ] Performance test PBKDF2 iterations (~600k target, tune for <1s on typical hardware)
- [ ] Write unit tests for encrypt → decrypt round-trip

**Spec reference** (from `architecture-v0.md`):

- KDF: PBKDF2-HMAC-SHA256, 16+ byte salt, ~600k iterations
- Cipher: AES-GCM, unique 96-bit (12-byte) IV per encryption
- Store encryption header with each encrypted blob

---

### Step 3: Storage Service

**Status: Not Started**

Create an abstraction layer to support browser storage now and desktop filesystem later.

Tasks:

- [ ] Create `lib/storage/index.ts` with `StorageService` interface:
  ```typescript
  interface StorageService {
    // User profile
    getProfile(userId: string): Promise<UserProfile | null>;
    saveProfile(profile: UserProfile): Promise<void>;

    // Session transcripts (encrypted)
    getTranscript(sessionId: string): Promise<SessionTranscript | null>;
    saveTranscript(transcript: SessionTranscript): Promise<void>;
    listTranscripts(userId: string): Promise<SessionTranscript[]>;

    // Session summaries
    getSummary(sessionId: string): Promise<SessionSummary | null>;
    saveSummary(summary: SessionSummary): Promise<void>;
    listSummaries(userId: string, limit?: number): Promise<SessionSummary[]>;
  }
  ```
- [ ] Create `lib/storage/dexie-storage.ts` implementing `StorageService` using Dexie
- [ ] Export factory function `createStorageService()` that returns browser implementation
- [ ] Add error handling for quota exceeded, database errors

---

### Step 4: Encryption Integration

**Status: Not Started**

Wire crypto module to storage operations for transparent encryption/decryption.

Tasks:

- [ ] Create `lib/storage/encrypted-storage.ts` wrapping `StorageService`:
  - Encrypts transcript messages before storage
  - Decrypts transcript messages on retrieval
  - Stores encryption header alongside encrypted blob
- [ ] Create `EncryptionContext` or hook to hold derived key in memory
- [ ] Key is derived once per session unlock, held in memory (never persisted)
- [ ] Add `isUnlocked()` check — returns true if key is in memory
- [ ] Clear key from memory on explicit lock or page unload

---

### Step 5: Passphrase Flow

**Status: Not Started**

Connect the existing passphrase UI (`/setup`) to real key derivation and storage initialization.

Tasks:

- [ ] On `/setup` submit:
  - Generate new salt
  - Derive encryption key from passphrase + salt
  - Store salt in IndexedDB (unencrypted metadata)
  - Initialize empty UserProfile
  - Store key in memory (EncryptionContext)
  - Navigate to `/session`
- [ ] Create `lib/storage/metadata.ts` for unencrypted metadata:
  - `vault_initialized: boolean`
  - `salt: ArrayBuffer`
  - `kdf_iterations: number`
  - `encryption_version: string`
- [ ] Add vault initialization check on app load
- [ ] If vault exists, redirect to unlock flow instead of setup

---

### Step 6: Session Persistence

**Status: Not Started**

Wire chat UI to persist messages to encrypted storage.

Tasks:

- [ ] On session start:
  - Create new `SessionTranscript` with `session_id`, `started_at`
  - Store initial empty transcript
- [ ] On each message (user or coach):
  - Append to in-memory messages array
  - Re-encrypt and save transcript (or use incremental approach)
- [ ] On session end:
  - Set `ended_at` timestamp
  - Final save of complete transcript
- [ ] Handle page refresh during active session:
  - Detect incomplete session on load
  - Offer to resume or discard
- [ ] Update chat page to load messages from storage on resume

---

### Step 7: Profile & Summary Storage

**Status: Not Started**

Implement storage for UserProfile and SessionSummary entities.

Tasks:

- [ ] UserProfile:
  - Create on first setup (minimal: just `user_id`, timestamps)
  - Update after sessions if new stable info emerges
  - Load on session start for context
- [ ] SessionSummary:
  - Create after session closure
  - For now, use mock summary generation (real LLM summarization is Phase 5)
  - Store `recognition_moment`, `action_steps`, `open_threads`
- [ ] Add `lib/storage/queries.ts` for common queries:
  - `getRecentSummaries(userId, limit)` — for context assembly
  - `getLastSession(userId)` — for session gating
  - `hasCompletedSessions(userId)` — for first-session detection

---

### Step 8: Unlock Flow

**Status: Not Started**

Handle returning users unlocking their vault with passphrase.

Tasks:

- [ ] Create `/unlock` route (or modal on `/session`)
- [ ] UI: passphrase input, "Unlock" button, error state for wrong passphrase
- [ ] On submit:
  - Load salt from metadata
  - Derive key from passphrase + salt
  - Attempt to decrypt a known test value (or first transcript)
  - If success: store key in memory, proceed
  - If failure: show error, allow retry
- [ ] Add "Forgot passphrase" info (warning: data is unrecoverable)
- [ ] Route protection: redirect to `/unlock` if vault exists but not unlocked
- [ ] Add lock button to sidebar (clears key from memory)

---

### Dependencies (To Install)

```
dexie
dexie-react-hooks
```

---

### Out of Scope (Later Phases)

- Key rotation / re-encryption (v1.1)
- Zero-knowledge sync (v1.1)
- Real LLM summarization (Phase 5)
- Server-side session gating (Phase 4)

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
