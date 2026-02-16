# MVP 2 Implementation

Last Updated: 2026-02-13
Status: In Progress

> **Session protocol**: At the end of each working session, append a dated entry to
> "Running Updates" summarizing what was completed, what's in progress, and any decisions
> made. Mark items with status inline (`✅ Complete`, `🔄 In Progress`). This is how the
> next session picks up context.

> **Implementation guidance**: The code references, approaches, and implementation details
> in each item below are _suggestions_, not prescriptions. They capture initial thinking
> and context to help you get oriented, but you MUST apply your own judgement about the
> best way to solve each item elegantly. If you find a simpler approach, a better root
> cause, or a cleaner architecture — go with it. The goal is the outcome, not the recipe.

---

## Running Updates

- 2026-02-15: **Session Notebook + Arc system** — Replaced JSON `SessionSummary` with
  markdown Session Notebooks and a living Arc document. Two LLM calls at session end
  (notebook → arc update). Context assembly rewritten: Arc → all notebooks → last 3
  transcripts → random older transcripts (Fisher-Yates). Opus 4.6 context window
  corrected from 1M to 200K. New Dexie v2 schema (`sessionNotebooks`, `userArcs`).
  History UI updated to prefer notebooks over legacy summaries. All 48 tests pass.
  Docs: `notebook-and-arc-prompts.md`, updated `harness-flow.md`.
- 2026-02-13: `3.1 ✅ Complete` — Session history feature + 19 regression tests.
  History list page (`/history`), detail page (`/history/[sessionId]`),
  session card and summary components, transcript viewer with decrypt
  pipeline, sidebar "Past conversations" link, `formatShortDate` utility.
  Tests: 3 format, 5 session-summary rendering, 5 session-card rendering
  - truncation, 6 transcript-loader integration (encrypt→store→decrypt
    round-trip, multi-chunk concat, wrong-key error path).
- 2026-02-13: `2.1–2.8 ✅ Complete` — Tier 2 system prompt v2 and summary prompt
  rewrite. Collaborative session to evolve Lumen's identity from v1 → v2.
  Key additions: 5-lens peripheral vision (Calling, Relationships, Vitality,
  Prosperity, Spirit) as Simon's lived experience — not a framework, just how
  he listens. Enhanced PRESENCE with responsibility-as-empowerment, strong
  container/backbone, self-reliance over dependency, and reading-what's-unsaid.
  Added humor permission to VOICE (wit from clarity, not deflection). Rewrote
  THE CONVERSATION with rich first-session intake guidance and context-responsive
  returning-user openings. Added CONTINUITY section (friend who remembers vs.
  system that tracks). Added CLOSURE section (say the truest thing, not a recap).
  Added "don't narrate your own process" guardrail. Integrated safety/crisis
  awareness. Updated summary generation prompt: parting_words now must be
  something NEW they haven't heard — "the kind of thing a wise friend says at
  the door that stops you in your tracks." Perspective source material drawn
  from external mentoring prompts (6 files, merged Performance+Contribution →
  Calling = 5 lenses). New docs: `docs/mentoring/perspectives/` (5 files),
  `docs/mentoring/system-prompts-v2.md`, `docs/mentoring/summary-prompt.md`.
  Code changes: `prompts.ts` (7→11 constants), `summary.ts` (SUMMARY_PROMPT
  v2). No changes needed in `assembly.ts` — existing YAML front matter wiring
  already supports the new CONTINUITY instructions.
- 2026-02-12: Replaced `pb-[80vh]` with dynamic ResizeObserver-driven spacer
  system (`flex-spacer-scroll` branch). Fixes 6 scroll/layout bugs: excess
  whitespace below content, pin-to-top snap-back, 48px shift at streaming
  commit, lightbulb bounce, tight text/indicator gap, and footer height swing
  from ScrollToBottom mount/unmount. Added 20 E2E regression tests covering
  all 6 bug fixes + general chat stability (pin-to-top, show more/less, copy,
  shift+enter, input overlap, scroll-to-bottom, session resume, scroll during
  thinking). Tests use route mocking with sequenced SSE responses and run in
  CI via existing `e2e` workflow. Resolves the known issue from 1.9/1.10/1.11.
- 2026-02-12: `1.7 ✅ Complete` — added graceful recovery UX for response and
  reflection failures. In-chat streaming interruptions now preserve partial
  text and show an inline retry prompt ("I lost my train of thought...") with
  `Try again`. Session closure now surfaces summary-generation failures with
  honest copy and a `Try reflection again` action instead of silently finishing
  with empty reflection content. Added regression coverage for interrupted
  streaming/retry flow and closure error-state rendering.
