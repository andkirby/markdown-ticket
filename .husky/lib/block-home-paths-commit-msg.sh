#!/bin/sh
# Block absolute home paths in commit messages
#
# Blocks commit messages containing absolute paths like:
#   - /Users/kirby/...
#   - /home/user/...

COMMIT_MSG_FILE="$1"

# Pattern for absolute home paths (macOS/Linux)
# Only match paths with actual content (not "username" or "user" placeholders)
HOME_PATH_PATTERN='/(Users|home)/[a-zA-Z0-9_-]+/'

# Read commit message
COMMIT_MSG=$(cat "$COMMIT_MSG_FILE")

# Check for home paths in commit message
# Skip example placeholders and common documentation terms
if echo "$COMMIT_MSG" | grep -v "username" | grep -v "pattern" | \
  grep -v "description" | grep -v "example" | \
  grep -E "$HOME_PATH_PATTERN" > /dev/null; then
  echo "❌ Blocked: Absolute home paths detected in commit message"
  echo ""
  echo "Please remove absolute paths from your commit message."
  echo "Use relative paths or project identifiers instead."
  echo ""
  echo "Found in:"
  echo "$COMMIT_MSG" | grep -E "$HOME_PATH_PATTERN" | sed 's/^/  /'
  exit 1
fi

exit 0
