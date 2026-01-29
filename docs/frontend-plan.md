# Frontend Implementation Plan (Phase 2)

Date: 2026-01-28
Status: In Progress
Last Updated: 2026-01-29

## Overview

Phase 2 of the MVP: Build the web app shell with Next.js + TypeScript, Tailwind, and shadcn/ui. This phase is UI-only — no backend integration, no encryption, no real auth.

See `design-system.md` for palette, typography, and visual direction.

## Progress Summary

| Step                     | Status         | Notes                             |
| ------------------------ | -------------- | --------------------------------- |
| 1. Foundation Setup      | ✅ Complete    | Tailwind v4, theming, palettes    |
| 2. Layout Shell          | ✅ Complete    | Sidebar, floating menu            |
| 3. Auth Entry            | ✅ Complete    | Email form + confirmation         |
| 4. Passphrase Gate       | ✅ Complete    |                                   |
| 4.5 Persistence + Polish | ✅ Complete    | localStorage + a11y + UX polish   |
| 5. Session Gating        | ✅ Complete    | Locked/unlocked states            |
| 6. Chat UI Core          | ✅ Complete    | Messages, input, streaming        |
| 7. Session Closure       | ✅ Complete    | Recognition moment + action steps |
| 8. Edge States           | ✅ Complete    | Unavailable, error, loading       |

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

### Step 4.5: Palette Persistence + Polish ✅

**Status: Complete**

**Palette Persistence:**

- [x] Persist palette preference to localStorage
- [x] Load preference on app init
- [x] Ensure preference survives page navigation and hard refresh

**Polish from Step 3 (Login):**

- [x] Add icon to form state (Mail) for visual consistency with confirmation state
- [x] Extract `LoadingSpinner` to `components/ui/spinner.tsx` as shared component
- [x] Add visible label above email input (accessibility) with `sr-only` class
- [x] Add underline-on-hover to "Use a different email" link
- [x] Add `aria-describedby` hint for email input

**Polish from Step 4 (Setup):**

- [x] Add `aria-label` to show/hide password toggle buttons (e.g., "Show passphrase")
- [x] Improve strength bar animation — animates smoothly between states using Framer Motion
- [x] Add `aria-describedby` linking strength indicator to passphrase input
- [x] Add `aria-invalid` and `aria-describedby` for mismatch error on confirm input
- [x] Add `role="alert"` to error message for screen reader announcement

**Key files changed:**

- `components/theme-provider.tsx` — Added localStorage persistence for palette preference
- `components/ui/spinner.tsx` — New shared loading spinner component
- `app/login/page.tsx` — Added Mail icon, sr-only label, aria-describedby, hover underline
- `app/setup/page.tsx` — Added aria-labels, improved strength animation, aria-describedby

**Optional (deferred):**

- [ ] Abstract shared auth page layout pattern (atmosphere + back link + centered content + footer)
- [ ] More robust email validation regex

---

### Step 5: Session Gating UI ✅

**Status: Complete**

Completed items:

- [x] Create `/session` route
- [x] "Session locked" state showing next available date/time
- [x] Countdown or relative time ("Available in 3 days")
- [x] Date card showing exact unlock date
- [x] "Last session" context showing days since last session
- [x] Pre-session prompt when unlocked ("Set aside ~60 minutes")
- [x] Time-aware greeting (Good morning/afternoon/evening)
- [x] First session vs returning user differentiation
- [x] "Begin Session" button (links to /chat)
- [x] Button disabled when gate is active
- [x] Encouragement text explaining the 7-day spacing
- [x] Loading state with spinner
- [x] Works across all palettes (morning/afternoon/evening) and light/dark modes

**Key files:**

- `app/session/page.tsx` — Session gating page with locked/unlocked states

**Implementation notes:**

- Uses mock data for now (toggle `MOCK_UNLOCKED` constant to test states)
- `formatRelativeTime()` for countdown to next session
- `formatDaysAgo()` for time since last session
- `getTimeGreeting()` for contextual greeting
- Locked state uses Calendar icon with muted colors
- Unlocked state uses Sun icon (or Sparkles for first session) with accent colors
- AnimatePresence for smooth transitions between states
- Atmospheric backgrounds consistent with other pages

---

### Step 6: Chat UI Core ✅

**Status: Complete (with polish refinements)**

