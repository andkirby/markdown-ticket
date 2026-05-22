# Tests: MDT-156

**Source**: [MDT-156](../MDT-156-security-hardening.md)
**Trace projection**: [tests.trace.md](./tests.trace.md)
**Mode**: normal, spec-only

## Scope

This pass defines test specifications and canonical `spec-trace` test-plan records only. No executable test files were created yet by instruction.

Tests must verify the architecture obligations for CORS, filesystem boundaries, MCP HTTP hardening, backend headers, dependency posture, tracked-file secret hygiene, Docker/MCP documentation, reverse-proxy compatibility, and existing suite preservation.

## Module to Test Mapping

| Module or Surface | Planned Test File | Test Type | Coverage |
|-------------------|-------------------|-----------|----------|
| `server/security/originPolicy.ts` | `server/tests/security/originPolicy.test.ts` | unit | Allowed origins, disallowed origins, no-Origin compatibility, no wildcard stream policy. |
| `server/routes/sse.ts` | `server/tests/api/sse-cors.test.ts` | integration | `GET /api/events` returns matching CORS only for allowed origins and preserves no-Origin clients. |
| `server/routes/devtools.ts` | `server/tests/api/devtools-security.test.ts` | integration | Devtools streams use shared CORS, cover shared-origin obligation, and production requires `DEVTOOLS_ENABLED=true`. |
| `server/security/filesystemAccess.ts` | `server/tests/security/filesystemAccess.test.ts` | unit | Discovery roots plus project roots, canonical containment, symlink escape denial, encoded/Unicode traversal denial. |
| `server/routes/system.ts`, `server/controllers/ProjectController.ts`, `shared/services/ProjectService.ts` | `server/tests/api/filesystem-boundary.test.ts` | integration | `/api/directories` and `/api/filesystem/exists` deny outside roots before leaking entries, existence, or expanded paths. |
| `server/server.ts` | `server/tests/api/security-headers.test.ts` | integration | Backend responses include `X-Content-Type-Options: nosniff` and `X-Frame-Options: DENY`. |
| Backend behind nginx/reverse proxy | `server/tests/api/reverse-proxy-compat.test.ts` | integration | Backend headers/CORS behavior remains stable with `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host`. |
| `server/routes/system.ts` config and maintenance routes | `server/tests/api/config-maintenance-policy.test.ts` | integration | Config reads filter sensitive detail; production maintenance/debug mutation endpoints require explicit opt-in. |
| `mcp-server/src/index.ts`, `mcp-server/src/transports/http.ts` | `mcp-server/tests/http-security-config.test.ts` | unit | Env-to-transport config wiring, production Docker defaults, stdio unaffected, fail-start when origin validation has no allowed origins. |
| MCP HTTP behind nginx/reverse proxy | `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts` | integration | Caller identity and rate-limit keys behave correctly with forwarded client address and forwarded scheme/host. |
| `mcp-server/src/transports/middleware.ts`, `mcp-server/src/utils/rateLimitManager.ts` | `mcp-server/tests/http-auth-session-rate-limit.test.ts` | unit | Timing-safe token comparison, `/sessions` visibility policy, caller-aware rate-limit keys. |
| `package.json`, `bun.lock` | `server/tests/security/dependencyAudit.test.ts` | unit/script | Patched runtime dependency thresholds or explicit breaking-change follow-up. |
| Tracked `.env`, config, Docker, compose, docs files | `server/tests/security/trackedSecretScan.test.ts` | unit/script | No committed secrets or tokens in MDT-156 scan scope. |
| `docs/DOCKER_GUIDE.md`, `docs/MCP_SERVER_GUIDE.md`, compose comments | `docs/tests/mcp-docker-docs.test.ts` | integration/script | Production defaults, allowed-origin requirements, rate limiting, and migration guidance are documented. |
| User-visible security flows | `tests/e2e/security-hardening.spec.ts` | E2E/API | Configured-origin streams, outside-root denial, inside-root browsing, no-Origin compatibility. |
| Existing suites | `docs/CRs/MDT-156/tests.md` | suite gate | Existing unit and E2E suites remain green, or exclusions document suite, reason, environment constraint, and owner. |

