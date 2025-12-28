# Requirements: MDT-106

**Source**: [MDT-106](../MDT-106.md)
**Generated**: 2025-12-26
**CR Type**: Feature Enhancement
**Requirements Scope**: Full EARS + FR + NFR specifications

## Introduction

MDT-106 adds comprehensive end-to-end (E2E) test coverage for all server API endpoints. The system currently lacks automated verification that API endpoints continue working after changes, requiring manual testing. This CR establishes automated E2E tests using the existing `shared/test-lib` infrastructure for isolated test environments, covering both success paths and error handling for all routes in `server/routes/`.

## Behavioral Requirements (EARS)

### Requirement 1: API Endpoint Coverage

**Objective**: As a developer, I want automated E2E tests for all server API endpoints, so that I can verify API functionality after making changes.

#### Acceptance Criteria

1. WHEN the E2E test suite executes, the system shall test all endpoints defined in `server/routes/` (projects, tickets, documents, sse, system, docs).
   > **Note**: DevTools endpoint (`/api/devtools/*`) is excluded — development-only feature with stateful session management.
2. WHEN an endpoint test runs, the system shall verify success responses including correct status codes and response body structure.
3. WHEN an endpoint test runs, the system shall verify error handling for invalid inputs (400), missing resources (404), and server errors (500).

### Requirement 2: Test Environment Isolation

**Objective**: As a developer, I want tests to run in isolated environments, so that tests do not interfere with each other or with development servers.

#### Acceptance Criteria

1. WHEN a test runs, the system shall create an isolated test environment using `shared/test-lib` with custom ports and temporary directories.
2. WHILE multiple tests run concurrently, the system shall prevent port conflicts by assigning unique ports per test environment.
3. WHEN a test completes, the system shall clean up all test data including temporary files and directories.

### Requirement 3: Test Data Management

**Objective**: As a developer, I want test data to be properly isolated and cleaned up, so that tests produce consistent results.

#### Acceptance Criteria

1. WHEN a test creates test data (projects, tickets, documents), the system shall store data in a temporary directory specific to that test.
2. WHEN a test completes, the system shall delete all temporary files and directories created during the test.
3. IF test cleanup fails, THEN the system shall log the failure and mark the test as failed.

### Requirement 4: HTTP Testing Infrastructure

**Objective**: As a developer, I want the test infrastructure to use Supertest for HTTP requests, so that tests can make HTTP calls to the Express app without starting a server.

#### Acceptance Criteria

1. WHEN the test server initializes, the system shall export the Express app instance without calling `listen()`.
2. WHEN a test makes an HTTP request, the system shall use Supertest to inject the request into the Express app.
3. WHEN Supertest executes a request, the system shall return the HTTP response including status code, headers, and body.

### Requirement 5: Test Execution Performance

**Objective**: As a developer, I want tests to execute quickly, so that I can run them frequently during development.

#### Acceptance Criteria

1. WHEN the full E2E test suite runs, the system shall complete all tests within 60 seconds.
2. WHILE tests run concurrently, the system shall maintain isolation without performance degradation from port contention.
3. IF a test exceeds 5 seconds to execute, THEN the system shall fail the test and log a performance warning.

### Requirement 6: Error Case Coverage

**Objective**: As a developer, I want tests to verify error handling, so that the API handles edge cases gracefully.

#### Acceptance Criteria

1. WHEN testing endpoints with invalid request bodies, the system shall verify 400 status codes and appropriate error messages.
2. WHEN testing endpoints with missing resources, the system shall verify 404 status codes.
3. WHEN testing endpoints with malformed YAML in markdown files, the system shall verify appropriate error handling.
4. WHEN file system errors occur during ticket operations, the system shall verify error responses and recovery.

### Requirement 7: SSE Endpoint Testing

**Objective**: As a developer, I want to test Server-Sent Events endpoints, so that real-time updates work correctly.

#### Acceptance Criteria

1. WHEN testing SSE endpoints, the system shall establish EventSource connections and verify event delivery.
2. WHILE SSE connection is active, the system shall verify that events are received in the correct order.
3. IF SSE connection fails, THEN the system shall verify appropriate error handling and reconnection logic.

### Requirement 8: Continuous Integration Support

**Objective**: As a developer, I want tests to run in CI/CD environments, so that code changes are automatically validated.

#### Acceptance Criteria

1. WHEN tests run in a CI environment, the system shall execute without requiring manual setup of development servers.
2. WHEN tests run in CI, the system shall generate coverage reports showing >80% coverage for tested endpoints.
3. IF tests fail in CI, THEN the system shall fail the build and provide detailed failure logs.

### Requirement 9: Concurrent Test Execution

**Objective**: As a developer, I want tests to run concurrently without conflicts, so that test execution completes quickly.

#### Acceptance Criteria

1. WHEN tests run concurrently, the system shall ensure no test depends on execution order.
2. WHILE multiple tests execute, the system shall maintain isolated data and port allocation per test.
3. IF a port conflict occurs during concurrent execution, THEN the system shall retry with a different port or fail the test with a clear error message.

