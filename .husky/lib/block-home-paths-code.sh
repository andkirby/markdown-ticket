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

block_home_paths_code() {
  # Get list of staged files (excluding .husky and deleted files)
  staged_files=$(git diff --cached --name-only --diff-filter=AC | grep -v '\.husky/' || true)

  if [ -z "$staged_files" ]; then
    return 0
  fi

  # Check each staged file for home paths
  violations=""
  for file in $staged_files; do
    # Check for home paths in non-comment lines
    # Skip: comments, string literals that are clearly examples/URLs
    if git diff --cached -- "$file" | grep -E '^\+' | grep -vE '^\+\+\+' | \
      grep -v '^[[:space:]]*//' | grep -v '^[[:space:]]*\*' | grep -v '^[[:space:]]*#' | \
      grep -v "example" | grep -v "http" | grep -v "https" | \
      grep -E "$HOME_PATH_PATTERN" > /dev/null; then
      violations="$violations  $file\n"
    fi
  done

  if [ -n "$violations" ]; then
    echo "❌ Blocked: Absolute home paths detected in staged files"
    echo ""
    echo "The following files contain absolute home paths:"
    echo -e "$violations"
    echo ""
    echo "Please replace absolute paths with:"
    echo "  - Relative paths from project root"
    echo "  - Environment variables"
    echo "  - Path.join() / path.resolve() constructs"
    return 1
  fi

  return 0
}
