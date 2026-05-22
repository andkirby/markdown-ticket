# Tests: MDT-157

**Source**: [MDT-157](../MDT-157-api-auth.md)  
**Trace projection**: [tests.trace.md](./tests.trace.md)  
**Mode**: normal, RED executable tests

## Scope

This pass adds executable RED tests and canonical `spec-trace` test-plan records for backend REST API authentication, MCP HTTP auth regression/defaults, reverse-proxy credential forwarding, migration documentation, latency, and existing-suite preservation.

## Module → Test Mapping

| Module or Surface | Test File | Test Type | Coverage |
|---|---|---|---|
| `server/security/apiAuth.ts` | `server/tests/security/apiAuth.test.ts` | unit | Env parsing, local/test no-auth compatibility, migration warning flag, `Authorization: Bearer`, `X-API-Key`, rejected credential sources, health/status exemptions, length-checked timing-safe comparison. |
| Backend Express auth boundary | `server/tests/api/api-auth.test.ts` | integration | 401 missing/invalid on protected routes, valid bearer/API-key success, `/api/status` and `/api/health` public, no-Origin token rules, stripped proxy credentials fail closed, forwarded credentials pass, non-local no-auth migration warning while continuing, <5ms median latency on protected route versus no-auth baseline, local/test no-auth preservation. |
| MCP HTTP auth middleware | `mcp-server/tests/http-auth-session-rate-limit.test.ts` | unit | Missing, malformed, different-length, and equal-length invalid bearer tokens return 401; valid token succeeds. |
| MCP HTTP config/defaults | `mcp-server/tests/http-security-config.test.ts` | unit | Auth env parsing, explicit auth without `MCP_AUTH_TOKEN` failure, concrete stdio transport selection without auth-token requirement, legacy no-auth migration warning, production Docker auth-on default. |
| Migration docs and nginx | `docs/tests/api-auth-docs.test.ts` | integration/script | Docker/MCP migration docs mention env vars, warnings, credential headers; nginx preserves `Authorization` and `X-API-Key`. |
| Vite dev frontend logging boundary | `tests/vite-frontend-logs-security.test.ts` | unit/integration | Vite-only `/api/frontend/logs*` middleware accepts loopback clients, rejects non-loopback clients before state mutation/body handling, and returns controlled 400 for malformed JSON. |
| Existing suites | `docs/CRs/MDT-157/tests.md` | suite gate | Existing server, MCP, frontend, and E2E suites remain green outside auth-enabled contexts. |

## Data Mechanism Tests

