#!/bin/sh
# Block ../shared/ imports (enforce @mdt/shared path alias)

block_shared_imports() {
  # Get list of staged .ts files (excluding .d.ts files)
  staged_files=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\.ts$' | grep -v -E '\.d\.ts$' || true)

  if [ -z "$staged_files" ]; then
    return 0
  fi

  # Pattern for disallowed imports: ../shared/ or ../../shared/ etc.
  disallowed_pattern="from ['\"](\.\.\/)+shared\/"
  violations=0

  for file in $staged_files; do
    if [ ! -f "$file" ]; then
      continue
    fi

    # Check for disallowed imports (case insensitive)
    if grep -iE "$disallowed_pattern" "$file" > /dev/null 2>&1; then
      echo "❌ ERROR: Disallowed relative import to shared module in: $file"
      echo ""
      echo "   Found import using '../shared/' which breaks TypeScript project references."
      echo ""
      echo "   Please use '@mdt/shared' path alias instead:"
      echo "   Bad:  from '../../../shared/test-lib/...'"
      echo "   Good: from '@mdt/shared/test-lib/...'"
      echo ""

      # Show the offending lines
      grep -n -E --color=always "$disallowed_pattern" "$file" | sed 's/^/   /'
      echo ""
      violations=$((violations + 1))
    fi
  done

  if [ $violations -gt 0 ]; then
    echo ""
    echo "❌ Commit blocked: $violations file(s) with disallowed relative imports to shared module."
    echo "   Fix the imports and try again."
    return 1
  fi

  return 0
}