- 2026-02-12: `1.6 ✅ Complete` — replaced immediate vault lock on `pagehide`
  with visibility-based idle locking. `VaultProvider` now starts a configurable
  timeout (default 30 minutes via `NEXT_PUBLIC_VAULT_IDLE_TIMEOUT_MINUTES`)
  when the tab is hidden, cancels it on return, and locks only after timeout.
  Kept immediate lock on `beforeunload` for full close security.
- 2026-02-12: `1.8 ✅ Complete` — surfaced conversation continuity in UI by adding
  session number to chat header (`Conversation N - <date>`), sourced from the
  transcript `session_number`.
- 2026-02-11: Organized `docs/implementation/` — moved completed phase plans to
  `done/` as templates, updated cross-references. MVP2 is now the single active WIP doc.
- 2026-02-11: Tier 1 kickoff. `1.1 ✅ Complete` by fixing a render-state handoff bug in
  `use-llm-conversation`: the streaming placeholder and finalized Lumen message briefly
  rendered together. We now clear `streamingContent` before committing final messages
  (both initial greeting and normal replies). `1.2 🔄 In Progress` and `1.3 🔄 In Progress`
  will be approached as one scroll-system pass to stabilize streaming and footer overlap.
- 2026-02-11: Implemented unified scroll behavior for `1.2` + `1.3` (`🔄 In Progress`,
  pending visual QA): removed token-by-token smooth scrolling, added bottom-locking during
  streaming, tracked "near bottom" state to respect manual scroll-up, and added dynamic
  bottom breathing room tied to measured footer height so growing input doesn't cover the
  latest Lumen message.
- 2026-02-11: QA feedback pass for Tier 1 chat rendering (`1.2 🔄 In Progress`, `1.3 🔄 In Progress`):
  fixed empty-state shield overlap so "One moment..." hides as soon as streaming begins; adjusted
  streaming autoscroll to align once at stream start (not every token) to prevent the currently-read
  line from being pushed upward while text streams in; added guard to avoid rendering empty Lumen
  bubbles when a stream resolves with blank content.
- 2026-02-11: `1.4 ✅ Complete` — switched default model to Opus 4.6 by adding `opus-4.6` to
  `MODEL_CONFIGS` (`claude-opus-4-6`, 1,000,000 context tokens, 120,000 reserved), updated
  `DEFAULT_MODEL_ID` to `opus-4.6`, and raised context assembly fallbacks to 1,000,000 / 120,000.
  Kept `opus-4.5` intact as a fallback config.
- 2026-02-11: `1.4 ✅ Complete` refinement — made model selection provider-agnostic and
  switchable via `NEXT_PUBLIC_DEFAULT_MODEL_ID` while restoring `opus-4.5` as the default.
  Added Opus 4.6 support without hardcoded context constants in context assembly; token budgets
  now derive from model metadata (30% reserved by default), so adding future models only
  requires a new registry entry.
- 2026-02-11: `1.4 ✅ Complete` default-toggle update — set fallback default back to
  `opus-4.6` for active QA while keeping env-based model switching in place.
- 2026-02-11: `1.5 ✅ Complete` — moved auth to canonical `user_id` (API now issues stable
  IDs per email and returns `{ user_id, email }` from `/v1/auth/session`), then scoped web
  storage by authenticated `user_id` via per-user Dexie database names. Removed local
  pseudo-user IDs, kept schema version stable, and updated backend/frontend tests.
- 2026-02-11: `1.1 ✅ Complete`, `1.2 ✅ Complete`, `1.3 ✅ Complete` — Chat UI stability
  session. Rewrote scroll behavior, animation system, and streaming rendering to match
  Claude.ai's stability patterns. Key changes:
  - Removed `AnimatePresence mode="popLayout"` (caused layout jitter on every message)
  - All scroll control is manual (`overflow-anchor: none`), no auto-scroll during streaming
  - User message pins to top on send via `scrollTo` + `getBoundingClientRect` (smooth)
  - Permanent `pb-[80vh]` padding provides scroll room without conditional spacers
  - Stop button replaces Send during generation; input disabled while streaming
  - Typing indicator replaced with pulsing gold lightbulb (brand-aligned, persists during streaming)
  - LumenMessage simplified to plain div — no motion.div, no entrance animation, no finalization flash
  - Double-render fix: `setStreamingContent(null)` before `setMessages()` prevents one-frame duplicate
  - Removed blinking cursor in favor of lightbulb-only indicator
  - Code review pass: removed dead refs (`messagesEndRef`, `footerRef`), unused exports, stale comments
- 2026-02-11: Added `1.9`, `1.10`, `1.11` — Show More/Less, Scroll-to-bottom button, Copy action.
  Added accessibility and responsive notes to `3.4`.