Completed items:

- [x] Message list component with scroll area
- [x] Coach message (left-aligned, clean design without avatar)
- [x] User message (right-aligned, accent-colored bubble)
- [x] Typing indicator with animated bouncing dots
- [x] Auto-scroll to bottom on new messages
- [x] Multiline expanding textarea input (max 200px height)
- [x] Send button (disabled when empty or streaming)
- [x] "End Session" button with confirmation dialog
- [x] Streaming text simulation (no cursor — cleaner)
- [x] Markdown rendering for coach messages (bold, italic, lists, code, links)
- [x] Empty state before first message ("Your session is beginning...")
- [x] Keyboard shortcuts (Enter to send, Shift+Enter for newline)

**Polish refinements (claude.ai-inspired):**

- [x] Removed avatar icons for cleaner design
- [x] Increased text size (prose-lg for coach, text-lg for user/input)
- [x] Wider conversation area (max-w-4xl)
- [x] Cream/muted input bubble (bg-muted, rounded-2xl) that stands out
- [x] Input refocuses after sending message
- [x] Session title includes date: "Session · Thursday, January 29"
- [x] Combined footer hints: "Enter to send · Shift+Enter for new line · Lumen is AI and may make mistakes"
- [x] Removed streaming cursor (unnecessary visual noise)
- [x] Placeholder changed to "Reply..."
- [x] Hamburger menu accessible from chat page

**Session page enhancements:**

- [x] Active session detection with "Resume session" button
- [x] Session preview one-liner: "You were exploring what's holding you back at work..."
- [x] "Welcome back" greeting for returning users with active sessions

**Design review polish (2026-01-29):**

- [x] Input field theming — uses theme tokens (`bg-muted/50`) instead of hardcoded colors
- [x] Focus styling — removed harsh focus ring from text inputs (cursor is sufficient)
- [x] Scrollbar styling — visible, functional scrollbar with transparent track
- [x] Scroll container — proper flex containment (`min-h-0`) for mouse wheel scrolling
- [x] Animation timing — faster global transitions (0.2s instead of 0.4s)
- [x] Sidebar animation — clean tween instead of bouncy spring
- [x] Input auto-refocus — textarea refocuses after coach finishes responding

**Key files:**

- `app/chat/page.tsx` — Main chat page with message list and state management
- `app/session/page.tsx` — Session gating with active session support
- `components/chat/coach-message.tsx` — Coach message with markdown rendering
- `components/chat/user-message.tsx` — User message bubble
- `components/chat/typing-indicator.tsx` — Animated typing dots
- `components/chat/chat-input.tsx` — Expanding textarea with send button
- `components/chat/index.ts` — Barrel export for chat components

**Implementation notes:**

- Uses `react-markdown` with `remark-gfm` for GitHub-flavored markdown
- `@tailwindcss/typography` plugin for prose styling with theme-aware colors
- Streaming simulated with async generator yielding word-by-word
- Mock responses cycle through 3 different coach replies for demo
- Header is sticky with backdrop blur for scroll context
- Input area is sticky at bottom (no border divider — cleaner)
- End Session dialog uses Framer Motion for smooth enter/exit
- All colors use theme tokens — adapts to all palettes and light/dark modes
- Fully responsive — tested on mobile (390px) and desktop viewports
- SessionGate interface includes hasActiveSession and sessionPreview fields
- Custom scrollbar uses `.chat-scroll-area` class with transparent track for natural blending
- Global `:focus-visible` override for inputs removes outline (cursor provides sufficient indicator)

---

### Step 7: Session Closure UI ✅

**Status: Complete**

Completed items:

- [x] End session confirmation dialog (already existed in Step 6)
- [x] Session closure view with "Session complete" state
- [x] Recognition moment display (the most impactful question/statement from the session)
- [x] Next session date display with calendar icon
- [x] Collapsible action steps (hidden by default, user opt-in)
- [x] "Return home" button
- [x] Smooth entrance animations with staggered reveals
- [x] Works across all palettes (morning/afternoon/evening) and light/dark modes

**Key files:**

- `components/chat/session-closure.tsx` — Session closure component
- `components/chat/index.ts` — Updated barrel export
- `app/chat/page.tsx` — Integrated session state management

**Implementation notes:**

