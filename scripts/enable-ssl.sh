#!/usr/bin/env bash
set -euo pipefail

DOMAIN_NAME="${1:-}"
if [[ -z "$DOMAIN_NAME" ]]; then
  echo "Usage: ./scripts/enable-ssl.sh your-domain.com" >&2
  exit 1
fi

SOURCE_FILE="infra/nginx/conf.d/proshop.ssl.conf.example"
TARGET_FILE="infra/nginx/conf.d/proshop.ssl.conf"

if [[ ! -f "$SOURCE_FILE" ]]; then
  echo "Missing $SOURCE_FILE" >&2
  exit 1
fi

sed "s/example.com/${DOMAIN_NAME}/g" "$SOURCE_FILE" > "$TARGET_FILE"

echo "Created $TARGET_FILE for $DOMAIN_NAME."
echo "Now uncomment 443:443 in docker-compose.yml under nginx ports, then run: docker compose up -d nginx"