- 2026-02-11: `1.9 ✅ Complete`, `1.10 ✅ Complete`, `1.11 ✅ Complete` — Chat interaction features.
  - **Show More/Less** (1.9): Applied to user messages (not assistant), 200px collapse threshold,
    ResizeObserver-based height detection, thin gradient fade into card bg, left-aligned toggle
    button inside the bubble (matches Claude.ai pattern).
  - **Scroll-to-bottom** (1.10): Circular down-arrow button above input, appears when user scrolls
    away from actual content (compensates for `pb-[80vh]` padding in scroll math), smooth scroll to
    content end, AnimatePresence enter/exit animation.
  - **Copy action** (1.11): Clipboard copy on all messages. Always visible on latest Lumen message,
    hover-revealed on older messages (both Lumen and user). Check icon feedback on copy.

---

## North Star

> **Make the first 3 sessions compelling enough that testers voluntarily return and tell someone about it.**

MVP 1 answered: _"Can this exist?"_ — put a working product in someone's hands.
MVP 2 answers: **"Does this change someone?"** — does the relationship work?

The signal we're looking for: after 2-3 sessions over a couple weeks, do testers experience any of these moments?

### Design Targets ("Tell a Friend" Moments)

These are the specific experiences we're engineering for. Every item in this plan should serve at least one.

| #   | Moment                                           | How We Hit It                                                                               |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| 1   | _"It said something no one has ever said to me"_ | 5-lens system prompt — sees the relationship pattern underneath the work complaint          |
| 2   | _"It remembered"_                                | Session Notebooks + Arc + raw transcripts loaded into 200K context window                   |
| 3   | _"It knew what I needed before I did"_           | Prompt instructions to notice tone, energy, what's _not_ being said                         |
| 4   | _Humor — real lightness from seeing clearly_     | Prompt permission + anti-pattern guidance (not jokes to lighten mood, but wit from clarity) |

### Timeline

- **Wednesday (Day 1)**: Tier 1 — Make it work and feel right
- **Thursday (Day 2)**: Tier 2 — Make the conversation extraordinary
- **Thursday/Friday (Day 2-3)**: Tier 3 — Make it trustworthy

---

## Tier 1 — "Make it work and feel right"

**Goal**: Nothing breaks, nothing confuses, and there's a subtle sense that this is a real thing someone cared about building.

### 1.1 Fix first message double-render `[S]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: When the chat UI opens and Lumen sends the initial greeting, it appears duplicated for a split second before resolving to one. Jarring first impression.

**Root cause**: Likely a React state/render race condition — either a duplicate `handleSend` call or StrictMode double-mount triggering the initial greeting twice.

**Code refs**:

- `apps/web/app/chat/page.tsx` — chat initialization logic
- `apps/web/lib/hooks/use-llm-conversation.ts` — `handleSend`, streaming state management

**Approach**: Add a ref guard to prevent the initial greeting from firing twice. Check if `useEffect` cleanup is properly cancelling in-flight requests on re-mount. Verify the message array isn't being double-appended during streaming.

---

### 1.2 Fix streaming text pushing content upward `[S]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: While Lumen streams a response, the text shifts upward as tokens arrive, breaking reading flow. Users can't comfortably read the response as it's being generated.

**Code refs**:

- `apps/web/components/chat/chat-body.tsx` — message list rendering, scroll anchor
- `apps/web/app/chat/page.tsx` — streaming content state

**Approach**: Pin the scroll position so new content grows downward from a stable anchor point. Consider `overflow-anchor: auto` CSS property or manual scroll position management. The scroll-to-bottom ref at the end of the message list should keep the viewport locked to the latest content during streaming.

---

### 1.3 Fix Lumen message scroll behavior `[M]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: When a Lumen message appears, it doesn't auto-position well. As the user types longer responses in the input, the growing textarea covers Lumen's last message.

**Code refs**:

- `apps/web/components/chat/chat-body.tsx` — scroll area, message layout
- `apps/web/components/chat/chat-footer.tsx` — sticky footer with gradient

**Approach**:

- When a new Lumen message appears, auto-scroll so it sits in the top 2/3 of the viewport
- Add generous bottom padding (at least 1/3 viewport height) below the last Lumen message
- This padding should be dynamic — account for the chat footer height plus breathing room
- When the input textarea grows (multi-line), the visible area above should adjust so Lumen's message stays readable

**Implementation detail from original spec**:

> There should be enough whitespace after the last Lumen message (even after scrolling to the bottom of a long one) so that it only takes up ~2/3 of the page. The remaining whitespace at the bottom is intentional breathing room.

---

### 1.4 Default to Claude Opus 4.6 `[S]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: Currently using Opus 4.5 (200K context). Opus 4.6 offers 1M context window — a 5x increase that changes the context assembly math entirely.

**Code refs**:

- `apps/web/lib/llm/model-config.ts` — `DEFAULT_MODEL_ID`, `MODEL_CONFIGS`, model-to-provider mapping
- `apps/web/lib/context/assembly.ts` — `DEFAULT_TOTAL_CONTEXT_TOKENS`, `DEFAULT_RESERVED_TOKENS`, budget calculation

**Approach**:

