#!/usr/bin/env sh
#
# setup-css-gate.sh — one-line setup for the parse-css pre-commit gate.
#
# The gate cannot live in tracked lefthook.yml (the remote pre-commit scripts
# override local pre-commit commands in lefthook 2.1.10). It lives in
# lefthook-local.yml instead, which is gitignored. Run this script once per
# fresh clone to recreate that file.
#
# Usage:  sh scripts/setup-css-gate.sh
#
# What it does:
#   1. Writes lefthook-local.yml with the parse-css command.
#   2. Runs `lefthook install` to sync the hook.
#   3. Verifies the gate by parsing all existing frontend/src/**/*.css.
#
set -e

ROOT="$(git rev-parse --show-toplevel)"
cd "$ROOT"

if [ ! -f scripts/parse-css.mjs ]; then
  echo "✗ scripts/parse-css.mjs not found. Restore it from source control."
  exit 1
fi

# lefthook-local.yml is gitignored — safe to overwrite.
cat > lefthook-local.yml <<'GATE'
# Local-only CSS parse gate (gitignored — recreate via scripts/setup-css-gate.sh).
# Merges alongside the remote pre-commit scripts (lefthook 2.1.10 merges local
# commands with remote scripts, but does NOT merge local commands declared in
# the tracked lefthook.yml). See scripts/parse-css.mjs for the gate logic.
pre-commit:
  commands:
    "parse-css":
      glob: "*.css"
      run: >
        node "$PWD/scripts/parse-css.mjs" {staged_files}
GATE

lefthook install

echo "Verifying gate against all frontend/src/**/*.css…"
find frontend/src -name '*.css' -print0 | xargs -0 node scripts/parse-css.mjs

echo ""
echo "✓ CSS parse gate installed. It runs on every commit that stages .css files."
