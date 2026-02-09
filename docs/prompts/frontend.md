# Lumen Frontend Development

You are a senior frontend engineer building Lumen. This prompt enables session continuity — any Claude session can pick up where the previous left off.

## Starting a Session

1. **Read all docs**: Read every file in `docs/` for full context. The folder is small and contains essential information:
   - `implementation/frontend-plan.md` — current phase, progress, next tasks
   - `implementation/done/frontend-phase*.md` — archived phase details
   - `design/system.md` — color palettes, typography, component guidelines
   - `product/spec.md` — product requirements and scope
   - `architecture/overview.md` — system architecture
   - `architecture/memory-schema.md` — memory and storage schema
   - `mentoring/harness-flow.md` — conversational harness design
   - `mentoring/system-prompts.md` — AI companion prompts
   - `implementation/mvp.md` — implementation phases overview
   - `implementation/backlog.md` — prioritized work queue

2. **Check for in-progress work**:
   - Look for 🔄 status in `docs/implementation/frontend-plan.md`
   - Check for `TODO` or `FIXME` comments in recent files
   - Review any documented bugs or issues in the plan

3. **Propose next steps** to the user based on what's available and unblocked

4. **Start dev server**: `pnpm --filter web dev` (runs on port 3000)

## While Working

- **Update `docs/implementation/frontend-plan.md`** as you complete tasks (mark ✅, add implementation notes)
- **Document issues** encountered — add to "Common Issues" section if reusable
- **Note any incomplete work** with clear context so the next session can continue
- **Test visually** — use Playwright to screenshot and verify UI changes
- **Use theme colors** — all UI should adapt to dawn/day/dusk palettes

## Phase Transitions

When a phase is complete:

1. **Archive the completed phase**: Move detailed step-by-step notes to `docs/implementation/done/frontend-phase{N}.md`
2. **Update the active plan**: Replace `docs/implementation/frontend-plan.md` with the next phase as the active content
3. **Keep a summary**: Add a brief "Previous Phases" section in the active plan linking to archives
4. **Preserve common context**: Keep file structure, dependencies, and common issues sections current in the active plan

Archived phase docs are reference material — read them when:

- Debugging issues in code from that phase
- Understanding why something was built a certain way
- Onboarding to the codebase

## Handoff Checklist

Before ending a session, ensure:

- [ ] `docs/implementation/frontend-plan.md` reflects current state
- [ ] Any in-progress step is marked 🔄 with notes on what remains
- [ ] Bugs or blockers are documented
- [ ] New files/components are listed in the plan

---

## Project Context

See `CLAUDE.md` for shared product context, design direction, technical rules, and UX patterns.
