# Backend Release Notes

Append one entry per backend deploy.

## Template

```md
## YYYY-MM-DD HH:MM UTC — <short title>

- Commit(s): `<sha>`
- Deployer: `<name>`
- Fly app: `lumen-api`
- Type: `feature | fix | refactor | infra`
- Risk: `low | medium | high`

### Changes

- ...

### API / Contract Impact

- `none` or explicit endpoint/field changes

### Validation

- `go test ./...`: pass/fail
- `pnpm --filter web build`: pass/fail (if relevant)
- Health check: pass/fail
- Smoke script: pass/fail

### Follow-ups

- none / list
```

---

## 2026-02-11 16:16 UTC — Auth user_id + scoped vault deployment

- Commit(s): `user_id and scoped-storage changes on main`
- Deployer: `gaurang/codex`
- Fly app: `lumen-api`
- Type: `feature`
- Risk: `medium`

### Changes

- Added canonical `user_id` issuance and session validation in backend auth flow
- `/v1/auth/session` now returns `user_id` and `email`
- Added backend user identity persistence and migration support

### API / Contract Impact

- `GET /v1/auth/session` response includes `user_id`
- Frontend now requires `user_id` to scope local storage

### Validation

- `go test ./...`: pass
- `pnpm --filter web build`: pass
- Health check: pass (`/v1/health` returned 200)
- Smoke script: pending (script added after this deploy)

### Follow-ups

- Use `apps/api/scripts/smoke.sh` on next deploy and mark result
