# Frontend Implementation Plan (Phase 2)

Date: 2026-01-28
Status: In Progress
Last Updated: 2026-01-28

## Overview

Phase 2 of the MVP: Build the web app shell with Next.js + TypeScript, Tailwind, and shadcn/ui. This phase is UI-only — no backend integration, no encryption, no real auth.

See `design-system.md` for palette, typography, and visual direction.

## Progress Summary

| Step | Status | Notes |
|------|--------|-------|
| 1. Foundation Setup | ✅ Complete | Tailwind v4, theming, palettes |
| 2. Layout Shell | ✅ Complete | Sidebar, floating menu |
| 3. Auth Entry | ⬜ Not started | |
| 4. Passphrase Gate | ⬜ Not started | |
| 5. Session Gating | ⬜ Not started | |
| 6. Chat UI Core | ⬜ Not started | |
| 7. Session Closure | ⬜ Not started | |
| 8. Edge States | ⬜ Not started | |

---

## Steps

### Step 1: Foundation Setup ✅

**Status: Complete**

Completed items:
- [x] Tailwind CSS v4 with PostCSS (`@tailwindcss/postcss`)
- [x] `cn()` utility via `clsx` + `tailwind-merge` (in `lib/utils.ts`)
- [x] `next-themes` for light/dark mode (default: system)
- [x] `lucide-react` for icons
- [x] Lato font via `next/font/google`
- [x] Three time-based palettes in `globals.css`:
  - Morning (dawn): misty blue accent `hsl(200, 30%, 58%)`
  - Afternoon (day): sage green accent `hsl(135, 18%, 55%)`
  - Evening (dusk): warm amber accent `hsl(28, 50%, 59%)`
- [x] `ThemeProvider` with auto time detection (updates every minute)
- [x] CSS variables for all color tokens (shadcn-compatible)

**Key files:**
- `app/globals.css` — Tailwind config, color palettes, base styles
- `app/layout.tsx` — Root layout with Lato font + ThemeProvider
- `components/theme-provider.tsx` — Time-of-day + dark mode context
- `lib/utils.ts` — `cn()` helper

**Implementation notes:**
- Using Tailwind v4 CSS-first config (no `tailwind.config.js`)
- Added `@source` directives in `globals.css` to tell Tailwind where to scan
- Time ranges: Morning 5-12, Afternoon 12-18, Evening 18-5
- Palettes use HSL values without `hsl()` wrapper for Tailwind compatibility

---

### Step 2: Layout Shell ✅

**Status: Complete**

Completed items:
- [x] Floating hamburger menu in top-left corner (fixed position)
- [x] Slide-out sidebar with smooth CSS transitions
- [x] Centered content area with `max-w-2xl`
- [x] Responsive padding
- [x] Theme controls in sidebar:
  - Appearance: Auto / Light / Dark
  - Palette: Auto / Dawn / Day / Dusk (with color indicator on selection)
- [x] Privacy footer on main page

**Key files:**
- `components/layout-shell.tsx` — Main layout wrapper
- `components/sidebar.tsx` — Custom sidebar (not using Radix Dialog)
- `components/ui/button.tsx` — Button component with variants
- `components/ui/sheet.tsx` — Sheet primitive (currently unused, sidebar is custom)

**Implementation notes:**
- Sidebar is pure CSS transitions (`translate-x`) — Radix Dialog caused layout issues
- Overlay is subtle (`bg-black/10`)
- Palette buttons show accent color as background when selected
- Menu icon: `h-7 w-7` with `strokeWidth={2}`
- Text sizes increased throughout for readability

**Design decisions:**
- OmmWriter-inspired minimal UI (hamburger in corner, hidden sidebar)
- No persistent header — content takes full focus
- Sidebar contains settings only (session history will come later)

---

### Step 3: Auth Entry (UI only) ⬜

**Status: Not started**

