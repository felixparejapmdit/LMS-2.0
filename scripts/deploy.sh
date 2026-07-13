#!/usr/bin/env bash
# Deploy LMS 2.0 on a server (Test or Production).
#
#   ./scripts/deploy.sh          interactive: shows the schema plan, asks before applying
#   ./scripts/deploy.sh --auto   non-interactive: applies without asking (use on Test / CI)
#
# Requires on the host: git, docker compose, sqlite3 (apt install sqlite3)
set -euo pipefail
cd "$(dirname "$0")/.."

SNAPSHOT=/directus/snapshots/schema.yaml
DB=directus/database/data.db

echo "==> Pulling latest code + schema snapshot"
git pull --ff-only origin main

if [[ -f "$DB" ]]; then
  echo "==> Backing up SQLite database (online, WAL-safe)"
  mkdir -p backups
  sqlite3 "$DB" ".backup 'backups/data-$(date +%Y%m%d-%H%M%S).db'"
  ls -1t backups/data-*.db | tail -n +15 | xargs -r rm --
fi

if [[ -f directus/snapshots/schema.yaml ]]; then
  echo "==> Schema plan (dry run)"
  docker compose exec -T directus npx directus schema apply --dry-run "$SNAPSHOT"

  if [[ "${1:-}" != "--auto" ]]; then
    read -rp "Apply this schema plan? [y/N] " ok
    [[ "$ok" == "y" ]] || { echo "Aborted — code pulled, schema unchanged."; exit 1; }
  fi

  echo "==> Applying schema"
  docker compose exec -T directus npx directus schema apply --yes "$SNAPSHOT"
else
  echo "==> No schema snapshot in repo yet; skipping schema apply"
fi

if [[ -f scripts/seed-lookups.js ]]; then
  echo "==> Running idempotent seeds"
  docker compose exec -T backend node scripts/seed-lookups.js
fi

echo "==> Rebuilding app containers"
docker compose up -d --build backend frontend

echo "==> Health checks"
curl -fsS http://localhost:8055/server/ping >/dev/null && echo "directus OK"
curl -fsS "http://localhost:5000" -o /dev/null -w "backend HTTP %{http_code}\n" || true

echo "==> Deploy complete"
