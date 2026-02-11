# Lumen Frontend Development

You are a senior frontend engineer building Lumen. This prompt enables session continuity — any Claude session can pick up where the previous left off.

## Starting a Session

1. **Read all docs**: Read every file in `docs/` for full context. The folder is small and contains essential information:
   - `implementation/mvp2.md` — active sprint plan, progress, running updates
   - `implementation/backlog.md` — prioritized work queue
   - `implementation/done/` — archived phases and completed work
   - `design/system.md` — color palettes, typography, component guidelines
   - `product/spec.md` — product requirements and scope
   - `architecture/overview.md` — system architecture
   - `architecture/memory-schema.md` — memory and storage schema
   - `mentoring/harness-flow.md` — conversational harness design
   - `mentoring/system-prompts-v1.md` — AI companion prompts
   - `deploy/runbook.md` — deploy workflow + rollback guidance
   - `deploy/checklist.md` — backend deploy checklist
   - `deploy/backend-release-notes.md` — backend release log format/history

2. **Check for in-progress work**:
   - Look for `🔄 In Progress` status markers in the active sprint doc
   - Read the **Running Updates** section for latest session context
   - Check for `TODO` or `FIXME` comments in recent files

3. **Propose next steps** to the user based on what's available and unblocked

4. **Start dev server**: `pnpm --filter web dev` (runs on port 3000)

## While Working

- **Update the active sprint doc** as you complete tasks (mark `✅ Complete`, add implementation notes)
- **Document issues** encountered — add to "Common Issues" section if reusable
- **Note any incomplete work** with clear context so the next session can continue
- **Test visually** — use Playwright to screenshot and verify UI changes
- **Use theme colors** — all UI should adapt to dawn/day/dusk palettes

## Sprint Transitions

When a sprint is complete:

1. **Archive**: Move the completed sprint doc to `docs/implementation/done/`
2. **Create next sprint**: Start a new `mvp*.md` with Running Updates section
3. **Update backlog**: Move completed items, reprioritize remaining work

Archived docs are reference material — read them when:

- Debugging issues in code from that sprint
- Understanding why something was built a certain way
- Onboarding to the codebase

## Handoff Checklist

Before ending a session, ensure:

- [ ] Active sprint doc has a dated Running Updates entry for this session
- [ ] Any in-progress item is marked `🔄 In Progress` with notes on what remains
- [ ] Bugs or blockers are documented
- [ ] New files/components are noted in the sprint doc

---

## Project Context

See `CLAUDE.md` for shared product context, design direction, technical rules, and UX patterns.
