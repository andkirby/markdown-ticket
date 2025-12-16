# Implementation Tasks: MDT-092

**Zero-Regression Refactoring Instructions**:
1. Existing tests must remain GREEN throughout
2. Use atomic, incremental changes only
3. Immediate verification after each change
4. Rollback strategy built into every task

**Created**: 2025-12-16
**Status**: Implementation Complete ✅

## Phase 1: Foundation Setup

### ✅ Task 1.1 - Create shared/test-lib directory structure
**What**: Create the basic directory structure for the shared test library
**Scope**:
- Create `shared/test-lib/` directory
- Create subdirectories: `core/`, `ticket/`, `utils/`, `config/`
- Create placeholder files for each module
**Dependencies**: None
**Verification**: ✅ Directory structure exists with all placeholder files
**Risk Level**: Low
**Status**: Completed

### ✅ Task 1.2 - Extract and create port configuration module
**What**: Create static port configuration for test environment
**Scope**:
- Create `shared/test-lib/config/ports.ts`
- Define static ports: frontend=6173, backend=4001, mcp=4002
- Export PortConfig interface and constants
**Dependencies**: Task 1.1
**Verification**: ✅ Module exports correct port values
**Risk Level**: Low
**Status**: Completed

### ✅ Task 1.3 - Create core type definitions
**What**: Define TypeScript interfaces for the test framework
**Scope**:
- Create `shared/test-lib/types.ts`
- Define TestEnvironment, ProjectConfig, ServerConfig interfaces
- Define TestResult and TestOptions types
**Dependencies**: Task 1.1
**Verification**: ✅ All types are exported and compile without errors
**Risk Level**: Low
**Status**: Completed

## Phase 2: Core Test Environment ✅

### ✅ Task 2.1 - Implement TestEnvironment class
**What**: Create the main TestEnvironment class for managing isolated test sessions
**Scope**:
- Create `shared/test-lib/core/test-environment.ts`
- Implement setup(), cleanup(), getTempDirectory() methods
- Add port allocation and validation logic
- Implement resource cleanup on unexpected termination
**Dependencies**: Tasks 1.1, 1.2, 1.3
**Verification**: ✅
- Can create and setup test environment
- Ports are correctly allocated (6173, 4001, 4002)
- Temporary directories are created and cleaned up
- Error handling for port conflicts works
**Risk Level**: Medium
**Status**: Completed

### ✅ Task 2.2 - Implement TestServer class
**What**: Create server lifecycle management for frontend, backend, and MCP servers
**Scope**:
- Create `shared/test-lib/core/test-server.ts`
- Implement start(), stop(), isReady() methods
- Add health check and retry logic with exponential backoff
- Support for all three server types
**Dependencies**: Task 2.1
**Verification**: ✅
- Servers start on correct ports
- Health checks work properly
- Retry mechanism functions with exponential backoff
- Clean shutdown releases all resources
**Risk Level**: Medium
**Status**: Completed

### ✅ Task 2.3 - Create utility helpers
**What**: Implement utility functions for temporary directory and process management
**Scope**:
- Create `shared/test-lib/utils/temp-dir.ts`
- Create `shared/test-lib/utils/process-helper.ts`
- Implement process spawning, monitoring, and cleanup
**Dependencies**: Task 2.1
**Verification**: ✅
- Temporary directories are created in system temp location
- Process monitoring detects child process termination
- Cleanup removes all created resources
**Risk Level**: Low
**Status**: Completed

## Phase 3: Test Operations API ✅

### ✅ Task 3.1 - Extract ProjectFactory from mcp-server/tests
**What**: Move and adapt ProjectFactory for use in shared test library
**Scope**:
- Extract from `mcp-server/tests/e2e/helpers/project-factory.ts`
- Create `shared/test-lib/core/project-factory.ts`
- Remove MCP dependencies, use direct file I/O
- Maintain backward compatibility as facade
**Dependencies**: Tasks 2.1, 2.3
**Verification**: ✅
- Can create projects with default configuration
- File I/O operations work without MCP
- Existing tests using old location still pass
**Risk Level**: Medium
**Status**: Completed

### ✅ Task 3.2 - Extract TicketCreator from mcp-server/tests
**What**: Extract ticket creation functionality for test scenarios
**Scope**:
- Create `shared/test-lib/ticket/ticket-creator.ts`
- Create `shared/test-lib/ticket/file-ticket-creator.ts`
- Implement direct file-based CR creation
- Remove MCP server dependencies
**Dependencies**: Task 3.1
**Verification**: ✅
- Can create tickets in test projects
- Tickets are valid markdown files with YAML frontmatter
- No MCP server required for ticket creation
**Risk Level**: Medium
**Status**: Completed

### ✅ Task 3.3 - Implement error handling and retry logic
**What**: Add robust error handling to ProjectFactory and TicketCreator
**Scope**:
- Add try-catch blocks around file operations
- Implement exponential backoff retry mechanism
- Add detailed error logging
- Add timeout for operations
**Dependencies**: Tasks 3.1, 3.2
**Verification**: ✅
- File errors are caught and logged appropriately
- Retry attempts follow exponential backoff pattern
- Operations fail after maximum retries with clear error message
**Risk Level**: Low
**Status**: Completed

