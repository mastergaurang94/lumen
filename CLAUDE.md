# CLAUDE.md

> This file is mirrored into `AGENTS.md`. Keep both in sync.

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development Commands

```bash
# Root level (monorepo)
pnpm lint              # ESLint across all packages
pnpm format            # Prettier format all files
pnpm format:check      # Check formatting without modifying

# Web app (apps/web)
pnpm --filter web dev      # Next.js dev server on port 3000
pnpm --filter web build    # Production build
pnpm --filter web start    # Production server
pnpm --filter web test -- --run  # Vitest non-watch run (preferred for CI/verification)

# API (apps/api)
cd apps/api && go run ./cmd/api
```

## Architecture

**Monorepo Structure**: pnpm workspaces with two packages:

- `apps/web` - Next.js 15 + React 19 frontend (main development focus)
- `apps/api` - Go chi/v5 backend (auth, LLM proxy)

**Product**: Privacy-first AI conversations app. Client-side encryption (PBKDF2 + AES-GCM) is a core requirement, not an afterthought. All sensitive data stored locally in IndexedDB.

## Backend Details

**Runtime**: Go (chi/v5). Keep API work concise and aligned with frontend needs.

## Engineering Approach

- Fix root causes over band-aids; prefer simple, maintainable solutions
- Remove dead code instead of leaving breadcrumbs or "moved to X" comments
- When stuck, do a quick web check for official docs or best-practice solutions before pivoting

## Collaboration & Quality

- Deliver production-quality, modular, idiomatic solutions; no hacks or partials
- Validate with integration/E2E tests, no mock-only confidence
- Communicate as if we are pair-programming
- Keep README clean; put extra docs in `docs/`
- Clean up temporary files; leave repo organized
- Use conventional commits
- Add high-signal comments that explain intent, invariants, and non-obvious decisions
- Comments should let a reader quickly understand what a file or function does; balance concise and deliberate

## Frontend Details

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4 (CSS-first config), Radix UI primitives, Framer Motion

**Principles**:

- Warm: Soft, natural tones
- Grounded: Earthy palette, generous whitespace, nothing flashy
- Clear: Clean typography, no clutter, distraction-free
- Human: Rounded shapes, friendly type, subtle warmth

## Frontend Technical Rules

- Use Tailwind CSS exclusively — no inline styles
- Use shadcn/ui primitives for standard UI (Button, Input, Dialog, ScrollArea, etc.)
- Build custom components when the design requires something specific
- Support dark/light mode via next-themes
- Use lucide-react for icons
- Use CSS variables and theme tokens — UI must adapt to all palettes
- Fully responsive and mobile-friendly

## Code Style

- Single quotes, trailing commas, 100 char print width (Prettier)
- Prefer `type` over `interface` for simple type aliases

## Pre-Commit Hooks

Husky automatically runs checks before every commit (see `.husky/pre-commit`):

- **lint-staged**: formats and lints only staged files
- **Unit tests**: `pnpm --filter web test -- --run`
- **Go tests**: `go test ./...`

Commits are blocked if any check fails. Keep `.husky/pre-commit` and `.github/workflows/ci.yml` in sync when adding new checks.

## Napkin

Keep `.claude/napkin.md` updated with high-signal preferences, pitfalls, conventions, and
decisions as they emerge. This is the persistent scratchpad across sessions.

## Browser Verification (SweetLink)

SweetLink connects agents to a real browser session for visual verification and debugging.
It works in Gaurang's actual browser tab (with encryption keys already unlocked), so you can
verify post-unlock UI that headless browsers can't reach.

**Daemon must be running first** — if commands fail with connection errors, ask Gaurang to start it:

```bash
pnpm sweetlink daemon
```

**Common commands:**

```bash
# Open a page in the controlled browser
pnpm sweetlink open --controlled --path /chat

# Smoke test route groups (see sweetlink.json for route definitions)
pnpm sweetlink smoke --routes public    # landing + login (no auth needed)
pnpm sweetlink smoke --routes core      # chat + session (requires unlocked vault)
pnpm sweetlink smoke --routes all       # everything

# Screenshot a specific page
pnpm sweetlink screenshot --path /chat

# Check for console errors in active sessions
pnpm sweetlink sessions

# Target a different dev server port (for multi-agent work)
pnpm sweetlink open --url http://localhost:3001/chat
```

**When to use:**

- After UI changes — run `pnpm sweetlink smoke --routes core` to catch regressions
- Debugging rendering issues — screenshot the page and inspect console errors
- Verifying encrypted data renders correctly post-unlock

**Route groups** (defined in `sweetlink.json`):

- `public` — `/`, `/login` (no auth needed)
- `auth` — `/login`, `/setup`, `/unlock` (auth flow pages)
- `core` — `/chat`, `/session` (main app, requires unlocked vault)
- `history` — `/history` (session history)
- `all` — every route

## Key Documentation

ALWAYS read ALL docs to get started with a thread.

- `docs/product/spec.md` - Product requirements (locked for MVP)
- `docs/design/system.md` - Palettes, typography, component guidelines
- `docs/architecture/overview.md` - System architecture and data flow
- `docs/architecture/harness-flow.md` - Context assembly and session closure flow
- `docs/mentoring/` - System prompts, perspectives, notebook/arc prompt design
- `docs/implementation/mvp3.md` - Active sprint plan (check Running Updates first)
- `docs/implementation/done/mvp2.md` - Completed MVP 2 (archived)
- `docs/implementation/backlog.md` - Prioritized work queue
- `docs/implementation/done/` - Archived phases and completed work
- `docs/deploy/runbook.md` - Deployment workflow and rollback guidance
- `docs/deploy/checklist.md` - Pre/post backend deploy checklist
- `docs/deploy/backend-release-notes.md` - Structured backend deploy log