- Add `opus-4.6` to `MODEL_CONFIGS` with model ID `claude-opus-4-6` and 1M context window
- Update `DEFAULT_MODEL_ID` to `'opus-4.6'`
- Keep the `opus-4.5` entry intact as fallback
- Update `DEFAULT_TOTAL_CONTEXT_TOKENS` to 1,000,000
- Revisit `DEFAULT_RESERVED_TOKENS` — with 1M total, 60K reserved is very conservative. Consider 120K-150K to allow longer responses
- Update any server-side model references if the API proxy hardcodes the model ID

**Ripple effects**: With ~850K tokens available for context, we can fit 50+ raw session transcripts. This makes summary fallback largely unnecessary for early testers but keeps the architecture correct for long-term users. Context compaction and summary compaction backlog items become lower priority.

---

### 1.5 Scope vaults by user/email `[M]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: All local data shares one vault. If multiple friends test on the same device or different accounts share a browser, their encrypted data could bleed together.

**Code refs**:

- `apps/web/lib/crypto.ts` — encryption/decryption functions
- `apps/web/lib/crypto/key-context.ts` — in-memory key storage
- `apps/web/lib/storage/` — Dexie/IndexedDB schema and operations

**Approach**:

- Namespace the Dexie database by user email or user ID (from auth session)
- When a user authenticates, open/create their specific database instance
- Vault metadata (salt, key check) should be per-user
- On logout, close the current user's database connection (don't delete data)
- On login as different user, open their database (or create fresh if first time)

**Key consideration**: The auth session provides the user's email after magic link verification. Use a hash of the email as the database namespace to avoid storing raw emails in IndexedDB metadata.

---

### 1.6 Reduce vault unlock churn — idle timeout `[M]`

**Status**: ✅ Complete (2026-02-12)

**Problem**: Every time a user closes the tab and returns, they must re-enter their passphrase. For testers coming back for session 2, this friction could kill the return visit.

**Code refs**:

- `apps/web/lib/crypto/key-context.ts` — `setKey()`, `getKey()`, `lockVault()`
- `apps/web/components/vault-provider.tsx` — clears key on `beforeunload`/`pagehide`

**Approach**:

- Implement a configurable idle timeout (e.g., 30 minutes) before clearing the derived key from memory
- On tab visibility change (`visibilitychange` event), start an idle timer instead of immediately clearing
- If the user returns within the timeout window, they skip the unlock page
- If the timeout expires, lock the vault normally
- Keep the `beforeunload` clear for full page close (security), but be smarter about tab switching and backgrounding

**Scope note**: This is the web-only piece. OS keychain / WebAuthn unlock stays in the backlog for the desktop wrapper (MVP 3).

---

### 1.7 Graceful error feedback for streaming and summary failures `[S]`

**Status**: ✅ Complete (2026-02-12)

**Problem**: Two silent failure modes exist:

1. **Streaming interruption**: If the network drops mid-response, the partial message just disappears with no user feedback
2. **Summary failure**: If the LLM fails during the closure "Reflecting" step, the user sees "Done" but no summary was generated

For a product built on presence and trust, silent failures are the opposite of what Lumen represents.

**Code refs**:

- `apps/web/lib/hooks/use-llm-conversation.ts` — abort handling, error states
- `apps/web/components/chat/session-closure.tsx` — closure progress steps, summary generation try/catch

**Approach**:

- **Streaming interruption**: When an abort or network error occurs mid-stream, show a warm inline message: _"I lost my train of thought — want me to try again?"_ with a retry action. Don't silently discard the partial content.
- **Summary failure**: When the closure summary fails, show honest feedback in the reflection view: _"I wasn't able to capture a full reflection this time, but your conversation is saved."_ Offer a retry button for the summary generation. Don't show empty parting_words or action_steps as if they were intentionally absent.

---

### 1.8 Session number visible in UI `[S]`

**Status**: ✅ Complete (2026-02-12)

**Problem**: The system computes `session_number` for context assembly, but the user never sees it. Displaying it creates a sense of journey and continuity — "Conversation 5" feels like a relationship, not a one-off chat.

**Code refs**:

- `apps/web/lib/context/assembly.ts` — `getSessionNumber()` computes from completed sessions
- `apps/web/components/chat/chat-header.tsx` — displays session date + elapsed time
- `apps/web/app/session/page.tsx` — pre-session screen, greeting

**Approach**:

- Add session number to the chat header alongside the date: e.g., "Conversation 5 — Feb 12, 2026"
- Optionally show it on the `/session` page: _"Ready for conversation 5?"_
- Keep it subtle — informational, not gamified

---

### 1.9 Show More / Show Less for long messages `[M]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: Long assistant messages take up the entire scroll area, making it hard to navigate the conversation. Messages exceeding ~60-80vh of rendered height should collapse by default.

**Spec ref**: Chat UI spec Section 3.

