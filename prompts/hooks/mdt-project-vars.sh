#!/bin/bash
# SessionStart hook: Inject MDT project variables into Claude Code context
# Reads from .mdt-config.toml if it exists in the git repo root

set -e

# Read JSON input (optional for SessionStart, but good practice)
INPUT=$(cat 2>/dev/null || echo '{}')
PROJECT_DIR=$(echo "$INPUT" | jq -r '.workspace.current_dir // "."' 2>/dev/null || echo ".")

# Find git root
GIT_ROOT=$(cd "$PROJECT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$PROJECT_DIR")

CONFIG_FILE="$GIT_ROOT/.mdt-config.toml"

if [ -f "$CONFIG_FILE" ]; then
    # Extract values from config
    CODE=$(grep '^code = ' "$CONFIG_FILE" 2>/dev/null | cut -d'"' -f2 | tr -d ' ')
    TICKETS_PATH=$(grep '^ticketsPath = ' "$CONFIG_FILE" 2>/dev/null | cut -d'"' -f2 | tr -d ' ')
    
    if [ -n "$CODE" ] && [ -n "$TICKETS_PATH" ]; then
        echo "# MDT Project Variables (from $CONFIG_FILE)"
        echo "PROJECT_CODE=$CODE"
        echo "TICKETS_PATH=$TICKETS_PATH"
        echo "# Use these variables in mdt workflow prompts"
    fi
fi