### Requirement 10: OpenAPI Contract Validation

**Objective**: As a developer, I want API responses validated against the OpenAPI specification, so that implementation drift is caught automatically.

#### Acceptance Criteria

1. WHEN endpoint tests execute, the system shall validate response status codes, headers, and bodies against `server/openapi.yaml`.
2. WHEN a response deviates from the OpenAPI specification, THEN the system shall fail the test with details about the mismatch.
3. WHEN tests run, the system shall use jest-openapi for contract validation without requiring manual schema updates.

---

## Functional Requirements

> Specific capabilities the system must provide.

| ID | Requirement | Rationale |
|----|-------------|-----------|
| FR-1 | E2E test infrastructure using `shared/test-lib` for environment isolation | Leverages existing infrastructure for consistent test environments |
| FR-2 | Test suite covering all routes in `server/routes/` (projects, tickets, documents, sse, system, docs) | Ensures comprehensive API coverage (DevTools excluded — development-only) |
| FR-3 | Success path verification for all endpoints (status codes, response bodies) | Validates expected behavior |
| FR-4 | Error path verification for common error cases (400, 404, 500) | Ensures graceful error handling |
| FR-5 | Supertest integration for HTTP requests to Express app | Enables testing without starting actual servers |
| FR-6 | Test data fixtures and seed data management | Provides consistent test data across tests |
| FR-7 | SSE testing utilities for Server-Sent Events endpoints | Enables testing of real-time features |
| FR-8 | Cleanup procedures for temporary test data | Ensures test isolation and prevents pollution |
| FR-9 | Jest/Vitest configuration for running E2E tests | Aligns with existing backend test infrastructure |
| FR-10 | OpenAPI contract validation via jest-openapi | Catches API implementation drift automatically |

## Non-Functional Requirements

> Quality attributes and constraints.

### Performance
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-P1 | Full E2E test suite execution time | < 60 seconds | Enables frequent test runs during development |
| NFR-P2 | Individual test execution time | < 5 seconds | Prevents slow tests and provides quick feedback |
| NFR-P3 | Concurrent test execution | No performance degradation from port contention | Enables parallel test execution |

### Reliability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-R1 | Test isolation | Zero cross-test interference | Ensures consistent test results |
| NFR-R2 | Cleanup success rate | 100% (fail test if cleanup fails) | Prevents test pollution |
| NFR-R3 | CI environment pass rate | Same as local development (100% when code is correct) | Enables reliable CI/CD |

### Maintainability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-M1 | Code coverage for API endpoints | > 80% | Ensures comprehensive test coverage |
| NFR-M2 | Test organization | Clear structure matching route organization | Makes tests easy to find and update |
| NFR-M3 | Test independence | No test depends on execution order | Enables concurrent execution and easier debugging |

### Usability
| ID | Requirement | Target | Rationale |
|----|-------------|--------|-----------|
| NFR-U1 | Developer workflow | Single command to run all tests (`npm test`) | Removes friction for running tests |
| NFR-U2 | Failure clarity | Descriptive error messages showing expected vs actual | Speeds up debugging |
| NFR-U3 | Local development | Tests run without manual server setup | Eliminates pre-test setup steps |

---

## Configuration Requirements

> Include only if feature has configurable settings.

| Setting | Description | Default | Valid Range | Rationale |
|---------|-------------|---------|-------------|-----------|
| `TEST_PORT_START` | Starting port for test server allocation | 3100    | 1024-65535 | Avoids conflicts with dev server (3001) and frontend (5173) |
| `TEST_TIMEOUT` | Maximum time per test before failure | 5000ms  | 1000-30000ms | Prevents hanging tests |
| `TEST_CLEANUP_TIMEOUT` | Maximum time for cleanup procedures | 2000ms  | 500-10000ms | Ensures cleanup completes promptly |
| `ENABLE_PARALLEL_TESTS` | Allow concurrent test execution | false   | true/false | Can disable for debugging |

---

## Current Implementation Context

> Informational only. Architecture may restructure as needed.

| Behavior | Current Location | Notes |
|----------|------------------|-------|
| Test environment management | `shared/test-lib/core/test-environment.ts` | Provides isolated environments with custom ports |
| Test server management | `shared/test-lib/core/test-server.ts` | Manages server lifecycle for testing |
| Project creation for tests | `shared/test-lib/core/project-factory.ts` | Creates test projects with temp directories |
| Existing E2E tests | `tests/e2e/` (Playwright) | Frontend E2E only, not server API |
| Backend unit tests | `server/test/` | Unit tests exist, not E2E |

---

## Artifact Mapping

> Maps requirements to implementation. Architecture decides final structure.

