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

  # Collect all violations with line numbers into a temp file
  tmp_output=$(mktemp)
  for file in $staged_files; do
    # Use git diff with line numbers, filter for violations
    git diff --cached -- "$file" | awk '
      BEGIN { state = 0; file_name = ""; new_line = 0 }
      /^\+\+\+/ {
        file_name = $0
        sub(/^\+\+\+ [ab]?\/?/, "", file_name)
        next
      }
      /^@@/ {
        # Parse: @@ -old,old_count +new,new_count @@
        # Extract the +new_start part
        hunk = $0
        sub(/^@@ .* \+/, "", hunk)
        sub(/,.*/, "", hunk)
        new_line = hunk + 0
        state = 1
        next
      }
      /^\+/ && !/^(\+\+\+|---)/ && state == 1 {
        line = substr($0, 2)
        # Skip comments and example/URL lines
        skip = 0
        if (match(line, /^[[:space:]]*(\/\/|#)/)) skip = 1
        if (match(line, /^[[:space:]]*\*/)) skip = 1
        if (line ~ /[Ee][Xx][Aa][Mm][Pp][Ll][Ee]/) skip = 1
        if (line ~ /[Hh][Tt][Tt][Pp][Ss]?:/) skip = 1

        if (!skip && line ~ /(Users|home)\/[a-zA-Z0-9_-]+\//) {
          printf "  %s:%d\n  │  %s\n", file_name, new_line, line
        }
        new_line++
      }
      /^-/ { new_line++ }  # Handle deleted lines
    '
  done > "$tmp_output"

  # Check if any violations found
  if [ -s "$tmp_output" ]; then
    echo "❌ Blocked: Absolute home paths detected in staged files"
    echo ""
    echo "Found absolute home paths in the following locations:"
    echo ""
    cat "$tmp_output"
    echo ""
    echo "Please replace absolute paths with:"
    echo "  - Relative paths from project root"
    echo "  - Environment variables"
    echo "  - Path.join() / path.resolve() constructs"
    rm -f "$tmp_output"
    return 1
  fi

  rm -f "$tmp_output"
  return 0
}