**Approach**:

- When an assistant message exceeds a height threshold (~600px), collapse it to that max height
- Apply a gradient fade-out at the bottom indicating more content below
- "Show more" button at the bottom edge of collapsed content
- On expand: "Show less" button sticks to the top of the viewport (always reachable)
- Scroll stability: expanding grows content downward; collapsing scrolls back to the message top

---

### 1.10 Scroll-to-bottom button `[S]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: After reading a long response or scrolling up through history, the user has no quick way to jump back to the latest content.

**Spec ref**: Chat UI spec Section 4 — "Scroll to Bottom" Button.

**Approach**:

- Small circular button with a down-arrow, floating just above the input area
- Only visible when the user is scrolled away from the bottom of the conversation
- Clicking it scrolls smoothly to the bottom
- Disappears when the user reaches the bottom
- Subtle styling — not intrusive, appears on scroll-up and fades in

---

### 1.11 Copy action on messages `[S]`

**Status**: ✅ Complete (2026-02-11)

**Problem**: Users may want to save or share something Lumen said. There's no way to copy a message without manual text selection.

**Spec ref**: Chat UI spec Section 7 — Message Action Bar.

**Approach**:

- On hover (desktop) or tap (mobile), show a small action bar below assistant messages
- Primary action: Copy (copies the message content to clipboard)
- For the most recent assistant message, the action bar may be always visible
- Keep it minimal — just Copy for now, expandable later

---

## Tier 2 — "Make the conversation extraordinary"

**Goal**: The quality of Lumen's conversation is so good that testers feel genuinely seen, and they tell someone about it.

This tier is fundamentally one connected piece of work: **rewriting who Simon is and how he shows up**. The code changes are mostly in `apps/web/lib/llm/prompts.ts` and `apps/web/lib/context/assembly.ts`, but the impact touches every conversation.

### 2.1 System prompt v2: 5-lens Simon `[M]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: Simon currently speaks with one undifferentiated perspective. The product vision describes five mentoring lenses — Career/Calling, Relationships, Vitality, Prosperity, Spirit — that together give Simon "peripheral vision." Without them, conversations stay surface-level on whatever topic the user brings up.

**Design target**: Moment #1 — _"It said something no one has ever said to me."_

A user talks about a frustrating boss, and Simon doesn't just see a work problem — he senses the relationship dynamic underneath, the vitality drain, maybe even the calling question hiding behind it. That cross-domain insight is what no therapist, no coach, and no generic AI chat provides.

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — `buildSystemPrompt()`, all prompt section constants
- `docs/mentoring/system-prompts-v1.md` — current active prompt (preserve as v1 reference)

**Approach**:

Add a new section to the system prompt (between PRESENCE and VOICE) that defines the five lenses:

```
## How You See

You see the whole person, not just the topic they bring up. Five dimensions
are always present in how you listen:

- **Calling** — purpose, vocation, contribution. What are they here to do?
- **Relationships** — love, connection, family, friendship. Who matters to them?
- **Vitality** — health, energy, body, aliveness. How are they physically?
- **Prosperity** — money, abundance, stewardship. Is scarcity driving decisions?
- **Spirit** — meaning, transcendence, inner life. What feeds their soul?

You don't name these dimensions or use them as a framework. They're your
peripheral vision. When someone talks about work stress, you naturally notice
the relationship strain underneath. When they mention money anxiety, you sense
the calling question hiding behind it. You follow what's most alive — but you
see the whole picture.
```

**Anti-pattern**: Lumen should NEVER say "Let's look at this through the lens of Vitality" or reference the framework explicitly. These are internal awareness, not conversational structure.

**Deliverable**: Updated `prompts.ts` with v2 prompt. Save current prompt as `docs/mentoring/system-prompts-v1.md` (already exists) and create `docs/mentoring/system-prompts-v2.md` for the new version.

---

### 2.2 Explicit thread and action continuity `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The system stores `open_threads` and `action_steps` from each session summary and includes them in YAML front matter. But there's no explicit instruction telling Lumen what to do with them. The "it remembered" moment is left to chance — Lumen might pick up on threads from raw transcripts, or it might not.

**Design target**: Moment #2 — _"It remembered."_

**Code refs**:

- `apps/web/lib/llm/prompts.ts` — session context injection (end of `buildSystemPrompt`)
- `apps/web/lib/context/assembly.ts` — YAML front matter construction with `last_session_action_steps` and `last_session_open_threads`

**Approach**:

Add continuity instructions to the system prompt's session-awareness section. Instead of just:

> "This is conversation #N with this person. You have history together."

Make it:

```
This is conversation #N with this person. You have history together.

From your last conversation, these threads were left open:
{open_threads}

They mentioned wanting to:
{action_steps}

You don't need to interrogate them about any of this. But carry this
awareness. If something comes up naturally, you can reference it. If they
bring up something related, connect the dots. The goal isn't accountability —
it's the feeling of being known.
```

