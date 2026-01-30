# Test Case Execution Guide for CLI Project Management

**CR**: MDT-077
**Purpose**: Instructions for running individual test cases from the test suite
**Created**: 2025-12-18

## Overview

This guide provides instructions for running a specific test case from the CLI project management test suite. Each test case must be executed in an isolated environment to ensure reliable, repeatable results.

## Test Case Selection

Before running a test, identify which case you want to execute from `test-suite.md`:

### Available Test Cases

**Strategy 1: Global-Only Mode**
- G01 - Create project with global-only strategy
- G02 - Attempt to create global-only project with invalid path
- G03 - Create global-only project with document discovery settings

**Strategy 2: Project-First Mode (Default)**
- PF01 - Create project with project-first strategy (default)
- PF02 - Create project-first with existing local config
- PF03 - Project-first with custom tickets path

**Strategy 3: Auto-Discovery Mode**
- AD01 - Create project with auto-discovery strategy
- AD02 - Auto-discovery project outside search depth
- AD03 - Auto-discovery with conflict resolution

**Cross-Strategy Test Scenarios**
- CS01 - Verify project code uniqueness across strategies
- CS02 - Strategy migration validation
- CV01 - Invalid project codes
- CV02 - ID mismatch with directory name

**Error Handling and Recovery**
- ER01 - Permission denied scenarios
- ER02 - Concurrent project creation

## Execution Template

### Step 1: Setup Isolated Environment

```bash
# Create unique test environment
TEST_ID="<CASE-NAME>-$(date +%s%N | tail -c 10)"
TEST_BASE="/tmp/mdt-cli-tests-${TEST_ID}"
PROJECT_PATH="${TEST_BASE}/projects/<PROJECT-DIR>"

# Create directory structure
mkdir -p "${TEST_BASE}/config/projects"
mkdir -p "${TEST_BASE}/projects"
mkdir -p "${TEST_BASE}/home"

# Create global configuration
cat > "${TEST_BASE}/config/config.toml" << EOF
[discovery]
autoDiscover = true
searchPaths = ["${TEST_BASE}/projects"]
maxDepth = 2
EOF

# Set isolation variables
export CONFIG_DIR="${TEST_BASE}/config"
export HOME="${TEST_BASE}/home"
export XDG_CONFIG_HOME="${TEST_BASE}/config"
```

### Step 2: Navigate to Correct Directory

Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.

### Step 3: Execute Test Commands

Replace placeholders with actual values from your selected test case:

```bash
# Execute the test command(s) from test-suite.md
npm run project:create -- \
  --name "<PROJECT-NAME>" \
  --code "<PROJECT-CODE>" \
  --path "<PROJECT-PATH>" \
  [ADDITIONAL FLAGS]
```

### Step 4: Verification

After executing the test commands, verify the results:

```bash
# Check global registry
cat "${CONFIG_DIR}/projects/<REGISTRY-FILE>.toml"

# Check for local config (if expected to exist/NOT exist)
ls -la "${PROJECT_PATH}/.mdt-config.toml"

# Try to retrieve project
npm run project:get -- <PROJECT-CODE>

# List projects
npm run project:list
```

### Step 5: Cleanup

```bash
# On success, clean up
rm -rf "${TEST_BASE}"

# On failure, preserve for debugging
echo "Test artifacts preserved at: ${TEST_BASE}"
```

## Test Case Examples

### Example: Running G01 (Global-Only Creation)

```bash
#!/bin/bash
# Test G01: Create project with global-only strategy

# 1. Setup
TEST_ID="G01-$(date +%s%N | tail -c 10)"
TEST_BASE="/tmp/mdt-cli-tests-${TEST_ID}"
PROJECT_PATH="${TEST_BASE}/projects/within-depth/project-global"

mkdir -p "${TEST_BASE}/config/projects"
mkdir -p "${TEST_BASE}/projects"
mkdir -p "${TEST_BASE}/home"

cat > "${TEST_BASE}/config/config.toml" << EOF
[discovery]
autoDiscover = true
searchPaths = ["${TEST_BASE}/projects"]
maxDepth = 2
EOF

export CONFIG_DIR="${TEST_BASE}/config"
export HOME="${TEST_BASE}/home"
export XDG_CONFIG_HOME="${TEST_BASE}/config"

# 2. Execute
# **CRITICAL**: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.
cd $(git rev-parse --show-toplevel)

npm run project:create -- \
  --name "Global Only Project" \
  --code "GLOB" \
  --path "${PROJECT_PATH}" \
  --global-only \
  --description "Test project in global-only mode"

# 3. Verify
echo "Exit code: $?"
echo "Global registry:"
cat "${CONFIG_DIR}/projects/project-global.toml"
echo "Local config (should NOT exist):"
ls -la "${PROJECT_PATH}/.mdt-config.toml" 2>&1 || echo "Correctly not created"

# 4. Test retrieval
npm run project:get -- GLOB

# 5. Cleanup
rm -rf "${TEST_BASE}"
```

### Example: Running CV01 (Invalid Project Codes)

```bash
#!/bin/bash
# Test CV01: Invalid project codes

# Test multiple invalid codes
INVALID_CODES=("A" "TOOLONG" "low" "INV-1" "123")

for code in "${INVALID_CODES[@]}"; do
    TEST_ID="CV01-${code}-$(date +%s%N | tail -c 10)"
    TEST_BASE="/tmp/mdt-cli-tests-${TEST_ID}"

    mkdir -p "${TEST_BASE}/config/projects"
    mkdir -p "${TEST_BASE}/projects"

    cat > "${TEST_BASE}/config/config.toml" << EOF
[discovery]
autoDiscover = true
searchPaths = ["${TEST_BASE}/projects"]
maxDepth = 2
EOF

    export CONFIG_DIR="${TEST_BASE}/config"

    # **CRITICAL**: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.
    cd $(git rev-parse --show-toplevel)

    # Try to create project with invalid code
    if npm run project:create -- \
      --name "Invalid Code Test" \
      --code "$code" \
      --path "${TEST_BASE}/projects/test" \
      --global-only 2>&1 | grep -q "error"; then
        echo "✓ Code '$code' correctly rejected"
    else
        echo "✗ Code '$code' was incorrectly accepted"
        rm -rf "${TEST_BASE}"
        exit 1
    fi

    rm -rf "${TEST_BASE}"
done

echo "All invalid codes correctly rejected"
```

## Important Notes

1. **Always use isolated environments** - Never use the user's actual configuration
2. **Use compiled commands** - Use `npm run project:create` not `:dev` versions
3. **Work in MDT-077 directory** - Not the parent markdown-ticket directory
4. **Create project directories first** - Global-only mode requires existing directories
5. **Verify expected vs actual** - Compare results with expectations from test-suite.md
6. **Clean up on success** - Preserve artifacts only on failure for debugging

## Troubleshooting

### Common Issues

1. **Module resolution errors**: Ensure you're using compiled commands (not `:dev`)
2. **Permission errors**: Check that TEST_BASE is in a writable location
3. **Command not found**: Verify you're in the correct directory
4. **Validation failures**: Check that project codes match the expected format

### Debug Mode

For debugging, add these exports:
```bash
export MDT_DEBUG_TEST=true
export MDT_TEST_MODE=true
```

This will provide verbose output during test execution.
