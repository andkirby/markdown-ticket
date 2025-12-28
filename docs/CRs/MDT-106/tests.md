# Tests: MDT-106

**Mode**: Feature
**Source**: requirements.md
**Generated**: 2025-12-27
**Scope**: E2E tests for all server API endpoints

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Contract Validation | jest-openapi (validates against server/openapi.yaml) |
| Test Directory | `server/tests/api/` |
| Test Command | `cd server && npm test` |
| Status | 🔴 RED (implementation pending) |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| R1.1 | Test all API endpoints | All `*.test.ts` files | 70+ | 🔴 RED |
| R1.2 | Verify success responses | All `*.test.ts` files | 35+ | 🔴 RED |
| R1.3 | Verify error handling | All `*.test.ts` files | 35+ | 🔴 RED |
| R2.1 | Create isolated environments | `setup.ts` | N/A | 🔴 RED |
| R2.2 | Prevent port conflicts | `setup.ts` | N/A | 🔴 RED |
| R2.3 | Cleanup test environments | `setup.ts` | N/A | 🔴 RED |
| R3.1 | Store test data in temp dirs | `fixtures/` + `setup.ts` | N/A | 🔴 RED |
| R3.2 | Delete test data on complete | `setup.ts` | N/A | 🔴 RED |
| R3.3 | Tests run concurrently | All test files | N/A | 🔴 RED |
| R4.1 | Export Express app without listen | `server/server.ts` | N/A | ✅ DONE |
| R4.2 | Use Supertest for requests | All test files | N/A | 🔴 RED |
| R4.3 | Return HTTP responses | All test files | N/A | 🔴 RED |
| R5.1 | Complete suite in 60 seconds | All test files | N/A | 🔴 RED |
| R5.2 | Maintain isolation during concurrency | `setup.ts` | N/A | 🔴 RED |
| R5.3 | Fail slow tests (>5s) | Jest config | N/A | 🔴 RED |
| R6.1 | Verify 400 errors | All `*.test.ts` files | 15+ | 🔴 RED |
| R6.2 | Verify 404 errors | All `*.test.ts` files | 15+ | 🔴 RED |
| R6.3 | Handle malformed YAML | `tickets.test.ts` | 2 | 🔴 RED |
| R6.4 | Handle file system errors | `tickets.test.ts` | 2 | 🔴 RED |
| R7.1 | Verify SSE event delivery | `sse.test.ts` | 3 | 🔴 RED |
| R7.2 | Verify SSE event order | `sse.test.ts` | 2 | 🔴 RED |
| R7.3 | Handle SSE connection failures | `sse.test.ts` | 2 | 🔴 RED |
| R8.1 | Run in CI without manual setup | CI configuration | N/A | 🔴 RED |
| R8.2 | Generate coverage reports (Istanbul/nyc) | Jest config | N/A | 🔴 RED |
| R8.3 | Fail CI on test failures | CI configuration | N/A | 🔴 RED |
| R9.1 | No execution order dependencies | All test files | N/A | 🔴 RED |
| R9.2 | Isolated data during concurrency | `setup.ts` | N/A | 🔴 RED |
| R9.3 | Handle port conflicts | `setup.ts` | N/A | 🔴 RED |
| R10.1 | Validate responses against OpenAPI spec | All `*.test.ts` files + `helpers/assertions.ts` | 35+ | 🔴 RED |

## Test Specifications

### Feature: Projects API Endpoint Tests

**File**: `server/tests/api/projects.test.ts`
**Covers**: R1.1, R1.2, R1.3, R6.1, R6.2, R10.1

#### Scenario: get_all_projects (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api/projects
Then return 200 status code
And response body is an array
And array contains registered projects
```

**Test**: `describe('GET /api/projects') > it('should return empty array when no projects exist')`

#### Scenario: create_project_success (R1.1, R1.2)
```gherkin
Given valid project data
When POST request to /api/projects/create
Then return 201 status code
And response body contains project ID
```

**Test**: `describe('POST /api/projects/create') > it('should create new project with valid data')`

#### Scenario: create_project_missing_field (R6.1)
```gherkin
Given project data missing required field
When POST request to /api/projects/create
Then return 400 status code
And response body contains error message
```

**Test**: `describe('POST /api/projects/create') > it('should return 400 for missing required fields')`

---

### Feature: Tickets/Legacy Tasks Endpoint Tests

**File**: `server/tests/api/tickets.test.ts`
**Covers**: R1.1, R1.2, R1.3, R6.1, R6.2, R6.3, R10.1

#### Scenario: get_all_tasks (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api/tasks
Then return 200 status code
And response body is an array of task filenames
```

**Test**: `describe('GET /api/tasks') > it('should return empty array when no tasks exist')`