## Data Mechanism Tests

| Mechanism | Planned Test File | Required Cases |
|-----------|-------------------|----------------|
| Origin allowlist | `server/tests/security/originPolicy.test.ts` | built-in local origin accepted; `ALLOWED_DOMAINS` origin accepted; disallowed origin rejected; missing Origin accepted. |
| Stream CORS headers | `server/tests/api/sse-cors.test.ts`, `server/tests/api/devtools-security.test.ts` | allowed Origin gets matching `Access-Control-Allow-Origin`; disallowed Origin does not; no response uses `*`; devtools CORS explicitly covers `OBL-cors-single-origin-policy`. |
| Filesystem allowed roots | `server/tests/security/filesystemAccess.test.ts` | configured project root accepted; discovery root accepted; `/etc` denied; sibling prefix path denied. |
| Canonical path containment | `server/tests/security/filesystemAccess.test.ts` | direct child accepted; `..` escape denied; symlink escape denied; URL-encoded traversal denied; Unicode-normalized outside path denied. |
| Filesystem disclosure | `server/tests/api/filesystem-boundary.test.ts` | outside-root `/api/directories` returns 403 with no entries; outside-root `/api/filesystem/exists` returns 403 with no existence or expanded path. |
| Reverse-proxy request metadata | `server/tests/api/reverse-proxy-compat.test.ts`, `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts` | `X-Forwarded-For` preserves expected client identity; `X-Forwarded-Proto` and `X-Forwarded-Host` do not break CORS/origin checks; direct `Host` remains compatible where relevant. |
| MCP env config | `mcp-server/tests/http-security-config.test.ts` | production defaults enable origin validation/rate limiting; dev can remain configurable; missing allowed origins with validation enabled fails startup. |
| MCP auth token comparison | `mcp-server/tests/http-auth-session-rate-limit.test.ts` | valid token accepted; wrong length rejected; equal length wrong token rejected through timing-safe path. |
| MCP rate-limit key | `mcp-server/tests/http-auth-session-rate-limit.test.ts`, `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts` | authenticated requests key by token fingerprint; unauthenticated requests key by origin plus forwarded client address; spoofed/changed `X-Forwarded-For` changes caller bucket only through trusted proxy handling; tool name alone is insufficient. |
| Dependency thresholds | `server/tests/security/dependencyAudit.test.ts` | DOMPurify >= 3.3.2; express-rate-limit >= 8.2.2 when present; path-to-regexp >= 8.4.0 when present; unresolved high/critical runtime advisory requires follow-up record. |
| Secret scan scope | `server/tests/security/trackedSecretScan.test.ts` | tracked `.env`, config, Docker, compose, and docs files scanned; placeholder/example values allowed; token-like real secrets fail. |

## External Dependency and Configuration Tests

