#!/usr/bin/env bash
# Stop hook: block if tasks remain incomplete during implement-agentic
# Reads .tasks-status.yaml (simple YAML tracker) instead of parsing tasks.md
set -euo pipefail

INPUT=$(cat)

# Prevent infinite loop — if stop hook already fired, let it go
STOP_HOOK_ACTIVE=$(echo "$INPUT" | jq -r '.stop_hook_active // false')
if [ "$STOP_HOOK_ACTIVE" = "true" ]; then
  exit 0
fi

# Use CWD from hook input
CWD=$(echo "$INPUT" | jq -r '.cwd // "."')
TRACKER_HINT=$(echo "$INPUT" | jq -r '.tracker_path // ""')

# Prefer explicit tracker when provided.
TRACKER=""
if [ -n "$TRACKER_HINT" ] && [ -f "$TRACKER_HINT" ]; then
  TRACKER="$TRACKER_HINT"
fi

# Otherwise, discover trackers under CWD.
if [ -z "$TRACKER" ]; then
  TRACKERS=$(find "$CWD" -name ".tasks-status.yaml" -type f 2>/dev/null || true)

  if [ -z "$TRACKERS" ]; then
    exit 0  # No tracker = not in implement workflow
  fi

  ACTIONABLE_TRACKER_COUNT=0
  LAST_ACTIONABLE_TRACKER=""
  LAST_ACTIONABLE_COUNT=0
  ACTIONABLE_LIST=""

  while IFS= read -r CANDIDATE; do
    [ -z "$CANDIDATE" ] && continue
    CANDIDATE_ACTIONABLE=$(grep -c 'status:.*\(pending\|in_progress\)' "$CANDIDATE" 2>/dev/null || true)
    if [ "$CANDIDATE_ACTIONABLE" -gt 0 ]; then
      ACTIONABLE_TRACKER_COUNT=$((ACTIONABLE_TRACKER_COUNT + 1))
      LAST_ACTIONABLE_TRACKER="$CANDIDATE"
      LAST_ACTIONABLE_COUNT="$CANDIDATE_ACTIONABLE"
      ACTIONABLE_LIST="${ACTIONABLE_LIST}\n- ${CANDIDATE} (${CANDIDATE_ACTIONABLE} incomplete)"
    fi
  done <<< "$TRACKERS"

  if [ "$ACTIONABLE_TRACKER_COUNT" -eq 0 ]; then
    exit 0
  fi

  if [ "$ACTIONABLE_TRACKER_COUNT" -gt 1 ]; then
    echo "BLOCKED: Multiple active task trackers detected under $CWD." >&2
    printf "Active trackers:%b\n" "$ACTIONABLE_LIST" >&2
    echo "Provide tracker_path in hook input to disambiguate." >&2
    exit 2
  fi

  TRACKER="$LAST_ACTIONABLE_TRACKER"
  ACTIONABLE="$LAST_ACTIONABLE_COUNT"
fi

# Count actionable tasks: pending or in_progress (grep-based, no YAML parser needed)
# Tasks with status "done" or "blocked" are terminal — they allow stop.
if [ -z "${ACTIONABLE:-}" ]; then
  ACTIONABLE=$(grep -c 'status:.*\(pending\|in_progress\)' "$TRACKER" 2>/dev/null || true)
fi
# grep -c outputs "0" and exits 1 on no match; || true prevents set -e from killing us

if [ "$ACTIONABLE" -gt 0 ]; then
  CR_KEY=$(grep '^cr_key:' "$TRACKER" | head -1 | sed 's/cr_key:[[:space:]]*["]*\([^"]*\)["]*$/\1/')
  echo "BLOCKED: $ACTIONABLE incomplete tasks for $CR_KEY" >&2
  echo "Read $TRACKER and continue working on pending/in_progress tasks." >&2
  echo "If a task cannot be completed, set its status to 'blocked' in $TRACKER." >&2
  exit 2
fi

exit 0
