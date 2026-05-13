#!/usr/bin/env bash
set -euo pipefail

BUCKET="${1:-bushcraft-exhibition}"

echo "uploading default logo to $BUCKET..."
wrangler r2 object put "$BUCKET/images/_default/logo.png" \
  --file="$(dirname "$0")/../public/default-logo.png" \
  --content-type="image/png"

echo "done."