| Dependency or Config | Planned Test | Behavior When Absent or Invalid |
|----------------------|--------------|---------------------------------|
| `ALLOWED_DOMAINS` | `TEST-origin-policy-unit` | Falls back to built-in local origins; no-Origin requests remain accepted. |
| `DEVTOOLS_ENABLED` | `TEST-devtools-policy-api` | Production devtools disabled when absent; enabled only with explicit `true`. |
| `MAINTENANCE_ENDPOINTS_ENABLED` | `TEST-config-maintenance-policy` | Production maintenance/debug mutation routes return generic 404 or 403 when absent. |
| `X-Forwarded-For` | `TEST-backend-reverse-proxy-compat`, `TEST-mcp-reverse-proxy-caller-identity` | Backend accepts proxied requests without changing security headers/CORS; MCP caller identity/rate-limit buckets use forwarded client address according to trusted proxy behavior. |
| `X-Forwarded-Proto` | `TEST-backend-reverse-proxy-compat`, `TEST-mcp-reverse-proxy-caller-identity` | `https` forwarded scheme behind nginx does not break allowed-origin handling, no-Origin compatibility, or MCP HTTP compatibility. |
| `X-Forwarded-Host` / `Host` | `TEST-backend-reverse-proxy-compat`, `TEST-mcp-reverse-proxy-caller-identity` | Forwarded host and direct host do not bypass origin allowlist and do not cause false rejection for configured origins. |
| `MCP_SECURITY_ORIGIN_VALIDATION` | `TEST-mcp-http-config` | When true, MCP HTTP requires non-empty `MCP_ALLOWED_ORIGINS` and fails startup if missing. |
| `MCP_ALLOWED_ORIGINS` | `TEST-mcp-http-config` | Empty or absent value with origin validation enabled is a configuration error. |
| `MCP_SECURITY_RATE_LIMITING` | `TEST-mcp-http-config`, `TEST-mcp-auth-session-rate-limit`, `TEST-mcp-reverse-proxy-caller-identity` | Production Docker enables it by default; caller-aware key policy must be testable behind proxy headers. |
| `MCP_AUTH_TOKEN` | `TEST-mcp-auth-session-rate-limit` | Auth remains opt-in; when enabled, token checks use timing-safe comparison. |
| `bun.lock` resolved versions | `TEST-dependency-audit-runtime` | High/critical runtime vulnerability that cannot be patched without a breaking change must be recorded as follow-up. |

## Constraint Coverage

| Constraint ID | Planned Test File | Coverage |
|---------------|-------------------|----------|
| `C1` | `server/tests/security/originPolicy.test.ts`, `server/tests/api/sse-cors.test.ts`, `server/tests/api/devtools-security.test.ts` | One allowed-origin decision for REST, SSE, and devtools. |
| `C2` | `server/tests/security/originPolicy.test.ts`, `tests/e2e/security-hardening.spec.ts` | No-Origin requests remain compatible. |
| `C4` | `server/tests/security/filesystemAccess.test.ts`, `server/tests/api/filesystem-boundary.test.ts` | Canonical resolved paths before filesystem disclosure. |
| `C5` | `server/tests/api/filesystem-boundary.test.ts` | Security boundary added without shared service public API expansion. |
| `C6` | `server/tests/api/reverse-proxy-compat.test.ts`, `mcp-server/tests/http-reverse-proxy-caller-identity.test.ts`, `mcp-server/tests/http-security-config.test.ts` | Exercises `X-Forwarded-For`, `X-Forwarded-Proto`, `X-Forwarded-Host`, and `Host`; asserts backend headers/CORS remain compatible behind nginx and MCP caller identity/rate-limit keys use expected forwarded client semantics. |
| `C7` | `server/tests/api/devtools-security.test.ts`, `mcp-server/tests/http-auth-session-rate-limit.test.ts` | No broad auth model added; only existing optional MCP auth hardened. |
| `C8` | `server/tests/security/trackedSecretScan.test.ts` | Confirmed tracked secrets removed; rotation policy deferred. |
| `C10` | `docs/CRs/MDT-156/tests.md` | Existing unit and E2E suites must remain green or exclusions must document suite, reason, environment constraint, and owner. |

`C3` and `C9` were clarification-routed but are now settled by architecture. They are covered through `TEST-filesystem-access-unit`, `TEST-filesystem-api-integration`, `TEST-mcp-auth-session-rate-limit`, and `TEST-mcp-reverse-proxy-caller-identity`.

## Reverse Proxy Compatibility Tests

| Planned Test | Headers Exercised | Assertions |
|--------------|-------------------|------------|
| `TEST-backend-reverse-proxy-compat` | `X-Forwarded-For: 203.0.113.10`, `X-Forwarded-Proto: https`, `X-Forwarded-Host: app.example.test`, `Host: backend:3001` | Backend still returns required security headers; allowed browser Origin remains allowed; disallowed Origin remains denied; no-Origin request remains accepted; forwarded host/proto do not bypass origin allowlist. |
| `TEST-mcp-reverse-proxy-caller-identity` | `X-Forwarded-For: 203.0.113.10`, second caller `X-Forwarded-For: 203.0.113.11`, `X-Forwarded-Proto: https`, `X-Forwarded-Host: mcp.example.test`, `Host: mcp:3002` | MCP rate-limit keys distinguish callers by trusted forwarded client address plus origin/auth identity; requests with same forwarded caller share a bucket; different forwarded callers do not consume each other's bucket; forwarded proto/host do not disable origin validation. |

