#!/bin/sh
# Block absolute home paths in staged files
#
# Blocks commits that contain absolute paths like:
#   - /Users/kirby/...
#   - /home/user/...
#   - ~ (except in .husky or comments)

# Pattern for absolute home paths (macOS/Linux)
# Exclude .husky directory and allow in comments
HOME_PATH_PATTERN='/(Users|home)/[a-zA-Z0-9_-]+/'

# Get list of staged files (excluding .husky and deleted files)
STAGED_FILES=$(git diff --cached --name-only --diff-filter=AC | grep -v '\.husky/' || true)

if [ -z "$STAGED_FILES" ]; then
  exit 0
fi

# Check each staged file for home paths
VIOLATIONS=""
for FILE in $STAGED_FILES; do
  # Check for home paths in non-comment lines
  # Skip: comments, string literals that are clearly examples/URLs
  if git diff --cached "$FILE" | grep -E "^\+" | grep -v "^\+\+\+" | \
    grep -v "^\s*//" | grep -v "^\s*\*" | grep -v "^\s*#" | \
    grep -v "example" | grep -v "http" | grep -v "https" | \
    grep -E "$HOME_PATH_PATTERN" > /dev/null; then
    VIOLATIONS="$VIOLATIONS  $FILE\n"
  fi
done

if [ -n "$VIOLATIONS" ]; then
  echo "❌ Blocked: Absolute home paths detected in staged files"
  echo ""
  echo "The following files contain absolute home paths:"
  echo -e "$VIOLATIONS"
  echo ""
  echo "Please replace absolute paths with:"
  echo "  - Relative paths from project root"
  echo "  - Environment variables"
  echo "  - Path.join() / path.resolve() constructs"
  exit 1
fi

exit 0
