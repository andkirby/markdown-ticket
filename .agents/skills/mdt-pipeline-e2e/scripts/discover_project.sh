#!/bin/sh
set -eu

ROOT=${1:-$(pwd)}
TICKET=${2:-}

if [ ! -d "$ROOT" ]; then
  echo "error: root is not a directory: $ROOT" >&2
  exit 2
fi

cd "$ROOT"

section() {
  printf '\n## %s\n' "$1"
}

list_existing() {
  for path in "$@"; do
    if [ -e "$path" ]; then
      printf -- '- %s\n' "$path"
    fi
  done
}

find_mdt_cli() {
  if command -v mdt-cli >/dev/null 2>&1; then
    command -v mdt-cli
    return 0
  fi
  if [ -x "./node_modules/.bin/mdt-cli" ]; then
    printf '%s\n' "./node_modules/.bin/mdt-cli"
    return 0
  fi
  return 1
}

find_bun() {
  if command -v bun >/dev/null 2>&1; then
    command -v bun
    return 0
  fi
  if [ -x "$HOME/.bun/bin/bun" ]; then
    printf '%s\n' "$HOME/.bun/bin/bun"
    return 0
  fi
  return 1
}

section "Discovery"
printf 'Root: %s\n' "$(pwd)"
[ -n "$TICKET" ] && printf 'Ticket: %s\n' "$TICKET"

section "Project Docs"
list_existing \
  AGENTS.md \
  CLAUDE.md \
  .github/copilot-instructions.md \
  docs/SKILLS.md \
  docs/create_ticket.md \
  docs/CONTRIBUTING.md \
  docs/WORKFLOWS.md \
  WORKFLOWS.md \
  COMMANDS.md \
  QUICKREF.md

section "Manifests"
list_existing package.json bun.lock bun.lockb pnpm-lock.yaml yarn.lock package-lock.json \
  pyproject.toml requirements.txt uv.lock Cargo.toml go.mod Makefile justfile

section "Ticket Directories"
list_existing docs/CRs tickets .tickets issues docs/tickets

section "Tools"
if MDT_CLI=$(find_mdt_cli); then
  printf -- '- mdt-cli: %s\n' "$MDT_CLI"
else
  printf -- '- mdt-cli: not found\n'
fi
if BUN=$(find_bun); then
  printf -- '- bun: %s\n' "$BUN"
else
  printf -- '- bun: not found\n'
fi
for tool in node npm pnpm yarn python3 pytest cargo go make just rg git; do
  if command -v "$tool" >/dev/null 2>&1; then
    printf -- '- %s: %s\n' "$tool" "$(command -v "$tool")"
  fi
done

section "Candidate Package Scripts"
if [ -f package.json ] && command -v node >/dev/null 2>&1; then
  node - <<'NODE'
const fs = require('fs')
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'))
const scripts = pkg.scripts || {}
const preferred = [
  'check',
  'test',
  'build',
  'lint',
  'format:check',
  'typecheck',
  'validate',
  'validate:ts',
  'test:e2e',
]
const fallback = Object.keys(scripts)
  .sort()
  .filter(name => /(^|:)(test|build|lint|check|validate|typecheck)(:|$)/.test(name))
const names = [...new Set([...preferred.filter(name => scripts[name]), ...fallback])].slice(0, 15)
for (const name of names) {
  console.log(`- ${name}: ${scripts[name]}`)
}
if (names.length === 0) console.log('- none')
NODE
elif [ -f package.json ]; then
  printf '%s\n' '- package.json exists; inspect scripts manually because node is not available'
else
  printf '%s\n' '- none'
fi

section "Suggested Verification Commands"
if [ -f package.json ]; then
  if BUN=$(find_bun); then
    for name in build test lint check "format:check"; do
      if command -v node >/dev/null 2>&1 && node -e "const s=require('./package.json').scripts||{}; process.exit(s['$name']?0:1)" >/dev/null 2>&1; then
        printf -- '- %s run %s\n' "$BUN" "$name"
      fi
    done
  else
    printf '%s\n' '- npm test'
    printf '%s\n' '- npm run build'
    printf '%s\n' '- npm run lint'
  fi
fi
[ -f pyproject.toml ] && printf '%s\n' '- pytest'
[ -f Cargo.toml ] && printf '%s\n' '- cargo test'
[ -f go.mod ] && printf '%s\n' '- go test ./...'
[ -f Makefile ] && printf '%s\n' '- make test'
[ -f justfile ] && printf '%s\n' '- just --list'

section "MDT CLI Commands"
if MDT_CLI=$(find_mdt_cli); then
  printf -- '- %s project current --json\n' "$MDT_CLI"
  printf -- '- %s ticket list --json --limit 10\n' "$MDT_CLI"
  if [ -n "$TICKET" ]; then
    printf -- '- %s ticket get %s --json\n' "$MDT_CLI" "$TICKET"
    printf -- '- %s ticket attr %s status=\"In Progress\"\n' "$MDT_CLI" "$TICKET"
    printf -- '- %s ticket attr %s status=Implemented\n' "$MDT_CLI" "$TICKET"
  else
    printf -- '- %s ticket get <ticket> --json\n' "$MDT_CLI"
    printf -- '- %s ticket attr <ticket> status=\"In Progress\"\n' "$MDT_CLI"
    printf -- '- %s ticket attr <ticket> status=Implemented\n' "$MDT_CLI"
  fi
else
  printf '%s\n' '- no mdt-cli detected'
fi

section "MDT CLI Snapshot"
if MDT_CLI=$(find_mdt_cli); then
  "$MDT_CLI" project current 2>/dev/null | sed -n '1,40p' || true
  if [ -n "$TICKET" ]; then
    "$MDT_CLI" ticket get "$TICKET" 2>/dev/null | sed -n '1,80p' || true
  fi
fi

section "Git Status"
if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git status --short
else
  printf '%s\n' '- not a git worktree'
fi
