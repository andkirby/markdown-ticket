# Tests: MDT-091

**Mode**: Feature Enhancement
**Source**: MDT-091 CR specification
**Generated**: 2025-12-12
**Status**: 🟡 Phase 1 Complete, Phase 2 Pending

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test directory | `tests/e2e/` |
| Test command | `npm run test:e2e` |
| CR test filter | `--testPathPattern=MDT-091` |
| Transport modes | stdio (✅), HTTP (⏳) |

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| PH1.1 | E2E tests cover all 10 MCP tools via stdio | `tools/*.spec.ts` | 10 tools × 3+ scenarios | ✅ GREEN |
| PH1.2 | Test isolation via CONFIG_DIR | `helpers/test-environment.ts` | mkdtemp, cleanup | ✅ GREEN |
| PH1.3 | Temporary test directories | `helpers/test-environment.ts` | unique per test | ✅ GREEN |
| PH1.4 | Test projects with .mdt-config.toml | `helpers/project-factory.ts` | 3 project types | ✅ GREEN |
| PH2.1 | HTTP transport testing | `tools/*.spec.ts` | HTTP mode tests | ⏳ TODO |
| PH2.2 | Performance test suite | `performance/` | Load, latency, memory | ⏳ TODO |

## Test Specifications

### Phase 1: Stdio Transport E2E Testing ✅

**Feature**: MCP Tools Coverage
**Files**: `tests/e2e/tools/*.spec.ts`
**Covers**: All 10 MCP tools

#### Tool Coverage Matrix

| Tool | Test File | Scenarios | Status |
|------|-----------|-----------|--------|
| list_projects | `tools/list-projects.spec.ts` | 6 scenarios | ✅ GREEN |
| get_project_info | `tools/get-project-info.spec.ts` | 5 scenarios | ✅ GREEN |
| list_crs | `tools/list-crs.spec.ts` | 6 scenarios | ✅ GREEN |
| create_cr | `tools/create-cr.spec.ts` | 7 scenarios | ✅ GREEN |
| get_cr | `tools/get-cr.spec.ts` | 8 scenarios | ✅ GREEN |
| update_cr_status | `tools/update-cr-status.spec.ts` | 5 scenarios | ✅ GREEN |
| update_cr_attrs | `tools/update-cr-attrs.spec.ts` | 6 scenarios | ✅ GREEN |
| delete_cr | `tools/delete-cr.spec.ts` | 4 scenarios | ✅ GREEN |
| manage_cr_sections | `tools/manage-cr-sections.spec.ts` | 9 scenarios | ✅ GREEN |
| suggest_cr_improvements | `tools/suggest-cr-improvements.spec.ts` | 4 scenarios | ✅ GREEN |

#### Test Environment Infrastructure

**File**: `tests/e2e/helpers/test-environment.ts`
**Purpose**: Isolated test directories with CONFIG_DIR
**Scenarios**:
- Creates unique temp directory per test using mkdtemp
- Sets CONFIG_DIR environment variable for isolation
- Automatic cleanup with safety checks
- Cross-platform compatibility (Windows/Unix)

**File**: `tests/e2e/helpers/project-factory.ts`
**Purpose**: Creates realistic project structures
**Scenarios**:
- Empty project with basic .mdt-config.toml
- Single CR project with sample ticket
- Multi-CR project with dependencies

**File**: `tests/e2e/helpers/mcp-client.ts`
**Purpose**: Unified MCP client for both transports
**Scenarios**:
- JSON-RPC 2.0 protocol handling
- Stdio transport spawning and communication
- Error handling and retry logic

### Phase 2: HTTP Transport Testing ⏳

**Feature**: HTTP Transport Coverage
**Files**: `tests/e2e/tools/*.spec.ts` (extended)
**Covers**: HTTP-specific scenarios

#### Required HTTP Test Scenarios

1. **HTTP Transport Initialization**
   - GIVEN MCP_HTTP_ENABLED=true WHEN starting THEN server binds to port
   - GIVEN custom port WHEN starting THEN uses specified port
   - GIVEN both transports WHEN client connects THEN supports both

