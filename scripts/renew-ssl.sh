#!/usr/bin/env bash
set -euo pipefail

cd /home/ubuntu/apps/proshop

echo "===== CERTBOT RENEW START: $(date -u) ====="

/usr/bin/docker compose run --rm \
  --entrypoint certbot \
  certbot renew --quiet

/usr/bin/docker compose exec -T nginx nginx -s reload

echo "===== CERTBOT RENEW END: $(date -u) ====="
