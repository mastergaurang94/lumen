# Frontend Implementation Plan

Last Updated: 2026-02-03

---

## Current Phase: Phase 6 — MVP Completion

**Status: ⬜ Not Started**

### Running Updates

- 2026-02-03: Phase 5 archived to `phase5.md`.
- 2026-02-03: Phase 6 scoped — LLM observability + E2E smoke test.

### In Progress / Next Up

- Complete Phase 6 to finish MVP.
- See `docs/product/backlog.md` for post-MVP priorities.

---

### Phase 6: MVP Completion

#### Step 1: LLM Observability

**Status: ⬜ Not Started**

Add structured logging for LLM calls to enable debugging and cost tracking.

Tasks:

- [ ] Log LLM call latency (time from request to first token, total time).
- [ ] Log token usage (input tokens, output tokens) from API response.
- [ ] Log errors with context (error type, retry count, final status).
- [ ] Use structured console logs (JSON format for easy parsing).

Files to modify:

- `apps/web/lib/llm/client.ts`
- `apps/web/app/api/llm/anthropic/route.ts`

---

#### Step 2: E2E Smoke Test

**Status: ⬜ Not Started**

Add a Playwright test covering the full session flow to ensure the app works end-to-end.

Tasks:

- [ ] Set up Playwright in `apps/web` (if not already configured).
- [ ] Write smoke test: login → setup passphrase → start session → send message → receive response → end session.
- [ ] Handle test isolation (mock LLM responses or use test API key).
- [ ] Add to CI workflow.

Files to create/modify:

- `apps/web/e2e/smoke.spec.ts` (new)
- `apps/web/playwright.config.ts` (new or modify)
- `.github/workflows/ci.yml`

---

## Previous Phases

| Phase | Status      | Description                               | Archive     |
| ----- | ----------- | ----------------------------------------- | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only)                   | `phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP            | `phase3.md` |
| 4     | ✅ Complete | Conversational spacing + context assembly | `phase4.md` |
| 5     | ✅ Complete | Client integration (auth, metadata, LLM)  | `phase5.md` |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm lint
pnpm --filter web test -- --run
```

### Web App Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web start
pnpm --filter web test -- --run
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.
