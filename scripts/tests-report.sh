#!/usr/bin/env bash
# tests-report.sh — Compact test failure report across all packages.
# Usage:
#   ./scripts/tests-report.sh                      — FAIL files only
#   ./scripts/tests-report.sh --verbose            — FAIL files + full test tree
#   ./scripts/tests-report.sh server               — scope to one package
#   ./scripts/tests-report.sh --verbose server     — verbose, one package

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

VERBOSE=false
PACKAGES=("shared" "server" "mcp-server")

# Parse flags and package args
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --verbose)   VERBOSE=true ;;
    -h|--help)
      echo "Usage: tests-report.sh [--verbose] [package...]"
      echo ""
      echo "  (no flags)   Show only failing test files"
      echo "  --verbose    Show failing files with full describe tree and ✕ cases"
      echo "  -h, --help   Show this help"
      echo ""
      echo "  package      One or more of: shared server mcp-server (default: all)"
      echo ""
      echo "Examples:"
      echo "  ./scripts/tests-report.sh"
      echo "  ./scripts/tests-report.sh --verbose"
      echo "  ./scripts/tests-report.sh server"
      echo "  ./scripts/tests-report.sh --verbose server"
      exit 0
      ;;
    *)           ARGS+=("$arg") ;;
  esac
done

VALID_PACKAGES=("shared" "server" "mcp-server")

if [[ ${#ARGS[@]} -gt 0 ]]; then
  for arg in "${ARGS[@]}"; do
    valid=false
    for vp in "${VALID_PACKAGES[@]}"; do
      [[ "$arg" == "$vp" ]] && valid=true && break
    done
    if [[ "$valid" == false ]]; then
      echo "Unknown package: '$arg'. Valid packages: ${VALID_PACKAGES[*]}" >&2
      exit 1
    fi
  done
  PACKAGES=("${ARGS[@]}")
fi

FAILED_PACKAGES=()
ALL_PASS=true

run_package() {
  local pkg="$1"
  local output

  output=$(bun run --cwd "$pkg" jest --verbose --no-coverage 2>&1) || true

  local fail_files
  fail_files=$(echo "$output" | grep '^FAIL ' || true)

  if [[ -z "$fail_files" ]]; then
    echo "  $pkg: ok"
    return 0
  fi

  echo ""
  echo "  [$pkg]"

  if [[ "$VERBOSE" == true ]]; then
    local tree
    tree=$(echo "$output" | awk '
      BEGIN { in_fail=0; in_detail=0 }
      /^Test Suites:/  { exit }
      /^PASS /         { in_fail=0; in_detail=0; next }
      /^FAIL /         { in_fail=1; in_detail=0; print; next }
      /^  ● /          { in_detail=1; next }
      in_detail        { next }
      !in_fail         { next }
      /[✓○]/           { next }
      /^\s*$/          { next }
      /DeprecationWarning|Use `node/ { next }
      { print }
    ' || true)
    echo "$tree" | sed 's/^/  /'
  else
    echo "$fail_files" | sed 's/^/  /'
  fi

  FAILED_PACKAGES+=("$pkg")
  ALL_PASS=false
}

for pkg in "${PACKAGES[@]}"; do
  run_package "$pkg"
done

echo ""
if [[ "$ALL_PASS" == true ]]; then
  echo "All packages passed."
else
  if [[ "$VERBOSE" == false ]]; then
    echo "Tip: run with --verbose to see failing test cases."
  fi
  echo "Failed: ${FAILED_PACKAGES[*]}"
  exit 1
fi
