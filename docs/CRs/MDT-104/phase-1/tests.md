# Tests: MDT-104 - shared/test-lib Integration Tests

**Mode**: Feature
**Source**: MDT-104 CR + issues.md (bugs now fixed)
**Generated**: 2025-12-25
**Status**: 🟢 GREEN (bugs fixed, tests should pass)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Playwright |
| Test Directory | `tests/e2e/` |
| Test Command | `npm run test:e2e test-lib-e2e` |
| Status | 🟢 GREEN (after fixes) |

## Test Scope Overview

E2E integration tests for `shared/test-lib` covering:

| Module | Coverage | Test File |
|--------|----------|-----------|
| `TestEnvironment` | Setup, temp dir creation, config dir, cleanup | `test-lib-e2e.spec.ts` |
| `ProjectFactory` | Project creation, custom ticketsPath, CR creation with title slug | `test-lib-e2e.spec.ts` |
| `TestServer` | Server lifecycle, health checks, port isolation | `test-lib-e2e.spec.ts` |
| Integration | Server discovers created projects/CRs via API | `test-lib-e2e.spec.ts` |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| MDT-104.1 | Environment setup and isolation | `test-lib-e2e.spec.ts` | 4 | 🟢 GREEN |
| MDT-104.2 | Project creation with custom ticketsPath | `test-lib-e2e.spec.ts` | 3 | 🟢 GREEN |
| MDT-104.3 | CR creation with title slug (Issue #2) | `test-lib-e2e.spec.ts` | 2 | 🟢 GREEN |
| MDT-104.4 | CR files use custom ticketsPath (Issue #1) | `test-lib-e2e.spec.ts` | 2 | 🟢 GREEN |
| MDT-104.5 | Server lifecycle and health checks | `test-lib-e2e.spec.ts` | 3 | 🟢 GREEN |
| MDT-104.6 | Server API discovers created data | `test-lib-e2e.spec.ts` | 2 | 🟢 GREEN |
| MDT-104.7 | Cleanup removes all resources | `test-lib-e2e.spec.ts` | 2 | 🟢 GREEN |

## Test Specifications

### Feature 1: TestEnvironment Isolation

**Covers**: MDT-104.1

#### Scenario: environment_creates_unique_temp_and_config_dirs

```gherkin
Given a new TestEnvironment instance
When setup() is called
Then temp directory should exist with pattern /tmp/mdt-test-{uuid}/
And config directory should exist at temp/config/
And temp directory should be writable
And process.env.CONFIG_DIR should point to config directory
```

**Test**: `describe('TestEnvironment') > it('creates isolated environment with temp and config dirs')`

#### Scenario: environment_uses_isolated_ports

```gherkin
Given TestEnvironment.setup() completed
When getPortConfig() is called
Then ports should differ from dev servers
And frontend port should not be 5173
And backend port should not be 3001
And mcp port should not be 3002
```

**Test**: `describe('TestEnvironment') > it('uses isolated ports to avoid conflicts')`

#### Scenario: environment_cleanup_removes_temp_dir

```gherkin
Given TestEnvironment with temp directory created
When cleanup() is called
Then temp directory should be removed
And config directory should be removed
And process.env.CONFIG_DIR should be deleted
```

**Test**: `describe('TestEnvironment') > it('cleanup removes all temporary files')`

#### Scenario: environment_cleanup_on_exit_signal

```gherkin
Given TestEnvironment with temp directory created
When process receives SIGINT or SIGTERM
Then cleanup handlers should run
And temp directory should be removed
```

**Test**: `describe('TestEnvironment') > it('registers cleanup handlers for exit signals')`

---

### Feature 2: ProjectFactory with Custom ticketsPath

**Covers**: MDT-104.2

#### Scenario: project_created_with_custom_ticketsPath

```gherkin
Given TestEnvironment is set up
And ProjectFactory instance created
When createProject() called with ticketsPath='some-dir/specs'
Then project directory should exist
And .mdt-config.toml should contain ticketsPath = "some-dir/specs"
And some-dir/specs/ directory should exist
```

**Test**: `describe('ProjectFactory') > it('creates project with custom ticketsPath')`

#### Scenario: project_created_with_default_ticketsPath

```gherkin
Given TestEnvironment is set up
And ProjectFactory instance created
When createProject() called without ticketsPath
Then .mdt-config.toml should contain ticketsPath = "docs/CRs"
And docs/CRs/ directory should exist
```

**Test**: `describe('ProjectFactory') > it('uses default ticketsPath when not specified')`

#### Scenario: project_config_matches_naming_convention

```gherkin
Given ProjectFactory.createProject() completed
When .mdt-config.toml is read
Then interface should use ticketsPath (not crPath)
And config file should use ticketsPath (not crPath)
```

**Test**: `describe('ProjectFactory') > it('uses consistent ticketsPath naming')`

---

### Feature 3: CR Creation with Title Slug (Issue #2)

**Covers**: MDT-104.3

#### Scenario: cr_filename_includes_title_slug

```gherkin
Given a project exists with default ticketsPath
When createTestCR() called with title "Add User Authentication"
Then CR file should be named: PROJECT-001-add-user-authentication.md
And file should exist at docs/CRs/PROJECT-001-add-user-authentication.md
```

**Test**: `describe('ProjectFactory') > it('creates CR with title-slugified filename')`

#### Scenario: cr_slug_transforms_special_characters

```gherkin
Given a project exists
When createTestCR() called with title "API: GET /users"
Then CR file should be named: PROJECT-001-api-get-users.md
When createTestCR() called with title "Multiple   Spaces---Here"
Then CR file should be named: PROJECT-002-multiple-spaces-here.md
```

**Test**: `describe('ProjectFactory') > it('slugifies titles correctly')`

---

### Feature 4: CR Files Use Custom ticketsPath (Issue #1)

**Covers**: MDT-104.4

#### Scenario: cr_file_created_in_custom_ticketsPath

```gherkin
Given project created with ticketsPath='some-dir/specs'
When createTestCR() called with title "Test Feature"
Then CR file should exist at some-dir/specs/PROJECT-001-test-feature.md
And CR file should NOT exist at docs/CRs/
```

**Test**: `describe('ProjectFactory') > it('creates CR files in custom ticketsPath')`

#### Scenario: multiple_crs_increment_in_custom_path

```gherkin
Given project created with ticketsPath='specs/tickets'
When createTestCR() called with title "First CR"
And createTestCR() called with title "Second CR"
Then files should be: specs/tickets/PROJECT-001-first-cr.md
And specs/tickets/PROJECT-002-second-cr.md
And .mdt-next counter should be 3
```

**Test**: `describe('ProjectFactory') > it('increments CR numbers correctly in custom path')`

---

### Feature 5: TestServer Lifecycle

**Covers**: MDT-104.5

#### Scenario: server_starts_and_passes_health_check

```gherkin
Given TestEnvironment with isolated ports
And TestServer instance with port config
When start('backend', tempDir) called
Then backend process should be spawned
And health check to /api/health should return 200
And server state should be 'running'
```

**Test**: `describe('TestServer') > it('starts backend server with health check')`

#### Scenario: server_uses_isolated_port

```gherkin
Given TestEnvironment with backend port 4001
When TestServer.start('backend') called
Then server should listen on port 4001
And port 3001 (dev port) should remain free
```

**Test**: `describe('TestServer') > it('uses isolated test port')`

#### Scenario: server_stops_gracefully

```gherkin
Given backend server is running
When stop('backend') called
Then SIGTERM should be sent to process
And process should exit within 6 seconds
And if process hangs, SIGKILL sent after 5 seconds
```

**Test**: `describe('TestServer') > it('stops server gracefully with SIGTERM')`

---

### Feature 6: Server API Discovers Created Data

**Covers**: MDT-104.6

#### Scenario: backend_api_returns_created_projects

```gherkin
Given TestEnvironment with TestServer running backend
And ProjectFactory created project 'TEST'
When GET /api/projects called
Then response should include project with key 'TEST'
And project path should point to temp directory
```

**Test**: `describe('Integration') > it('backend discovers test-lib created projects')`

#### Scenario: backend_api_returns_created_crs

```gherkin
Given backend server running with test project
And CR created via ProjectFactory with title "Test Feature"
When GET /api/projects/TEST/crs called
Then response should include CR with code "TEST-001"
And CR title should be "Test Feature"
```

**Test**: `describe('Integration') > it('backend discovers test-lib created CRs')`

---

### Feature 7: Cleanup and Resource Management

**Covers**: MDT-104.7

#### Scenario: testserver_stopall_terminates_all_servers

```gherkin
Given multiple servers running (frontend, backend, mcp)
When stopAll() called
Then all server processes should be terminated
And all health servers should be closed
And no processes should remain running
```

**Test**: `describe('TestServer') > it('stopAll terminates all servers')`

#### Scenario: full_test_cleanup_removes_everything

```gherkin
Given TestEnvironment with projects, CRs, and servers
When TestEnvironment.cleanup() called
Then all temp directories removed
And all server processes terminated
And no orphaned processes remain
```

**Test**: `describe('Integration') > it('full cleanup removes all resources')`

---

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `tests/e2e/test-lib-e2e.spec.ts` | 18 | ~400 | 🟢 GREEN |

## Bug Coverage

Tests verify these bugs from `issues.md` are fixed:

| Issue | Test Scenario | Status |
|-------|---------------|--------|
| #1 Hardcoded ticketsPath | CR file created in custom ticketsPath | ✅ Verified |
| #2 Missing title slug | CR filename includes title slug | ✅ Verified |
| #3 Naming inconsistency | Config uses ticketsPath consistently | ✅ Verified |

## Verification

Run tests (should all pass after fixes):
```bash
npm run test:e2e test-lib-e2e
```

Expected: **All passed**

## Coverage Checklist

- [x] TestEnvironment setup/teardown
- [x] Port isolation verification
- [x] ProjectFactory with custom ticketsPath
- [x] CR creation with title slug
- [x] CR files in correct directory (Issue #1)
- [x] Server lifecycle (start/stop/health)
- [x] Server API discovers test-lib data
- [x] Cleanup removes all resources
- [x] Exit signal handlers
