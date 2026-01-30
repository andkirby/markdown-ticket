---
code: MDT-107
status: Proposed
dateCreated: 2025-12-27T09:11:29.041Z
type: Technical Debt
priority: Medium
dependsOn: MDT-091
---

# Add MCP server HTTP Transport E2E Testing Coverage

## 1. Description

### Requirements Scope
`none` — Architecture/design will determine approach

### Problem

- **MDT-091 Phase 1** completed stdio transport E2E testing (221 passing, 1 skipped)
- **HTTP transport** (`mcp-server/src/transports/http.ts`) lacks automated E2E test coverage
- **Production deployments** (Docker, containers) use HTTP transport without test safety net
- **Phase 2 security features** (authentication, rate limiting, CORS, SSE) have no E2E validation

### Affected Areas

- **Backend**: MCP server HTTP transport layer
- **Testing**: E2E test infrastructure
- **Integration**: JSON-RPC over HTTP endpoints (`POST /mcp`, `GET /mcp`, `GET /health`)

### Scope

- **In scope**: Achieve E2E test parity for HTTP transport; validate MCP Streamable HTTP specification (2025-06-18) compliance
- **Out of scope**: Implementation approach (deferred to `/mdt:architecture`)

### Relationships

- **Knowledge source**: MDT-091 (stdio test patterns to reference/reuse)
- **Depends On**: MDT-091 (requires Phase 1 E2E framework as foundation)
- **Unblocks**: MDT-090, MDT-097 (refactoring work blocked on complete E2E safety net)

## 2. Desired Outcome

HTTP transport achieves same E2E coverage level as stdio transport.

### Success Conditions

- All 10 MCP tools tested via HTTP transport with same scenarios as stdio
- Phase 2 security features (auth, rate limiting, CORS, SSE) have E2E coverage
- Test execution completes in reasonable time (target: < 90 seconds)
- Both transports produce identical results for same tool calls

### Constraints

- Must leverage existing MDT-091 test infrastructure where possible (`TestEnvironment`, `TestDataFactory`)
- Must validate MCP Streamable HTTP specification (2025-06-18) compliance
- Tests must work in CI/CD environment (no manual intervention required)
- Must maintain test isolation (CONFIG_DIR, temporary directories)

### Non-Goals

- Not changing existing stdio transport tests
- Not modifying MCP tool implementations (only testing them)
- Not changing HTTP transport implementation (only testing it)

## 3. Open Questions

Questions to resolve during architecture/design:

| Area | Question | Constraints |
|------|----------|-------------|
| Architecture | Extend MDT-091 test patterns or create separate HTTP test suite? | Must reuse existing infrastructure |
| Test Client | How to implement `HTTPMCPClient`? Extend `MCPTestClient` or new base class? | Must match stdio client interface |
| SSE Testing | How to test server-sent events (GET /mcp)? | Requires real SSE client or simulation |
| Security Testing | How to safely test auth/rate limiting without real credentials? | Must use test tokens/mocks |
| Test Execution | Run tests sequentially or in parallel? Both transports at once or separate runs? | Must maintain isolation |

### Known Constraints

- `MCP_HTTP_ENABLED=true` environment variable enables HTTP transport
- HTTP server binds to `MCP_HTTP_PORT` (default: 3002, use ephemeral port in tests)
- Phase 2 features are optional and disabled by default
- MDT-091 test infrastructure exists in `mcp-server/tests/e2e/`

### Decisions Deferred

- Implementation approach (determined by `/mdt:architecture`)
- Specific test files and structure (determined by `/mdt:architecture`)
- Task breakdown (determined by `/mdt:tasks`)
- Whether to test Phase 2 features in same CR or separate

## 4. Acceptance Criteria

### Functional (Outcome-focused)

- [ ] All 10 MCP tools execute successfully via HTTP transport
- [ ] JSON-RPC responses match stdio transport responses for all tools
- [ ] Health check endpoint (`GET /health`) returns valid status
- [ ] Server-Sent Events (SSE) streaming works when enabled
- [ ] Authentication rejects requests without valid Bearer token (when enabled)
- [ ] Rate limiting blocks excessive requests (when enabled)
- [ ] CORS validation blocks unauthorized origins (when enabled)

### Non-Functional

- [ ] E2E test suite completes in < 90 seconds
- [ ] Test isolation maintained (no cross-test state leakage)
- [ ] Tests pass consistently in CI/CD environment
- [ ] No process leaks after HTTP server tests
- [ ] Memory usage stable during test execution

### Edge Cases

- HTTP server fails to start → test fails cleanly with cleanup
- Connection timeout → test fails with clear error message
- Malformed JSON-RPC → server returns proper error response
- Concurrent requests → server handles correctly
- Transport switching → same tests work on both stdio and HTTP

## 5. Verification

### How to Verify Success

- **Automated**: Run `npm run test:e2e:http` — all tests pass
- **Comparison**: Run same tool via both transports → identical results
- **Coverage**: Review test report — all 10 tools covered, Phase 2 features tested
- **Manual**: Start HTTP server with `MCP_HTTP_ENABLED=true`, invoke tools via curl

### Metrics

No baseline metrics yet — establish during implementation:
- Test execution time (target: < 90 seconds)
- Number of tests passing (target: 221+ matching stdio coverage)
- Code coverage percentage for HTTP transport