| Mechanism | Test File | Required Cases |
|---|---|---|
| Backend auth token format | `server/tests/security/apiAuth.test.ts` | valid bearer accepted; valid API key accepted; Basic/query/cookie/origin/referer/forwarded identity rejected; empty/malformed rejected. |
| Timing-safe comparison | `server/tests/security/apiAuth.test.ts`, `mcp-server/tests/http-auth-session-rate-limit.test.ts` | exact match accepted; empty, wrong length, and same-length wrong token rejected. |
| Route exemption | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` | only `GET /api/status` and `GET /api/health` bypass auth and expose no token/config/path data. |
| Reverse proxy credential handling | `server/tests/api/api-auth.test.ts`, `docs/tests/api-auth-docs.test.ts` | forwarded bearer/API key succeeds; stripped headers fail 401; nginx forwards `Authorization` and `X-API-Key`. |
| Latency budget | `server/tests/api/api-auth.test.ts` | median request time for authenticated `GET /api/projects` remains within 5ms of the same protected route with auth disabled; `/api/status` and `/api/health` are not used as the benchmark. |

## External Dependency and Configuration Tests

| Dependency or Config | Test File | Behavior When Absent or Invalid |
|---|---|---|
| `API_SECURITY_AUTH` | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` | Absent in test/local preserves no-auth behavior; absent in non-local mode continues with observable migration warning; explicit `true` requires token. |
| `API_AUTH_TOKEN` | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` | Missing with auth enabled fails config; valid value authenticates bearer/API-key requests. |
| `MCP_SECURITY_AUTH` | `mcp-server/tests/http-security-config.test.ts` | Stdio mode does not parse/require HTTP auth token; explicit HTTP auth requires `MCP_AUTH_TOKEN`; legacy HTTP no-auth emits migration warning; production Docker defaults auth on. |
| `MCP_AUTH_TOKEN` | `mcp-server/tests/http-security-config.test.ts`, `mcp-server/tests/http-auth-session-rate-limit.test.ts` | Missing with auth enabled fails startup/config; valid bearer accepted by MCP middleware. |
| `Authorization` / `X-API-Key` forwarding | `docs/tests/api-auth-docs.test.ts`, `server/tests/api/api-auth.test.ts` | Preserved headers authenticate; missing/stripped headers fail closed. |
| Vite frontend log endpoint caller boundary | `tests/vite-frontend-logs-security.test.ts` | Loopback requests are accepted; LAN/tunnel/non-loopback requests are rejected; spoofed forwarded headers are ignored. |

## Constraint Coverage

| Constraint ID | Test File | Coverage |
|---|---|---|
| `C1` | `server/tests/security/apiAuth.test.ts`, `mcp-server/tests/http-auth-session-rate-limit.test.ts` | Backend and MCP length-checked timing-safe token comparison regressions. |
| `C2` | `server/tests/api/api-auth.test.ts` | Median authenticated `GET /api/projects` overhead versus no-auth `GET /api/projects` baseline <5ms. |
| `C3` | `server/tests/api/api-auth.test.ts` | Protected route behavior verified centrally through production-equivalent app factory. |
| `C4` | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts`, `docs/tests/api-auth-docs.test.ts` | Origin/referer/proxy identity are not credentials; no-Origin requests use token rules. |
| `C5` | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` | Bearer and API-key accepted; raw token not echoed in error/health responses. |
| `C6` | `server/tests/security/apiAuth.test.ts` | Auth-only credential contract rejects broader authorization/sharing signals. |
| `C7` | `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` | Health/status public and minimal. |
| `C8` | `server/tests/api/api-auth.test.ts`, `mcp-server/tests/http-security-config.test.ts`, existing-suite gate | Local/test no-auth compatibility, stdio transport auth independence, plus full-suite preservation. |
| `C9` | `server/tests/api/api-auth.test.ts`, `docs/tests/api-auth-docs.test.ts`, `mcp-server/tests/http-security-config.test.ts` | Migration warnings, migration docs path, and production Docker MCP auth defaults. |
| `C10` | `tests/vite-frontend-logs-security.test.ts` | Vite dev frontend logging endpoints are localhost-only despite bypassing backend auth middleware. |

## BDD and Acceptance Continuity

| BDD Scenario | Test File | Notes |
|---|---|---|
| `backend_protected_requests_require_credentials` | `server/tests/api/api-auth.test.ts` | Covers anonymous `GET /api/projects` and `POST /api/projects/:id/crs` 401. |
| `backend_admin_token_allows_existing_route_behavior` | `server/tests/api/api-auth.test.ts` | Bearer and API key reach existing route contract. |
| `backend_health_endpoints_remain_public` | `server/tests/api/api-auth.test.ts` | `/api/status` and `/api/health` unauthenticated. |
| `backend_no_auth_config_preserves_local_behavior` | `server/tests/api/api-auth.test.ts` | Missing auth config in test mode keeps 200 for existing route. |
| `backend_no_origin_uses_token_rules` | `server/tests/api/api-auth.test.ts` | No-Origin missing token 401, valid token 200. |
| `mcp_stdio_ignores_http_auth_settings` | `mcp-server/tests/http-security-config.test.ts` | Transport selection chooses stdio when HTTP flags are not true and does not require `MCP_AUTH_TOKEN`. |
| `mcp_http_rejects_missing_or_invalid_bearer` | `mcp-server/tests/http-auth-session-rate-limit.test.ts` | Missing/malformed/invalid bearer rejected. |
| `mcp_http_accepts_production_bearer_default` | `mcp-server/tests/http-security-config.test.ts` | Production compose asserts auth-on default and required token. |
| `mcp_existing_deployment_migration_warning` | `server/tests/api/api-auth.test.ts`, `mcp-server/tests/http-security-config.test.ts`, `docs/tests/api-auth-docs.test.ts` | Backend and MCP legacy no-auth paths continue where allowed and emit observable migration warnings; docs explain actions. |

## Existing Suite Preservation

After implementation, run or explicitly report exclusions for:

```bash
bun run --cwd server jest
bun run --cwd mcp-server jest
bun run --cwd server build
bun run --cwd mcp-server build
bun run build
bun run test:e2e
bun test docs/tests/api-auth-docs.test.ts
bun test tests/vite-frontend-logs-security.test.ts
```

## Verify

Spec-trace validation performed:

```bash
spec-trace validate MDT-157 --stage tests --format json
spec-trace render tests MDT-157
```

Targeted RED test commands:

```bash
bun run --cwd server jest tests/security/apiAuth.test.ts tests/api/api-auth.test.ts
bun run --cwd mcp-server jest tests/http-auth-session-rate-limit.test.ts tests/http-security-config.test.ts
bun test docs/tests/api-auth-docs.test.ts
bun test tests/vite-frontend-logs-security.test.ts
```

## Test Specification Complete

**CR**: MDT-157  
**Output**: `docs/CRs/MDT-157/tests.md`, `docs/CRs/MDT-157/tests.trace.md`, and executable RED tests  
**Next**: `/mdt:tasks MDT-157`