| Req ID | Requirement Summary | Primary Artifact | Integration Points |
|--------|---------------------|------------------|-------------------|
| R1.1 | Test all API endpoints | `server/tests/api/` | All route files in `server/routes/` |
| R1.2 | Verify success responses | `server/tests/api/*.test.ts` | Supertest, Express app |
| R1.3 | Verify error handling | `server/tests/api/*.test.ts` | Error controllers |
| R2.1 | Create isolated environments | `server/tests/api/setup.ts` | `shared/test-lib/core/test-environment.ts` |
| R2.2 | Prevent port conflicts | `shared/test-lib/core/test-server.ts` | Port allocation logic |
| R2.3 | Cleanup test environments | `server/tests/api/setup.ts` | `shared/test-lib/utils/process-helper.ts` |
| R3.1 | Store test data in temp dirs | `server/tests/api/fixtures/` | `shared/test-lib/core/project-factory.ts` |
| R3.2 | Delete test data on complete | `server/tests/api/setup.ts` | Jest/Vitest `afterEach` hooks |
| R4.1 | Export Express app without listen | `server/server.ts` | App export modification |
| R4.2 | Use Supertest for requests | `server/tests/api/*.test.ts` | Supertest library |
| R4.3 | Return HTTP responses | Supertest integration | Response assertions |
| R5.1 | Complete suite in 60 seconds | All test files | Jest/Vitest configuration |
| R5.2 | Maintain isolation during concurrency | `shared/test-lib/core/test-server.ts` | Port management |
| R5.3 | Fail slow tests (>5s) | Jest/Vitest config | Test timeout settings |
| R6.1 | Verify 400 errors | `server/tests/api/*.test.ts` | Invalid input tests |
| R6.2 | Verify 404 errors | `server/tests/api/*.test.ts` | Missing resource tests |
| R6.3 | Handle malformed YAML | `server/tests/api/tickets.test.ts` | Markdown parsing tests |
| R6.4 | Handle file system errors | `server/tests/api/*.test.ts` | FS error injection |
| R7.1 | Verify SSE event delivery | `server/tests/api/sse.test.ts` | EventSource utilities |
| R7.2 | Verify SSE event order | `server/tests/api/sse.test.ts` | Event sequence tracking |
| R7.3 | Handle SSE connection failures | `server/tests/api/sse.test.ts` | Error handling tests |
| R8.1 | Run in CI without manual setup | CI configuration files | Environment setup scripts |
| R8.2 | Generate coverage reports | Jest/Vitest config | Coverage reporters |
| R8.3 | Fail CI on test failures | CI configuration | Build failure logic |
| R9.1 | No execution order dependencies | All test files | Test independence validation |
| R9.2 | Isolated data during concurrency | `shared/test-lib/core/test-environment.ts` | Environment isolation |
| R9.3 | Handle port conflicts | `shared/test-lib/core/test-server.ts` | Port retry logic |
| R10.1 | Validate responses against OpenAPI spec | `server/tests/api/helpers/assertions.ts` + all test files | jest-openapi, server/openapi.yaml |

---

## Traceability

| Req ID | CR Section | Acceptance Criteria |
|--------|------------|---------------------|
| R1.1 | Problem | AC: All API endpoints have E2E coverage |
| R1.2 | Problem | AC: Tests verify success responses |
| R1.3 | Problem | AC: Tests verify error handling |
| R2.1 | Problem | AC: Tests use shared/test-lib for isolation |
| R2.2 | Problem | AC: Tests run concurrently without conflicts |
| R2.3 | Problem | AC: Test data properly cleaned up |
| R3.1 | Problem | AC: Test data properly isolated |
| R3.2 | Problem | AC: Test data properly cleaned up |
| R3.3 | Non-Functional | AC: Tests pass when run in parallel |
| R4.1 | Constraints | AC: Use shared/test-lib infrastructure |
| R4.2 | Constraints | AC: Use Jest/Vitest runner |
| R4.3 | Constraints | AC: Use Supertest for HTTP requests |
| R5.1 | Non-Functional | AC: Tests complete in under 60 seconds |
| R5.2 | Non-Functional | AC: Tests can run in parallel |
| R5.3 | Non-Functional | AC: No tests depend on execution order |
| R6.1 | Edge Cases | AC: Invalid request bodies |
| R6.2 | Edge Cases | AC: Malformed YAML in markdown files |
| R6.3 | Edge Cases | AC: File system errors |
| R6.4 | Edge Cases | AC: Concurrent write operations |
| R7.1 | Open Questions | AC: SSE endpoints require special handling |
| R7.2 | Open Questions | AC: SSE event verification |
| R7.3 | Open Questions | AC: SSE error handling |
| R8.1 | Success Conditions | AC: CI/CD can run tests automatically |
| R8.2 | Non-Functional | AC: Test coverage > 80% |
| R8.3 | Success Conditions | AC: Tests pass in CI environment |
| R9.1 | Non-Functional | AC: No tests depend on execution order |
| R9.2 | Success Conditions | AC: Tests run concurrently without conflicts |
| R9.3 | Problem | AC: Tests use isolated ports |
| R10.1 | OpenAPI Contract Validation | AC: Responses validated against server/openapi.yaml |

---
*Generated from MDT-106 by /mdt:requirements (v3)*
