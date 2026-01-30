# Isolated Test Environment for CLI Project Management

**CR**: MDT-077
**Purpose**: Guidelines for using isolated environments when testing CLI project management
**Created**: 2025-12-18

## Overview

To ensure reliable, repeatable testing of CLI project management commands, all tests should be executed in isolated environments. This prevents interference with:
- User's actual project configurations
- Global registry in user's home directory
- Existing projects and configurations
- Environment variables and system state

## Isolation Strategy

### 1. Temporary Directory Structure

All tests must use a dedicated temporary directory structure:

```bash
TEST_BASE="/tmp/mdt-cli-tests-${RANDOM}"
```

The complete structure:
```
/tmp/mdt-cli-tests-${RANDOM}/
├── config/                       # Isolated global configuration
│   ├── config.toml              # Global discovery settings
│   └── projects/                # Simulated global registry
│       ├── project-a.toml
│       └── project-b.toml
└── projects/                    # Test projects workspace
    ├── within-depth/
    │   ├── project-a/
    │   └── project-b/
    └── out-of-depth/
        └── level1/
            └── level2/
                └── project-c/
```

### 2. Environment Variables

Tests MUST set these environment variables to ensure isolation:

```bash
export CONFIG_DIR="${TEST_BASE}/config"          # Override global config location
export HOME="${TEST_BASE}/home"                   # Override user home directory
export XDG_CONFIG_HOME="${TEST_BASE}/config"     # For XDG-compliant systems
export MDT_NO_GLOBAL_CACHE="true"                 # Disable any global caching
```

### 3. Command Execution Patterns

#### Isolated Command Wrapper
```bash
# Define a wrapper for all CLI commands
run_isolated() {
    local cmd="$1"
    local test_id="${2:-$(date +%s)}"
    local test_base="/tmp/mdt-cli-tests-${test_id}"

    # Create isolated environment
    mkdir -p "${test_base}/config/projects"
    mkdir -p "${test_base}/projects"

    # Set up isolated global config
    cat > "${test_base}/config/config.toml" << 'EOF'
[discovery]
autoDiscover = true
searchPaths = ["${test_base}/projects"]
maxDepth = 2
EOF

    # Execute command in isolation
    (
        export CONFIG_DIR="${test_base}/config"
        export HOME="${test_base}/home"
        cd /path/to/project/root
        eval "$cmd"
    )

    # Cleanup on success (optional)
    # rm -rf "${test_base}"
}

# Usage
run_isolated "npm run project:create -- --name 'Test Project' --code 'TEST' --path '${test_base}/projects/test'"
```

#### Test Function Pattern
```bash
test_scenario() {
    local test_name="$1"
    local command="$2"
    local expected_exit="${3:-0}"

    echo "Running: $test_name"

    # Create unique test environment
    local test_id="test-$(date +%s%N | tail -c 10)"
    local test_base="/tmp/mdt-cli-tests-${test_id}"

    # Setup
    mkdir -p "${test_base}/config/projects"
    export CONFIG_DIR="${test_base}/config"

    # Execute
    if eval "$command" >/dev/null 2>&1; then
        actual_exit=$?
    else
        actual_exit=$?
    fi

    # Verify
    if [ $actual_exit -eq $expected_exit ]; then
        echo "✓ PASS: $test_name"
    else
        echo "✗ FAIL: $test_name (expected $expected_exit, got $actual_exit)"
        # Keep environment for debugging
        echo "Test artifacts preserved at: ${test_base}"
        return 1
    fi

    # Cleanup
    rm -rf "${test_base}"
}
```

## Best Practices

### 1. Unique Test Identifiers
Always use unique identifiers for each test run:
- Use timestamp + random suffix
- Include test case name in directory
- Never hardcode paths like `/tmp/mdt-cli-tests` without randomization

### 2. Cleanup Strategy
- **On success**: Automatically clean up test environment
- **On failure**: Preserve environment for debugging
- **Always**: Log the location of test artifacts

### 3. State Management
- Each test should assume a clean environment
- Never rely on state from previous tests
- Create all necessary directories and files within the test environment

### 4. Path Resolution
- Use absolute paths for all test operations
- Never rely on relative paths that might resolve outside the test environment
- Include test base directory in all file operations

## Subagent Integration

When using subagents (e.g., universal-coding-architect), provide these instructions:

