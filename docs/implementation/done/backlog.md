# Backlog Changelog

Completed backlog items done directly (not promoted to a full phase). Items that graduate to frontend/backend phases are tracked in their respective `done/frontend-phase*.md` or `done/backend-phase*.md` files instead.

---

## 2026-02

### Harness

- **System prompt v1.1 — Simon the ragpicker infusion** — Deepened v1 prompt with explicit Simon Potter philosophy from "The Greatest Miracle in the World." Key changes: Added "You are Lumen" identity, Simon inspiration paragraph in Soul section, "greatest miracle in the world" framing, "help them remember (not learn)" presence, explicit anti-probing guidance ("don't ask what's that about"), no-disclaimers rule. Kept Simon reference to single mention at top to avoid repetition.
  - _Docs: `docs/coaching/system-prompts-v1.md`_
  - _Files: `apps/web/lib/llm/prompts.ts`_

- **Rename coach → lumen throughout codebase** — Comprehensive rename of all "coach" references to "lumen" in both user-facing copy and internal implementation. File renames: `coach-unavailable.tsx` → `lumen-unavailable.tsx`, `coach-message.tsx` → `lumen-message.tsx`. Type changes: `MessageRole` from `'coach'` to `'lumen'`, `coach_preferences` → `preferences`, `coach_notes` → `notes`. Updated all variable names, function names, comments, and env vars. Updated initial greeting instruction to match Simon philosophy.
  - _Files: 17 files across `apps/web/` including types, components, hooks, and tests_

- **System prompt v1** — Complete rewrite of coaching system prompt based on discovery session. Shifted from instruction-heavy v0 to soul-first v1 emphasizing: companion (not coach) identity, love and acceptance, voice range and congruence, natural conversation flow.
  - _Docs: `docs/coaching/system-prompts-v1.md`, `docs/coaching/system-prompt-discovery.md`, `docs/coaching/system-prompt-discovery-raw.md`_
  - _Files: `apps/web/lib/llm/prompts.ts`_

- **Rename `recognition_moment` → `parting_words`** — Refactored terminology across types, summary prompt, context assembly, and UI to better align with the coaching philosophy of leaving the user with warm, meaningful words.
  - _Files: `types/storage.ts`, `lib/session/summary.ts`, `lib/context/assembly.ts`, `components/chat/session-closure.tsx`, `app/chat/page.tsx`, plus test files_

### UX

- **Warm up all UI copy** — Comprehensive tone review aligning UI language with v1 system prompt philosophy. Removed clinical language ("set aside 60 min to reflect," "action steps," "suggested next session") and replaced with warm, invitational copy ("Come as you are," "Like catching up with an old friend," "See what unfolds"). Updated vision statement to reflect "Greatest Miracle in the World" inspiration: "A companion for the journey. Weekly conversations that walk you back to the world of living — restoring self-trust."
  - _Files: `app/page.tsx`, `app/session/page.tsx`, `components/chat/end-session-dialog.tsx`, `components/chat/session-closure.tsx`, `lib/session/summary.ts`_
  - _Docs: `docs/product/spec.md`, `docs/coaching/harness-flow.md`_

- **Session closure loading state** — Added spinner and pulsing animation to "Wrapping up your session..." screen during summary generation.
  - _Files: `apps/web/components/chat/session-closure.tsx`_

- **Session reflection sharing (copy + share sheet)** — Added share/copy CTA on session closure with cancel-safe UX, share/copy-specific success messaging, and lightweight client event logging.
  - _Files: `apps/web/components/chat/session-closure.tsx`, `apps/web/lib/analytics.ts`_

### Auth & Session

- **Sidebar auth state + logout** — Added signed-in indicator with current email, plus logout action in the sidebar. Implemented `POST /v1/auth/logout` to clear the session cookie and invalidate the in-memory session. Session status now returns the authenticated email.
  - _Files: `apps/web/components/sidebar.tsx`, `apps/web/lib/api/auth.ts`, `apps/api/internal/handlers/auth.go`, `apps/api/internal/server/router.go`, `apps/api/internal/store/auth_tokens.go`_

### Build / Infra

- **Next.js 15 Suspense fix** — Replaced `useSearchParams()` with `window.location.search` pattern to fix static generation errors. Created shared `lib/hooks/dev-auth.ts` utility.
  - _Files: `lib/hooks/dev-auth.ts`, `lib/hooks/use-auth-session-guard.ts`, `app/session/page.tsx`, `app/setup/page.tsx`, `app/unlock/page.tsx`, `app/login/callback/page.tsx`_

### LLM Integration

- **Real LLM streaming** — Replaced simulated word-by-word streaming with Anthropic SSE streaming, including a client-side SSE parser and live incremental updates.
  - _Files: `apps/web/lib/llm/client.ts`, `apps/web/lib/hooks/use-llm-conversation.ts`_

- **Abort signal propagation** — Forwarded client abort signals to the Anthropic upstream request to cancel in-flight streams.
  - _Files: `apps/web/app/api/llm/anthropic/route.ts`_
