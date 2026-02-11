# Deployment Runbook

## Scope

This runbook covers production deploys for:

- Frontend: Vercel (`apps/web`) — auto-deploy on push
- Backend: Fly.io (`apps/api`) — manual deploy

## Environments

- Frontend URL: `https://lumen-web-topaz.vercel.app`
- Backend URL: `https://lumen-api.fly.dev`

## Ownership Model

- Frontend-only changes: verify Vercel deploy + smoke UI
- Backend or API contract changes: deploy backend explicitly via Fly
- Full-stack contract changes: backend deploy and then end-to-end smoke

## Standard Backend Deploy

From repo root:

```bash
cd apps/api
fly deploy
```

Then verify:

```bash
curl -sS -i https://lumen-api.fly.dev/v1/health
```

Expected: `HTTP 200` and `{"status":"ok"}`.

## Post-Deploy Smoke

Run the backend smoke script:

```bash
./apps/api/scripts/smoke.sh
```

Optional custom target:

```bash
API_URL="https://lumen-api.fly.dev" ./apps/api/scripts/smoke.sh
```

## Frontend Deploy Notes

- Frontend deploys automatically on push.
- For backend contract changes, confirm the frontend commit with corresponding API usage is deployed.
- Validate one end-to-end flow manually after backend deploy:

1. Login / magic link callback
2. Setup or unlock
3. Start chat and send a message

## Rollback (Backend)

If smoke checks fail after deploy:

1. Identify previous good image/release in Fly dashboard
2. Roll back via Fly dashboard or by redeploying last known good commit
3. Re-run smoke script
4. Add incident note to release notes

## Logging and Diagnostics

```bash
fly logs -a lumen-api
```

Focus on:

- `5xx` responses
- auth/session errors
- unexpected panic traces

## Release Notes Discipline

For each backend deploy, append one entry in:

- `docs/deploy/backend-release-notes.md`

Use the template fields exactly for consistency.
