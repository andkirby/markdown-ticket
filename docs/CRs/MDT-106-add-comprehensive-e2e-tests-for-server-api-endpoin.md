---
code: MDT-106
status: Proposed
dateCreated: 2025-12-26T22:41:19.096Z
type: Feature Enhancement
priority: Medium
---

# Add comprehensive E2E tests for server API endpoints

## 1. Description

### Requirements Scope
`full` — Full EARS + FR + NFR specifications

### Problem
- Server API lacks comprehensive E2E test coverage, making API changes risky
- Existing test infrastructure (`shared/test-lib`) provides isolated test environments but is not utilized for server API testing
- No automated verification that API endpoints continue working after changes
- Manual testing required to verify API functionality

### Affected Areas
- Backend: All API endpoints in `server/routes/` (projects, tickets, documents, sse, system, devtools, docs)
- Backend: Business logic in `server/services/` and `server/controllers/`
- Tests: New E2E test infrastructure and test suites

### Scope
- **In scope**: E2E tests for all server API endpoints using `shared/test-lib` for isolated environments
- **Out of scope**: Frontend E2E tests (covered by Playwright), MCP server tests, unit tests

## 2. Desired Outcome

### Success Conditions
- All server API endpoints have automated E2E tests covering happy path and error cases
- Tests run in isolated environments using `shared/test-lib` (custom ports, temp directories)
- Tests verify both success responses and error handling
- Test data is properly isolated (each test cleans up after itself)
- Tests can run in parallel without conflicts
- CI/CD can run these tests automatically

### Constraints
- Must use existing `shared/test-lib` infrastructure (`TestEnvironment`, `TestServer`, `ProjectFactory`)
- Should consider the E2E testing guide in [api-e2e-testing.md](./MDT-106/api-e2e-testing.md)
- Must not interfere with development servers (use isolated ports via test-lib)
- Must use Jest/Vitest as test runner (aligned with guide and existing backend tests)
- Must use Supertest for HTTP requests to Express app
- Should support contract validation if OpenAPI spec exists

### Non-Goals
- Not adding unit tests (existing unit tests are separate)
- Not testing frontend interaction (covered by Playwright)
- Not replacing existing backend unit tests
- Not testing MCP server (separate test suite)

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Test structure | Should tests be organized by endpoint or by feature? | Must cover all routes in `server/routes/` |
| Database | How should tests handle file system operations? | Use test-lib's temp directory management |
| Authentication | How to test protected endpoints? | May need auth token helper per MDT-106 guide |
| SSE endpoints | How to test Server-Sent Events endpoints? | SSE endpoints require special handling |
| Cleanup | How to ensure test isolation and cleanup? | Each test must clean up its data |

### Known Constraints
- Must use `shared/test-lib` for environment isolation
- Must follow patterns from `docs/CRs/MDT-106/api-e2e-testing.md`
- Server must export app instance (not call `listen()`) for Supertest injection
- Tests must use isolated ports and temp directories

### Decisions Deferred
- Test file organization (endpoint-based vs feature-based) — determined by `/mdt:architecture`
- Specific test utilities and helpers — determined by `/mdt:architecture`
- Mock strategy for external dependencies — determined by `/mdt:architecture`
- Test data fixtures and seed data — determined by `/mdt:architecture`

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] All API endpoints in `server/routes/` have E2E test coverage
- [ ] Tests verify success responses (status codes, response bodies)
- [ ] Tests verify error handling (400, 404, 500 cases)
- [ ] Tests use `shared/test-lib` for environment isolation
- [ ] Tests can run concurrently without port conflicts
- [ ] Test data is properly isolated and cleaned up
- [ ] Authentication flows work correctly (if applicable)

### Non-Functional
- [ ] Tests complete in under 60 seconds total
- [ ] Tests can run in CI/CD environment
- [ ] Test coverage > 80% for API endpoints
- [ ] No tests depend on execution order

### Edge Cases
- Empty result sets (e.g., no projects found)
- Invalid request bodies (missing required fields, wrong types)
- Malformed YAML in markdown files
- File system errors during ticket operations
- Concurrent write operations

## 5. Verification

### How to Verify Success
- **Automated verification**: All tests pass when run via Jest/Vitest
- **Coverage verification**: Coverage report shows >80% for tested endpoints
- **Isolation verification**: Tests pass when run in parallel
- **CI verification**: Tests pass in clean CI environment

### Test Organization Guidance
Per MDT-106 guide, tests should be organized in `server/test/api/` with:
- `setup.ts` - Global test configuration
- `fixtures/` - Seed data and test fixtures
- `api/` - Endpoint-specific test files (e.g., `projects.test.ts`, `tickets.test.ts`)