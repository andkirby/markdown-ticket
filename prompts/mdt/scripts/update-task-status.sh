#!/usr/bin/env bash
# Update a task's status in .tasks-status.yaml
# Usage: update-task-status.sh <tracker-path> <task-id> <new-status>
#
# Valid statuses: pending, in_progress, done, blocked
#
# Examples:
#   update-task-status.sh CRs/TP0-001/.tasks-status.yaml 1 in_progress
#   update-task-status.sh CRs/TP0-001/.tasks-status.yaml 2 done
#   update-task-status.sh CRs/TP0-001/.tasks-status.yaml 3 blocked
set -euo pipefail

TRACKER="${1:?Usage: update-task-status.sh <tracker-path> <task-id> <new-status>}"
TASK_ID="${2:?Missing task ID}"
NEW_STATUS="${3:?Missing status (pending|in_progress|done|blocked)}"

# Validate tracker exists
if [ ! -f "$TRACKER" ]; then
  echo "ERROR: Tracker not found: $TRACKER" >&2
  exit 1
fi

# Validate status
case "$NEW_STATUS" in
  pending|in_progress|done|blocked) ;;
  *)
    echo "ERROR: Invalid status '$NEW_STATUS'. Must be: pending, in_progress, done, blocked" >&2
    exit 1
    ;;
esac

# Update status using awk (portable across BSD/Linux sed variants)
TMP_TRACKER="${TRACKER}.tmp.$$"

set +e
awk -v task_id="$TASK_ID" -v new_status="$NEW_STATUS" '
function trim(s) {
  sub(/^[[:space:]]+/, "", s)
  sub(/[[:space:]]+$/, "", s)
  return s
}
BEGIN {
  in_task = 0
  matched = 0
  changed = 0
}
{
  line = $0

  if (line ~ /^[[:space:]]*-[[:space:]]*id:[[:space:]]*/) {
    current_id = line
    sub(/^[[:space:]]*-[[:space:]]*id:[[:space:]]*/, "", current_id)
    current_id = trim(current_id)
    if (current_id == task_id) {
      in_task = 1
      matched = 1
    } else {
      in_task = 0
    }
  } else if (in_task && match(line, /^[[:space:]]*status:[[:space:]]*/)) {
    sub(/status:.*/, "status: " new_status, line)
    in_task = 0
    changed = 1
  }

  print line
}
END {
  if (!matched) {
    exit 2
  }
  if (!changed) {
    exit 3
  }
}
' "$TRACKER" > "$TMP_TRACKER"
AWK_STATUS=$?
set -e

case "$AWK_STATUS" in
  0)
    mv "$TMP_TRACKER" "$TRACKER"
    ;;
  2)
    rm -f "$TMP_TRACKER"
    echo "ERROR: Task ID '$TASK_ID' not found in $TRACKER" >&2
    exit 1
    ;;
  3)
    rm -f "$TMP_TRACKER"
    echo "ERROR: Task ID '$TASK_ID' found but status field was not updated in $TRACKER" >&2
    exit 1
    ;;
  *)
    rm -f "$TMP_TRACKER"
    echo "ERROR: Failed to update task status in $TRACKER" >&2
    exit 1
    ;;
esac

echo "OK: Task $TASK_ID → $NEW_STATUS" >&2