#### Scenario: save_task_success (R1.1, R1.2)
```gherkin
Given valid task data with filename and content
When POST request to /api/tasks/save
Then return 200 status code
And response body contains success: true
```

**Test**: `describe('POST /api/tasks/save') > it('should create new task with valid data')`

#### Scenario: save_task_missing_content (R6.1)
```gherkin
Given task data missing content field
When POST request to /api/tasks/save
Then return 400 status code
And response body contains error message
```

**Test**: `describe('POST /api/tasks/save') > it('should return 400 for missing content')`

#### Scenario: task_not_found (R6.2)
```gherkin
Given a non-existent task filename
When GET request to /api/tasks/:filename
Then return 404 status code
And response body contains error message
```

**Test**: `describe('GET /api/tasks/:filename') > it('should return 404 for non-existent task')`

---

### Feature: Documents Endpoint Tests

**File**: `server/tests/api/documents.test.ts`
**Covers**: R1.1, R1.2, R1.3, R6.1, R6.2, R10.1

#### Scenario: get_documents_missing_project_id (R6.1)
```gherkin
Given a request without projectId parameter
When GET request to /api/documents
Then return 400 status code
And response body contains error message
```

**Test**: `describe('GET /api/documents') > it('should return 400 for missing projectId')`

#### Scenario: get_documents_not_found (R6.2)
```gherkin
Given a non-existent project ID
When GET request to /api/documents with projectId
Then return 404 status code
And response body contains error message
```

**Test**: `describe('GET /api/documents') > it('should return 404 for non-existent project')`

---

### Feature: SSE Endpoint Tests

**File**: `server/tests/api/sse.test.ts`
**Covers**: R7.1, R7.2, R7.3, R10.1 |

#### Scenario: sse_connection_established (R7.1)
```gherkin
Given the test environment is set up
When GET request to /api/events
Then return 200 status code
And Content-Type header is "text/event-stream"
And Cache-Control header is "no-cache"
And Connection header is "keep-alive"
```

**Test**: `describe('SSE Connection') > it('should establish SSE connection with correct headers')`

#### Scenario: sse_connection_event (R7.1, R7.2)
```gherkin
Given the SSE endpoint is accessible
When GET request to /api/events
Then response contains connection event
And event data contains status: "connected"
And event contains timestamp
```

**Test**: `describe('SSE Connection') > it('should send initial connection event')`

#### Scenario: sse_keep_alive (R7.3)
```gherkin
Given the SSE endpoint is accessible
When GET request to /api/events
Then response maintains keep-alive connection
And cache is disabled
```

**Test**: `describe('SSE Connection Handling') > it('should maintain keep-alive connection')`

---

### Feature: System Endpoint Tests

**File**: `server/tests/api/system.test.ts`
**Covers**: R1.1, R1.2, R6.1, R6.2, R10.1 |

#### Scenario: get_status (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api/status
Then return 200 status code
And response body contains status: "ok"
And response body contains timestamp
And response body contains sseClients count
```

**Test**: `describe('GET /api/status') > it('should return server status')`

#### Scenario: get_directories (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api/directories
Then return 200 status code
And response body contains home directory
And response body contains directories array
```

**Test**: `describe('GET /api/directories') > it('should return system directories')`

#### Scenario: check_filesystem_exists_invalid (R6.1)
```gherkin
Given a request without path parameter
When POST request to /api/filesystem/exists
Then return 400 status code
And response body contains error message
```

**Test**: `describe('POST /api/filesystem/exists') > it('should return 400 for missing path')`

---

**Note**: DevTools endpoint (`/api/devtools/*`) is excluded from E2E test scope — development-only feature with stateful session management (per CR acceptance criteria).

---

### Feature: OpenAPI Docs Endpoint Tests

**File**: `server/tests/api/openapi-docs.test.ts`
**Covers**: R1.1, R1.2, R10.1

