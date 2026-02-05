# Backlog Changelog

Completed backlog items done directly (not promoted to a full phase). Items that graduate to frontend/backend phases are tracked in their respective `done/frontend-phase*.md` or `done/backend-phase*.md` files instead.

---

## 2026-02

### Harness

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

### Build / Infra

- **Next.js 15 Suspense fix** — Replaced `useSearchParams()` with `window.location.search` pattern to fix static generation errors. Created shared `lib/hooks/dev-auth.ts` utility.
  - _Files: `lib/hooks/dev-auth.ts`, `lib/hooks/use-auth-session-guard.ts`, `app/session/page.tsx`, `app/setup/page.tsx`, `app/unlock/page.tsx`, `app/login/callback/page.tsx`_
