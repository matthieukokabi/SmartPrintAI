# SmartPrintAI Deployment Runbook

This runbook documents the production deployment flow for SmartPrintAI on VPS `187.124.30.177`.

## 1) Scope and Current Runtime

- App path: `/root/smartprintai`
- Production app service: `smartprintai` (binds `127.0.0.1:3100`)
- Reverse proxy/TLS: Nginx (public via `https://smartprintai.com`)
- Infra dependencies (Docker): Postgres, Redis, MinIO

## 2) Pre-Deploy Checks

Run as `root` on the VPS:

```bash
cd /root/smartprintai
source /root/.nvm/nvm.sh

systemctl is-active smartprintai
docker-compose ps
npm run ci:check
```

Expected:
- `smartprintai` is `active`
- Docker dependencies are `Up`
- CI check finishes without errors (`lint`, `build`, `test`)

## 3) Deployment Steps

```bash
cd /root/smartprintai
source /root/.nvm/nvm.sh

# 1) Install dependencies (safe re-sync)
npm ci

# 2) Apply DB migrations safely
npm run db:migrate:deploy-safe

# 3) Build production bundle
npm run build

# 4) Restart app service
systemctl restart smartprintai
```

## 4) Post-Deploy Verification

```bash
systemctl is-active smartprintai
curl -sS -o /dev/null -w local_home:%{http_code} http://127.0.0.1:3100/; echo
curl -sS -o /dev/null -w local_products:%{http_code} http://127.0.0.1:3100/api/products; echo
curl -sS -o /dev/null -w public_home:%{http_code} https://smartprintai.com/; echo
curl -sS -o /dev/null -w public_products:%{http_code} https://smartprintai.com/api/products; echo
npm run test:e2e
```

Expected HTTP codes: `200` for all home/products checks.

## 5) Rollback Procedure

If deploy fails (build/runtime/health checks), perform immediate rollback:

```bash
cd /root/smartprintai
source /root/.nvm/nvm.sh

# 1) Restore previous application files from your latest backup snapshot
#    (example path; replace with your actual backup file)
# tar -xzf /root/backups/smartprintai_predeploy_<timestamp>.tar.gz -C /

# 2) Rebuild from restored state
npm ci
npm run build

# 3) Restart service
systemctl restart smartprintai

# 4) Re-verify health
systemctl is-active smartprintai
curl -sS -o /dev/null -w local_home:%{http_code} http://127.0.0.1:3100/; echo
curl -sS -o /dev/null -w public_home:%{http_code} https://smartprintai.com/; echo
```

If DB migrations were applied and are not backward-compatible, restore DB from your pre-deploy backup before restarting the old app build.

## 6) Operational Guardrails

- Never print or paste secret values in terminal logs.
- Always run local (`127.0.0.1`) and public (`https://smartprintai.com`) health checks after restart.
- Keep `smartprintai-uptime-check.timer` enabled for continuous endpoint checks.
