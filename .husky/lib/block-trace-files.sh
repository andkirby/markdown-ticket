#!/bin/sh
# Block generated trace artifacts from being committed under docs/CRs/*/

block_trace_files() {
  trace_files=$(git diff --cached --name-only --diff-filter=ACMR | grep -E '^docs/CRs/[^/]+/[^/]+\.trace\.md$' || true)

  if [ -z "$trace_files" ]; then
    return 0
  fi

  echo "❌ ERROR: Trace artifacts cannot be committed."
  echo ""
  echo "   Remove these staged files from the commit:"
  echo "$trace_files" | sed 's/^/   /'
  echo ""
  echo "   Pattern blocked: docs/CRs/*/*.trace.md"

  return 1
}