- Closure is rendered within the chat page (not a separate route) for smooth transition
- Recognition moment is displayed as a centered blockquote with subtle divider lines
- Action steps are collapsed by default — user clicks "View action steps (3)" to expand
- Action steps animate in with staggered delay when expanded
- Design follows product principle: "less is more" after a meaningful session
- Uses mock data for now — in real app, recognition moment and action steps would be generated from session content

**Design philosophy:**

The closure view intentionally avoids overwhelming the user after an emotional session:
- Single recognition moment (seed to carry forward) instead of a full summary
- Action steps are opt-in, not forced
- Generous whitespace and breathing room
- Fraunces display font for warmth
- Atmospheric background maintains continuity with the rest of the app

---

### Step 8: Edge States ✅

**Status: Complete**

Completed items:

- [x] "Coach unavailable" UI — warm, non-alarming state with reassurance messaging
- [x] Loading state with "Connecting to your coach" message
- [x] Connection error state with retry button
- [x] Skeleton components (Skeleton, SkeletonText, SkeletonMessage, SkeletonChat, SkeletonCard, SkeletonPage)
- [x] Error boundary wrapper with friendly recovery UI
- [x] Session state machine (loading → active/unavailable/error → complete)
- [x] Mock toggles for testing edge states during development

**Key files:**

- `components/coach-unavailable.tsx` — Full-page coach unavailable state
- `components/ui/skeleton.tsx` — Reusable skeleton loading components
- `components/error-boundary.tsx` — React error boundary + ErrorFallback component
- `app/chat/page.tsx` — Updated with session state machine and error handling

**Implementation notes:**

- Chat page now uses a state machine: `loading` → `active` | `unavailable` | `error` → `complete`
- `ChatPageInner` component wrapped with `ErrorBoundary` for crash recovery
- Mock toggles (`MOCK_COACH_UNAVAILABLE`, `MOCK_CONNECTION_ERROR`) for testing edge states
- Coach unavailable uses warm language ("Taking a moment") rather than alarming error text
- Skeleton components designed for the warm aesthetic with `bg-muted` and smooth pulse animation
- Error states include reassurance about data safety ("Your data is safe")
- All states maintain atmospheric backgrounds and theme consistency

**Design philosophy:**

Edge states should feel grounded and reassuring, not alarming:
- "Taking a moment" instead of "Error" or "Unavailable"
- "Connection interrupted" instead of "Network error"
- Always reassure users their data is safe
- Provide clear next steps (retry, return home)
- Maintain the warm, human tone throughout

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
react-markdown
remark-gfm
@tailwindcss/typography
```

## Dependencies (To Install Later)

```
(none currently)
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

3. **Palette preference not persisting**: Currently palette selection is stored in React state and resets on navigation. Future enhancement: persist to localStorage.

### File Structure

```
apps/web/
├── app/
│   ├── globals.css      # Tailwind + palettes
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Home page
│   ├── login/
│   │   └── page.tsx     # Email login
│   ├── setup/
│   │   └── page.tsx     # Passphrase setup
│   ├── session/
│   │   └── page.tsx     # Session gating
│   └── chat/
│       └── page.tsx     # Chat interface with edge state handling
├── components/
│   ├── layout-shell.tsx     # Main layout wrapper
│   ├── sidebar.tsx          # Slide-out sidebar
│   ├── theme-provider.tsx
│   ├── coach-unavailable.tsx  # Coach unavailable state
│   ├── error-boundary.tsx     # Error boundary + fallback
│   ├── chat/
│   │   ├── index.ts            # Barrel export
│   │   ├── coach-message.tsx   # Coach message with markdown
│   │   ├── user-message.tsx    # User message bubble
│   │   ├── typing-indicator.tsx
│   │   ├── chat-input.tsx      # Expanding textarea input
│   │   └── session-closure.tsx # Session complete view
│   └── ui/
│       ├── button.tsx
│       ├── input.tsx
│       ├── spinner.tsx
│       ├── skeleton.tsx   # Skeleton loading components
│       └── ...
└── lib/
    └── utils.ts         # cn() helper
```

---

## Out of Scope (Later Phases)

- Actual auth integration (Phase 4 - Go service)
- Local storage + encryption (Phase 3 - Dexie + WebCrypto)
- Real LLM streaming (Phase 4/5 - API + harness)
