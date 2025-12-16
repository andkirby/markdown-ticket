---
code: MDT-092
status: Proposed
dateCreated: 2025-12-15T21:48:50.978Z
type: Architecture
priority: Medium
---

# Define isolated test environment with custom ports

## 1. Description

### Problem
- Current test environment cannot run concurrently with development servers due to port conflicts
- Tests fail when development servers are running on default ports (5173, 3001, 3002)- No isolated environment for continuous integration or automated testing pipelines
- Cannot guarantee clean test state due to potential interference from running services

### Affected Areas
- Tests: All test files requiring isolated execution environment
- Backend services: Services that need to be testable in isolation
- Frontend components: Components requiring test server isolation
- MCP server: Server requiring test port isolation

### Scope
- **In scope**: Creating isolated test environments that can run alongside development
- **Out of scope**: Modifying production deployment configurations

## 2. Desired Outcome

### Success Conditions
- Tests can run successfully while development servers are active
- Each test execution gets a clean, isolated environment
- No port conflicts between test and development environments
- Test results are reproducible regardless of external services

### API Requirements
The framework must provide simple APIs for:
- **Project creation**: Programmatic creation of new projects with default configuration
- **Test environment setup**: Automated setup of isolated test environments with allocated ports
- **Ticket creation**: API for creating test tickets/CRs within isolated environments

### Constraints
- Must not require developers to stop their development servers to run tests
- Must maintain compatibility with existing test frameworks (Playwright, Jest)
- Must support all three main components (frontend, backend, MCP server)
- Cannot require significant changes to existing test code
- Must provide simple, programmatic APIs for common testing operations

### Non-Goals
- Not changing the way tests are written or structured
- Not modifying production server configurations

## Architecture Design

> **Extracted**: Complex architecture — see [architecture.md](./MDT-092/architecture.md)

**Summary**:
- Pattern: Static Port Isolation
- Components: 4 (TestEnvironment, ProjectFactory, TestServer, TicketCreator)
- Key constraint: Static ports (6173, 4001, 4002) to avoid dev server conflicts

**Extension Rule**: To add test helpers, create file in appropriate `@mdt/test-lib/` subdirectory (limit 300 lines).

**Key Design Decisions**:
1. **Static ports (6173, 4001, 4002)** - Simplest solution avoiding port conflicts with development servers
2. **File-based ticket creation** - Direct file I/O instead of MCP calls for better performance and simplicity
3. **Extract to shared/test-lib** - Reusable framework that can be used across all test suites
4. **No dynamic port allocation** - Eliminates complexity and race conditions

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Technology | Which port allocation strategy to use? | Must support concurrent execution |
| Architecture | How to coordinate port allocation across components? | Must prevent race conditions |
| Integration | How to inject custom ports into existing test setup? | Must work with Playwright and Jest |
| Performance | What's the overhead of port allocation? | Should not significantly slow test execution |
| API Design | How to expose existing MCP test helpers as a clean API? | Must leverage existing TestEnvironment and ProjectFactory |
| Library Structure | Should we extract helpers/mcp-server/tests/e2e into @mdt/test-lib? | Must maintain compatibility with existing tests |

### Known Constraints
- Must use dynamic port allocation to avoid conflicts
- Must coordinate port allocation across frontend, backend, and MCP servers
- Must preserve existing test functionality and APIs
- Must leverage existing implementation in mcp-server/tests/e2e/helpers/

### Existing Implementation Assets
The following components already exist in mcp-server/tests/e2e/:
- **TestEnvironment** (helpers/test-environment.ts): Complete isolated test environment with temporary directories
- **ProjectFactory** (helpers/project-factory.ts): Full project and CR creation using MCP tools
- **MCPClient** (helpers/mcp-client.ts): Dual transport client (stdio/HTTP) with error handling
- **Supporting utilities**: Transport handlers, logging, simulation clients

### Decisions Deferred
- Implementation approach (determined by `/mdt:architecture`)
- Specific port allocation mechanism (determined by `/mdt:architecture`)
- Test framework integration details (determined by `/mdt:architecture`)
- Whether to extract existing helpers into @mdt/test-lib shared library

## 4. Implementation Specification

