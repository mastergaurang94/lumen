# Backend Release Notes

Append one entry per backend deploy.

## Template

```md
## YYYY-MM-DD HH:MM UTC — <short title>

- Commit(s): `<sha>`
- Deployer: `<name>`
- Type: `feature | fix | refactor | infra`

### Changes

- ...

### API Impact (optional)

- only include when backend API contract changed

### Notes (optional)

- only include for incidents, rollbacks, or unusual deployment details
```

---

## 2026-02-11 16:16 UTC — Auth user_id + scoped vault deployment

- Commit(s): `user_id and scoped-storage changes on main`
- Deployer: `gaurang/codex`
- Type: `feature`

### Changes

- Added canonical `user_id` issuance and session validation in backend auth flow
- `/v1/auth/session` now returns `user_id` and `email`
- Added backend user identity persistence and migration support

### API Impact (optional)

- `GET /v1/auth/session` response includes `user_id`
- Frontend now requires `user_id` to scope local storage

---

## 2026-02-11 16:29 UTC — Deploy runbook and smoke automation

- Commit(s): `cb60e92`
- Deployer: `gaurang/codex`
- Type: `infra`

### Changes

- Added backend deployment runbook/checklist docs under `docs/deploy/`
- Added production smoke script at `apps/api/scripts/smoke.sh`
- Added deploy-doc references in session startup docs (`CLAUDE.md`, `AGENTS.md`, `docs/prompts/frontend.md`)
