---
code: MDT-125
status: Proposed
dateCreated: 2026-02-08T21:38:44.771Z
type: Bug Fix
priority: Medium
---

# Fix failing tests across server, MCP server, and shared code

## 1. Description

### Requirements Scope
`brief` — Bug fix, focus on what's broken

### Problem
- Server tests: 53 failures across 2 test files (TypeScript compilation errors + silent runtime failures)
- MCP server tests: ~15 tests timing out at 30 seconds (projects created after server startup)
- Shared tests: 2 git worktree matcher failures expecting undefined values

### Affected Areas
- server/: Test suites in tests/api/ (api.test.ts, projects.test.ts, sse.test.ts, system.test.ts, documents.test.ts)
- mcp-server/: E2E test suites (get-project-info.spec.ts, list-crs.spec.ts, update-cr-status.spec.ts, delete-cr.spec.ts)
- shared/: services/project/__tests__/ProjectService.test.ts

### Scope
- **In scope**: Fix test failures to restore CI/CD reliability
- **Out of scope**: Adding new tests, refactoring production code (unless necessary for fix)

## 2. Desired Outcome

### Success Conditions
- All server tests pass (npm run server:test)
- All MCP server tests pass (npm run mcp:test)
- All shared tests pass (npm run shared:test)

### Constraints
- Must maintain backward compatibility with existing test patterns
- Must not change production code behavior unless necessary for fix
- Must preserve test isolation (no cross-test pollution)

### Non-Goals
- Not changing test framework (Jest, supertest)
- Not adding new test capabilities
- Not modifying test configuration unless required for fix

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Server runtime | Why do tests fail with empty error messages? | Must diagnose root cause before fix |
| MCP discovery | Should tests support dynamic project creation or require pre-setup? | Must decide test pattern |
| Shared matcher | Is test data missing or matcher misconfigured? | Must verify test expectations |

### Known Constraints
- MCP server discovers projects at startup (ProjectService.getAllProjects())
- Server tests use setupTestEnvironment() helper from tests/api/setup.ts
- Shared tests use behavioral preservation matchers from test-lib/__tests__/matchers.ts

### Decisions Deferred
- Whether to add MCP project rediscovery endpoint
- Whether to fix or rewrite server runtime test failures
- Whether to update test data or fix matcher expectations

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] npm run server:test passes with 0 failures
- [ ] npm run mcp:test passes with 0 failures
- [ ] npm run shared:test passes with 0 failures
- [ ] All TypeScript compilation errors resolved
- [ ] All test timeouts eliminated

### Non-Functional
- [ ] Test execution time < 5 minutes total
- [ ] No new test flakiness introduced
- [ ] No MaxListenersExceededWarning emissions

### Edge Cases
- What happens when tests are run in isolation vs. full suite
- What happens when MCP server tests create projects dynamically
- What happens when git worktree tests run in non-git environments

## 5. Verification

### How to Verify Success
- Automated verification: Run each test suite individually (server, MCP, shared)
- Automated verification: Run full test suite to check for cross-suite pollution
- Manual verification: Review error messages to ensure they're descriptive

### Known Issues from Investigation

#### Server Test Failures (53 total)
**TypeScript Compilation Errors:**
- api.test.ts:289 — createProject() expects string "empty", not object
- projects.test.ts:410 — find() result possibly undefined
- sse.test.ts:52,271 — SuperAgent type conflicts between packages
- sse.test.ts:615 — MockEventStream type incompatibility

**Runtime Silent Failures:**
- system.test.ts: 20 tests fail with completely empty error messages
- documents.test.ts: 33 tests fail with completely empty error messages
- All failing tests use setupTestEnvironment() helper

#### MCP Server Test Failures (~15 total)
**Root Cause:** Tests create projects AFTER MCP server starts, but server discovers projects at startup.
- All tests timeout at 30 seconds (server hangs on tool calls)
- Affected: get-project-info.spec.ts, list-crs.spec.ts, update-cr-status.spec.ts, delete-cr.spec.ts
- MaxListenersExceededWarning: 11 error listeners added (max 10)

**Pattern:**
```typescript
// Broken:
beforeEach(async () => {
  await projectSetup.createProjectStructure('TEST', 'Test Project')
  await mcpClient.start()  // Server discovers projects HERE
})

it('test', async () => {
  await projectFactory.createProjectStructure('EMPTY', 'Empty Project')  // Too late!
  const response = await callTool('list_crs', { project: 'EMPTY' })  // Fails
})
```