2. **HTTP-specific Features**
   - GIVEN SSE enabled WHEN client connects THEN receives events
   - GIVEN rate limiting WHEN exceeded THEN returns 429
   - GIVEN authentication enabled WHEN missing token THEN returns 401

3. **Dual Transport Testing**
   - GIVEN same operation WHEN stdio THEN matches HTTP response
   - GIVEN concurrent requests WHEN both transports THEN handle gracefully

### Phase 3: Performance Testing ⏳

**Feature**: Performance and Load Testing
**Directory**: `tests/e2e/performance/` (TO BE CREATED)
**Covers**: Latency, memory, concurrent requests

#### Required Performance Test Scenarios

1. **Request/Response Latency**
   - GIVEN 100 CR listings WHEN measured THEN avg < 500ms
   - GIVEN large CR content WHEN fetched THEN < 2s

2. **Memory Usage**
   - GIVEN 1000 operations WHEN measured THEN no memory leaks
   - GIVEN large project scan WHEN completed THEN memory returns to baseline

3. **Concurrent Request Handling**
   - GIVEN 50 parallel requests WHEN processed THEN all succeed
   - GIVEN mixed operations WHEN concurrent THEN no race conditions

## Edge Cases

| Scenario | Expected Behavior | Test | Status |
|----------|-------------------|------|--------|
| Invalid project key | Error with available projects | All tool tests | ✅ |
| Non-existent CR | "not found" error | get_cr, delete_cr | ✅ |
| Corrupted YAML frontmatter | Parse error with file path | get_cr, manage_cr_sections | ✅ |
| Empty project directory | "No projects found" | list_projects | ✅ |
| Malformed JSON-RPC | Protocol error response | mcp-client.ts | ✅ |
| HTTP transport unavailable | Fallback to stdio | Phase 2 tests | ⏳ |
| Timeout during large operation | Timeout error with retry info | Performance tests | ⏳ |

## Generated Test Files

### Existing Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `tests/e2e/tools/list-projects.spec.ts` | 6 | 229 | ✅ GREEN |
| `tests/e2e/tools/get-project-info.spec.ts` | 5 | ~180 | ✅ GREEN |
| `tests/e2e/tools/list-crs.spec.ts` | 6 | ~220 | ✅ GREEN |
| `tests/e2e/tools/create-cr.spec.ts` | 7 | ~280 | ✅ GREEN |
| `tests/e2e/tools/get-cr.spec.ts` | 8 | ~300 | ✅ GREEN |
| `tests/e2e/tools/update-cr-status.spec.ts` | 5 | ~200 | ✅ GREEN |
| `tests/e2e/tools/update-cr-attrs.spec.ts` | 6 | ~240 | ✅ GREEN |
| `tests/e2e/tools/delete-cr.spec.ts` | 4 | ~180 | ✅ GREEN |
| `tests/e2e/tools/manage-cr-sections.spec.ts` | 9 | ~400 | ✅ GREEN |
| `tests/e2e/tools/suggest-cr-improvements.spec.ts` | 4 | ~160 | ✅ GREEN |

### Helper Files

| File | Purpose | Lines | Status |
|------|---------|-------|--------|
| `tests/e2e/helpers/test-environment.ts` | Test isolation | 260 | ✅ ACTIVE |
| `tests/e2e/helpers/mcp-client.ts` | MCP transport client | ~300 | ✅ ACTIVE |
| `tests/e2e/helpers/project-factory.ts` | Test data creation | ~200 | ✅ ACTIVE |
| `tests/e2e/helpers/mcp-transports.ts` | Transport adapters | ~250 | ✅ ACTIVE |

### Missing Files (To Be Created)

