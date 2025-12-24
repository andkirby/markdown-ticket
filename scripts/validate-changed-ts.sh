#!/bin/bash
# Validate TypeScript files that have been modified
# Usage: npm run validate:ts
# Or with specific files: bash scripts/validate-changed-ts.sh file1.ts file2.ts

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0
SKIP=0

echo -e "${YELLOW}TypeScript validation for changed files...${NC}"
echo ""

# Function to validate a single file
validate_file() {
    local file="$1"

    # Skip if not a .ts or .tsx file
    if [[ ! "$file" =~ \.(ts|tsx)$ ]]; then
        return
    fi

    # Skip if file doesn't exist
    if [[ ! -f "$file" ]]; then
        echo -e "${YELLOW}⊘ SKIP${NC} $file (not found)"
        ((SKIP++))
        return
    fi

    # Skip declaration files
    if [[ "$file" =~ \.d\.ts$ ]]; then
        return
    fi

    echo -n "Checking $file ... "

    # Run TypeScript validation
    if npx tsc --skipLibCheck --noEmit "$file" 2>/dev/null; then
        echo -e "${GREEN}✓ PASS${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
        # Show actual errors
        npx tsc --skipLibCheck --noEmit "$file" 2>&1 | head -20
    fi
}

# If files are passed as arguments, validate those
if [ $# -gt 0 ]; then
    for file in "$@"; do
        validate_file "$file"
    done
else
    # Otherwise, get changed files from git status
    # Include staged, modified, and untracked files
    FILES=$(git status --porcelain | awk '{print $2}')

    if [ -z "$FILES" ]; then
        echo -e "${YELLOW}No changed files found.${NC}"
        exit 0
    fi

    echo -e "${YELLOW}Found $(echo "$FILES" | wc -l | tr -d ' ') changed file(s)${NC}"
    echo ""

    while IFS= read -r file; do
        validate_file "$file"
    done <<< "$FILES"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed:${NC} $PASS  |  ${RED}Failed:${NC} $FAIL  |  ${YELLOW}Skipped:${NC} $SKIP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with error if any files failed
if [ $FAIL -gt 0 ]; then
    exit 1
fi

exit 0