#### Shared Test Failures (2 total)
- ProjectService.test.ts: "should exclude git worktree when discovering all projects"
- ProjectService.test.ts: "should only scan main projects when scanGitWorktrees is false"
- Error: "value attribute to contain a value" but received undefined
- Stack trace points to test-lib/__tests__/matchers.ts:52:13

## 6. Implementation Notes

### Quick Reference (Execution Order)

| Priority | Area | Quick Fix | Est. Time |
|----------|------|-----------|-----------|
| P0 | MCP tests | Create projects before mcpClient.start() | 5-10 min |
| P1 | Shared tests | Fix git worktree test data/matcher | 10-15 min |
| P2 | Server TS errors | Fix type mismatches in 4 files | 30-45 min |
| P3 | Server runtime | Debug silent failures (unknown cause) | 1-2 hrs |

### Recent Changes (Potential Root Cause)
- mcp-server/src/tools/handlers/crHandlers.ts — Added debug console.error statements
- shared/services/TicketService.ts — Added ticket.content = markdownContent synchronization

### Diagnostic Commands
```bash
# Verify failures
cd server && npm test
cd mcp-server && npm run build && npm test
cd shared && npm test

# Check specific recent changes
git diff HEAD~1 mcp-server/src/tools/handlers/crHandlers.ts
git diff HEAD~1 shared/services/TicketService.ts

# Run specific test file with verbose output
cd server && npm test -- tests/api/system.test.ts --verbose
cd mcp-server && npm test -- tests/e2e/tools/list-crs.spec.ts --verbose
```

### Entry Points for Investigation

**Server Tests:**
- server/tests/api/setup.ts (setupTestEnvironment helper - used by all failing runtime tests)
- server/tests/api/system.test.ts (20 silent failures start here)
- server/tests/integration/api.test.ts:289 (TypeScript error: createProject expects string)
- server/tests/api/projects.test.ts:410 (TypeScript error: find() possibly undefined)
- server/tests/api/sse.test.ts:52, 271, 615 (TypeScript errors: SuperAgent type conflicts)

**MCP Tests:**
- mcp-server/tests/e2e/tools/list-crs.spec.ts:31 (beforeEach creates project, but tests create more after start)
- mcp-server/tests/e2e/tools/list-crs.spec.ts:166+ (each test creates projects AFTER server started)
- mcp-server/src/tools/handlers/crHandlers.ts (recent changes with console.error added)
- mcp-server/tests/e2e/tools/get-project-info.spec.ts (all 10 tests timeout)
- mcp-server/tests/e2e/tools/update-cr-status.spec.ts (createTestCR fails due to project not found)

**Shared Tests:**
- shared/test-lib/__tests__/matchers.ts:52 (matcher throwing "value" undefined error)
- shared/services/project/__tests__/ProjectService.test.ts:161 (first failing test)
- shared/services/project/__tests__/ProjectService.test.ts:176 (second failing test)

### Full File Paths (Quick Navigation)

**Server:**
- server/tests/integration/api.test.ts:289
- server/tests/api/projects.test.ts:410
- server/tests/api/sse.test.ts:52, 271, 615
- server/tests/api/system.test.ts (20 failing tests, all with empty error messages)
- server/tests/api/documents.test.ts (33 failing tests, all with empty error messages)
- server/tests/api/setup.ts (setupTestEnvironment helper)

**MCP Server:**
- mcp-server/tests/e2e/tools/get-project-info.spec.ts (10/10 tests timeout)
- mcp-server/tests/e2e/tools/list-crs.spec.ts:31 (beforeEach), 166+ (individual test failures)
- mcp-server/tests/e2e/tools/update-cr-status.spec.ts (5+ tests timeout at createCR)
- mcp-server/tests/e2e/tools/delete-cr.spec.ts (createCR failures)
- mcp-server/src/tools/handlers/crHandlers.ts (recent console.error additions)
- mcp-server/tests/e2e/mcp-client.ts (MCP client wrapper for tests)

**Shared:**
- shared/services/project/__tests__/ProjectService.test.ts:161, 176
- shared/test-lib/__tests__/matchers.ts:52 (valueExtractor, value expectation)
- shared/services/ProjectService.ts (production code being tested)

### MCP Test Fix Pattern (Detailed)

**The Problem (Current Code):**
```typescript
// mcp-server/tests/e2e/tools/list-crs.spec.ts
beforeEach(async () => {
  // Step 1: Create ONE project
  await projectSetup.createProjectStructure('TEST', 'Test Project')

  // Step 2: Start MCP server (discovers projects at THIS moment)
  await mcpClient.start()  // Only sees 'TEST' project
})

describe('basic Listing', () => {
  it('GIVEN empty project WHEN listing CRs THEN return empty list', async () => {
    // Step 3: Try to create ANOTHER project (TOO LATE!)
    await projectFactory.createProjectStructure('EMPTY', 'Empty Project')

    // Step 4: Call MCP tool with unknown project
    const response = await callListCRs('EMPTY')  // FAILS: Project not found
    expect(response.success).toBe(true)  // Never reaches here
  })
})
```

