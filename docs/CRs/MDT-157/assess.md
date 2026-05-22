# Assessment: MDT-157

## Verdict

**Recommendation**: Option 2 — Redesign Inline

## Feature Pressure

### Target Feature Needs
- Add backend REST authentication for all non-health endpoints while preserving no-auth local development by default.
- Reuse the existing MCP bearer-token pattern and make MCP HTTP production deployments authenticated by default.
- Compare bearer/API tokens with `crypto.timingSafeEqual`.
- Work behind nginx/reverse proxies by relying only on auth headers that are preserved and explicitly documented/protected (`Authorization` and/or `X-API-Key`).
- Keep MDT-157 limited to authentication; defer public sharing, visibility filtering, and read-only authorization to MDT-172.

### Current System Assumptions
- `server/server.ts` mounts all `/api/*` routers without an authentication or principal context layer.
- `server/routes/system.ts` exposes `/api/status`, filesystem, config, cache, and other system endpoints from one router.
- Reverse-proxy behavior is currently outside the backend auth boundary; nginx may drop, rewrite, or fail to forward `Authorization`/API-key headers unless configured.
- `mcp-server/src/transports/middleware.ts` already compares MCP bearer tokens with `crypto.timingSafeEqual` through `tokenMatches`.
- `mcp-server/src/index.ts` already calls `parseHttpTransportConfig(process.env)` before `startHttpTransport`, so MCP auth env vars are wired into HTTP transport config.
- MCP HTTP auth is still opt-in through `MCP_SECURITY_AUTH=true`, and production Docker currently enables MCP HTTP but leaves auth variables commented out.
- Existing deployments with no auth env vars are expected to continue functioning with a logged warning/migration signal rather than failing closed.

## Fitness Summary

| Dimension | Verdict | Why |
|-----------|---------|-----|
| Structural Fit | Concerning | Express has a clean middleware insertion point, but no existing auth context or route classification boundary. |
| Extension Fit | Concerning | MCP has an auth middleware/config seam already wired; backend REST needs a new centralized auth seam before route handlers. |
| Dependency Fit | Healthy | No new packages are required; Node `crypto` is enough for timing-safe comparison. |
| Verification Fit | Concerning | Existing API tests assume unauthenticated defaults; new tests must explicitly run with auth enabled and assert bypass routes. |
| Redesign Scope | Concerning | Redesign is bounded to auth middleware/config/test seams, not foundational system restructuring. |

## Mismatch Points

### Backend Express request pipeline
- Current system assumes: Any caller reaching `/api/*` is trusted, and controllers do not receive an authenticated principal.
- Feature needs: A single authentication gate for all protected backend REST routes, with `/api/status` and the requested `/api/health` exempt.
- Mismatch: Authentication cannot be added safely as scattered controller checks without creating drift across projects, documents, events, filesystem, config, and devtools routes.
- Adjustment required: Add a centralized backend auth middleware plus route exemption/classification before protected routers; keep authorization decisions out of MDT-157.
- Scope: bounded

### Health/status endpoint shape
- Current system assumes: Backend health is `/api/status`; there is no real `/api/health` route, even though Docker docs/config reference it.
- Feature needs: Both `/api/health` and `/api/status` remain unauthenticated per acceptance criteria.
- Mismatch: Architecture must decide whether to add `/api/health` as an alias or update the ticket/docs; implementation cannot satisfy acceptance as-is.
- Adjustment required: Add `/api/health` as a minimal health alias or explicitly revise acceptance before implementation.
- Scope: local

### MCP HTTP auth configuration
- Current system assumes: Auth is optional and active when `parseHttpTransportConfig(process.env)` sees `MCP_SECURITY_AUTH=true` and `MCP_AUTH_TOKEN`; `mcp-server/src/index.ts` already passes that parsed config to `startHttpTransport`.
- Feature needs: Production Docker MCP HTTP should require bearer auth by default while stdio remains unchanged.
- Mismatch: The previously suspected env-wiring gap appears already implemented in current source, but production compose still comments out `MCP_SECURITY_AUTH` and `MCP_AUTH_TOKEN`, leaving production MCP HTTP unauthenticated unless operators opt in.
- Adjustment required: Treat MDT-157's remaining MCP obligation as production Docker default/migration behavior plus regression coverage for env parsing, auth enablement, and stdio no-auth preservation.
- Scope: bounded

### Reverse-proxy auth header handling
- Current system assumes: Backend/MCP auth sees whatever headers Express receives, with no documented nginx contract.
- Feature needs: Auth must work behind nginx and other reverse proxies without confusing proxy-origin checks with credential checks.
- Mismatch: If nginx does not preserve `Authorization` or the chosen API-key header, valid clients can be rejected; if proxy config forwards credentials inconsistently, auth behavior can differ between direct and proxied deployments.
- Adjustment required: Architecture must name the supported credential header(s), document required nginx forwarding behavior, and protect against relying on proxy-only headers for authentication.
- Scope: local

