# Frontend Implementation Plan

Last Updated: 2026-02-03

---

## Current Phase: Phase 6 — MVP Completion

**Status: ✅ Complete**

### Running Updates

- 2026-02-03: Phase 5 archived to `done/frontend-phase5.md`.
- 2026-02-03: Phase 6 scoped — LLM observability + E2E smoke test.
- 2026-02-03: Phase 6 complete — MVP finished! 🎉

### In Progress / Next Up

- MVP complete! See `backlog.md` for post-MVP priorities.

---

### Phase 6: MVP Completion

#### Step 1: LLM Observability

**Status: ✅ Complete**

Added structured logging for LLM calls to enable debugging and cost tracking.

Tasks:

- [x] Log LLM call latency (time from request to first token, total time).
- [x] Log token usage (input tokens, output tokens) from API response.
- [x] Log errors with context (error type, retry count, final status).
- [x] Use structured console logs (JSON format for easy parsing).

Files modified:

- `apps/web/lib/llm/logger.ts` (new) — Structured JSON logger with typed events
- `apps/web/lib/llm/client.ts` — Client-side logging for start, success, error, retry, abort
- `apps/web/app/api/llm/anthropic/route.ts` — Server-side logging for proxy layer

---

#### Step 2: E2E Smoke Test

**Status: ✅ Complete**

Added Playwright tests covering the full session flow and vault lock/unlock.

Tasks:

- [x] Set up Playwright in `apps/web` (already configured).
- [x] Write smoke test: setup passphrase → start session → send message → receive response → end session.
- [x] Handle test isolation (mock auth, LLM, and session APIs using Playwright route interception).
- [x] Add to CI workflow (test, e2e jobs with artifact upload on failure).

Files modified:

- `apps/web/e2e/smoke.spec.ts` — Full session flow test + unlock flow test
- `apps/web/e2e/vault-smoke.spec.ts` — Updated with auth mocks and lock dialog flow
- `apps/web/playwright.config.ts` — Added retries, reporters, screenshot/trace on failure
- `.github/workflows/ci.yml` — Added `test` and `e2e` jobs with Playwright browser install

---

## Previous Phases

| Phase | Status      | Description                               | Archive                   |
| ----- | ----------- | ----------------------------------------- | ------------------------- |
| 2     | ✅ Complete | Web app shell (UI-only)                   | `done/frontend-phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP            | `done/frontend-phase3.md` |
| 4     | ✅ Complete | Conversational spacing + context assembly | `done/frontend-phase4.md` |
| 5     | ✅ Complete | Client integration (auth, metadata, LLM)  | `done/frontend-phase5.md` |
| 6     | ✅ Complete | MVP completion (observability + E2E)      | (this document)           |

---

## Common Context

### Package Manager

Using **pnpm** for the monorepo:

```bash
pnpm lint
pnpm --filter web test -- --run
pnpm --filter web test:e2e
```

### Web App Commands

```bash
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web start
pnpm --filter web test -- --run
pnpm --filter web test:e2e  # Requires dev server running locally
```

### Common Issues

1. **Webpack module error on hard refresh**: Clear `.next` cache and restart:

   ```bash
   rm -rf apps/web/.next && pnpm --filter web dev
   ```

2. **Tailwind classes not applying**: Ensure `@source` directives in `globals.css` point to all component directories.

3. **E2E tests failing locally**: Ensure dev server is running on port 3000 before running `pnpm --filter web test:e2e`.
