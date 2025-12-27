---
code: MDT-104
status: Proposed
dateCreated: 2025-12-25T12:41:13.021Z
type: Documentation
priority: Medium
---

# Add comprehensive integration tests for shared/test-lib

## 1. Description

### Problem
- `shared/test-lib` provides core testing infrastructure (TestEnvironment, TestServer, ProjectFactory, utilities) but lacks integration test coverage
- Existing test `tests/e2e/test-lib-basic.spec.ts` only validates imports and basic operations
- No tests verify server lifecycle (start/stop/health checks), process management, retry logic, port validation, or error paths
- Changes to test-lib infrastructure could break downstream tests without detection

### Affected Areas
- `shared/test-lib/core/test-server.ts` - Server lifecycle management
- `shared/test-lib/utils/process-helper.ts` - Process spawning and cleanup
- `shared/test-lib/utils/retry-helper.ts` - Retry logic with exponential backoff
- `shared/test-lib/config/ports.ts` - Port configuration and validation
- `shared/test-lib/core/project-factory.ts` - Project and CR creation

### Scope
- **In scope**: Integration tests for all exported test-lib modules, error path testing, server lifecycle testing
- **Out of scope**: Unit tests (deferred to separate task), tests for non-exported internal functions

## 2. Desired Outcome

### Success Conditions
- All test-lib modules have integration test coverage verifying their public APIs
- Server lifecycle tests verify start/stop/health check behavior with actual server processes
- Process management tests verify cross-platform spawn/kill/timeout behavior
- Retry logic tests verify exponential backoff and error handling
- Port configuration tests validate edge cases and error conditions
- Test suite runs in isolated environment without conflicts

### Constraints
- Tests must use isolated ports (6173/4001/4002) to avoid dev server conflicts
- Tests must clean up processes and temp directories even on failure
- Tests must run cross-platform (macOS, Linux, Windows)
- Tests should not require external dependencies beyond existing playwright/framework

### Non-Goals
- Not adding unit tests for internal helper functions
- Not changing test-lib API or behavior
- Not adding new test-lib capabilities

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Test organization | Single test file or split by module? | Must use existing tests/e2e directory structure |
| Server testing | Test against real servers or mock? | Must verify actual process spawning/health checks |
| Port conflicts | How to test port-in-use scenarios? | Must not interfere with dev servers |
| Cross-platform | How to verify Windows compatibility? | CI environment may be Unix-only |

### Known Constraints
- Must follow existing Playwright test patterns in `tests/e2e/`
- Must use `@mdt/shared/test-lib` imports (test the library, not re-implement)
- Must not require changes to test-lib source code

### Decisions Deferred
- Specific test file structure (determined by test author)
- Mock vs. real server approach for specific test cases
- Windows CI testing approach

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] TestServer integration tests verify server start/stop lifecycle
- [ ] ProcessHelper tests verify spawn/kill/timeout across platforms
- [ ] RetryHelper tests verify exponential backoff and retry behavior
- [ ] Port configuration tests verify validation and edge cases
- [ ] ProjectFactory tests verify project/CR creation scenarios
- [ ] All tests pass in isolated environment
- [ ] Tests clean up resources (processes, temp dirs) on failure

### Non-Functional
- [ ] Test execution completes in < 2 minutes total
- [ ] No port conflicts with development servers
- [ ] Tests produce actionable failure messages

### Edge Cases
- Server fails to start (port in use, command not found)
- Process timeout during spawn
- Retry limit exhausted
- Temp directory creation fails
- Cleanup interrupted by crash

## 5. Verification

### How to Verify Success
- Manual verification: Run test suite with `npm run test:e2e` targeting test-lib tests
- Automated verification: CI runs new tests as part of E2E test suite
- Coverage verification: All exported test-lib modules referenced in at least one test
- Isolation verification: Tests run concurrently with dev servers without conflicts