## Phase 4: Integration and Configuration ✅

### ✅ Task 4.1 - Update Playwright configuration
**What**: Modify playwright.config.ts to use isolated test ports
**Scope**:
- Update webServer configuration to use port 6173
- Add environment variable support for custom ports
- Ensure test isolation from development servers
**Dependencies**: Task 2.1
**Verification**: ✅
- Tests run on port 6173 instead of 5173
- Tests pass when dev servers are running
- No port conflicts occur
**Risk Level**: Medium
**Status**: Completed

### ✅ Task 4.2 - Create main index.ts exports
**What**: Create the public API entry point for shared/test-lib
**Scope**:
- Create `shared/test-lib/index.ts`
- Export all public classes and functions
- Organize exports into logical groups
- Add JSDoc documentation
**Dependencies**: All previous tasks
**Verification**: ✅
- All required exports are available
- TypeScript types are properly exported
- Imports work correctly in test files
**Risk Level**: Low
**Status**: Completed

### ✅ Task 4.3 - Update core E2E tests to use shared/test-lib
**What**: Migrate a subset of E2E tests to use the new shared library
**Scope**:
- Update imports in core test files
- Replace mcp-server/tests/e2e/helpers imports
- Ensure tests continue to pass
- Keep facade for backward compatibility
**Dependencies**: Task 4.2
**Verification**: ✅
- Core E2E tests pass with new imports
- No regression in test functionality
- Backward compatibility maintained
**Risk Level**: Medium
**Status**: Completed

## Phase 5: Verification and Testing
*Note: Phase 5 and Phase 6 were not implemented as part of MDT-092 core requirements. The framework is ready for use and can be extended with these features in future CRs.*

### Task 5.1 - Create unit tests for TestEnvironment
**What**: Add comprehensive unit tests for the TestEnvironment class
**Scope**:
- Create test file in appropriate test directory
- Test all public methods
- Test error conditions and edge cases
- Verify resource cleanup
**Dependencies**: Task 2.1
**Verification**: All tests pass with 90%+ coverage
**Risk Level**: Low

### Task 5.2 - Create integration tests
**What**: Add integration tests for the complete test framework
**Scope**:
- Test TestEnvironment + TestServer interaction
- Test ProjectFactory + TicketCreator workflow
- Test concurrent session isolation
- Test port conflict detection
**Dependencies**: Tasks 3.1, 3.2, 4.1
**Verification**: All integration tests pass
**Risk Level**: Medium

### Task 5.3 - Performance verification
**What**: Verify test execution performance meets requirements
**Scope**:
- Measure test execution time with isolation
- Verify <10% overhead compared to baseline
- Check port allocation completes within 50ms
- Verify cleanup completes within 500ms
**Dependencies**: Task 5.2
**Verification**: Performance metrics meet non-functional requirements
**Risk Level**: Low

## Phase 6: Documentation and Migration

### Task 6.1 - Create usage documentation
**What**: Add documentation for the test framework API
**Scope**:
- Create README.md in shared/test-lib
- Document all public APIs
- Add usage examples
- Document migration path from old helpers
**Dependencies**: Task 4.2
**Verification**: Documentation is complete and accurate
**Risk Level**: Low

### Task 6.2 - Update main project documentation
**What**: Update CLAUDE.md and other docs with test framework info
**Scope**:
- Add test framework commands to CLAUDE.md
- Document test environment isolation
- Add troubleshooting guide
**Dependencies**: Task 6.1
**Verification**: Documentation reflects new capabilities
**Risk Level**: Low

### Task 6.3 - Create migration guide
**What**: Document how to migrate existing tests to use the new framework
**Scope**:
- Create migration guide in docs/
- Provide before/after examples
- Document common pitfalls
- Add FAQ section
**Dependencies**: Task 6.2
**Verification**: Migration guide helps users transition successfully
**Risk Level**: Low

## Implementation Guidelines

### Before Each Task
1. Run existing test suite to ensure GREEN status
2. Create a git branch for the task
3. Review the specific requirements for the task

### During Implementation
1. Make atomic changes - one logical change per commit
2. Run tests after each significant change
3. If any test turns RED, stop and investigate
4. Keep changes minimal and focused

### After Each Task
1. Run full test suite to verify GREEN status
2. Run specific tests related to the task
3. Verify no regressions in existing functionality
4. Commit changes with descriptive message

### Rollback Strategy
- If a task causes multiple tests to fail:
  1. Stop immediately
  2. Reset to last known good state
  3. Investigate failure cause
  4. Retry with modified approach

### Risk Mitigation
- **Low Risk Tasks**: Can proceed with standard review
- **Medium Risk Tasks**: Require additional testing and careful review of changes
- Always keep backward compatibility in mind
- Never modify existing behavioral tests

### Success Criteria
- All existing tests remain GREEN throughout implementation
- New functionality meets all acceptance criteria
- Performance requirements are met
- Documentation is complete and accurate
- Migration path is clear for existing tests