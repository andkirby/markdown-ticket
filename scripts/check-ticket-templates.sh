#!/bin/sh
# Read-only local Lefthook launcher for MDT's shared staged-content validator.
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
validator_root=$(dirname -- "$script_dir")

if ! command -v bun >/dev/null 2>&1; then
  echo 'MDT ticket validation cannot run: Bun is unavailable. Install Bun, build MDT, then retry the commit.' >&2
  exit 1
fi

if [ ! -f "$validator_root/cli/dist/index.js" ] || [ ! -f "$validator_root/shared/dist/services/ticket/staged-validation.js" ]; then
  echo 'MDT ticket validation cannot run: the validator build is missing. Run bun run build:domain-contracts, bun run build:shared and bun run --cwd cli build, then retry the commit.' >&2
  exit 1
fi

if ! bun "$validator_root/cli/dist/index.js" ticket validate --help >/dev/null 2>&1; then
  echo 'MDT ticket validation cannot run: this CLI build does not support ticket validate. Rebuild MDT shared and CLI packages, then retry the commit.' >&2
  exit 1
fi

exec bun "$validator_root/cli/dist/index.js" ticket validate --staged