### Agent Prompt Template
```
You are working on fixing issues in a CLI project management tool.

## Testing Requirements
All fixes must be tested in an isolated environment. Use this pattern:

1. **CRITICAL**: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.

2. Create a unique test directory:
   ```bash
   TEST_BASE="/tmp/mdt-cli-tests-$(date +%s%N | tail -c 10)"
   mkdir -p "${TEST_BASE}/config/projects"
   mkdir -p "${TEST_BASE}/projects"
   ```

3. Set up isolated environment variables:
   ```bash
   export CONFIG_DIR="${TEST_BASE}/config"
   export HOME="${TEST_BASE}/home"
   export XDG_CONFIG_HOME="${TEST_BASE}/config"
   ```

4. Create test global config:
   ```bash
   cat > "${TEST_BASE}/config/config.toml" << EOF
[discovery]
autoDiscover = true
searchPaths = ["${TEST_BASE}/projects"]
maxDepth = 2
EOF
   ```

5. **IMPORTANT**: Use compiled commands, not dev versions:
   ```bash
   # Use this (compiled version):
   npm run project:create -- ...

   # NOT this (dev version has module resolution issues):
   npm run project:create:dev -- ...
   ```

6. Execute all test commands within this isolated environment.

## Current Issue
[Describe the specific issue to fix]

## Test Case
[Provide the exact test case to run, using the isolated environment pattern]
```

### Agent Task Pattern
```typescript
const agentTask = `
Fix the [specific issue] in the CLI project management tool.

After implementing your fix, test it in an isolated environment:

1. Create test environment:
   TEST_BASE="/tmp/mdt-cli-tests-$(date +%s%N | tail -c 10)"
   mkdir -p "$TEST_BASE/config/projects"

2. Set isolation variables:
   export CONFIG_DIR="$TEST_BASE/config"
   export HOME="$TEST_BASE/home"

3. Create global config:
   cat > "$TEST_BASE/config/config.toml" << 'EOF'
[discovery]
autoDiscover = true
searchPaths = ["$TEST_BASE/projects"]
maxDepth = 2
EOF

4. Test the fix with:
   [specific test commands]

5. Verify the results match expected behavior.
`;
```

## Example: Complete Isolated Test

```bash
#!/bin/bash
# test-global-only-mode.sh

set -e

# Create unique test environment
TEST_ID="global-only-$(date +%s%N | tail -c 10)"
TEST_BASE="/tmp/mdt-cli-tests-${TEST_ID}"
PROJECT_PATH="${TEST_BASE}/projects/test-project"

# Setup
echo "Setting up test environment: ${TEST_BASE}"
mkdir -p "${TEST_BASE}/config/projects"
mkdir -p "${PROJECT_PATH}"

# Global config
cat > "${TEST_BASE}/config/config.toml" << EOF
[discovery]
autoDiscover = true
searchPaths = ["${TEST_BASE}/projects"]
maxDepth = 2
EOF

# Isolate
export CONFIG_DIR="${TEST_BASE}/config"
export HOME="${TEST_BASE}/home"

# Test
cd /path/to/project/root
npm run project:create -- \
  --name "Test Project" \
  --code "TEST" \
  --path "${PROJECT_PATH}" \
  --global-only

# Verify
echo "=== Global Registry ==="
cat "${TEST_BASE}/config/projects/test-project.toml"

echo "=== Local Config (should NOT exist) ==="
if [ -f "${PROJECT_PATH}/.mdt-config.toml" ]; then
  echo "ERROR: Local config should not exist in global-only mode"
  exit 1
else
  echo "PASS: Local config correctly not created"
fi

# Cleanup
rm -rf "${TEST_BASE}"
echo "Test completed successfully!"
```

## Continuous Integration

When running tests in CI/CD:

1. Always use isolated environments
2. Set `MDT_TEST_MODE=true` to disable any interactive prompts
3. Use `MDT_DEBUG_TEST=true` for verbose output during debugging
4. Parallelize tests using unique test IDs

## Common Pitfalls

1. **Wrong directory**: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.
2. **Forgot to set CONFIG_DIR**: Commands use user's actual global config
3. **Using dev commands**: `npm run project:create:dev` has module resolution issues, use `npm run project:create`
4. **Hardcoded paths**: Tests fail when run in different environments
5. **Missing cleanup**: Accumulated test artifacts fill disk space
6. **Shared state**: Tests interfere with each other
7. **Permission issues**: Test directories created with wrong ownership
8. **Not creating project directory**: Global-only mode requires the project directory to exist first
