# Tests: MDT-092

**Mode**: Refactoring (Behavioral Preservation)
**Source**: Analysis of existing test helpers in mcp-server/tests/e2e/helpers/
**Generated**: 2025-12-16

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Playwright (E2E) + Jest (Unit) |
| Test directory | `tests/e2e/`, `tests/unit/` |
| Test command | `npm run test:e2e` (Playwright), `npm test` (Jest) |
| CR test filter | `tests/e2e/MDT-092-*.spec.ts` |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| Static Ports | Use ports 6173, 4001, 4002 for test isolation | `MDT-092-isolation.spec.ts` | 4 | 🔴 RED |
| Env Isolation | Isolated temporary directories for each test run | `MDT-092-isolation.spec.ts` | 3 | 🔴 RED |
| Port Conflicts | Avoid conflicts with dev servers (5173, 3001, 3002) | `MDT-092-isolation.spec.ts` | 2 | 🔴 RED |
| Backward Compat | Preserve existing test helper APIs | `MDT-092-isolation.spec.ts` | 3 | 🔴 RED |

## Test Specifications

### Feature: Isolated Test Environment with Custom Ports

**File**: `tests/e2e/MDT-092-isolation.spec.ts`
**Covers**: All MDT-092 requirements

#### Scenario: static_port_allocation

```gherkin
Given the test framework needs isolated execution
When MDT-092 is implemented
Then it should allocate static ports 6173 (frontend), 4001 (backend), 4002 (MCP)
And these ports should not conflict with development servers
```

**Test**: `describe('Port Configuration') > it('should use static ports (6173, 4001, 4002) for test isolation')`

#### Scenario: temporary_directory_isolation

```gherkin
Given a test needs an isolated environment
When TestEnvironment is initialized
Then it should create a unique temporary directory with UUID-based naming
And create a config subdirectory within it
And set CONFIG_DIR environment variable for MCP server
```

**Test**: `describe('TestEnvironment Isolation')` (3 scenarios)

#### Scenario: project_factory_preservation

```gherkin
Given existing tests use ProjectFactory
When extracted to shared/test-lib
Then it should preserve unique project code generation (T{random})
And maintain default project configuration
And support standard/complex project scenarios
```

**Test**: `describe('ProjectFactory Behavior')` (3 scenarios)

#### Scenario: playwright_integration

```gherkin
Given Playwright runs E2E tests
When MDT-092 ports are configured
Then webServer should use port 6173
And baseURL should match webServer URL
And test execution should succeed with dev servers running
```

**Test**: `describe('Playwright Integration')` (2 scenarios)

---

### Feature: Unit Tests for Shared Library

**File**: `tests/unit/shared/test-lib/*.test.ts`
**Covers**: Individual components of shared/test-lib

#### Scenario: ports_config_validation

```gherkin
Given the ports configuration module
When loaded
Then it should export FRONTEND_PORT = 6173
And BACKEND_PORT = 4001
And MCP_PORT = 4002
And all ports should be within valid range (1024-65535)
```

**Test**: `describe('Ports Configuration')` (4 scenarios)

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Dev server running on 5173 | Tests should still pass (use 6173) | `port_conflict_detection` | Static Ports |
| All temp directories exhausted | Throw TestEnvironmentError | `error_handling` | Env Isolation |
| Invalid project code format | ProjectFactoryError with message | `error_handling` | Backward Compat |
| MCP server fails to start | TestServer reports failure | `server_lifecycle` | Static Ports |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `tests/e2e/MDT-092-isolation.spec.ts` | 15 | ~200 | 🔴 RED |
| `tests/unit/shared/test-lib/ports-config.test.ts` | 4 | ~60 | 🔴 RED |

## Verification

Run E2E tests (should all fail):
```bash
npm run test:e2e -- tests/e2e/MDT-092-isolation.spec.ts
```

Expected: **15 failed, 0 passed**

Run unit tests (should all fail):
```bash
npm test tests/unit/shared/test-lib/
```

Expected: **All tests fail (files don't exist yet)**

## Coverage Checklist

- [x] All requirements have at least one test
- [x] Error scenarios covered
- [x] Edge cases from existing implementation included
- [x] Backward compatibility preservation tests
- [x] Playwright configuration changes covered
- [ ] Tests are RED (verified manually)

---

## For Implementation

Each task in implementation plan should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Extract TestEnvironment | `tests/e2e/MDT-092-isolation.spec.ts > TestEnvironment Isolation` |
| Create ports config | `tests/unit/shared/test-lib/ports-config.test.ts` |
| Update playwright config | `tests/e2e/MDT-092-isolation.spec.ts > Playwright Integration` |
| Extract ProjectFactory | `tests/e2e/MDT-092-isolation.spec.ts > ProjectFactory Behavior` |
| Create TestServer lifecycle | `tests/e2e/MDT-092-isolation.spec.ts > TestServer Lifecycle` |

After each task: `npm run test:e2e tests/e2e/MDT-092-isolation.spec.ts` should show fewer failures.

## Implementation Notes

### What Must Be Preserved

1. **TestEnvironment API**:
   - `setup()`: Creates temp dirs, sets CONFIG_DIR env
   - `cleanup()`: Removes all temp files
   - `getTempDir()`, `getConfigDir()`: Return paths
   - Error types: TestEnvironmentError

2. **ProjectFactory API**:
   - `createProject()`: With 'empty' default type
   - `createTestCR()`: Using MCP tools
   - `createTestScenario()`: 'standard-project' | 'complex-project'
   - Project code generation: `T{random}` pattern

3. **MCPClient Features**:
   - Dual transport support (stdio/HTTP)
   - Error handling patterns
   - Response parsing

### What Can Change

1. **Port Allocation**: From dynamic to static (6173, 4001, 4002)
2. **Import Paths**: From `mcp-server/tests` to `shared/test-lib`
3. **Directory Structure**: Organized by feature in shared/test-lib/

### Migration Strategy

1. Create new shared/test-lib modules
2. Keep old helpers as facades (re-export from new location)
3. Update core E2E tests to use new imports
4. Gradually migrate remaining tests
5. Remove old helpers (future task, not in MDT-092)
