I need to execute the complete CLI project management test suite using orchestration. We've already passed G01, so please
  run ALL remaining test cases systematically.

  Instructions:
  1. Read the orchestration guide at
  ./docs/CRs/MDT-077/test-suite-prompts/orchestration.md
  2. Read the orchestration prompt at
  ./docs/CRs/MDT-077/test-suite-prompts/orchestrate-prompt.md
  3. Check current status in test-suite.md (G01 is PASSED, 14 tests remain)

  Execute ALL remaining test cases in order:
  - G02 through G03 (Global-Only Mode)
  - PF01 through PF03 (Project-First Mode)
  - AD01 through AD03 (Auto-Discovery Mode)
  - CS01 through CS02 (Cross-Strategy Tests)
  - CV01 through CV02 (Configuration Validation)
  - ER01 through ER02 (Error Handling)

  For each test case:
  - Run in isolation
  - If failed → Fix issues → Re-test until GREEN
  - Mark as PASSED in test-suite.md
  - Continue to next case
  - Repeat until ALL tests are GREEN

  Context:
  - Working directory: Always work in current directory, check it with command `git rev-parse --show-toplevel` and remember location.
  - Project code validation fixed (allows numbers)
  - Global-only mode partially working (G01 passed)

  Goal: Complete the entire test suite - all 15 cases must be GREEN.

  Please orchestrate the full test suite execution and report final results.