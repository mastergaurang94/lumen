# MVP 3 Implementation

Last Updated: 2026-02-22
Status: In progress (restructured)

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline. This is how the next session picks up context.

---

## Running Updates

- 2026-02-22: Pivot from WKWebView + static export approach to **full SwiftUI native Mac app**. No React in the loop — complete rewrite of UI and business logic in Swift. Tier 1 items (1.1–1.6) replaced with single reference to `swift-mac-app.md`. Key decisions: GRDB.swift for SQLite, CryptoKit AES-GCM + CommonCrypto PBKDF2, URLSession.bytes for SSE streaming, `@Observable` MVVM, 3 SPM deps (GRDB, swift-markdown-ui, KeychainAccess). 6 implementation phases. Web app stays as-is during development.
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

**Goal**: Lumen moves from a browser tab to a native SwiftUI Mac app.

> **Full plan**: [`docs/implementation/swift-mac-app.md`](swift-mac-app.md)
>
> Covers: Xcode project setup, GRDB.swift SQLite, CryptoKit/CommonCrypto encryption, Keychain auto-unlock, passphrase recovery, auth with deep linking, SSE streaming, context assembly, session closure, history, settings, transcript import — across 6 phases.

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
| Swift Mac app plan         | `docs/implementation/swift-mac-app.md`       |
| Context assembly + closure | `docs/architecture/harness-flow.md`          |
| System architecture        | `docs/architecture/overview.md`              |
| Notebook/Arc prompts       | `docs/mentoring/notebook-and-arc-prompts.md` |
| System prompt v2           | `docs/mentoring/system-prompts-v2.md`        |
| Backlog                    | `docs/implementation/backlog.md`             |
