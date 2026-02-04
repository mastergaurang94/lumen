# Backlog Changelog

Completed backlog items done directly (not promoted to a full phase). Items that graduate to frontend/backend phases are tracked in their respective `done/frontend-phase*.md` or `done/backend-phase*.md` files instead.

---

## 2026-02

### UX

- **Session closure loading state** — Added spinner and pulsing animation to "Wrapping up your session..." screen during summary generation.
  - _Files: `apps/web/components/chat/session-closure.tsx`_

### Build / Infra

- **Next.js 15 Suspense fix** — Replaced `useSearchParams()` with `window.location.search` pattern to fix static generation errors. Created shared `lib/hooks/dev-auth.ts` utility.
  - _Files: `lib/hooks/dev-auth.ts`, `lib/hooks/use-auth-session-guard.ts`, `app/session/page.tsx`, `app/setup/page.tsx`, `app/unlock/page.tsx`, `app/login/callback/page.tsx`_