**The Fix:**
```typescript
beforeEach(async () => {
  // Step 1: Create ALL projects needed by ALL tests
  await projectSetup.createProjectStructure('TEST', 'Test Project')
  await projectFactory.createProjectStructure('EMPTY', 'Empty Project')
  await projectFactory.createProjectStructure('REPO', 'Repo Project')
  await projectFactory.createProjectStructure('CRS', 'Project with CRs')
  await projectFactory.createProjectStructure('NOREPO', 'No Repo Project')
  await projectFactory.createProjectStructure('SPEC', 'Special-Project_Test')
  await projectFactory.createProjectStructure('FMT', 'Format Test')
  await projectFactory.createProjectStructure('PERF', 'Performance Test')

  // Step 2: THEN start MCP server (discovers ALL projects)
  await mcpClient.start()
})

describe('basic Listing', () => {
  it('GIVEN empty project WHEN listing CRs THEN return empty list', async () => {
    // Project already exists, just use it
    const response = await callListCRs('EMPTY')  // WORKS!
    expect(response.success).toBe(true)
  })
})
```

**Files Requiring This Fix:**
- mcp-server/tests/e2e/tools/get-project-info.spec.ts (creates TEST, REPO, CRS, NOREPO, SPEC, FMT, PERF)
- mcp-server/tests/e2e/tools/list-crs.spec.ts (creates EMPTY, TEST)
- mcp-server/tests/e2e/tools/update-cr-status.spec.ts (creates TEST for update tests)
- mcp-server/tests/e2e/tools/delete-cr.spec.ts (creates TEST for delete tests)

### Server TypeScript Fixes (Detailed)

**api.test.ts:289**
```typescript
// Current (broken):
const emptyProject = await projectFactory.createProject({
  name: 'Empty Test Project',
  code: 'EMPTY',
})

// Fix: Check factory method signature
// If it expects a string, use:
const emptyProject = await projectFactory.createProject('empty')
```

**projects.test.ts:410**
```typescript
// Current (broken):
const listed = (listRes.body as ProjectListItem[]).find(p => p.id === project.key)
expect(listed.id).toBe(configRes.body.project.id)

// Fix: Add null check
const listed = (listRes.body as ProjectListItem[]).find(p => p.id === project.key)
expect(listed?.id).toBe(configRes.body.project.id)
```

**sse.test.ts:52, 271 (SuperAgent type conflicts)**
```typescript
// Issue: openapi-validator has its own @types/superagent that conflicts
// Potential fixes:
// 1. Use type assertion: res as any
// 2. Import supertest Response type explicitly
// 3. Check if openapi-validator types can be excluded
```

**sse.test.ts:615 (MockEventStream type incompatibility)**
```typescript
// Issue: Event handler signature mismatch (unknown vs Error)
// Fix: Align the mock with Readable base class interface
class MockEventStream extends Readable {
  on(event: string, handler: (...args: any[]) => void): this {
    return super.on(event, handler)
  }
}
```

### Server Runtime Silent Failures (Diagnostic Approach)

**Symptom:** 53 tests fail with completely empty error messages

**Diagnostic Steps:**
1. Run with DEBUG=true: `DEBUG=true npm test -- tests/api/system.test.ts`
2. Check Jest configuration for custom reporters suppressing errors
3. Add try/catch in setupTestEnvironment to capture errors
4. Verify Express app initialization completes successfully
5. Check if CONFIG_DIR is being set correctly before app starts
6. Look for unhandled promise rejections
7. Run tests individually to isolate if it's a suite-level issue

**Hypothesis:** The setupTestEnvironment helper may be swallowing errors or failing silently before tests execute.

### Shared Git Worktree Test Failures

**Failing Tests:**
- "should exclude git worktree when discovering all projects" (line 161)
- "should only scan main projects when scanGitWorktrees is false" (line 176)

**Error:** `"value" attribute to contain a value` but received `undefined`

**Diagnostic Steps:**
1. Read the test at line 161 to understand what value it expects
2. Read test-lib/__tests__/matchers.ts:52 to understand the matcher logic
3. Check if test data creates the expected project structure
4. Verify the behavioral preservation matcher expectations
5. May need to update test data OR fix the matcher to handle undefined