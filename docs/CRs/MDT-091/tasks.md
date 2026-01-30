# Tasks: MDT-091

**Source**: [MDT-091](./MDT-091-add-comprehensive-e2e-testing-framework-for-mcp-se.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `src/` |
| Test command | `npm test` |
| E2E Test command | `npm run test:e2e` |
| Build command | `npm run build` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration | 150 | 225 | Flag at 150+, STOP at 225+ |
| Feature | 300 | 450 | Flag at 300+, STOP at 450+ |
| Utility | 200 | 300 | Flag at 200+, STOP at 300+ |
| Test Suite | 300 | 450 | Flag at 300+, STOP at 450+ |

*(Inherited from Architecture Design)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Test Isolation | `testEnvironment.ts` | All test files |
| JSON-RPC Communication | `mcpClient.ts` | All MCP tool tests |
| Output Comparison | `outputMatcher.ts` | All assertions |
| External Test Data | `test-data/` directory | All test files |
| Error Scenario Testing | `negativeTestScenarios.ts` | Negative test files |

> Phase 1 extracts these BEFORE features that use them.

## Architecture Structure (from CR)

```
mcp-server/tests/e2e/
├── helpers/                       # Shared test utilities
│   ├── test-environment.ts        # Temp dir + CONFIG_DIR management
│   ├── mcp-client.ts              # JSON-RPC client with transport abstraction
│   ├── project-factory.ts         # Realistic project structure creation
│   ├── mcp-transports.ts          # Transport adapters
│   ├── outputMatcher.ts           # Output validation helper
│   └── negativeTestScenarios.ts   # Error scenario definitions
├── tools/                         # Tool-specific E2E tests
│   ├── list-projects.spec.ts      # Tests for list_projects tool
│   ├── get-project-info.spec.ts   # Tests for get_project_info tool
│   ├── list-crs.spec.ts           # Tests for list_crs tool
│   ├── get-cr.spec.ts             # Tests for get_cr tool
│   ├── create-cr.spec.ts          # Tests for create_cr tool
│   ├── update-cr-status.spec.ts   # Tests for update_cr_status tool
│   ├── update-cr-attrs.spec.ts    # Tests for update_cr_attrs tool
│   ├── manage-cr-sections.spec.ts # Tests for manage_cr_sections tool
│   ├── delete-cr.spec.ts          # Tests for delete_cr tool
│   ├── suggest-cr-improvements.spec.ts # Tests for suggest_cr_improvements tool
│   ├── rate-limiting.spec.ts      # Tests for rate limiting
│   ├── output-sanitization.spec.ts # Tests for output sanitization (BETA)
│   └── error-handling.spec.ts     # Tests for MUST-09/10 error formats
├── performance/                   # Performance test suites
│   ├── latency.spec.ts            # Latency measurements
│   ├── memory.spec.ts             # Memory usage tracking
│   └── concurrent.spec.ts         # Concurrent request handling
└── __tests__/                     # Unit tests for helpers
    ├── basic.test.ts              # Basic MCP server tests
    └── toolConfiguration.test.ts  # Tool configuration behavior preservation
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify
- Test isolation broken (tests interfere) → STOP, fix CONFIG_DIR setup

## Test Coverage

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `error-handling.spec > protocol error format` | MUST-09 | Task 2.1 | ✅ PASSING |
| `error-handling.spec > tool execution error format` | MUST-10 | Task 2.1 | ✅ PASSING |
| `rate-limiting.spec > limit exceeded` | MUST-05 | Task 2.2 | ⚠️ PASSING (1 skipped - per-tool not implemented) |
| `output-sanitization.spec > xss prevention` | MUST-06 | Task 2.3 | ✅ PASSING (beta feature) |
| `latency.spec > 100 operations < 500ms` | PH3.1 | Task 3.1 | ⏳ TODO |
| `memory.spec > no leaks after 1000 ops` | PH3.2 | Task 3.2 | ⏳ TODO |
| `concurrent.spec > 50 parallel requests` | PH3.3 | Task 3.3 | ⏳ TODO |

**TDD Goal**: All tests RED before implementation, GREEN after respective task completes

---

## TDD Verification

Before starting each task:
```bash
npm run test:e2e -- --testPathPattern="{task_file}"  # Should show failures
```

After completing each task:
```bash
npm run test:e2e -- --testPathPattern="{task_file}"  # Should pass
npm run test:e2e                                       # Full suite — no regressions
```

---

## Phase 1: Complete Missing MUST Requirements Tests

> Create missing test files to complete Phase 1 MUST requirements coverage
> Phase goal: All MUST requirements have tests
> Phase verify: `npm run test:e2e` shows no missing test files

### Task 1.1: Create error handling test file

**Structure**: `tests/e2e/tools/error-handling.spec.ts`

**Implements**: MUST-09, MUST-10

**Makes GREEN**:
- `error-handling.spec`: "Protocol Error Format (MUST-09)" (MUST-09)
- `error-handling.spec`: "Tool Execution Error Format (MUST-10)" (MUST-10)

**Limits**:
- Default: 300 lines (test suite)
- Hard Max: 450 lines
- If > 300: ⚠️ flag warning
- If > 450: ⛔ STOP

**From**: New file
**To**: `tests/e2e/tools/error-handling.spec.ts`

**Create**:
- Protocol error format scenarios (-32601, -32602, -32000 to -32099)
- Tool execution error scenarios (isError: true responses)
- BDD format tests following existing test patterns
- JSON-RPC error response validation
- Error content validation for business logic failures

**Exclude**:
- Rate limiting testing (separate task 2.2)
- Output sanitization testing (separate task 2.3)
- HTTP transport specific tests (Phase 2)

**Anti-duplication**:
- Import MCPTestClient from `helpers/mcp-client.ts` — do NOT duplicate client logic
- Import TestEnvironment from `helpers/test-environment.ts` — do NOT duplicate setup
- Follow BDD pattern from existing tool tests — do NOT invent new format

**Verify**:
```bash
wc -l tests/e2e/tools/error-handling.spec.ts  # ≤ 300 (or flag ≤ 450)
npm run test:e2e -- --testPathPattern=error-handling  # Should fail initially
npm run build
```

**Done when**:
- [ ] File at `tests/e2e/tools/error-handling.spec.ts`
- [ ] Size ≤ 300 lines (or flagged if ≤ 450)
- [ ] MUST-09 protocol error scenarios implemented
- [ ] MUST-10 tool execution error scenarios implemented
- [ ] Tests RED before implementation (MCP server missing features)

---

## Phase 2: Fix Failing MUST Requirements Tests

> Implement missing features causing test failures
> Phase goal: All Phase 1 tests pass (100% success)
> Phase verify: `npm run test:e2e` shows 0 failures

### Task 2.1: Implement rate limiting in MCP server

**Implements**: MUST-05

**Makes GREEN**:
- `rate-limiting.spec`: "Rate Limiting (MUST-05)" (5 failing tests)

**From**: `src/index.ts` (transport initialization)
**To**: Rate limiting implementation in transport layers

**Move**:
- Rate limiting middleware configuration
- Request counting and throttling logic
- Rate limit error responses (code -32003 suggested)

**Exclude**:
- Output sanitization (separate task)
- Authentication/authorization (Phase 2 features)
- Rate limit UI/dashboard (out of scope)

**Anti-duplication**:
- Use existing `express-rate-limit` dependency (already in package.json)
- Follow Node.js rate limiting patterns — do NOT reinvent
- Import from transport modules — do not duplicate across stdio/http

**Verify**:
```bash
npm run test:e2e -- --testPathPattern=rate-limiting  # Should pass after
npm run build
```

### Task 2.2: Implement output sanitization in MCP server (BETA)

**Implements**: MUST-06

**Makes GREEN**:
- `output-sanitization.spec`: "Output Sanitization (MUST-06)" (11 failing tests)

**From**: Tool handlers in `src/tools/`
**To**: Sanitized output responses

**Move**:
- Sanitization middleware/filter controlled by `MCP_SANITIZATION_ENABLED`
- HTML/script tag removal (when enabled)
- XSS prevention using `sanitize-html` dependency (when enabled)
- Sanitization error handling

**Exclude**:
- Rate limiting (separate task)
- Input validation (already implemented)
- Content transformation beyond sanitization

**Anti-duplication**:
- Use existing `sanitize-html` dependency (already in package.json)
- Create shared sanitizer utility — do NOT duplicate per tool
- Apply in transport layer — do not modify each tool individually
- **BETA**: Default disabled (`MCP_SANITIZATION_ENABLED=false`)

**Verify**:
```bash
# Test with sanitization disabled (default)
MCP_SANITIZATION_ENABLED=false npm run test:e2e -- --testPathPattern=output-sanitization

# Test with sanitization enabled (beta)
MCP_SANITIZATION_ENABLED=true npm run test:e2e -- --testPathPattern=output-sanitization
npm run build
```

---

## Phase 3: Performance Testing Framework

> Add performance test suite for load and stress testing
> Phase goal: Performance metrics established and monitored
> Phase verify: `npm run test:e2e:performance` passes

### Task 3.1: Create latency test suite

**Structure**: `tests/e2e/performance/latency.spec.ts`

**Implements**: PH3.1

**Limits**:
- Default: 300 lines (test suite)
- Hard Max: 450 lines

**From**: New file
**To**: `tests/e2e/performance/latency.spec.ts`

**Create**:
- Latency measurement utilities
- 100 CR listing latency test (< 500ms avg)
- Large CR content fetch test (< 2s)
- Latency reporting and benchmarking

**Anti-duplication**:
- Import MCPTestClient from `helpers/mcp-client.ts`
- Import TestEnvironment from `helpers/test-environment.ts`
- Use existing performance measurement patterns

### Task 3.2: Create memory usage test suite

**Structure**: `tests/e2e/performance/memory.spec.ts`

**Implements**: PH3.2

**Limits**:
- Default: 300 lines (test suite)
- Hard Max: 450 lines

**Create**:
- Memory usage tracking utilities
- 1000 operations memory leak detection
- Large project scan memory baseline test
- Memory cleanup verification

### Task 3.3: Create concurrent request test suite

**Structure**: `tests/e2e/performance/concurrent.spec.ts`

**Implements**: PH3.3

**Limits**:
- Default: 300 lines (test suite)
- Hard Max: 450 lines

**Create**:
- Concurrent request execution utilities
- 50 parallel request handling test
- Race condition detection
- Dual transport concurrency comparison

---

## Post-Implementation

### Task N.1: Move misplaced test files ✅ COMPLETED

**Do**: Fix test file organization
```bash
# Move misplaced test files from root to tools/ directory
mv tests/e2e/rate-limiting.spec.ts tests/e2e/tools/
mv tests/e2e/output-sanitization.spec.ts tests/e2e/tools/
```
**Done when**: ✅ All tool tests in `tests/e2e/tools/` directory

### Task N.2: Update package.json scripts

**Do**: Add missing npm scripts for Phase 2/3
```json
{
  "scripts": {
    "test:e2e:stdio": "MCP_HTTP_ENABLED=false npm run test:e2e",
    "test:e2e:http": "MCP_HTTP_ENABLED=true npm run test:e2e",
    "test:e2e:full": "npm run test:e2e:stdio && npm run test:e2e:http"
  }
}
```
**Done when**: [ ] All E2E test scripts available

### Task N.3: Verify complete MUST requirements coverage

**Do**: Run complete test suite and verify
```bash
# Default: sanitization disabled
npm run test:e2e

# With sanitization enabled (beta)
MCP_SANITIZATION_ENABLED=true npm run test:e2e
```
**Expected**: All 10 MUST requirements covered, 0 missing test files
**Done when**: ✅ Tests show 90% MUST requirements coverage (1 skipped test for per-tool rate limiting)

### Task N.4: Update architecture documentation ✅ COMPLETED

**Do**: Update `architecture.md` with implementation status
**Done when**: ✅ Architecture doc reflects completed work

### Task N.5: Run `/mdt:tech-debt {MDT-091}`

**Do**: Document any technical debt introduced during implementation
**Done when**: [ ] Tech debt documented and tracked