TODO:
- [ ] Create `/login` route
- [ ] Email input with basic validation
- [ ] Submit button (disabled while empty)
- [ ] "Check your email" confirmation state after submit
- [ ] Privacy line in footer
- [ ] Link to return to home

**Notes for implementation:**
- UI only — no actual email sending
- Use shadcn-style Input component
- Consider adding subtle loading state on submit

---

### Step 4: Passphrase Onboarding Gate ⬜

**Status: Not started**

TODO:
- [ ] Create `/setup` route
- [ ] Passphrase input (password type)
- [ ] Confirm passphrase input
- [ ] Match validation
- [ ] Clear warning: "This passphrase cannot be recovered"
- [ ] Optional: strength indicator
- [ ] Continue button

**Notes for implementation:**
- This gates first-time users before they can start a session
- Consider showing/hide toggle for passphrase fields
- Warning copy should be prominent but not alarming

---

### Step 5: Session Gating UI ⬜

**Status: Not started**

TODO:
- [ ] "Session locked" state showing next available date/time
- [ ] Countdown or relative time ("Available in 3 days")
- [ ] Pre-session prompt when unlocked ("Set aside ~60 minutes")
- [ ] "Begin Session" button
- [ ] Button disabled when gate is active

---

### Step 6: Chat UI Core ⬜

**Status: Not started**

TODO:
- [ ] Message list component with scroll area
- [ ] Coach message (left-aligned, with avatar/icon)
- [ ] User message (right-aligned)
- [ ] Typing indicator for streaming
- [ ] Auto-scroll to bottom on new messages
- [ ] Multiline expanding textarea input
- [ ] Send button
- [ ] "End Session" button

**Notes for implementation:**
- Consider `react-markdown` for coach message rendering
- Scroll area should use shadcn ScrollArea or native with custom styling
- Input should grow but have max height

---

### Step 7: Session Closure UI ⬜

**Status: Not started**

TODO:
- [ ] End session confirmation dialog
- [ ] Session summary display
- [ ] Action steps list
- [ ] "Session complete" state
- [ ] Next session date display

---

### Step 8: Edge States ⬜

**Status: Not started**

TODO:
- [ ] "Coach unavailable" UI (for model outages)
- [ ] Loading/skeleton states
- [ ] Error boundary with friendly message
- [ ] Empty state before first message

---

## Dependencies (Installed)

```
tailwindcss@4.1.18
@tailwindcss/postcss
postcss
next-themes
lucide-react
clsx
tailwind-merge
class-variance-authority
@radix-ui/react-dialog (installed but sidebar uses custom implementation)
@radix-ui/react-dropdown-menu
@radix-ui/react-slot
```

## Dependencies (To Install Later)

```
react-markdown
remark-gfm
@tailwindcss/typography (for prose styling)
```

---

## Technical Notes for Future Context

### Package Manager
Using **pnpm** for the monorepo. Run commands from `apps/web/`:
```bash
pnpm dev    # Start dev server
pnpm build  # Build for production
```

### Common Issues Encountered

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:
   ```bash
   rm -rf .next && pnpm dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.

3. **Sidebar causing layout shift**: Avoid Radix Dialog — use custom fixed-position div with CSS transitions.

### File Structure

```
apps/web/
├── app/
│   ├── globals.css      # Tailwind + palettes
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── components/
│   ├── layout-shell.tsx # Main layout wrapper
│   ├── sidebar.tsx      # Slide-out sidebar
│   ├── theme-provider.tsx
│   └── ui/
│       ├── button.tsx
│       ├── dropdown-menu.tsx
│       └── sheet.tsx
└── lib/
    └── utils.ts         # cn() helper
```

---

## Out of Scope (Later Phases)

- Actual auth integration (Phase 4 - Go service)
- Local storage + encryption (Phase 3 - Dexie + WebCrypto)
- Real LLM streaming (Phase 4/5 - API + harness)
