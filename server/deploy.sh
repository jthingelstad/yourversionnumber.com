#!/usr/bin/env bash
# Publish the static site to S3 and invalidate CloudFront.
# The site is plain files, so this is a sync and nothing more.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-jamie}"
export AWS_PAGER=""
BUCKET=yourversionnumber-com-site
DIST=EXHEH2YDGRSWL
cd "$(cd "$(dirname "$0")/.." && pwd)"

  # og/ and _build/ exist only in the bucket — generated previews and the lambda
  # bundle. --delete would remove anything not present locally, so they are
  # excluded from the sync rather than re-uploaded.
aws s3 sync . "s3://$BUCKET/" \
  --exclude ".git/*" --exclude ".github/*" --exclude "server/*" \
  --exclude "design_handoff_theme_refresh/*" \
  --exclude "*.md" --exclude "*.mjs" --exclude "SALVAGE.txt" \
  --exclude ".gitignore" --exclude "CNAME" --exclude "themes-preview.html" \
  --exclude ".DS_Store" --exclude "_*.html" \
  --exclude "_build/*" --exclude "og/*" \
  --delete --only-show-errors

# HTML is small and re-read often; assets can sit in the edge cache longer.
aws s3 cp "s3://$BUCKET/" "s3://$BUCKET/" --recursive \
  --exclude "*" --include "*.html" --metadata-directive REPLACE \
  --cache-control "public, max-age=300" \
  --content-type "text/html; charset=utf-8" --only-show-errors

aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" \
  --query "Invalidation.Id" --output text
