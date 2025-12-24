#!/bin/bash
# Validate TypeScript files that have been modified
# Usage: npm run validate:ts
# Or with specific files: bash scripts/validate-changed-ts.sh file1.ts file2.ts

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[1;34m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0
SKIP=0
TOTAL=0

# Track validated projects and files
declare -A VALIDATED_PROJECTS
declare -A PROJECT_FILES

echo -e "${YELLOW}TypeScript validation for changed files...${NC}"
echo ""

# Function to validate a single file (doesn't print, just tracks)
validate_file() {
    local file="$1"

    # Skip if not a .ts or .tsx file
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

    # Determine which directory to validate from based on file location
    local project_dir=""
    local relative_path=""
    if [[ "$file" =~ ^mcp-server/(.+)$ ]]; then
        project_dir="mcp-server"
        relative_path="${BASH_REMATCH[1]}"
    elif [[ "$file" =~ ^server/(.+)$ ]]; then
        project_dir="server"
        relative_path="${BASH_REMATCH[1]}"
    elif [[ "$file" =~ ^shared/(.+)$ ]]; then
        project_dir="shared"
        relative_path="${BASH_REMATCH[1]}"
    elif [[ "$file" =~ ^domain-contracts/(.+)$ ]]; then
        project_dir="domain-contracts"
        relative_path="${BASH_REMATCH[1]}"
    else
        project_dir="root"
        relative_path="$file"
    fi

    # Add to project files array
    PROJECT_FILES["$project_dir"]+="|$relative_path"
}

# If files are passed as arguments, validate those
if [ $# -gt 0 ]; then
    for file in "$@"; do
        validate_file "$file"
    done
else
    # Otherwise, get changed files from git status
    FILES=$(git status --porcelain | awk '{print $2}')

    if [ -z "$FILES" ]; then
        echo -e "${YELLOW}No changed files found.${NC}"
        exit 0
    fi

    while IFS= read -r file; do
        validate_file "$file"
    done <<< "$FILES"
fi

if [ $TOTAL -eq 0 ]; then
    echo -e "${YELLOW}No TypeScript files found in changed files.${NC}"
    exit 0
fi

# Now validate and display results by project
for project in "${!PROJECT_FILES[@]}"; do
    # Get files for this project (split by |)
    IFS='|' read -ra files <<< "${PROJECT_FILES[$project]}"

    # Remove empty first element
    files=("${files[@]:1}")

    if [ ${#files[@]} -eq 0 ]; then
        continue
    fi

    file_word="files"
    [ ${#files[@]} -eq 1 ] && file_word="file"
    echo -e "${BLUE}$project${NC} (${#files[@]} $file_word)"
    echo ""

    # Check if already validated
    if [[ -n "${VALIDATED_PROJECTS[$project]}" ]]; then
        # Use cached result
        if [[ "${VALIDATED_PROJECTS[$project]}" == "PASS" ]]; then
            project_status="PASS"
        else
            project_status="FAIL"
        fi
    else
        # Validate the project
        if [ "$project" == "root" ]; then
            # For root-level files, validate individually (first file only)
            local first_file="${files[0]}"
            if npx tsc --skipLibCheck --noEmit "$first_file" 2>/dev/null; then
                project_status="PASS"
            else
                project_status="FAIL"
            fi
        else
            # Validate using project tsconfig
            if npx tsc --project "$project/tsconfig.json" --noEmit 2>/dev/null; then
                project_status="PASS"
            else
                project_status="FAIL"
            fi
        fi
        VALIDATED_PROJECTS[$project]="$project_status"
    fi

    # Show project status
    if [ "$project_status" == "PASS" ]; then
        echo -e "  ${GREEN}✓${NC} Validated"
        PASS=$((PASS + 1))
    else
        echo -e "  ${RED}✗${NC} Failed"
        FAIL=$((FAIL + 1))
        # Show errors
        if [ "$project" == "root" ]; then
            npx tsc --skipLibCheck --noEmit "${files[0]}" 2>&1 | sed 's/^/    /' | head -10
        else
            npx tsc --project "$project/tsconfig.json" --noEmit 2>&1 | sed 's/^/    /' | head -10
        fi
    fi
    echo ""

    # List files
    for file in "${files[@]}"; do
        # Show all files, mark first as validated, rest as cached
        if [ "$project_status" == "PASS" ]; then
            echo -e "  ${GREEN}✓${NC} $file"
        else
            echo -e "  ${RED}✗${NC} $file"
        fi
    done
    echo ""
done

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "  ${BLUE}Projects:${NC} ${#VALIDATED_PROJECTS[@]}  |  ${BLUE}Files:${NC} $TOTAL"
echo -e "  ${GREEN}Passed:${NC} $PASS  |  ${RED}Failed:${NC} $FAIL  |  ${YELLOW}Skipped:${NC} $SKIP"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Exit with error if any projects failed
if [ $FAIL -gt 0 ]; then
    exit 1
fi

exit 0
