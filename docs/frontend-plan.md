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

**Status: Complete (with refinements)**

Completed items:
- [x] Tailwind CSS v4 with PostCSS (`@tailwindcss/postcss`)
- [x] `cn()` utility via `clsx` + `tailwind-merge` (in `lib/utils.ts`)
- [x] `next-themes` for light/dark mode (default: system)
- [x] `lucide-react` for icons
- [x] Lato font via `next/font/google` (body text)
- [x] **Fraunces display font** for headings (warm, characterful serif)
- [x] Three time-based palettes in `globals.css`:
  - Morning (dawn): misty blue accent `hsl(200, 30%, 58%)`
  - Afternoon (day): sage green accent `hsl(135, 18%, 55%)`
  - Evening (dusk): warm amber accent `hsl(28, 50%, 59%)`
- [x] `ThemeProvider` with auto time detection (updates every minute)
- [x] CSS variables for all color tokens (shadcn-compatible)
- [x] **Atmospheric backgrounds** — radial gradient glows that shift with palette
- [x] **Entrance animations** — fade-in-up with staggered delays
- [x] **Smoother transitions** — cubic-bezier easing for theme changes

**Key files:**
- `app/globals.css` — Tailwind config, color palettes, atmospheric backgrounds, animations
- `app/layout.tsx` — Root layout with Lato + Fraunces fonts + ThemeProvider
- `components/theme-provider.tsx` — Time-of-day + dark mode context
- `lib/utils.ts` — `cn()` helper

**Implementation notes:**
- Using Tailwind v4 CSS-first config (no `tailwind.config.js`)
- Added `@source` directives in `globals.css` to tell Tailwind where to scan
- Time ranges: Morning 5-12, Afternoon 12-18, Evening 18-5
- Palettes use HSL values without `hsl()` wrapper for Tailwind compatibility
- Atmospheric `.atmosphere` class creates layered radial gradients per palette
- Animation utilities: `.animate-fade-in-up`, `.animate-fade-in`, `.animation-delay-*`

---

### Step 2: Layout Shell ✅

**Status: Complete (with refinements)**

Completed items:
- [x] Floating hamburger menu in top-left corner (fixed position)
- [x] Slide-out sidebar with smooth CSS transitions
- [x] Centered content area with `max-w-2xl`
- [x] Responsive padding
- [x] Theme controls in sidebar:
  - Appearance: Auto / Light / Dark (horizontal button row)
  - Palette: Auto / Dawn / Day / Dusk with **live color swatches**
- [x] Privacy footer on main page
- [x] **Backdrop blur** on sidebar overlay
- [x] **Color swatch palette selector** — circular swatches showing bg + accent colors
- [x] **Smoother easing** — cubic-bezier for sidebar slide animation
- [x] **Home page atmosphere** — gradient glow behind centered content
- [x] **Staggered entrance animation** — content fades in with delays

**Key files:**
- `components/layout-shell.tsx` — Main layout wrapper
- `components/sidebar.tsx` — Custom sidebar with color swatches
- `components/ui/button.tsx` — Button component with variants
- `app/page.tsx` — Home page with atmospheric wrapper and animations

**Implementation notes:**
- Sidebar uses `ease-[cubic-bezier(0.32,0.72,0,1)]` for natural deceleration
- Overlay has `backdrop-blur-[2px]` for subtle depth
- Palette swatches show actual colors (bg circle with accent dot)
- "Auto" palette has dashed border indicator
- Selected palette scales up with ring indicator
- Home page uses `.atmosphere` class for radial gradient backgrounds
- Content sections have staggered animation delays (100ms, 200ms, 300ms, 500ms)

**Design decisions:**
- OmmWriter-inspired minimal UI (hamburger in corner, hidden sidebar)
- No persistent header — content takes full focus
- Sidebar contains settings only (session history will come later)
- Fraunces serif font used for "Lumen" branding in sidebar header

---

### Step 3: Auth Entry (UI only) ✅

**Status: Complete**

Completed items:
- [x] Create `/login` route
- [x] Email input with basic validation
- [x] Submit button (disabled while empty/invalid)
- [x] Loading state with spinner ("Sending...")
- [x] "Check your email" confirmation state after submit
- [x] Privacy line in footer
- [x] Back link to return to home
- [x] "Use a different email" link in confirmation state
- [x] Framer Motion transitions between form/sent states

**Key files:**
- `app/login/page.tsx` — Login page with form and confirmation states
- `components/ui/input.tsx` — Shadcn-style Input component

**Implementation notes:**
- Uses `AnimatePresence` for smooth transitions between states
- Three view states: `form` → `loading` → `sent`
- Basic email validation (contains @ and .)
- 1.5s simulated delay for loading state
- Atmospheric background consistent with home page

---

### Step 4: Passphrase Onboarding Gate ✅

**Status: Complete**

Completed items:
- [x] Create `/setup` route
- [x] Passphrase input (password type)
- [x] Confirm passphrase input
- [x] Match validation (shows error when passphrases don't match)
- [x] Clear warning: "This passphrase cannot be recovered"
- [x] Strength indicator (weak/fair/good/strong with color bar)
- [x] Show/hide toggle for both passphrase fields
- [x] Continue button (disabled until valid)
- [x] Back link to home
- [x] Privacy footer

**Key files:**
- `app/setup/page.tsx` — Passphrase setup page

**Implementation notes:**
- Password strength based on length, mixed case, numbers, special chars
- Strength levels: weak (muted), fair (muted), good (accent), strong (accent)
- All colors use theme tokens — adapts to dawn/day/dusk palettes
- Minimum 8 characters required
- Warning box uses accent color with transparency
- UI only — no actual encryption setup yet

---

### Step 4.5: Palette Persistence ⬜

**Status: Not started**

TODO:
- [ ] Persist palette preference to localStorage
- [ ] Load preference on app init
- [ ] Ensure preference survives page navigation

**Notes**: Required before Step 5 so Steps 1-4 are fully complete.

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
framer-motion
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

4. **Palette preference not persisting**: Currently palette selection is stored in React state and resets on navigation. Future enhancement: persist to localStorage.

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