**Key principle**: Continuity should feel like a friend remembering, not a coach checking homework. Lumen notices, it doesn't audit.

---

### 2.3 First-session intake guidance `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The current first-session instruction is: _"Begin the conversation with a warm, simple greeting. Be glad to be here."_ That's all. The product spec says the first session should be a guided intake that seeds the long-term relationship. Without it, session 2's context is just a raw transcript of a generic conversation with no structured knowledge of who this person is.

**Design target**: Seeds ALL future moments — you can't "remember" if you never learned.

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — first-session conditional in `buildSystemPrompt`

**Approach**:

For session #1, add specific guidance:

```
This is your first conversation with this person. You've never met before.

Open warmly and simply. Introduce yourself — not as a product, but as a
person would:

"Hey — I'm glad you're here. I'm Lumen. Think of me as a companion for
the stuff that matters to you — not a coach, not a therapist, just someone
who shows up and actually listens. We'll talk about whatever's on your mind.
Over time, I'll get to know your story. Ready?"

Then be genuinely curious:
- Learn their name (use it naturally after they share it)
- Understand what brought them here — what's alive for them right now
- Get a sense of what they're carrying, what they're hoping for
- Don't interview them — let it unfold like meeting someone at a dinner party

By the end of this first conversation, you should know them well enough that
next time feels like catching up with a friend, not meeting a stranger.
```

**Note**: The intro copy above is a starting point. It sets expectations (companion, not coach/therapist; remembers over time; user-directed) through personality rather than pedagogy. The exact wording can be iterated, but the three things a user should understand from the intro are: (1) this is a companion, not a tool, (2) it remembers across sessions, (3) it's here for what matters to them.

---

### 2.4 Opening prompt tone `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The current opening greeting for returning users can sound formulaic — a known issue from the v1 prompt. Combined with the 5-lens and continuity work, the opening should feel like a friend who's genuinely glad to see you and carries awareness of your story.

**Design target**: Moment #3 — _"It knew what I needed before I did."_

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — opening/greeting instructions in THE CONVERSATION section

**Approach**: Revise the CONVERSATION section's opening guidance:

- Remove any template-like phrasing
- Emphasize reading the person's energy from their first message
- If there are open threads from last time, Lumen might naturally reference one — but only if it feels right, not as a checklist
- The opening should feel different every time, responsive to context (time of day, days since last session, what was left open)

This work is naturally combined with 2.1-2.3 since it's all prompt writing.

---

### 2.5 Humor permission and guidance `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The v1 prompt doesn't explicitly give Lumen permission to be funny. Real mentors use humor — not to deflect, but because seeing things clearly is sometimes hilarious. Without this permission, Lumen defaults to earnest intensity, which can feel heavy and one-dimensional.

**Design target**: Moment #4 — _Humor._

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — VOICE section

**Approach**: Add to the VOICE section:

```
You can be funny. Real humor — not jokes to lighten the mood or quips to
fill silence, but the kind of wit that comes from seeing things clearly.
Sometimes the most loving thing is to help someone laugh at what they've
been taking too seriously. Lightness creates safety. It signals that this
is a real relationship, not a performance.
```

**Anti-pattern**: Forced humor, puns, emoji-laden responses, or deflecting from heavy moments with jokes. Humor should emerge from clarity, not replace it.

---

### 2.6 Reading what's unsaid `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The v1 prompt mentions "read their energy, their tone, what's said and unsaid" but doesn't give concrete guidance on what this looks like in a text-based conversation. With prosody analysis (voice) in the future, this is the text-based version of "it knew what I needed."

**Design target**: Moment #3 — _"It knew what I needed before I did."_

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — VOICE and PRESENCE sections

**Approach**: Add explicit guidance:

```
Notice the gaps. If someone says "everything's fine" but just described
three things that aren't — name that gently. If they're talking fast about
surface things, sense what they might be avoiding. If they bring up the same
thing three sessions in a row without acting on it, that pattern is worth
naming.

You can't hear their voice yet, but you can read between the lines. Trust
what you notice.
```

---

### 2.7 Closure recognition over homework `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: The closure prompt generates `parting_words` + `action_steps`. But the product vision draws a clear line: coaching asks "what will you do this week?" — mentoring asks "what are you learning about yourself?" The last thing Lumen says in a session is what the user carries into their week. It should feel like being seen, not being assigned.

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — closure/summary generation prompt (if separate from main system prompt)
- `apps/web/components/chat/session-closure.tsx` — where summary fields are rendered

**Approach**: Update the summary generation prompt to:

- Make `parting_words` the primary output — a genuine recognition of what happened, what shifted, what matters. Not a generic inspirational quote, but something specific to THIS conversation
- Reframe `action_steps` as "what emerged" rather than "what to do" — things that came up naturally, not assignments. Keep the field name for backwards compatibility but change the generation guidance
- The parting words should feel like the last thing a wise friend would say before you part ways — warm, specific, memorable

