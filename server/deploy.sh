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

# HTML is small and re-read often, so it gets a short max-age.
aws s3 cp "s3://$BUCKET/" "s3://$BUCKET/" --recursive \
  --exclude "*" --include "*.html" --metadata-directive REPLACE \
  --cache-control "public, max-age=300" \
  --content-type "text/html; charset=utf-8" --only-show-errors

# CSS and JS shipped without any cache-control at all, which left browsers to
# guess. Filenames carry no content hash, so a long max-age would strand people
# on stale CSS after a deploy even though the edge gets invalidated -- 10
# minutes is the most we can offer without that risk.
# REPLACE drops the existing content-type, so each pass restates its own
# rather than letting the copy guess and land on application/octet-stream.
aws s3 cp "s3://$BUCKET/" "s3://$BUCKET/" --recursive \
  --exclude "*" --include "*.css" --metadata-directive REPLACE \
  --cache-control "public, max-age=600" --content-type "text/css" \
  --only-show-errors

aws s3 cp "s3://$BUCKET/" "s3://$BUCKET/" --recursive \
  --exclude "*" --include "*.js" --metadata-directive REPLACE \
  --cache-control "public, max-age=600" --content-type "text/javascript" \
  --only-show-errors

aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" \
  --query "Invalidation.Id" --output text
