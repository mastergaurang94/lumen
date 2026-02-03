# Backend Implementation Plan

Last Updated: 2026-02-03

---

## Current Phase: Phase 6 — TBD

**Status: ⬜ Not Started**

### Running Updates

- 2026-02-02: Phase 5 archived to `done/backend-phase5.md`.

### In Progress / Next Up

- See `docs/product/backlog.md` for prioritized backlog items.
- Next phase scope TBD based on backlog priorities.

### Goals (Backend Focus)

- Auth service with magic link flow and session cookies.
- Session metadata recording (start/end times, transcript hash).
- Observability with structured logs and OpenTelemetry spans.
- No plaintext transcript storage — privacy by design.

---

## Previous Phases

| Phase | Status      | Description                                      | Archive                   |
| ----- | ----------- | ------------------------------------------------ | ------------------------- |
| 5     | ✅ Complete | API foundation (auth, session metadata, o11y)    | `done/backend-phase5.md`  |

---

## Common Context

### Running the API

```bash
cd apps/api && go run ./cmd/api
```

### Common Commands

```bash
# Run tests
cd apps/api && go test ./...

# Lint
cd apps/api && golangci-lint run
```