---

### 2.8 Safety policy integration `[S]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: Lumen needs basic safety boundaries baked into the system prompt — not a full trust & safety framework, but awareness that it's not a therapist and knows when to gently point toward professional resources.

**Code ref**:

- `apps/web/lib/llm/prompts.ts` — WHAT YOU DON'T DO section

**Approach**: Add to the system prompt (naturally, not as a disclaimer block):

```
If someone is in genuine crisis — expressing thoughts of self-harm,
describing abuse, or in immediate danger — you are warm and present, but
you are honest: "I care about you, and this is beyond what I can help with.
Please reach out to [resource]." You don't abandon them, but you don't
pretend to be what you're not.
```

Keep it minimal and integrated into the existing voice. Not a separate "safety" section — just part of who Lumen is.

---

## Tier 3 — "Make it trustworthy"

**Goal**: Users can see their data, take their data with them, recover from mistakes, and use Lumen comfortably on their phone.

### 3.1 View past session transcripts `[M]`

**Status**: ✅ Complete (2026-02-13)

**Problem**: Users have no way to review their conversation history. For a privacy-first product where the user owns their data, not being able to see it undermines the value proposition. It's also how testers verify the "it remembered" moment — they can go back and check.

**Code refs**:

- `apps/web/lib/storage/` — transcript storage, chunk decryption
- `apps/web/lib/context/assembly.ts` — `listTranscripts()`, `listTranscriptChunks()`
- Sidebar or new route needed

**Approach**:

- Add a "Past conversations" section accessible from the sidebar menu
- List sessions by date and session number (e.g., "Conversation 3 — Feb 5, 2026")
- On selection, decrypt and display the full transcript with the same message styling as the chat
- Include the session summary (parting words, action steps) if available
- Read-only view — no editing of past transcripts
- Consider lazy-loading / pagination if transcript list grows long

**UX consideration**: This should feel like flipping through a journal, not browsing a database. Minimal chrome, same warm styling as the chat.

---

### 3.2 Export/import for recovery `[M]`

**Problem**: If a user clears their browser data, switches devices, or needs to recover, their entire conversation history is gone. For a product that promises "your data stays on your device," users need the ability to actually take that data with them.

**Code refs**:

- `apps/web/lib/storage/` — all Dexie tables (transcripts, summaries, profiles, vault metadata)
- `apps/web/lib/crypto.ts` — encryption/decryption

**Approach**:

- **Export**: Serialize the entire encrypted vault (all Dexie tables) into a single JSON file. Include vault metadata (salt, key check, encryption version) so the export is self-contained. The export file contains ciphertext only — it's useless without the passphrase
- **Import**: Upload a vault export file, verify the passphrase can decrypt the key check, then hydrate all Dexie tables from the export
- **UI**: Add "Export vault" and "Import vault" options in the sidebar menu under a "Your Data" section
- **File format**: `.lumen` extension (JSON internally) for clear identification

**Security note**: The export is encrypted at rest — same PBKDF2 + AES-GCM protection as the live vault. No plaintext ever leaves the browser.

---

### 3.3 Mobile testing pass + accessibility `[M]`

**Problem**: Testers will try Lumen on their phones. The chat input, sidebar overlay, passphrase entry, and closure flow all need to work comfortably on mobile viewports. Additionally, basic accessibility standards should be met.

**Approach**: This is a testing + polish pass. After Tiers 1 and 2 are complete:

1. Open the deployed app on an iPhone and an Android device
2. Walk through the full flow: login → setup → session → chat → wrap up → closure
3. Note and fix issues with:
   - Chat input positioning (iOS keyboard push, viewport resize)
   - Sidebar overlay on small screens
   - Passphrase input usability (autocomplete, paste behavior)
   - Scroll behavior during streaming (especially on iOS Safari)
   - Closure reflection view layout
   - Touch targets (buttons, links)
   - Message action bar: tap-triggered instead of hover on mobile
   - Show More/Less collapse threshold: lower on mobile (~400px vs 600px)
   - Full-width messages on mobile (minimal side padding ~16px)
4. Fix what's broken, note what can wait

**Accessibility** (Chat UI spec Section 15):

- All interactive elements keyboard-navigable
- ARIA labels on icons (Send, Stop, Copy, Show More/Less)
- Respect `prefers-reduced-motion` — disable scroll animations and streaming effects
- Sufficient color contrast (4.5:1 minimum for body text)
- Screen reader announcement for streaming completion ("Response complete")

**Key concern**: iOS Safari handles viewport height differently when the keyboard is open (`100vh` includes the keyboard). The chat footer and input area need to account for this.

---

### 3.4 Prompt quality iteration — session feedback `[M]`

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

