#!/usr/bin/env bash
set -euo pipefail

BUCKET="${1:-bushcraft-exhibition}"

echo "uploading default logo to $BUCKET..."
npx wrangler r2 object put "$BUCKET/images/_default/logo.png" \
  --file="$(dirname "$0")/../public/default-logo.png" \
  --content-type="image/png"

echo "uploading background texture to $BUCKET..."
npx wrangler r2 object put "$BUCKET/images/_default/b.png" \
  --file="$(dirname "$0")/../public/b.png" \
  --content-type="image/png"

echo "done."
