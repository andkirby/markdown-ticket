# Test Suite Orchestration Guide

**CR**: MDT-077
**Purpose**: Orchestrate iterative test execution and fixing
**Created**: 2025-12-18

## Overview

This document provides an orchestration pattern for running test cases iteratively: execute a test, identify failures, fix issues, and re-test until the test passes (GREEN), then move to the next test case.

## Orchestration Flow

```
┌─────────────────┐
│ 1. Select Case  │
└─────────┬───────┘
          ▼
┌─────────────────┐
│ 2. Run Test      │◄─────────────────────┐
└─────────┬───────┘                     │
          │ GREEN?                       │
          ▼                             │ NO
┌─────────────────┐                     │
│ 3. Mark Green   │                     │
│    & Next Case  │                     │
└─────────┬───────┘                     │
          │                             │
          ▼                             ▼
     ┌────────────┐              ┌────────────┐
     │    END     │              │ 4. Fix     │
     └────────────┘              │    Issues  │
                                  └─────┬──────┘
                                        │
                                        ▼
                                   (Go to Step 2)
```

## Implementation Pattern

### Step 1: Initialize Test Tracking

Create a test status tracker:
```markdown
## Test Case Status

| Case | Status | Last Run | Issues Fixed | Notes |
|------|--------|----------|--------------|-------|
| G01  | ❌ RED  |          |              |       |
| G02  | ⏳ TODO |          |              |       |
| G03  | ⏳ TODO |          |              |       |
| PF01 | ⏳ TODO |          |              |       |
| ...  | ...    | ...      | ...          | ...   |
```

### Step 2: Run Test Case

Use the general-purpose agent to execute a test:

```bash
# Agent task to run test case
Task with subagent_type='general-purpose' and prompt:

"Execute test case [CASE_ID] from the CLI project management test suite.

Instructions:
1. Read test suite: ./docs/CRs/MDT-077/test-suite.md
2. Read execution guide: ./docs/CRs/MDT-077/test-suite-prompts/run-case.md
3. Execute test case [CASE_ID] in isolation
4. Report detailed results:
   - Exit codes
   - Expected vs actual outcomes
   - Any errors or deviations
   - Test status: GREEN (passed) or RED (failed)
"
```

### Step 3: Check Test Result

Based on agent output:
- **GREEN**: Mark as passed, move to next case
- **RED**: Proceed to step 4

### Step 4: Fix Issues

Use the universal-coding-architect agent to fix identified issues:

```bash
# Agent task to fix issues
Task with subagent_type='universal-coding-architect' and prompt:

"Fix the failing test case [CASE_ID] for the CLI project management tool.

## Test Failure Details
[Copy the failure details from the test run agent]

## Issues to Fix
[List specific issues that need to be addressed]

## Context
- The test suite is at: ./docs/CRs/MDT-077/test-suite.md
- The specific test case [CASE_ID] expects: [summarize expectations]
- Current behavior: [describe what's happening]

## Requirements
1. Analyze the root cause of failures
2. Implement fixes in the TypeScript code
3. Ensure fixes don't break other functionality
4. Test the fix in isolation before reporting back
5. Rebuild the shared code after changes: `npm run build:shared`

## Expected Outcome
The test case [CASE_ID] should pass when re-executed with all expectations met."
```

### Step 5: Update Status

After fixing, update the test status:
- Add fixed issues to the tracker
- Set status to "FIXED - PENDING RETEST"

### Step 6: Repeat

Go back to Step 2 with the same test case ID.

## Automation Script Template

```bash
#!/bin/bash
# orchestrate-tests.sh

# Test case list in order
TEST_CASES=(
    "G01"
    "G02"
    "G03"
    "PF01"
    "PF02"
    "PF03"
    "AD01"
    "AD02"
    "AD03"
    "CS01"
    "CS02"
    "CV01"
    "CV02"
    "ER01"
    "ER02"
)

# Status file
STATUS_FILE="/tmp/test-status-$(date +%s).md"

# Initialize status
cat > "$STATUS_FILE" << EOF
# Test Status - $(date)

| Case | Status | Issues Fixed | Notes |
|------|--------|--------------|-------|
EOF

# Function to run test case
run_test_case() {
    local case_id="$1"
    echo "Running test case: $case_id"

    # Launch test agent
    # [Implementation would use Claude Code's Task tool]

    # Check result and return status
}

# Function to fix issues
fix_test_case() {
    local case_id="$1"
    local issues="$2"
    echo "Fixing test case: $case_id"
    echo "Issues: $issues"

    # Launch fix agent
    # [Implementation would use Claude Code's Task tool]
}

# Main loop
for case in "${TEST_CASES[@]}"; do
    echo "================================"
    echo "Processing test case: $case"
    echo "================================"

    while true; do
        # Run the test
        result=$(run_test_case "$case")

        if [[ "$result" == "GREEN" ]]; then
            echo "✅ $case PASSED"
            # Update status to GREEN
            echo "| $case | ✅ GREEN | | |" >> "$STATUS_FILE"
            break
        else
            echo "❌ $case FAILED"
            # Extract issues from result
            issues=$(echo "$result" | grep -o "Issues: .*" | cut -d' ' -f2-)

            # Fix the issues
            fix_test_case "$case" "$issues"

            # Update status to PENDING RETEST
            echo "| $case | 🔧 FIXED - PENDING RETEST | $issues | |" >> "$STATUS_FILE"

            # Loop to re-test
            continue
        fi
    done
done

echo "================================"
echo "All test cases completed!"
echo "Status saved to: $STATUS_FILE"
echo "================================"
```

## Best Practices

### 1. Test Isolation
- Each test run must use a unique temporary directory
- Never share state between test runs
- Clean up artifacts on success

### 2. Issue Tracking
- Document every fix applied
- Note which files were modified
- Keep track of fix attempts

### 3. Incremental Progress
- Fix one issue at a time when possible
- Test after each fix
- Don't move to next case until current is GREEN

### 4. Communication
- Clearly document test expectations
- Provide detailed failure information
- Explain fix rationale

## Example Orchestration Session

```
ORCHESTRATOR: Running test case G01...

[AGENT: TEST EXECUTOR]
Executing G01: Create project with global-only strategy
- Exit code: 0
- Global registry: Contains minimal data only
- Local config: Correctly not created
- Project retrieval: FAILED - Cannot retrieve by code
- Status: RED

ORCHESTRATOR: Test G01 failed. Launching fix agent...

[AGENT: CODE FIXER]
Analyzing G01 failure...
Issues:
1. Global registry stores minimal data instead of full project details
2. Project cannot be retrieved by code

Fixing:
- Updated ProjectConfigService.ts to store full details in global-only mode
- Modified ProjectManager.ts to handle project lookup
- Rebuilt shared code

Status: Fixed - ready for retest

ORCHESTRATOR: Re-running test case G01...

[AGENT: TEST EXECUTOR]
Re-executing G01...
- Exit code: 0
- Global registry: Contains full project details ✅
- Local config: Correctly not created ✅
- Project retrieval: SUCCESS ✅
- Status: GREEN

ORCHESTRATOR: Test G01 PASSED! Moving to G02...

[Continues with next test case...]
```

## Tool Integration

When using Claude Code:
1. Use `Task` tool to launch test execution agents
2. Use `Task` tool to launch code fixing agents
3. Use `Write` tool to update status documents
4. Use `Read` tool to check previous results
5. Repeat until all tests are GREEN

This orchestration ensures systematic, iterative improvement of the CLI project management tool.