### Token comparison utility
- Current system assumes: MCP bearer-token checks already use `crypto.timingSafeEqual` after equal-length buffer validation in `mcp-server/src/transports/middleware.ts`.
- Feature needs: Timing-safe comparison for MCP and backend tokens.
- Mismatch: The previously suspected MCP direct-string-equality gap appears already fixed in current source, but backend REST auth still needs the same timing-safe behavior and regression coverage should lock MCP behavior to prevent drift.
- Adjustment required: Reuse or mirror the MCP timing-safe pattern for backend auth and add tests/code-review checks covering equal, unequal, empty, malformed, and different-length tokens.
- Scope: local

### Test harness and API contract
- Current system assumes: Supertest helpers call backend endpoints without credentials and OpenAPI tests expect 200 for many routes.
- Feature needs: Tests covering unauthenticated 401, authenticated success, health bypass, MCP stdio no-auth behavior, and MCP HTTP bearer rejection/acceptance.
- Mismatch: Turning auth on globally in tests would break unrelated suites unless auth defaults stay disabled for local/test and auth-enabled tests isolate env/config.
- Adjustment required: Add focused auth-enabled test setup rather than changing all existing endpoint tests.
- Scope: bounded

## Dependency and Tooling Pressure

- New packages: none
- Runtime/config impact: add backend API auth env config; verify existing MCP auth env parsing remains wired; update production Docker env defaults for MCP HTTP auth.
- Reverse-proxy impact: document nginx preservation of `Authorization` and/or `X-API-Key`; avoid depending on proxy-supplied identity headers.
- Testing/E2E impact: add backend middleware unit/API tests, MCP HTTP auth tests, Docker/config verification, reverse-proxy/header contract checks, lightweight latency validation, and preserve stdio tests.
- Main risk introduced: accidentally protecting health/status or local development flows, dropping auth headers behind nginx, conflating Origin/CORS validation with authentication, or leaving production MCP HTTP unauthenticated because env defaults are ambiguous.

## Verification Gaps

- Preservation tests needed:
  - Existing no-auth local/test behavior when auth env is absent.
  - `/api/status` and `/api/health` unauthenticated access.
  - Protected backend routes return 401 without token and normal responses with valid token.
  - No-`Origin` curl/server-to-server requests authenticate normally: missing token returns 401, valid token succeeds, and Origin validation is not treated as authentication.
  - Supported auth headers are preserved through nginx/reverse-proxy configuration (`Authorization` and/or API-key header).
  - Lightweight latency benchmark/validation evidence shows auth middleware overhead remains below 5ms/request.
  - MCP stdio remains unaffected by HTTP auth settings.
  - MCP HTTP rejects missing/invalid bearer tokens and accepts valid bearer tokens.
  - MCP HTTP env parsing enables auth when `MCP_SECURITY_AUTH=true` and `MCP_AUTH_TOKEN` is present, and fails startup when auth is enabled without a token.
  - Production Docker/default config verification shows MCP HTTP auth is enabled by default or emits the intended migration warning when auth env vars are absent.
  - Existing non-local deployments with no auth env vars continue to function and produce an observable logged warning/migration notice.
- E2E/contract drift risks:
  - OpenAPI docs may not reflect 401 responses/security scheme.
  - Docker health checks may point at `/api/health` while backend only implements `/api/status` today.
  - SSE `/api/events` auth with browser `EventSource` may need a cookie or non-header strategy; do not solve sharing/SSE authorization in MDT-157 without architecture direction.
- Safe-to-refactor now?: yes, if auth remains centralized and tests isolate auth-enabled mode.

## Recommendation

### Option 1: Integrate As-Is
Use when: Not recommended. Adding a few ad hoc checks would leave route coverage and MCP config behavior fragile.
Architecture impact: minimal but insufficient.

### Option 2: Redesign Inline
Use when: The feature fits the system with a bounded auth pipeline redesign and no foundational model change.
Architecture must redesign: backend auth middleware/config and route exemptions; MCP production Docker auth defaults/migration behavior and regression coverage for existing MCP env parsing/timing-safe comparison.
Expected scope added: define the backend auth env shape, protected-route boundary, health aliases, 401 error contract, isolated auth-enabled test harness, production Docker MCP auth default/migration behavior, and regression coverage for current MCP timing-safe comparison/env parsing.

### Option 3: Redesign First
Use when: Not needed for MDT-157. Public sharing, project visibility filtering, read-only capabilities, and token stores belong to MDT-172, not this authentication foundation.
Reason redesign cannot wait: n/a
Preferred path: n/a
