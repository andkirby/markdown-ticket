#!/bin/bash

# Install git hooks from scripts/githooks/ to .git/hooks/
# This ensures all developers use the same pre-commit checks

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
GIT_HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
SOURCE_HOOKS_DIR="$PROJECT_ROOT/scripts/githooks"

echo "Installing git hooks..."

# Check if we're in a git repository
if [ ! -d "$GIT_HOOKS_DIR" ]; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Copy all hooks from scripts/githooks/ to .git/hooks/
for hook in "$SOURCE_HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        target="$GIT_HOOKS_DIR/$hook_name"
        cp "$hook" "$target"
        chmod +x "$target"
        echo "  ✓ Installed $hook_name"
    fi
done

echo ""
echo "Git hooks installed successfully!"
echo ""
echo "Active hooks:"
for hook in "$GIT_HOOKS_DIR"/*; do
    if [ -f "$hook" ]; then
        hook_name=$(basename "$hook")
        echo "  - $hook_name"
    fi
done