### New Artifacts
| File Path | Type | Purpose |
|-----------|------|---------|
| `shared/test-lib/index.ts` | Entry point | Main exports and public API |
| `shared/test-lib/types.ts` | Type definitions | TypeScript interfaces and types |
| `shared/test-lib/config/ports.ts` | Configuration | Static port definitions (6173, 4001, 4002) |
| `shared/test-lib/core/test-environment.ts` | Core feature | Environment isolation and setup |
| `shared/test-lib/core/test-server.ts` | Core feature | Server lifecycle management |
| `shared/test-lib/core/project-factory.ts` | Extracted | Test project creation (from mcp-server/tests) |
| `shared/test-lib/ticket/ticket-creator.ts` | Extracted | Ticket creation interface (from mcp-server/tests) |
| `shared/test-lib/ticket/file-ticket-creator.ts` | Extracted | Direct file ticket creation (from mcp-server/tests) |
| `shared/test-lib/utils/temp-dir.ts` | Utility | Temporary directory management |
| `shared/test-lib/utils/process-helper.ts` | Utility | Process management helpers |

### Modified Artifacts
| File Path | Changes | Purpose |
|-----------|---------|---------|
| `playwright.config.ts` | Update webServer ports | Use static ports (6173, 4001) for test isolation |
| `tests/e2e/*.spec.ts` (core tests only) | Update imports | Import from shared/test-lib instead of mcp-server/tests |
| `mcp-server/tests/e2e/helpers/project-factory.ts` | Keep as facade | Maintain backward compatibility during migration |

### Integration Points
| Component | Interface | Direction |
|-----------|-----------|----------|
| TestEnvironment → Node.js fs/os | File system operations | Uses |
| TestServer → Child Process | Process spawning | Uses |
| TicketCreator → MarkdownService | File I/O | Uses |
| ProjectFactory → TestEnvironment | Environment setup | Uses |
| Tests → shared/test-lib | Test framework API | Uses |

## 5. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Tests can run successfully while development servers are active on default ports
- [ ] Multiple test sessions can run concurrently without interfering with each other
- [ ] Test failures are not caused by port conflicts or external service interference
- [ ] Core E2E tests continue to pass without modification (using shared/test-lib)
- [ ] Port conflict detection works when dev servers running on ports 5173, 3001, 3002
- [ ] Clean state verification ensures temporary directories are isolated

> Full EARS requirements: [requirements.md](./MDT-092/requirements.md)

### Non-Functional
- [ ] Test execution time increases by less than 10% due to isolation overhead
- [ ] Port allocation completes within 100ms per test run
- [ ] System supports at least 5 concurrent test sessions

### Edge Cases
- What happens when all allocated ports are exhausted
- What happens when a test session fails to release ports
- What happens when system resources are constrained

## 6. Verification

### Test Scenarios
- [ ] Port conflict detection: Verify tests pass with dev servers running on default ports
- [ ] Clean state verification: Confirm temporary directories are properly isolated
- [ ] Concurrent execution: Run multiple test suites simultaneously (optional, if complexity allows)

### By Test Type
- **Unit tests**: Verify each component in isolation
- **Integration tests**: Verify TestEnvironment + TestServer interaction
- **E2E tests**: Verify full test workflow with new framework

### Metrics
- Test execution time with and without isolation framework
- Port allocation success rate
- Temporary directory cleanup verification

## 7. Deployment Plan

### Migration Strategy
1. Keep `mcp-server/tests/e2e/helpers/project-factory.ts` as facade for backward compatibility
2. Update core E2E test imports to use `shared/test-lib`
3. Update `playwright.config.ts` to use static ports (6173, 4001)
4. Gradually migrate remaining tests

### Rollback
- Revert imports to use mcp-server/tests helpers
- Restore original playwright.config.ts port configuration

## 8. Clarifications

### Session 2025-12-16
- Q: Which specific test files need to be updated to use the new isolated test environment? → A: Core E2E tests only
- Q: Where should the Playwright configuration be updated for the new static ports? → A: playwright.config.ts
- Q: What is the exact path for the shared test library package? → A: shared/test-lib/
- Q: For the test framework API, which file structure should we use? → A: index.ts + types.ts (recommended for TypeScript support)
- Q: What specific test scenarios should be used to verify the isolated environment works correctly? → A: Port conflict detection, Clean state verification
- Q: How should existing tests be migrated to the new framework? → A: Use mcp-server/tests/e2e/helpers/project-factory.ts as facade for backward compatibility

### How to Verify Success
- Manual verification: Run tests while development servers are active
- Automated verification: Automated test suite validates isolated execution
- Performance verification: Measure test execution time with and without isolation