# Frontend Implementation Plan

Last Updated: 2026-01-31

---

## Current Phase: Phase 4 — Conversational Spacing + Context Assembly

**Status: ✅ Complete**

### Running Updates

- 2026-01-31: Backend plan moved to `docs/implementation/backend/plan.md`.

### In Progress / Next Up

- TBD: Frontend follow-ups will be tracked here.

### Goals (Frontend Focus)

- Session-centric chat UI with pre-session gate and explicit end session flow.
- Passphrase onboarding gate with unrecoverable warning.
- Local storage + encryption (IndexedDB + WebCrypto).
- Conversational harness integration and deterministic context assembly.
- “Coach unavailable” UI state and privacy indicators.

---

## Previous Phases

| Phase | Status      | Description                               | Archive     |
| ----- | ----------- | ----------------------------------------- | ----------- |
| 2     | ✅ Complete | Web app shell (UI-only)                   | `phase2.md` |
| 3     | ✅ Complete | Local storage + encryption MVP            | `phase3.md` |
| 4     | ✅ Complete | Conversational spacing + context assembly | `phase4.md` |

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