| File | Scenarios | Est. Lines | Status |
|------|-----------|------------|--------|
| `tests/e2e/tools/http-transport.spec.ts` | HTTP-specific tests | ~300 | ⏳ TODO |
| `tests/e2e/performance/latency.spec.ts` | Latency measurements | ~200 | ⏳ TODO |
| `tests/e2e/performance/memory.spec.ts` | Memory usage tracking | ~200 | ⏳ TODO |
| `tests/e2e/performance/concurrent.spec.ts` | Concurrent requests | ~250 | ⏳ TODO |

## Verification

### Phase 1 Verification ✅
```bash
# Run stdio E2E tests
MCP_HTTP_ENABLED=false npm run test:e2e

# Expected: All tests pass (GREEN)
# Results: ✅ All 60+ scenarios passing
```

### Phase 2 Verification ⏳
```bash
# Run HTTP transport tests
MCP_HTTP_ENABLED=true npm run test:e2e

# Expected: All stdio tests + HTTP tests pass
# Status: ⏳ Implementation pending
```

### Performance Verification ⏳
```bash
# Run performance tests
npm run test:e2e:performance

# Expected: Performance metrics within thresholds
# Status: ⏳ Tests not implemented
```

## Coverage Checklist

### Phase 1: Stdio Transport ✅
- [x] All 10 MCP tools have E2E tests
- [x] Test isolation via CONFIG_DIR
- [x] Temporary directories with cleanup
- [x] Realistic project structures
- [x] Error scenarios covered
- [x] BDD scenario format (Given/When/Then)

### Phase 2: HTTP Transport ⏳
- [x] Infrastructure exists in mcp-client.ts
- [ ] HTTP transport initialization tests
- [ ] SSE streaming tests
- [ ] Authentication tests
- [ ] Rate limiting tests
- [ ] CORS and origin validation
- [ ] Dual transport comparison

### Phase 3: Performance ⏳
- [ ] Latency measurement tests
- [ ] Memory usage tracking
- [ ] Concurrent request handling
- [ ] Large dataset handling
- [ ] Resource cleanup verification

## Test Execution Summary

### Current Status: 🟡 Phase 1 Complete, Phase 2 Pending

**Phase 1 Achievements:**
- ✅ 60+ test scenarios across 10 tools
- ✅ Complete test isolation infrastructure
- ✅ Realistic test data generation
- ✅ Comprehensive error coverage
- ✅ BDD-formatted scenarios

**Phase 2 Requirements:**
- HTTP transport test implementation
- Security feature testing (auth, rate limiting)
- Dual transport verification
- SSE streaming validation

**Phase 3 Requirements:**
- Performance test suite creation
- Load testing infrastructure
- Memory leak detection
- Benchmark establishment

## Implementation Tasks Reference

| Task ID | Description | Makes Green |
|---------|-------------|-------------|
| MDT-091.1 | Create HTTP transport tests | `http-transport.spec.ts` |
| MDT-091.2 | Implement SSE tests | SSE scenarios in HTTP tests |
| MDT-091.3 | Add authentication tests | Auth scenarios in HTTP tests |
| MDT-091.4 | Create performance test suite | `performance/*.spec.ts` |
| MDT-091.5 | Implement latency benchmarks | `latency.spec.ts` |
| MDT-091.6 | Add memory tracking | `memory.spec.ts` |
| MDT-091.7 | Create concurrent tests | `concurrent.spec.ts` |

## Next Steps

1. **Immediate**: Implement Phase 2 HTTP transport tests
2. **Short-term**: Create performance test suite
3. **Validation**: Run full test suite with both transports
4. **CI/CD**: Update pipeline to run Phase 1 tests first, Phase 2 on merge

---

## Test Execution Commands

```bash
# Phase 1: Stdio transport only
MCP_HTTP_ENABLED=false npm run test:e2e

# Phase 2: HTTP transport (when implemented)
MCP_HTTP_ENABLED=true npm run test:e2e

# Phase 3: Performance tests (when implemented)
npm run test:e2e:performance

# Development/watch mode
npm run test:e2e:watch

# Individual test files
npm run test:e2e -- tools/list-projects.spec.ts
```