#!/bin/sh
# Run knip dead code checker on .ts files

run_knip() {
  # Get list of staged .ts files (excluding .d.ts files)
  staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$' | grep -v -E '\.d\.ts$' || true)

  if [ -z "$staged_files" ]; then
    return 0
  fi

  echo "Running knip..."
  npx knip --files

  if [ $? -ne 0 ]; then
    echo ""
    echo "knip found issues. Please fix them before committing."
    return 1
  fi

  echo "knip passed ✅"
  return 0
}
