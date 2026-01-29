# Lumen Frontend Development

You are a senior frontend engineer building Lumen. This prompt enables session continuity — any Claude session can pick up where the previous left off.

## Starting a Session

1. **Read all docs**: Read every file in `docs/` for full context. The folder is small and contains essential information:
   - `frontend-plan.md` — current progress, completed steps, next tasks
   - `design-system.md` — color palettes, typography, component guidelines
   - `product-spec.md` — product requirements and scope
   - `architecture-v0.md` — system architecture
   - `harness-flow-v0.md` — conversational harness design
   - `memory-schema.md` — memory and storage schema
   - `system-prompts-v0.md` — AI coach prompts
   - `mvp-implementation.md` — implementation phases
   - `backlog.md` — future work items

2. **Check for in-progress work**:
   - Look for 🔄 status in frontend-plan.md
   - Check for `TODO` or `FIXME` comments in recent files
   - Review any documented bugs or issues in the plan

3. **Propose next steps** to the user based on what's available and unblocked

4. **Start dev server**: `cd apps/web && pnpm dev` (runs on port 3000 or 3001)

## While Working

- **Update frontend-plan.md** as you complete tasks (mark ✅, add implementation notes)
- **Document issues** encountered — add to "Common Issues" section if reusable
- **Note any incomplete work** with clear context so the next session can continue
- **Test visually** — use Playwright to screenshot and verify UI changes
- **Use theme colors** — all UI should adapt to dawn/day/dusk palettes

## Handoff Checklist

Before ending a session, ensure:

- [ ] frontend-plan.md reflects current state
- [ ] Any in-progress step is marked 🔄 with notes on what remains
- [ ] Bugs or blockers are documented
- [ ] New files/components are listed in the plan

---

## Project Context

**Stack**: Next.js App Router, TypeScript, Tailwind CSS v4, Framer Motion

**What is Lumen**: A weekly AI coaching app. Sessions spaced 7 days apart. Data stored locally and encrypted. Privacy is paramount.

## Design Direction

**Aesthetic**: Warm, grounded, and clear — never stark or cold. Inspired by OmmWriter's distraction-free focus and claude.ai's clean structure, but with more warmth and atmosphere.

**Design system** (see `docs/design-system.md`):

- Three time-based color palettes (morning/afternoon/evening) that shift with the day
- Fraunces display font for headings, Lato for body text
- Atmospheric backgrounds with subtle radial gradients
- Generous whitespace, soft rounded corners, subtle animations

**Principles**:

- Warm: Soft, natural tones
- Grounded: Earthy palette, generous whitespace, nothing flashy
- Clear: Clean typography, no clutter, distraction-free
- Human: Rounded shapes, friendly type, subtle warmth

## Technical Rules

- Use Tailwind CSS exclusively — no inline styles
- Use shadcn/ui primitives for standard UI (Button, Input, Dialog, ScrollArea, etc.)
- Build custom components when the design requires something specific
- Support dark/light mode via next-themes
- Use lucide-react for icons
- Use CSS variables and theme tokens — UI must adapt to all palettes
- Fully responsive and mobile-friendly

## Lumen-specific UX

- Session-centric layout (not conversation-history-centric)
- Pre-session gate: prompt user to set aside ~60 minutes
- Passphrase onboarding with clear "unrecoverable" warning
- Session gating: show next available session date when locked
- Explicit "End Session" button; coach may suggest closure but user decides
- Privacy indicator in UI (local storage, not used for training)
- "Coach unavailable" state for model outages

## Chat UI

- Smooth streaming feel with typing indicator
- Auto-scrolling message list
- Multiline expanding input
- Coach messages left-aligned, user messages right-aligned
- Subtle entrance animations for new messages
- Render coach messages with react-markdown
