#!/usr/bin/env bash
set -euo pipefail

TARGET_URL="${1:-http://127.0.0.1/}"
REQUESTS="${2:-10000}"
CONCURRENCY="${3:-100}"

if ! command -v ab >/dev/null 2>&1; then
  echo "Apache Benchmark is missing. Install it with: sudo apt install -y apache2-utils" >&2
  exit 1
fi

echo "Running Apache Benchmark against ${TARGET_URL} with ${REQUESTS} requests and ${CONCURRENCY} concurrency..."
ab -n "$REQUESTS" -c "$CONCURRENCY" "$TARGET_URL"