## What We're NOT Doing (MVP 2 Scope Boundaries)

These are explicitly out of scope for this sprint. They're captured in the backlog or designated as MVP 3 anchors.

- **Theme iteration / atmospheric design** — Nice but not blocking feedback
- **Evaluation harness / prompt versioning** — Internal tooling, not user-facing
- **Context compaction / summary compaction** — Less urgent with notebook/arc system
- **Session insights / analytics endpoint** — Can ask testers directly
- **Passphrase recovery mechanism** — Deferred from MVP 2 to backlog; pull forward before broader beta or once testers accumulate multi-week history
- **Zero-knowledge encrypted sync** — MVP 3
- **Desktop wrapper (Tauri)** — MVP 3
- **Voice input** — MVP 3
- **Provider auth + billing** — MVP 3
- **Individual mentor mode** — Architecture + prompt design for per-mentor voices; MVP 3
- **System prompt protection / IP security** — Backlog (Later)
- **Crisis UX** — Backlog (Later)

---

## MVP 3 Vision (Captured, Not Planned)

> **"Make this a real product people pay for."**

Anchors:

- **Tauri desktop wrapper** — Local filesystem vault, OS keychain, CLI/tool-calling extensibility
- **Zero-knowledge encrypted sync** — Multi-device with ciphertext-only server storage
- **Voice input (speech-to-text)** — Native mic in chat UI; web Speech API and native STT
- **Provider auth + billing** — Monetizable token broker + BYOK fallback
- **System prompt protection** — IP security for mentoring philosophy
- **Individual mentor mode** — Per-mentor voices (one perspective each) alongside unified Lumen; mentor selection UI, session tagging by mentor type. Architecture design in former `2.9`. Source prompts at `~/Documents/conversations/mentoring-prompts/`
- **OpenClaw plugin** — Distribution wedge for AI tinkerer audience

---

## Code Reference Index

| Area              | File                                                | Key Functions                                           |
| ----------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Model config      | `apps/web/lib/llm/model-config.ts`                  | `DEFAULT_MODEL_ID`, `MODEL_CONFIGS`, `getModelConfig()` |
| System prompt     | `apps/web/lib/llm/prompts.ts`                       | `buildSystemPrompt()`                                   |
| Context assembly  | `apps/web/lib/context/assembly.ts`                  | `buildSessionContext()`, `getSessionNumber()`           |
| Chat page         | `apps/web/app/chat/page.tsx`                        | `ChatPage` component                                    |
| Chat body         | `apps/web/components/chat/chat-body.tsx`            | `ChatBody` — message list, scroll                       |
| Chat footer       | `apps/web/components/chat/chat-footer.tsx`          | `ChatFooter` — input, sticky positioning                |
| LLM hook          | `apps/web/lib/hooks/use-llm-conversation.ts`        | `useLlmConversation()`, `handleSend`                    |
| Session lifecycle | `apps/web/lib/hooks/use-session-lifecycle.ts`       | `useSessionLifecycle()`                                 |
| Encryption        | `apps/web/lib/crypto.ts`                            | `encrypt()`, `decrypt()`, `deriveKey()`                 |
| Key context       | `apps/web/lib/crypto/key-context.ts`                | `setKey()`, `getKey()`, `lockVault()`                   |
| Vault provider    | `apps/web/components/vault-provider.tsx`            | Key cleanup on page unload                              |
| Session closure   | `apps/web/components/chat/session-closure.tsx`      | `SessionClosure` — 4-step progress                      |
| Session page      | `apps/web/app/session/page.tsx`                     | Pre-session gate, greeting                              |
| Unlock page       | `apps/web/app/unlock/page.tsx`                      | Passphrase verification                                 |
| Setup page        | `apps/web/app/setup/page.tsx`                       | Vault initialization                                    |
| History list      | `apps/web/app/history/page.tsx`                     | Past conversations list                                 |
| History detail    | `apps/web/app/history/[sessionId]/page.tsx`         | Single transcript view with summary                     |
| Session card      | `apps/web/components/history/session-card.tsx`      | Journal-style card for history list                     |
| Session summary   | `apps/web/components/history/session-summary.tsx`   | Summary block (parting words + action steps)            |
| Transcript viewer | `apps/web/components/history/transcript-viewer.tsx` | Read-only transcript display                            |
| Transcript loader | `apps/web/lib/hooks/use-transcript-loader.ts`       | Decrypt chunks → Message[] hook                         |
| Notebook prompt   | `apps/web/lib/session/summary.ts`                   | `NOTEBOOK_PROMPT`, `extractClosureFields()`             |
| Arc prompts       | `apps/web/lib/session/arc.ts`                       | `ARC_CREATION_PROMPT`, `ARC_UPDATE_PROMPT`              |
| Storage types     | `apps/web/types/storage.ts`                         | `SessionNotebook`, `UserArc`                            |
