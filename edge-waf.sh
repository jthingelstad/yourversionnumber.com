#!/usr/bin/env bash
# Keep the shared edge web ACL on this site's CloudFront distribution. No
# stack owns the distribution, so this is its writer for WebACLId, and the
# only field it changes.
#
#   ./edge-waf.sh           set WebACLId if it differs, then read it back
#   ./edge-waf.sh --check   only read: is it attached, and what a run changes
#
# The web ACL is projects-sysadmin's `edge` (stack edge-waf), every rule in
# count mode (Jamie, 2026-11-02: "Approved: build one shared AWS WAF web ACL
# in count mode in projects-sysadmin and attach it to all 22 CloudFront
# distributions through their stacks"). Its ARN is read from the
# CloudFormation export on every run and never kept here.
set -euo pipefail
export AWS_PROFILE="${AWS_PROFILE:-cloud-engineer}"
export AWS_REGION=us-east-1
export AWS_PAGER=""
DIST=EXHEH2YDGRSWL
EXPORT=edge-waf-WebAclArn

check=false
case "${1:-}" in
  "") ;;
  --check) check=true ;;
  *)
    echo "usage: $0 [--check]" >&2
    exit 2
    ;;
esac
command -v jq >/dev/null || {
  echo "edge-waf: needs jq" >&2
  exit 2
}

arn=$(aws cloudformation list-exports \
  --query "Exports[?Name=='$EXPORT'].Value | [0]" --output text)
if ! [[ "$arn" =~ ^arn:aws:wafv2:us-east-1:[0-9]{12}:global/webacl/edge/[0-9a-f-]+$ ]]; then
  echo "edge-waf: the export $EXPORT is missing or is not the edge web ACL; nothing changed" >&2
  exit 1
fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
aws cloudfront get-distribution-config --id "$DIST" --output json >"$tmp/current.json"
if [ "$(jq -r '.DistributionConfig.WebACLId' "$tmp/current.json")" = "$arn" ]; then
  echo "edge-waf: $DIST carries the edge web ACL"
  exit 0
fi
jq --arg arn "$arn" '.DistributionConfig | .WebACLId = $arn' "$tmp/current.json" >"$tmp/next.json"

if $check; then
  # Every config path a run would change: WebACLId alone, by construction.
  jq -r --slurpfile next "$tmp/next.json" '
    .DistributionConfig as $a | $next[0] as $b
    | [($a, $b) | paths(scalars)] | unique
    | map(. as $p | select(($a | getpath($p)) != ($b | getpath($p))) | map(tostring) | join("."))
    | "edge-waf: '"$DIST"' lacks the edge web ACL; a run changes: \(join(", "))"' "$tmp/current.json"
  exit 1
fi

# ETag compare-and-swap: refused if the distribution changed since the read.
aws cloudfront update-distribution --id "$DIST" \
  --if-match "$(jq -r '.ETag' "$tmp/current.json")" \
  --distribution-config "file://$tmp/next.json" --query 'Distribution.Status' --output text >/dev/null
after=$(aws cloudfront get-distribution-config --id "$DIST" \
  --query 'DistributionConfig.WebACLId' --output text)
if [ "$after" != "$arn" ]; then
  echo "edge-waf: the readback differs; check $DIST by hand" >&2
  exit 1
fi
echo "edge-waf: $DIST now carries the edge web ACL (its rules only count)"
