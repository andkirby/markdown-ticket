#!/bin/sh
# Block Co-Authored-By in commit messages (no AI attribution)

block_co_authored_by() {
  commit_msg_file="$1"

  if [ -z "$commit_msg_file" ]; then
    commit_msg_file=$(git rev-parse --git-dir)/COMMIT_EDITMSG
  fi

  if [ ! -f "$commit_msg_file" ]; then
    return 0
  fi

  if grep -qi "Co-Authored-By" "$commit_msg_file"; then
    echo "❌ ERROR: Commit message contains 'Co-Authored-By'"
    echo ""
    echo "   AI/tool attribution is not allowed in commit messages."
    echo "   Please remove 'Co-Authored-By' lines and try again."
    echo ""
    echo "   Current message:"
    cat "$commit_msg_file" | sed 's/^/   /'
    return 1
  fi

  return 0
}