## BDD and E2E Continuity

| BDD Scenario | Planned Test File | Notes |
|--------------|-------------------|-------|
| `sse_stream_allows_configured_origin` | `tests/e2e/security-hardening.spec.ts`, `server/tests/api/sse-cors.test.ts` | API-level test should assert exact stream headers; E2E/API journey confirms observable behavior. |
| `devtools_stream_allows_configured_origin` | `tests/e2e/security-hardening.spec.ts`, `server/tests/api/devtools-security.test.ts` | Architecture-owned devtools stream route remains expected as `/api/devtools/logs/stream` unless implementation updates the route contract. |
| `directory_browse_denies_outside_root` | `tests/e2e/security-hardening.spec.ts`, `server/tests/api/filesystem-boundary.test.ts` | Must verify `/etc` returns 403 and no directory entries. |
| `directory_browse_allows_inside_root` | `tests/e2e/security-hardening.spec.ts`, `server/tests/api/filesystem-boundary.test.ts` | Use a real configured allowed-root fixture, not the placeholder `/allowed/project`. |

## Endpoint Policy Tests

| Route | Planned Test File | Required Cases |
|-------|-------------------|----------------|
| `GET /api/config` | `server/tests/api/config-maintenance-policy.test.ts` | Allowed in production; response omits secrets/tokens and unnecessary absolute paths. |
| `GET /api/config/global` | `server/tests/api/config-maintenance-policy.test.ts` | Allowed in production; raw env values and sensitive paths filtered. |
| `GET /api/config/selector` | `server/tests/api/config-maintenance-policy.test.ts` | Allowed in production; returns only selector state. |
| `POST /api/config/selector` | `server/tests/api/config-maintenance-policy.test.ts` | Allowed in production; validation errors do not echo sensitive detail. |
| `POST /api/config/clear` | `server/tests/api/config-maintenance-policy.test.ts` | Disabled in production without `MAINTENANCE_ENDPOINTS_ENABLED=true`; generic 404 or 403. |
| `POST /api/cache/clear` | `server/tests/api/config-maintenance-policy.test.ts` | Disabled in production without `MAINTENANCE_ENDPOINTS_ENABLED=true`; generic 404 or 403. |
| `/api/devtools/*` | `server/tests/api/devtools-security.test.ts` | Disabled in production without `DEVTOOLS_ENABLED=true`; no wildcard CORS when enabled. |

## Existing Suite Preservation

After implementation, these suites remain required unless explicitly excluded in the implementation/test report:

| Suite | Command | Exclusion Rule |
|-------|---------|----------------|
| Frontend/build validation | `bun run build` or project-selected equivalent | Exclusion must name environment constraint and owner. |
| Frontend lint | `bun run lint` | Exclusion must name rule/environment constraint and owner. |
| Backend unit tests | `bun run --cwd server jest` | Exclusion must name suite, reason, and owner. |
| MCP unit/build tests | `bun run --cwd mcp-server jest` and `bun run --cwd mcp-server build` | Exclusion must name suite, reason, and owner. |
| E2E tests | `bun run test:e2e` | Exclusion must name browser/server constraint and owner. |

## Verify

Spec-only validation already performed:

```bash
spec-trace validate MDT-156 --stage tests --format json
spec-trace render tests MDT-156
```

Implementation-phase verification should add or update the planned executable tests, then run the relevant targeted suites plus the existing-suite preservation gate above.

## Test Specification Complete

**CR**: MDT-156
**Output**: `docs/CRs/MDT-156/tests.md` and `docs/CRs/MDT-156/tests.trace.md`
**Executable tests**: not created in this pass by instruction
**Next**: `/mdt:tasks MDT-156`
