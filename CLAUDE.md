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

# API (apps/api)
cd apps/api && go run ./cmd/api
```

## Architecture

**Monorepo Structure**: pnpm workspaces with two packages:

- `apps/web` - Next.js 15 + React 19 frontend (main development focus)
- `apps/api` - Go chi/v5 backend (auth, session gating, LLM proxy)

**Product**: Privacy-first AI coaching app. Client-side encryption (PBKDF2 + AES-GCM) is a core requirement, not an afterthought. All sensitive data stored locally in IndexedDB.

## Frontend Details

**Tech Stack**: Next.js 15, React 19, TypeScript, Tailwind CSS v4 (CSS-first config), Radix UI primitives, Framer Motion

**Theming System**: Three time-based color palettes (morning/afternoon/evening) that auto-shift. Theme context in `components/theme-provider.tsx`. CSS variables defined in `app/globals.css`.

**Design Aesthetic**: "Warm, grounded, clear, human" - OmmWriter-inspired minimal UI with atmospheric gradient backgrounds. Fonts are Lato (body) and Fraunces (display/headings).

**Component Pattern**: shadcn/ui-style components in `components/ui/` using CVA for variants. Use `cn()` utility from `lib/utils.ts` for class merging.

## Code Style

- Single quotes, trailing commas, 100 char print width (Prettier)
- Prefer `type` over `interface` for simple type aliases
- Before committing, ensure CI will pass by running the checks in `.github/workflows/ci.yml`

## Key Documentation

- `docs/frontend-plan.md` - Implementation roadmap with progress tracking
- `docs/design-system.md` - Palettes, typography, component guidelines
- `docs/product-spec.md` - Product requirements (locked for MVP)
- `docs/architecture-v0.md` - System architecture and data flow
