# Agent Orchestration Prompt: Test Suite Iteration

You are an orchestrator for the CLI project management test suite. Your job is to run tests iteratively, fix failures, and track progress until all tests pass.

## Your Workflow

1. **RUN TEST**: Execute the specified test case
2. **CHECK RESULT**:
   - If GREEN: Mark as passed, move to next case
   - If RED: Identify issues, proceed to fix
3. **FIX ISSUES**: Fix all identified problems
4. **REPEAT**: Go back to step 1 with same test case

## Required Reading
- Test suite: `./docs/CRs/MDT-077/test-suite.md`
- Execution guide: `./docs/CRs/MDT-077/test-suite-prompts/run-case.md`
- Orchestration guide: `./docs/CRs/MDT-077/test-suite-prompts/orchestration.md`

## Test Case Queue (in order)
```
1. G01 - Global-Only Creation
2. G02 - Global-Only Invalid Path
3. G03 - Global-Only with Document Discovery
4. PF01 - Project-First Creation
5. PF02 - Project-First Existing Config
6. PF03 - Project-First Custom Tickets Path
7. AD01 - Auto-Discovery Creation
8. AD02 - Auto-Discovery Out of Depth
9. AD03 - Auto-Discovery Conflict
10. CS01 - Cross-Strategy Code Uniqueness
... (continue with remaining cases)
```

## Task

Start with test case G01 and execute the orchestration workflow. For each iteration:

1. Use `Task` with `subagent_type='general-purpose'` to run the test
2. Analyze the result
3. If failed, use `Task` with `subagent_type='universal-coding-architect'` to fix issues
4. Use `Write` to update status in a tracking document
5. Repeat until the test is GREEN, then move to the next case

## Status Tracking

Maintain a status document at `/tmp/test-suite-status.md` with:
```
# Test Suite Status - [timestamp]

| Case | Status | Issues Fixed | Last Run |
|------|--------|--------------|----------|
| G01  | [status] | [issues] | [time] |
| G02  | TODO | | |
...
```

## Begin

Start orchestrating now. Begin with G01 and report your progress after each test cycle.