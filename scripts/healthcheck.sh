#!/usr/bin/env bash
set -euo pipefail
BASE="${1:-http://localhost:3000}"
for p in / /select-city /articles /vacancies /services /resumes /links /auth/signin /auth/signup; do
  code=$(curl -s -o /tmp/we_h -w "%{http_code}" "$BASE$p")
  echo "$p $code"
  if [ "$code" -ge 500 ] || [ "$code" -eq 000 ]; then
    echo "FAILED: $p" >&2
    exit 1
  fi
done
