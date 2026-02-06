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

## Key Documentation

ALWAYS read ALL docs to get started with a thread.

- `docs/product/spec.md` - Product requirements (locked for MVP)
- `docs/design/system.md` - Palettes, typography, component guidelines
- `docs/architecture/overview.md` - System architecture and data flow
- `docs/coaching/` - Harness flow and system prompts
- `docs/implementation/` - MVP and frontend implementation plans
