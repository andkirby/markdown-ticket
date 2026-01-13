#!/usr/bin/env bash
# Validate TypeScript files using project tsconfig
# Usage: npm run validate:ts:all
#        npm run validate:ts:all mcp-server/src
#        npm run validate:ts:all server shared

set -o pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Known projects and their tsconfigs
KNOWN_PROJECTS="mcp-server server shared domain-contracts src"

get_tsconfig_for_project() {
    local project="$1"
    case "$project" in
        mcp-server) echo "mcp-server/tsconfig.json" ;;
        server) echo "server/tsconfig.json" ;;
        shared) echo "shared/tsconfig.json" ;;
        domain-contracts) echo "domain-contracts/tsconfig.json" ;;
        src) echo "tsconfig.json" ;;
        *) echo "" ;;
    esac
}

# Determine which project a path belongs to
get_project_for_path() {
    local path="$1"

    # Extract the top-level directory
    local top_dir="${path%%/*}"

    # Check if it's a known project
    case "$top_dir" in
        mcp-server|server|shared|domain-contracts)
            echo "$top_dir"
            ;;
        src)
            echo "src"
            ;;
        *)
            echo ""
            ;;
    esac
}

# Validate a project using its tsconfig
validate_project() {
    local project="$1"
    local tsconfig
    tsconfig=$(get_tsconfig_for_project "$project")

    if [[ ! -f "$tsconfig" ]]; then
        echo -e "  ${YELLOW}⊘${NC} tsconfig not found: $tsconfig"
        return 1
    fi

    echo -ne "  Validating... "

    if npx tsc --project "$tsconfig" --noEmit 2>/dev/null; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        echo ""
        npx tsc --project "$tsconfig" --noEmit 2>&1 | sed 's/^/    /'
        return 1
    fi
}

# Counters
PASS=0
FAIL=0

echo -e "${YELLOW}TypeScript validation${NC}"
echo ""

# Collect unique projects to validate
PROJECTS_TO_VALIDATE=""

if [ $# -gt 0 ]; then
    # User specified paths
    for path in "$@"; do
        # Remove trailing slash
        path="${path%/}"

        project=$(get_project_for_path "$path")

        if [[ -z "$project" ]]; then
            echo -e "${RED}Unknown project for path:${NC} $path"
            echo "  Known projects: $KNOWN_PROJECTS"
            exit 1
        fi

        # Add to list if not already present
        if [[ ! " $PROJECTS_TO_VALIDATE " =~ " $project " ]]; then
            PROJECTS_TO_VALIDATE="$PROJECTS_TO_VALIDATE $project"
        fi
    done
else
    # Validate all known projects that exist
    for project in $KNOWN_PROJECTS; do
        if [[ -d "$project" ]]; then
            PROJECTS_TO_VALIDATE="$PROJECTS_TO_VALIDATE $project"
        fi
    done
fi

# Validate each project
for project in $PROJECTS_TO_VALIDATE; do
    echo -e "${BLUE}$project${NC}"

    if validate_project "$project"; then
        PASS=$((PASS + 1))
    else
        FAIL=$((FAIL + 1))
    fi
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${GREEN}Passed:${NC} $PASS  |  ${RED}Failed:${NC} $FAIL"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with error if any projects failed
if [ $FAIL -gt 0 ]; then
    exit 1
fi

exit 0
