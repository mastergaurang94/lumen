# Backlog Changelog

Completed backlog items done directly (not promoted to a full phase). Items that graduate to frontend/backend phases are tracked in their respective `done/frontend-phase*.md` or `done/backend-phase*.md` files instead.

---

## 2026-02

### Harness

- **System prompt v1.1 — Simon the ragpicker infusion** — Deepened v1 prompt with explicit Simon Potter philosophy from "The Greatest Miracle in the World." Key changes: Added "You are Lumen" identity, Simon inspiration paragraph in Soul section, "greatest miracle in the world" framing, "help them remember (not learn)" presence, explicit anti-probing guidance ("don't ask what's that about"), no-disclaimers rule. Kept Simon reference to single mention at top to avoid repetition.
  - _Docs: `docs/mentoring/system-prompts-v1.md`_
  - _Files: `apps/web/lib/llm/prompts.ts`_

- **Rename coach → lumen throughout codebase** — Comprehensive rename of all "coach" references to "lumen" in both user-facing copy and internal implementation. File renames: `coach-unavailable.tsx` → `lumen-unavailable.tsx`, `coach-message.tsx` → `lumen-message.tsx`. Type changes: `MessageRole` from `'coach'` to `'lumen'`, `coach_preferences` → `preferences`, `coach_notes` → `notes`. Updated all variable names, function names, comments, and env vars. Updated initial greeting instruction to match Simon philosophy.
  - _Files: 17 files across `apps/web/` including types, components, hooks, and tests_

- **System prompt v1** — Complete rewrite of coaching system prompt based on discovery session. Shifted from instruction-heavy v0 to soul-first v1 emphasizing: companion (not coach) identity, love and acceptance, voice range and congruence, natural conversation flow.
  - _Docs: `docs/mentoring/system-prompts-v1.md`, `docs/mentoring/system-prompt-discovery.md`, `docs/mentoring/system-prompt-discovery-raw.md`_
  - _Files: `apps/web/lib/llm/prompts.ts`_

- **Rename `recognition_moment` → `parting_words`** — Refactored terminology across types, summary prompt, context assembly, and UI to better align with the coaching philosophy of leaving the user with warm, meaningful words.
  - _Files: `types/storage.ts`, `lib/session/summary.ts`, `lib/context/assembly.ts`, `components/chat/session-closure.tsx`, `app/chat/page.tsx`, plus test files_

### UX

- **Session closure animated progress steps** — Replaced the static "Wrapping up..." spinner with a 4-step animated progression: wrapping up → storing locally → reflecting on conversation → done. Uses `ClosureStep` state machine instead of boolean `isSummaryLoading`. Fast steps enforce 600ms minimum display time so they don't flash by invisibly. Framer Motion `AnimatePresence` cross-fades between the progress view and the final "Until next time" screen. Also added `tsc --noEmit` to CI and pre-commit, fixed pre-existing `durationMs` scope bug in LLM client, and fixed E2E type errors.
  - _Files: `apps/web/components/chat/session-closure.tsx`, `apps/web/app/chat/page.tsx`, `apps/web/types/session.ts`, `.github/workflows/ci.yml`, `.husky/pre-commit`, `apps/web/lib/llm/client.ts`, `apps/web/e2e/smoke.spec.ts`, `eslint.config.mjs`_

- **Warm up all UI copy** — Comprehensive tone review aligning UI language with v1 system prompt philosophy. Removed clinical language ("set aside 60 min to reflect," "action steps," "suggested next session") and replaced with warm, invitational copy ("Come as you are," "Like catching up with an old friend," "See what unfolds"). Updated vision statement to reflect "Greatest Miracle in the World" inspiration: "A companion for the journey. Weekly conversations that walk you back to the world of living — restoring self-trust."
  - _Files: `app/page.tsx`, `app/session/page.tsx`, `components/chat/end-session-dialog.tsx`, `components/chat/session-closure.tsx`, `lib/session/summary.ts`_
  - _Docs: `docs/product/spec.md`, `docs/mentoring/harness-flow.md`_

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

### Go Live (Phase 7)

- **Store interface extraction** — Defined `AuthTokens`, `AuthSessions`, `CoachingSessions` interfaces in `store/interfaces.go`. Handlers and middleware now depend on interfaces, not concrete types. Compile-time compliance checks on in-memory stores.
  - _Files: `internal/store/interfaces.go`, `internal/store/auth_tokens.go`, `internal/store/session_metadata.go`, `internal/handlers/auth.go`, `internal/handlers/sessions.go`, `internal/middleware/auth.go`_

- **Dependency injection refactor** — Added `server.Dependencies` struct. `server.New(cfg)` → `server.New(cfg, deps)`. `main.go` builds and wires all dependencies. Test helpers updated.
  - _Files: `internal/server/router.go`, `cmd/api/main.go`, `internal/handlers/auth_test.go`, `internal/handlers/sessions_test.go`_

- **SQLite persistent storage** — Pure-Go SQLite via `modernc.org/sqlite` (no CGO). Schema migration on open, WAL mode, RFC3339 text timestamps, transactional token consumption. Selected when `DATABASE_URL` is set, falls back to in-memory.
  - _Files: `internal/store/sqlite/sqlite.go`, `internal/store/sqlite/auth_tokens.go`, `internal/store/sqlite/auth_sessions.go`, `internal/store/sqlite/coaching_sessions.go`, `cmd/api/main.go`, `go.mod`_

- **Resend email provider** — Direct HTTP POST to Resend API (no SDK). Branded HTML template with sage green CTA. Selected when `RESEND_API_KEY` is set, falls back to DevProvider.
  - _Files: `internal/email/resend.go`, `internal/config/config.go`, `cmd/api/main.go`_

- **Server-side LLM token** — Injects `ANTHROPIC_TOKEN` env var in proxy route before validation. `NEXT_PUBLIC_LLM_SERVER_MODE` skips IndexedDB key loading and ProviderGate on client, using `'server-managed'` sentinel.
  - _Files: `apps/web/app/api/llm/anthropic/route.ts`, `apps/web/app/chat/page.tsx`_

- **Next.js API rewrites** — `next.config.mjs` rewrites `/v1/:path*` to `API_BACKEND_URL` when set. Solves cross-origin cookie problem (Vercel → Fly.io same-origin proxy).
  - _Files: `apps/web/next.config.mjs`_

- **Dockerfile + Fly.io config** — Multi-stage Docker build (`golang:1.24-alpine` → `alpine:3.19`), `CGO_ENABLED=0`. `fly.toml` with health check, volume mount at `/data` for SQLite persistence.
  - _Files: `apps/api/Dockerfile`, `apps/api/fly.toml`, `apps/api/.dockerignore`_

- **Environment documentation** — `.env.example` for both apps with all env vars and commented defaults.
  - _Files: `apps/api/.env.example`, `apps/web/.env.example`_

- **Deployment (2026-02-10)** — Deployed and verified end-to-end.
  - _Frontend_: Vercel (`mylumen.ai`), root directory `apps/web`
  - _Backend_: Fly.io (`lumen-api.fly.dev`), region `iad`, 1GB volume for SQLite
  - _Email_: Resend via `mylumen.ai` domain
  - _LLM_: Server-managed Anthropic token (no BYOK required for testers)
