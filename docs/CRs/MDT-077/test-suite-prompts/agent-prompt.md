# Agent Prompt: Run Test Case

You need to execute a specific test case from the CLI project management test suite. Follow these instructions precisely:

## Pre-conditions
1. Read the test suite at `./docs/CRs/MDT-077/test-suite.md`
2. Read the execution guide at `./docs/CRs/MDT-077/test-suite-prompts/run-case.md`

## Critical Requirements
- **DIRECTORY**: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.
- **ISOLATION**: Create unique test environment for each run
- **COMMANDS**: Use compiled versions (`npm run project:create`) not dev versions

## Isolation Pattern
```bash
TEST_ID="CASE-$(date +%s%N | tail -c 10)"
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
export HOME="${TEST_BASE}/home"
export XDG_CONFIG_HOME="${TEST_BASE}/config"
```

## Task
Execute test case [SPECIFY CASE HERE] with:
1. Proper environment setup
2. Command execution exactly as specified in test suite
3. Verification of all expected results
4. Cleanup on success, preserve artifacts on failure

## Expected Outcome
Report whether the test PASSED or FAILED with:
- Exit codes
- Actual vs expected results
- Any deviations from test suite specifications
- Location of preserved artifacts (if failed)

Run the test now and report results.