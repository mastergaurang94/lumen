# CLAUDE.md

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

**Product**: Privacy-first AI coaching app. Client-side encryption (PBKDF2 + AES-GCM) is a core requirement, not an afterthought. All sensitive data stored locally in IndexedDB.

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

**Theming System**: Three time-based color palettes (morning/afternoon/evening) that auto-shift. Theme context in `components/theme-provider.tsx`. CSS variables defined in `app/globals.css`.

**Design Aesthetic**: "Warm, grounded, clear, human" - OmmWriter-inspired minimal UI with atmospheric gradient backgrounds. Fonts are Lato (body) and Fraunces (display/headings).

**Component Pattern**: shadcn/ui-style components in `components/ui/` using CVA for variants. Use `cn()` utility from `lib/utils.ts` for class merging.

## Product Context

**What is Lumen**: A weekly AI coaching app. Sessions are spaced 7 days apart. Data is stored locally and encrypted. Privacy is paramount.

## Design Direction

**Aesthetic**: Warm, grounded, and clear — never stark or cold. Inspired by OmmWriter's distraction-free focus and claude.ai's clean structure, but with more warmth and atmosphere.

**Design system** (see `docs/design/system.md`):

- Three time-based color palettes (morning/afternoon/evening) that shift with the day
- Fraunces display font for headings, Lato for body text
- Atmospheric backgrounds with subtle radial gradients
- Generous whitespace, soft rounded corners, subtle animations

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

## Product UX Patterns

These patterns are core to Lumen's product experience:

- Session-centric layout (not conversation-history-centric)
- Pre-session gate: prompt user to set aside ~60 minutes
- Passphrase onboarding with clear "unrecoverable" warning
- Session spacing: 7-day rhythm encouraged conversationally by coach
- Explicit "End Session" button; coach may suggest closure but user decides
- Privacy indicator in UI (local storage, not used for training)
- "Coach unavailable" state for model outages

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

- `docs/product/spec.md` - Product requirements (locked for MVP)
- `docs/design/system.md` - Palettes, typography, component guidelines
- `docs/architecture/overview.md` - System architecture and data flow
- `docs/coaching/` - Harness flow and system prompts
- `docs/implementation/` - MVP and frontend implementation plans
