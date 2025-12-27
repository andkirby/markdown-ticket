---
code: MDT-106
status: In Progress
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
- Backend: API endpoints in `server/routes/` (projects, tickets, documents, sse, system, docs)
- Backend: Business logic in `server/services/` and `server/controllers/`
- Tests: New E2E test infrastructure and test suites

**Note**: Devtools endpoint (`/api/devtools/*`) is excluded - development-only feature with stateful session management.
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

### Decisions Made (2025-12-26)
- Test file organization: Endpoint-based structure (e.g., `projects.test.ts`, `tickets.test.ts`) in `server/test/api/`
- Test runner: Jest + Supertest (per E2E testing guide)
- Fixtures location: `server/test/api/fixtures/`
- SSE testing: EventSource client simulation
- Authentication: No authentication required (all endpoints are public)
- Coverage tool: Istanbul/nyc for >80% coverage reports

### Decisions Deferred
- Specific test utilities and helpers — determined by `/mdt:architecture`
- Mock strategy for external dependencies — determined by `/mdt:architecture`
- Test data fixtures and seed data structure — determined by `/mdt:architecture`

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Test-Factory Pattern with centralized setup/teardown and shared helpers
- Components: 14 modules (3 helpers, 3 fixtures, 7 endpoint test files, 1 setup)
- Key constraint: Helper files ≤100 lines, endpoint test files ≤350 lines, total suite ~2,500 lines

**Extension Rule**: To add endpoint tests, create `{endpoint}.test.ts` (limit 300 lines for standard CRUD, 350 for complex) importing helpers from `helpers/index.ts` and using `setup.ts` for TestEnvironment lifecycle.
## 3. Open Questions
- **Q: How should the E2E test files be organized in server/test/api/?** → A: By endpoint (projects.test.ts, tickets.test.ts)
- **Q: Which test runner should be used for E2E API tests?** → A: Specified in the document about e2e testing (supertest + jest openapi)
- **Q: Where should test fixture data be stored?** → A: server/test/api/fixtures/
- **Q: How should Server-Sent Events (SSE) endpoints be tested?** → A: EventSource client simulation
- **Q: How should protected endpoints requiring authentication be tested?** → A: We don't have auth
- **Q: Which coverage tool should generate the >80% coverage reports?** → A: Istanbul/nyc
## 4. Acceptance Criteria
### Functional (Outcome-focused)
- [ ] All API endpoints in `server/routes/` have E2E test coverage organized by endpoint (e.g., `projects.test.ts`, `tickets.test.ts`, `documents.test.ts`, `sse.test.ts`, `system.test.ts`, `openapi-docs.test.ts`)

- [ ] Tests use `shared/test-lib` for environment isolation with Jest + Supertest
- [ ] Tests can run concurrently without port conflicts using endpoint-based organization
- [ ] Test data in `server/tests/api/fixtures/` is properly isolated and cleaned up
- [ ] EventSource client simulation verifies SSE endpoint behavior (connection lifecycle, message delivery, reconnection)

**Note**: Devtools endpoint excluded - development-only feature with stateful session management.
### Non-Functional
- [ ] Tests complete in under 60 seconds total using Jest + Supertest
- [ ] Tests can run in CI/CD environment with Istanbul/nyc coverage reports
- [ ] Test coverage > 80% for API endpoints measured by Istanbul/nyc
- [ ] No tests depend on execution order (endpoint-based organization supports concurrent execution)
### Edge Cases
- Empty result sets (e.g., no projects found)
- Invalid request bodies (missing required fields, wrong types)
- Malformed YAML in markdown files
- File system errors during ticket operations
- Concurrent write operations

### Requirements Specification
- [`docs/CRs/MDT-106/requirements.md`](./MDT-106/requirements.md) — EARS-formatted requirements
## 8. Clarifications
### Session 2025-12-26

**Questions Asked**: 6
**Sections Updated**: Open Questions, Desired Outcome (Decisions Made), Acceptance Criteria (Functional/Non-Functional), Verification

**Clarifications Recorded**:
- **Q1**: Test file organization → **A**: By endpoint (projects.test.ts, tickets.test.ts)
- **Q2**: Test runner selection → **A**: Jest + Supertest (per E2E testing guide)
- **Q3**: Fixtures location → **A**: server/test/api/fixtures/
- **Q4**: SSE endpoint testing → **A**: EventSource client simulation
- **Q5**: Authentication testing → **A**: Not applicable (no authentication on endpoints)
- **Q6**: Coverage tool → **A**: Istanbul/nyc

**Impact on CR**:
- Resolved test structure ambiguity (endpoint-based organization)
- Clarified testing stack (Jest + Supertest + Istanbul/nyc)
- Eliminated authentication testing scope (all endpoints public)
- Specified SSE testing approach (EventSource simulation)

**Remaining Decisions Deferred** (to architecture phase):
- Specific test utilities and helpers implementation
- Mock strategy for external dependencies
- Test data fixtures and seed data structure