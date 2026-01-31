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
