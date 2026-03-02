#!/usr/bin/env bash
# Generate .tasks-status.yaml from tasks.md headers
# Usage: gen-tasks-status.sh <path-to-tasks.md>
# Output: .tasks-status.yaml in the same directory as tasks.md
#
# Only generates if .tasks-status.yaml does NOT already exist.
# To force regeneration, delete the existing file first.
set -euo pipefail

TASKS_MD="${1:?Usage: gen-tasks-status.sh <path-to-tasks.md>}"

if [ ! -f "$TASKS_MD" ]; then
  echo "ERROR: tasks.md not found: $TASKS_MD" >&2
  exit 1
fi

DIR=$(dirname "$TASKS_MD")
TRACKER="$DIR/.tasks-status.yaml"

if [ -f "$TRACKER" ]; then
  echo "SKIP: $TRACKER already exists" >&2
  exit 0
fi

# Extract CR key from directory name.
# tasks.md may live in:
# - {CR-KEY}/tasks.md
# - {CR-KEY}/prep/tasks.md
# - {CR-KEY}/part-X.Y/tasks.md
DIR_NAME=$(basename "$DIR")
if [ "$DIR_NAME" = "prep" ] || [[ "$DIR_NAME" == part-* ]]; then
  CR_KEY=$(basename "$(dirname "$DIR")")
else
  CR_KEY="$DIR_NAME"
fi

# Count tasks matching: ### Task N: Title  or  ### Task N.N: Title
COUNT=$(grep -cE '^### Task [0-9]' "$TASKS_MD" 2>/dev/null || true)

if [ "$COUNT" -eq 0 ]; then
  echo "ERROR: No tasks found in $TASKS_MD" >&2
  exit 1
fi

TOTAL_LINES=$(wc -l < "$TASKS_MD")

# Generate YAML
{
  echo "cr_key: \"$CR_KEY\""
  echo "total: $COUNT"
  echo "tasks:"

  prev_start=""
  prev_id=""
  prev_title=""

  emit_task() {
    local start="$1" end="$2" id="$3" title="$4"
    echo "  - id: $id"
    echo "    title: \"$title\""
    echo "    status: pending"
    # Extract Skills: line from task block (format: **Skills**: skill1, skill2)
    # Use { grep || true; } to prevent exit on no match with pipefail
    local skills
    skills=$(sed -n "${start},${end}p" "$TASKS_MD" | { grep -E '^\*\*Skills\*\*:' || true; } | sed -E 's/^\*\*Skills\*\*:\s*//' | tr -d ' ')
    if [ -n "$skills" ]; then
      echo "    skills:"
      echo "$skills" | tr ',' '\n' | while IFS= read -r skill; do
        [ -n "$skill" ] && echo "      - $skill"
      done
    fi
  }

  while IFS= read -r line; do
    line_num=$(echo "$line" | cut -d: -f1)
    rest=$(echo "$line" | cut -d: -f2-)
    id=$(echo "$rest" | sed -E 's/^### Task ([0-9.]+):.*/\1/')
    title=$(echo "$rest" | sed -E 's/^### Task [0-9.]+: (.*)/\1/')

    if [ -n "$prev_start" ]; then
      emit_task "$prev_start" "$((line_num - 1))" "$prev_id" "$prev_title"
    fi
    prev_start="$line_num"
    prev_id="$id"
    prev_title="$title"
  done < <(grep -nE '^### Task [0-9]' "$TASKS_MD")

  # Emit last task
  if [ -n "$prev_start" ]; then
    emit_task "$prev_start" "$TOTAL_LINES" "$prev_id" "$prev_title"
  fi
} > "$TRACKER"

echo "Generated $TRACKER ($COUNT tasks)" >&2
