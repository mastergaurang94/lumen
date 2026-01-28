# Frontend Implementation Plan (Phase 2)

Date: 2026-01-28
Status: Draft

## Overview

Phase 2 of the MVP: Build the web app shell with Next.js + TypeScript, Tailwind, and shadcn/ui. This phase is UI-only — no backend integration, no encryption, no real auth.

See `design-system.md` for palette, typography, and visual direction.

## Steps

### Step 1: Foundation Setup
- Install and configure Tailwind CSS
- Initialize shadcn/ui (includes `cn()` utility, CSS variables)
- Add `next-themes` for dark/light mode
- Add `lucide-react` for icons
- Add Lato font (humanist, warm)
- Set up three time-based palettes (morning/afternoon/evening) — see `design-system.md`
- Configure `ThemeProvider` with time-of-day auto-detection + manual override
- Base color tokens as CSS variables for easy palette switching

### Step 2: Layout Shell
- Create app layout with centered content area (max-width container)
- Add minimal header with Lumen wordmark + theme toggle
- Build responsive foundation (mobile-first)

### Step 3: Auth Entry (UI only)
- Magic link request page (`/login`)
- Email input with validation
- "Check your email" confirmation state
- Privacy line in footer

### Step 4: Passphrase Onboarding Gate
- First-time setup flow (`/setup`)
- Passphrase creation with confirmation input
- Clear "unrecoverable" warning copy
- Strength indicator (optional)

### Step 5: Session Gating UI
- "Session locked" state with next available date
- Pre-session prompt ("Set aside ~60 minutes")
- "Begin Session" button (disabled until gate clears)

### Step 6: Chat UI Core
- Message list with scroll area (coach left, user right)
- Coach avatar/icon
- Streaming message support (typing indicator, incremental render)
- Auto-scroll behavior
- Multiline expanding input with send button
- "End Session" button in header or input area

### Step 7: Session Closure UI
- End session confirmation dialog
- Summary display (from coach's closing message)
- Action steps display
- "Session complete" state with next session date

### Step 8: Edge States
- "Coach unavailable" UI (model outage)
- Loading/skeleton states
- Error boundaries with friendly messages
- Empty state (pre-first-message)

## Dependencies

```
tailwindcss, postcss, autoprefixer
@tailwindcss/typography
shadcn/ui components (Button, Input, Dialog, ScrollArea, Avatar, etc.)
next-themes
lucide-react
react-markdown + remark-gfm
clsx + tailwind-merge (via shadcn's cn())
@fontsource/lato (or next/font with Google Fonts)
```

## Out of Scope (Later Phases)

- Actual auth integration (Phase 4 - Go service)
- Local storage + encryption (Phase 3 - Dexie + WebCrypto)
- Real LLM streaming (Phase 4/5 - API + harness)
