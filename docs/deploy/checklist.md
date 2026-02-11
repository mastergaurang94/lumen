# Backend Deploy Checklist

Use this checklist before every Fly deploy.

## Pre-Deploy

- [ ] Working tree reviewed; intended changes only
- [ ] `cd apps/api && go test ./...` passes
- [ ] `pnpm --filter web build` passes (for contract-affecting changes)
- [ ] `pnpm --filter web test -- --run` passes (for contract-affecting changes)
- [ ] Fly secrets verified: `fly secrets list -a lumen-api`
- [ ] Breaking API changes assessed for frontend compatibility
- [ ] Release notes entry drafted

## Deploy

- [ ] Run `cd apps/api && fly deploy`
- [ ] Deploy completes without machine health errors

## Post-Deploy

- [ ] Health check: `curl -sS -i https://lumen-api.fly.dev/v1/health`
- [ ] Run smoke script: `./apps/api/scripts/smoke.sh`
- [ ] Spot-check logs: `fly logs -a lumen-api`
- [ ] Manual UI flow check (login -> session -> chat message)
- [ ] Release notes entry finalized with outcome

## Rollback Triggers

Rollback immediately if any of these occur:

- health endpoint non-200 after deploy
- smoke script failure
- auth/session flow broken in manual check
- repeated `5xx` in logs
