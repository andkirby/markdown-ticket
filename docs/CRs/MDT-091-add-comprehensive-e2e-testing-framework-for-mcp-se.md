---
code: MDT-091
status: Implemented
dateCreated: 2025-12-07T23:26:35.732Z
type: Feature Enhancement
priority: Medium
dependsOn:
blocks: MDT-090
relatedTickets: MDT-107
---

# Add comprehensive E2E testing framework for MCP server tools
## 1. Description
### Problem
The MCP server lacks comprehensive end-to-end (E2E) testing coverage. While basic unit tests exist in `mcp-server/src/tools/__tests__/basic.test.ts`, there are no integration tests that verify:
- MCP server behavior with actual markdown files
- Tool execution flows across multiple operations
- Error handling in real-world scenarios
- Performance under load
- Consistency between MCP and backend server behaviors

This lack of E2E tests makes it risky to perform major refactoring work (such as MDT-090) without a safety net to catch regressions.

### Affected Artifacts
- `mcp-server/src/tools/` (all MCP tools need E2E coverage)
- `mcp-server/src/tools/__tests__/` (existing basic tests)
- `tests/` directory structure (needs E2E test organization)
- CI/CD pipeline configuration for test automation

### Scope
- **Changes**: Add comprehensive E2E testing framework for MCP server
- **Unchanged**: Existing unit tests, MCP tool interfaces

### Blocks
- **MDT-090**: This CR blocks the refactoring work in MDT-090. The E2E tests must be implemented first to provide a safety net for the refactoring, ensuring we can verify that the refactoring doesn't break existing functionality.
- **MDT-097**: This CR enables the ProjectFactory refactoring work in MDT-097. The comprehensive E2E testing framework provides the safety net needed for the major refactoring of the ProjectFactory class, ensuring the refactoring maintains all existing functionality and behavior.
## 2. Decision

### Chosen Approach
Implement isolated E2E testing framework using temporary directories and custom CONFIG_DIR for project isolation.
### Rationale
- Enables testing all 10 MCP tools with realistic project structures and markdown files
- Provides test isolation using CONFIG_DIR environment variable to prevent interference with user projects
- Supports dual transport testing (stdio and HTTP) as specified in CLAUDE.md transport section
- Leverages existing configuration system's support for CONFIG_DIR (~/.config/markdown-ticket/) and custom scan paths
- Uses Jest as existing test runner to maintain consistency with current test infrastructure
## 3. Alternatives Considered
| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Temporary dirs + CONFIG_DIR | **ACCEPTED** - Complete isolation, realistic testing |
| Mock-based testing | Mock file system and services | Doesn't test actual file operations or configuration |
| Docker containers | Containerized test environment | Complex setup, slower execution, overkill for file-based tests |
| Integration with main app tests | Extend existing Playwright tests | Different stack (Node.js vs browser), would require substantial changes |
## Architecture Design

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Test Environment Factory + Transport Adapter
- Components: 5 (test suite + 4 helpers)
- Key constraint: Each helper module has strict size limits (150-200 lines)

**Extension Rule**: To add new MCP tool test, add case to test suite (within 400-line limit); to add new transport, extend mcpClient.ts (within 200-line limit).
## 4. Artifact Specifications

### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| `mcp-server/tests/e2e/mcp-tools.e2e.test.ts` | E2E Test Suite | Test all 10 MCP tools with positive/negative scenarios across 3 project types |
| `mcp-server/tests/e2e/helpers/testEnvironment.ts` | Test Helper | Setup temp dir per test file using mkdtemp + afterAll cleanup with CONFIG_DIR isolation |
| `mcp-server/tests/e2e/helpers/mcpClient.ts` | Test Helper | Full JSON-RPC interface: callTool(), listTools(), getToolSchema() with transport health checks |
| `mcp-server/tests/e2e/helpers/testDataFactory.ts` | Test Helper | Create 3 project types: Empty, Single CR, Multi-CR with dependencies |
| `mcp-server/tests/e2e/helpers/negativeTestScenarios.ts` | Test Helper | Invalid inputs, file system errors, transport error scenarios for Phase 1.2 |
| `mcp-server/jest.e2e.config.js` | Test Config | E2E-specific Jest configuration with 30s timeout |
| `mcp-server/scripts/test-setup.js` | Build Script | Prepare test environment and build artifacts |
### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/package.json` | Scripts added | Add test:e2e, test:e2e:watch, test:e2e:stdio, test:e2e:http |
| `mcp-server/tsconfig.json` | Paths added | Include e2e directory in TypeScript compilation |

### Integration Points
| From | To | Interface |
|------|----|-----------|
n| E2E Test Runner | MCP Server Process | JSON-RPC 2.0 over stdio/HTTP |
| Test Environment | Config Service | CONFIG_DIR environment variable (~/.config/markdown-ticket/) |
| Test Data Factory | Project Service | Temporary project creation with .mdt-config.toml |
| MCP Test Client | Transport Layer | Direct calls to stdio.ts and http.ts |
### Key Patterns
- Test Isolation: Each test in temporary directory with custom CONFIG_DIR
- Dual Transport Testing: Same test suite runs against both stdio and HTTP transports
- Factory Pattern: TestDataFactory creates reusable test project structures
- Client Wrapper: MCPTestClient abstracts transport-specific communication
- Config Path Override: Tests use CONFIG_DIR to point to isolated test registry (~/.config/markdown-ticket/test-registry/)
## 5. Acceptance Criteria
### Phase 1 Completion: ✅ IMPLEMENTED (2025-12-27)

**Status**: 221 tests passing, 1 skipped (99.5% complete)

