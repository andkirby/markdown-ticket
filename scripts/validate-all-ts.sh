#!/bin/bash
# Validate all TypeScript files in the project
# Usage: npm run validate:ts:all

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counter
PASS=0
FAIL=0
TOTAL=0

echo -e "${YELLOW}TypeScript validation for all files...${NC}"
echo ""

# Directories to scan
DIRS=(
    "src"
    "shared/src"
    "server/src"
    "mcp-server/src"
    "domain-contracts/src"
)

# Function to validate a single file
validate_file() {
    local file="$1"

    # Skip declaration files
    if [[ "$file" =~ \.d\.ts$ ]]; then
        return
    fi

    ((TOTAL++))

    # Show progress for every 50 files
    if ((TOTAL % 50 == 0)); then
        echo -e "${BLUE}Progress: $TOTAL files...${NC}"
    fi

    echo -n "Checking $file ... "

    # Run TypeScript validation
    if npx tsc --skipLibCheck --noEmit "$file" 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        ((PASS++))
    else
        echo -e "${RED}✗ FAIL${NC}"
        ((FAIL++))
        # Show actual errors
        npx tsc --skipLibCheck --noEmit "$file" 2>&1 | head -10
        echo ""
    fi
}

# Find all .ts and .tsx files in specified directories
for dir in "${DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo -e "${BLUE}Scanning $dir/...${NC}"
        while IFS= read -r -d '' file; do
            validate_file "$file"
        done < <(find "$dir" -type f \( -name "*.ts" -o -name "*.tsx" \) -print0 2>/dev/null)
    fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}Total:${NC}   $TOTAL"
echo -e "  ${GREEN}Passed:${NC}  $PASS"
echo -e "  ${RED}Failed:${NC}  $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with error if any files failed
if [ $FAIL -gt 0 ]; then
    exit 1
fi

exit 0