#### Scenario: get_redoc_ui (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api-docs
Then return 200 status code
And Content-Type header contains "text/html"
And response body contains Redoc HTML
```

**Test**: `describe('GET /api-docs') > it('should serve Redoc UI HTML page')`

#### Scenario: get_openapi_spec (R1.1, R1.2)
```gherkin
Given the test environment is set up
When GET request to /api-docs/json
Then return 200 status code
And response body contains openapi field
And response body contains info field
And response body contains paths field
And response body contains components field
```

**Test**: `describe('GET /api-docs/json') > it('should return OpenAPI specification')`

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Empty project list | Return empty array | `projects.test.ts` | R1.1 |
| Missing required field | 400 error | All test files | R6.1 |
| Non-existent resource | 404 error | All test files | R6.2 |
| Malformed YAML | Handle gracefully | `tickets.test.ts` | R6.3 |
| Invalid request body | 400 error | All test files | R6.1 |
| SSE connection drops | Error handling | `sse.test.ts` | R7.3 |
| Concurrent test execution | No interference | All test files | R9.1 |
| Port conflict during setup | Retry with different port | `setup.ts` | R9.3 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `server/tests/api/setup.ts` | N/A (infrastructure, jest-openapi init) | ~100 | 🔴 RED |
| `server/tests/api/helpers/request.ts` | N/A (utilities) | ~75 | 🔴 RED |
| `server/tests/api/helpers/assertions.ts` | N/A (utilities, includes toSatisfyApiSpec) | ~125 | 🔴 RED |
| `server/tests/api/helpers/sse.ts` | N/A (utilities, EventSource mock) | ~75 | 🔴 RED |
| `server/tests/api/fixtures/projects.ts` | N/A (test data) | ~50 | 🔴 RED |
| `server/tests/api/fixtures/tickets.ts` | N/A (test data) | ~75 | 🔴 RED |
| `server/tests/api/fixtures/documents.ts` | N/A (test data) | ~50 | 🔴 RED |
| `server/tests/api/projects.test.ts` | 25 | ~300 | 🔴 RED |
| `server/tests/api/tickets.test.ts` | 15 | ~180 | 🔴 RED |
| `server/tests/api/documents.test.ts` | 10 | ~120 | 🔴 RED |
| `server/tests/api/sse.test.ts` | 8 | ~90 | 🔴 RED |
| `server/tests/api/system.test.ts` | 12 | ~150 | 🔴 RED |
| `server/tests/api/openapi-docs.test.ts` | 8 | ~100 | 🔴 RED |

**Note**: DevTools endpoint excluded — development-only feature with stateful session management.

## Verification

Run all E2E tests (should all fail initially):
```bash
cd server && npm test
```

Expected: **Multiple failed, 0 passed** (tests are written but endpoints may not be fully implemented)

Run specific test file:
```bash
cd server && npm test -- projects.test.ts
```

Run with coverage:
```bash
cd server && npm run test:coverage
```

## Coverage Checklist

- [x] All API endpoints have test coverage (DevTools excluded per CR)
- [x] Success path tests included
- [x] Error case tests included (400, 404, 500)
- [x] SSE endpoint tests included
- [x] Test infrastructure helpers created
- [x] Fixture data defined
- [x] Express app exported for Supertest
- [x] OpenAPI contract validation via jest-openapi
- [ ] Tests are RED (verified after implementation begins)
- [ ] Coverage >80% (measured after implementation)

## Changes Made

### server/server.ts
- Added `export { app };` to allow Supertest to import Express app without starting server
- Wrapped `app.listen()` in `if (import.meta.url === `file://${process.argv[1]}`)` check to prevent auto-start when imported

### Test Infrastructure Created

#### server/tests/api/setup.ts (~100 lines)
- `setupTestEnvironment()`: Creates TestEnvironment, initializes jest-openapi, builds Express app
- `cleanupTestEnvironment()`: Cleans up temp directories
- `createTestProject()`: Helper for creating test projects using ProjectFactory

#### server/tests/api/helpers/request.ts (~75 lines)
- `createTestRequest()`: Creates Supertest instance
- `RequestBuilder`: Fluent API for GET/POST/PATCH/PUT/DELETE requests

#### server/tests/api/helpers/assertions.ts (~125 lines)
- `assertSuccess()`, `assertBadRequest()`, `assertNotFound()`, `assertServerError()`
- `assertSatisfiesApiSpec()`: Validates response against OpenAPI spec
- `assertBodyProperties()`, `assertIsArray()`, `assertIsObject()`
- `assertSSEHeaders()`, `assertErrorResponse()`, `assertCreated()`, `assertNoContent()`

#### server/tests/api/helpers/sse.ts (~75 lines)
- `MockEventSource`: Mock EventSource for testing SSE (uses Node built-in Event/EventTarget)
- `parseSSEMessage()`: Parses SSE message format
- `assertSSEEvent()`, `assertSSEConnection()`, `assertEventSequence()`

#### Fixtures (3 files, ~175 lines total)
- `projects.ts`: Project test data
- `tickets.ts`: CR/ticket test data including malformed YAML
- `documents.ts`: Document test data

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task Area | Makes GREEN |
|-----------|-------------|
| Test infrastructure setup | `setup.ts`, `helpers/` |
| Projects endpoint | `projects.test.ts` |
| Tickets endpoint | `tickets.test.ts` |
| Documents endpoint | `documents.test.ts` |
| SSE endpoint | `sse.test.ts` |
| System endpoints | `system.test.ts` |
| OpenAPI docs endpoint | `openapi-docs.test.ts` |

**Note**: DevTools endpoints excluded from E2E test scope (per CR acceptance criteria).

After each task: `cd server && npm test` should show fewer failures.

---

*Generated by /mdt:tests*
