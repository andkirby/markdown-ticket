#!/usr/bin/env bash
# Lint TypeScript files that have been modified (git-edited only)
# Usage: bun run lint:changed
# Or with specific files: bash scripts/lint-changed.sh file1.ts file2.ts
# Add --fix to auto-fix: bun run lint:changed --fix

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Parse flags
FIX_FLAG=""
FILES_ARGS=()
for arg in "$@"; do
    case "$arg" in
        --fix) FIX_FLAG="--fix" ;;
        *) FILES_ARGS+=("$arg") ;;
    esac
done

# Track files per package
declare -A PACKAGE_FILES
TOTAL=0
HAS_ERRORS=0

echo -e "${YELLOW}Linting changed files...${NC}"
echo ""

# Collect files
collect_file() {
    local file="$1"

    # Skip non-TS files
    if [[ ! "$file" =~ \.(ts|tsx)$ ]]; then
        return
    fi

    # Skip declaration files
    if [[ "$file" =~ \.d\.ts$ ]]; then
        return
    fi

    # Skip if file doesn't exist
    if [[ ! -f "$file" ]]; then
        return
    fi

    TOTAL=$((TOTAL + 1))

    # Route to the right package config
    if [[ "$file" =~ ^mcp-server/(.+)$ ]]; then
        PACKAGE_FILES["mcp-server"]+="$file "
    elif [[ "$file" =~ ^server/(.+)$ ]]; then
        PACKAGE_FILES["server"]+="$file "
    elif [[ "$file" =~ ^shared/(.+)$ ]]; then
        PACKAGE_FILES["shared"]+="$file "
    elif [[ "$file" =~ ^domain-contracts/(.+)$ ]]; then
        PACKAGE_FILES["domain-contracts"]+="$file "
    elif [[ "$file" =~ ^cli/(.+)$ ]]; then
        PACKAGE_FILES["cli"]+="$file "
    else
        PACKAGE_FILES["root"]+="$file "
    fi
}

# If files are passed as arguments, use those
if [ ${#FILES_ARGS[@]} -gt 0 ]; then
    for file in "${FILES_ARGS[@]}"; do
        collect_file "$file"
    done
else
    # Otherwise, get changed files from git status
    FILES=$(git status --porcelain | awk '{print $2}')

    if [ -z "$FILES" ]; then
        echo -e "${YELLOW}No changed files found.${NC}"
        exit 0
    fi

    while IFS= read -r file; do
        collect_file "$file"
    done <<< "$FILES"
fi

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}No TypeScript files found in changed files.${NC}"
    exit 0
fi

# Lint each package's changed files using its own eslint config
for pkg in root server mcp-server shared domain-contracts cli; do
    files="${PACKAGE_FILES[$pkg]}"
    [ -z "$files" ] && continue

    file_count=$(echo "$files" | wc -w | tr -d ' ')
    file_word="file"
    [ "$file_count" -gt 1 ] && file_word="files"

    echo -e "${BLUE}$pkg${NC} ($file_count $file_word)"

    config="$pkg/eslint.config.ts"
    [ "$pkg" = "root" ] && config="eslint.config.ts"

    if bunx eslint $files --config "$config" --report-unused-disable-directives --max-warnings 0 $FIX_FLAG 2>&1; then
        echo -e "  ${GREEN}✓${NC} Passed"
    else
        echo -e "  ${RED}✗${NC} Failed"
        HAS_ERRORS=1
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}Files linted:${NC} $TOTAL"
if [ $HAS_ERRORS -eq 0 ]; then
    echo -e "  ${GREEN}All passed${NC}"
else
    echo -e "  ${RED}Errors found${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

exit $HAS_ERRORS