### Functional
- [x] E2E tests cover all 10 MCP tools in mcp-server/src/tools/index.ts via stdio transport (Phase 1)
- [x] Test isolation via CONFIG_DIR prevents interference with user projects
- [x] Temporary test directories created and cleaned up for each test run
- [x] Test projects include realistic .mdt-config.toml and CR markdown files
- [x] Default CONFIG_DIR (~/.config/markdown-ticket/) respected in production tests
- [~] Phase 2: HTTP transport testing → **Extracted to MDT-107**

### Non-Functional
- [x] Phase 1: E2E test execution time < 60 seconds for stdio test suite
- [x] Test isolation ensures no cross-test state leakage
- [x] Phase 1: Tests pass with MCP_HTTP_ENABLED=false (stdio only)
- [x] Memory usage remains stable during test execution
- [~] Phase 2: Tests pass with both MCP_HTTP_ENABLED=true and false configurations → **Extracted to MDT-107**

### Testing
**Phase 1.1 - Positive Tests:** ✅ COMPLETE
- Unit: testEnvironment.ts mkdtemp creation and afterAll cleanup
- Unit: testDataFactory.ts creates 3 project types with correct .mdt-config.toml
- Integration: MCPTestClient callTool(), listTools(), getToolSchema() methods
- E2E: All 10 MCP tools with valid inputs across 3 project types
- Project: list_projects returns 2-3 projects, get_project_info validates real data

**Phase 1.2 - Negative Tests:** ✅ COMPLETE
- Invalid inputs: Missing required params, wrong project codes, non-existent CR keys
- File system errors: Permission denied, missing directories, corrupted YAML files
- Network/transport errors: Connection drops, timeout scenarios, malformed JSON-RPC

**Phase 2 - HTTP Transport:** 🔄 EXTRACTED TO MDT-107
- HTTP-specific: MCP_HTTP_ENABLED=true transport switching → See MDT-107
- Security: Authentication, rate limiting, CORS if Phase 2 features enabled → See MDT-107

### Known Limitations
- ⚠️ Per-tool rate limiting not implemented (1 test skipped) - global rate limiting works

### Post-Implementation Fixes
**2025-01-09**: Removed hardcoded `MCP_HTTP_ENABLED=false` from npm scripts (commit d4736ba originally added it for E2E tests). E2E test helpers already explicitly set this in their spawn() env, so the hardcoded value was unnecessary and broke Docker. Scripts now respect environment variables.
## 6. Verification
### By CR Type
- **Feature**: E2E test framework exists and all tests pass across both transports
- **Coverage**: All 10 MCP tools tested with minimum 3 scenarios each (happy path, error case, edge case)
- **Isolation**: Tests run successfully with CONFIG_DIR pointing to non-existent paths
## 7. Deployment
### Phase 1: Stdio Transport E2E Testing (Priority)
- Create mcp-server/tests/e2e/ directory structure
- Add jest.e2e.config.js with test timeout 30000ms
- Implement testEnvironment.ts with temporary directory management
- Create MCPTestClient for stdio transport only
- Implement basic E2E tests for all 10 tools via stdio

### Phase 2: HTTP Transport E2E Testing (After Phase 1 Success)
- Extend MCPTestClient to support HTTP transport
- Add HTTP-specific test scenarios (SSE, authentication, rate limiting)
- Implement Phase 2 security feature tests
- Add dual transport comparison tests

### Phase 3: Integration & CI/CD
- Update package.json with E2E test scripts for both phases
- Add TypeScript configuration for e2e directory
- Create test-setup.js for build preparation
- Configure CI pipeline to run Phase 1 tests first, Phase 2 on merge

```bash

### Session 2025-12-07

**Q1: Test Project Structures** → A: 3 project types: Empty, Single CR, Multi-CR with dependencies
- Applied to: New Artifacts - testDataFactory.ts purpose clarified

**Q2: Test Isolation Strategy** → A: Unique temp dir per test file with mkdtemp + cleanup in afterAll
- Applied to: New Artifacts - testEnvironment.ts implementation details

**Q3: MCP Client Interface** → A: Full JSON-RPC interface: callTool(), listTools(), getToolSchema()
- Applied to: New Artifacts - mcpClient.ts methods specified

**Q4: Negative Test Scenarios** → A: Invalid inputs & missing data, File system errors, Network & transport errors
- Applied to: Acceptance Criteria - Testing section with Phase 1.2 details

## 8. Clarifications

### Session 2025-12-07

**Q1: Test Project Structures** → A: 3 project types: Empty, Single CR, Multi-CR with dependencies
- Applied to: New Artifacts - testDataFactory.ts purpose clarified

**Q2: Test Isolation Strategy** → A: Unique temp dir per test file with mkdtemp + cleanup in afterAll
- Applied to: New Artifacts - testEnvironment.ts implementation details

**Q3: MCP Client Interface** → A: Full JSON-RPC interface: callTool(), listTools(), getToolSchema()
- Applied to: New Artifacts - mcpClient.ts methods specified

**Q4: Negative Test Scenarios** → A: Invalid inputs & missing data, File system errors, Network & transport errors
- Applied to: Acceptance Criteria - Testing section with Phase 1.2 details
# Phase 1: Stdio transport tests
npm run test:e2e:stdio     # Stdio transport only

# Phase 2: HTTP transport tests (after Phase 1 complete)
npm run test:e2e:http      # HTTP transport only
npm run test:e2e:full      # Both transports

# Development
npm run test:e2e:watch     # Watch mode during development
```
# Install additional dependencies
npm install --save-dev tmp-promise @types/tmp-promise

# Run E2E tests
npm run test:e2e          # All tests
npm run test:e2e:stdio    # Stdio transport only
npm run test:e2e:http     # HTTP transport only
npm run test:e2e:watch    # Watch mode during development
```
