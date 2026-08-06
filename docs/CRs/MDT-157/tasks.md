# Tasks: MDT-157

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- Backend REST auth: centralized middleware/config only; no controller-level auth drift.
- MCP HTTP auth: preserve existing transport seam; harden config/defaults and tests only.
- Deployment docs/proxy: document and test credential header forwarding and migration path.
- Out of scope: MDT-172 public sharing, project visibility filtering, read-only policy, RBAC, TLS termination, token rotation.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|---|---|---|
| Backend API credential parsing, timing-safe compare, exemptions, migration warning | `server/security/apiAuth.ts` | Task 0 |
| Backend middleware placement | `server/server.ts` | Task 1 |
| Public health/status payload shape | `server/routes/system.ts` | Task 1 |
| MCP bearer auth comparison | `mcp-server/src/transports/middleware.ts` | Task 2 |
| MCP HTTP config and stdio-vs-HTTP selection | `mcp-server/src/transports/httpSecurity.ts`, `mcp-server/src/transports/transportSelection.ts`, `mcp-server/src/index.ts` | Task 2 |
| Production Docker/proxy migration contract | `docker-compose.prod.yml`, `nginx.conf`, docs | Task 3 |

## Constraint Coverage

| Constraint ID | Tasks |
|---|---|
| C1 | Task 0, Task 2 |
| C2 | Task 1, Task 4 |
| C3 | Task 1 |
| C4 | Task 0, Task 1, Task 3 |
| C5 | Task 0, Task 1 |
| C6 | Task 0, Task 1 |
| C7 | Task 0, Task 1 |
| C8 | Task 1, Task 2, Task 4 |
| C9 | Task 1, Task 2, Task 3 |
| Edge-1 | Task 0, Task 2 |
| Edge-2 | Task 2, Task 3 |
| Edge-3 | Task 1, Task 3 |
| Edge-4 | Task 1, Task 3 |
| C11 | Task 6 |
| Edge-5 | Task 6 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|---|---|---|---|
| M0: Backend auth module | — | Task 0 | Backend auth unit contract GREEN |
| M1: Backend protected API vertical slice | BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-1.7 | Task 1 | `TEST-backend-api-auth-contract` GREEN |
| M2: MCP transport auth behavior | BR-2.1, BR-2.2 | Task 2 | MCP auth/config tests GREEN |
| M3: Production Docker and migration docs | BR-2.3, BR-2.4 | Task 3 | Docs/nginx + production default tests GREEN |
| M4: Regression gates | — | Task 4 | Existing suites and latency gate GREEN |

## Tasks

### Task 0: Implement backend API auth module and unit contract

**Milestone**: M0 — Backend auth module

**Structure**: `server/security/apiAuth.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-backend-api-auth-unit` → `server/tests/security/apiAuth.test.ts`: Backend API auth config, credential parsing, route exemption, and timing-safe comparison

**Scope**: Create the backend auth owner module and lock its pure unit behavior.
**Boundary**: Own backend authentication mechanics only; no route/controller authorization or sharing behavior.

**Creates**:
- `server/security/apiAuth.ts`

**Modifies**:
- `server/tests/security/apiAuth.test.ts`

**Must Not Touch**:
- `server/controllers/**`
- `server/services/**`
- `src/**`
- MDT-172 sharing/public-readonly files

**Create/Move**:
- Export auth config parsing for `API_SECURITY_AUTH` and `API_AUTH_TOKEN`.
- Export Express middleware factory.
- Export or internalize length-checked `crypto.timingSafeEqual` helper.
- Export route exemption classifier for `GET /api/status` and `GET /api/health`.

**Exclude**: OAuth, Basic auth, cookies, query tokens, RBAC, public sharing, token rotation.

**Anti-duplication**: Mirror the existing MCP timing-safe pattern from `mcp-server/src/transports/middleware.ts` conceptually; do not copy unrelated MCP transport middleware into backend.

**Duplication Guard**:
- Check `mcp-server/src/transports/middleware.ts` and any server auth/security helpers before coding.
- If another backend auth owner exists, merge into `server/security/apiAuth.ts` instead of adding a parallel path.
- Verify no controller-level credential parsing was introduced.

**Verify**:
```bash
bun run --cwd server jest tests/security/apiAuth.test.ts
```

**Done when**:
- [x] `Authorization: Bearer <token>` and `X-API-Key` are accepted.
- [x] Basic/query/cookie/origin/referer/proxy identity credentials are rejected.
- [x] Empty, malformed, wrong-length, and same-length wrong tokens fail generically.
- [x] Raw tokens are not logged or echoed.
- [x] Unit tests GREEN.

### Task 1: Wire backend auth middleware, health exemptions, and API contract tests

**Milestone**: M1 — Backend protected API vertical slice (BR-1.1, BR-1.2, BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-1.7)

**Structure**: `server/server.ts`, `server/routes/system.ts`, `server/tests/api/test-app-factory.ts`, `server/tests/api/api-auth.test.ts`, `docker-compose.yml`

**Makes GREEN (Automated Tests)**:
- `TEST-backend-api-auth-contract` → `server/tests/api/api-auth.test.ts`: protected route auth, migration warning, health bypass, no-Origin, proxy header, latency, local no-auth contract

**Makes GREEN (Behavior)**:
- `backend_protected_requests_require_credentials` → `server/tests/api/api-auth.test.ts` (BR-1.1, BR-1.3, BR-1.4)
- `backend_admin_token_allows_existing_route_behavior` → `server/tests/api/api-auth.test.ts` (BR-1.2)
- `backend_health_endpoints_remain_public` → `server/tests/api/api-auth.test.ts` (BR-1.5)
- `backend_no_auth_config_preserves_local_behavior` → `server/tests/api/api-auth.test.ts` (BR-1.6)
- `backend_no_origin_uses_token_rules` → `server/tests/api/api-auth.test.ts` (BR-1.7)

**Scope**: Insert the auth gate once in production-equivalent middleware order and prove protected/public route behavior.
**Boundary**: Do not move auth decisions into controllers; do not add project visibility filtering.

**Creates**:
- None

**Modifies**:
- `server/server.ts`
- `server/routes/system.ts`
- `server/tests/api/test-app-factory.ts`
- `server/tests/api/api-auth.test.ts`
- `docker-compose.yml`

**Must Not Touch**:
- `server/controllers/**` except only if existing imports require compile-safe no-op adjustments
- `shared/**`
- MDT-172 sharing implementation

**Create/Move**:
- Mount backend auth after generic request middleware and before protected `/api/*` routers.
- Keep `/api/status` and `/api/health` minimal and unauthenticated.
- Make `test-app-factory` mirror production middleware placement.
- Update Docker healthcheck compatibility for `/api/health` if needed.

**Exclude**: No CORS rework, filesystem restriction work, SSE auth redesign, public project filtering.

**Anti-duplication**: Import backend auth from `server/security/apiAuth.ts`; do not reimplement token parsing in `server/server.ts` or tests.

**Duplication Guard**:
- Check route mounting in `server/server.ts` before inserting middleware.
- If test helpers already construct an app, extend `server/tests/api/test-app-factory.ts` rather than creating another factory.
- Verify exactly one backend REST auth middleware is mounted for protected APIs.

**Verify**:
```bash
bun run --cwd server jest tests/api/api-auth.test.ts
```

**Done when**:
- [x] Anonymous `GET /api/projects` and `POST /api/projects/:id/crs` return 401 with auth enabled.
- [x] Valid bearer and `X-API-Key` reach existing route contracts.
- [x] No-Origin requests use the same token rules.
- [x] Proxy-stripped credentials fail closed; forwarded credential headers pass.
- [x] `/api/status` and `/api/health` expose no project paths, auth env, or tokens.
- [x] Median auth overhead check is below 5ms.

### Task 2: Harden MCP HTTP auth regression and stdio selection seams

**Milestone**: M2 — MCP transport auth behavior (BR-2.1, BR-2.2)

**Structure**: `mcp-server/src/transports/middleware.ts`, `mcp-server/src/transports/httpSecurity.ts`, `mcp-server/src/transports/http.ts`, `mcp-server/src/transports/transportSelection.ts`, `mcp-server/src/index.ts`, `mcp-server/tests/http-auth-session-rate-limit.test.ts`, `mcp-server/tests/http-security-config.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-mcp-http-auth-regression` → `mcp-server/tests/http-auth-session-rate-limit.test.ts`: MCP bearer auth rejects missing, malformed, different-length, and equal-length invalid tokens
- `TEST-mcp-http-security-config` → `mcp-server/tests/http-security-config.test.ts`: env parsing, stdio transport selection, legacy no-auth warning, production default, missing token failure

**Makes GREEN (Behavior)**:
- `mcp_stdio_ignores_http_auth_settings` → `mcp-server/tests/http-security-config.test.ts` (BR-2.1)
- `mcp_http_rejects_missing_or_invalid_bearer` → `mcp-server/tests/http-auth-session-rate-limit.test.ts` (BR-2.2)

**Scope**: Preserve MCP stdio behavior while locking HTTP bearer auth and config validation seams.
**Boundary**: Do not introduce backend API auth into MCP transport modules.

**Creates**:
- None

**Modifies**:
- `mcp-server/src/transports/middleware.ts`
- `mcp-server/src/transports/httpSecurity.ts`
- `mcp-server/src/transports/http.ts`
- `mcp-server/src/transports/transportSelection.ts`
- `mcp-server/src/index.ts`
- `mcp-server/tests/http-auth-session-rate-limit.test.ts`
- `mcp-server/tests/http-security-config.test.ts`

**Must Not Touch**:
- `mcp-server/src/tools/**`
- `server/security/apiAuth.ts`
- public sharing/read-only implementation

**Create/Move**:
- Keep MCP bearer comparison length-checked and timing-safe.
- Ensure HTTP auth enabled without `MCP_AUTH_TOKEN` fails config/startup generically.
- Keep stdio selection independent from HTTP auth token requirements.
- Make `mcp-server/src/index.ts` use the `transportSelection.ts` selector seam so the stdio independence test covers real transport selection.
- Keep auth middleware scoped to `/mcp` HTTP transport.

**Exclude**: MCP session/rate-limit redesign, tool-level authorization, backend API-token acceptance in MCP.

**Anti-duplication**: Reuse existing `createAuthMiddleware`/`parseHttpTransportConfig` seams; do not create a second MCP auth parser.

**Duplication Guard**:
- Check `mcp-server/src/transports/middleware.ts` for existing token matching before modifying.
- Check `mcp-server/src/transports/httpSecurity.ts` for existing env parsing before adding flags.
- Verify no auth checks were added inside MCP tool handlers.

**Verify**:
```bash
bun run --cwd mcp-server jest tests/http-auth-session-rate-limit.test.ts tests/http-security-config.test.ts
```

**Done when**:
- [x] Missing/malformed/invalid MCP bearer tokens return 401.
- [x] Valid MCP bearer token succeeds when HTTP auth is enabled.
- [x] Stdio starts without requiring `MCP_AUTH_TOKEN`.
- [x] Explicit HTTP auth without token fails clearly.
- [x] Existing timing-safe comparison remains covered.

### Task 3: Set production Docker auth defaults and migration/proxy docs

**Milestone**: M3 — Production Docker and migration docs (BR-2.3, BR-2.4)

**Structure**: `docker-compose.prod.yml`, `nginx.conf`, `docs/DOCKER_GUIDE.md`, `docs/DOCKER_REFERENCE.md`, `docs/MCP_SERVER_GUIDE.md`, `docs/tests/api-auth-docs.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-api-auth-migration-docs` → `docs/tests/api-auth-docs.test.ts`: backend/MCP auth migration warning docs plus nginx credential header forwarding contract
- `TEST-mcp-http-security-config` → `mcp-server/tests/http-security-config.test.ts`: production Docker auth-on default portions

**Makes GREEN (Behavior)**:
- `mcp_http_accepts_production_bearer_default` → `mcp-server/tests/http-security-config.test.ts` (BR-2.3)
- `mcp_existing_deployment_migration_warning` → `server/tests/api/api-auth.test.ts`, `mcp-server/tests/http-security-config.test.ts`, `docs/tests/api-auth-docs.test.ts` (BR-2.4)

**Scope**: Make production Docker auth-on default and document migration/proxy behavior.
**Boundary**: Docs/config only; no runtime sharing policy.

**Creates**:
- None

**Modifies**:
- `docker-compose.prod.yml`
- `nginx.conf`
- `docs/DOCKER_GUIDE.md`
- `docs/DOCKER_REFERENCE.md`
- `docs/MCP_SERVER_GUIDE.md`
- `docs/tests/api-auth-docs.test.ts`

**Must Not Touch**:
- `docker-compose.dev*.yml` unless compile/test evidence shows a named reference requires it
- frontend UI docs unrelated to deployment
- MDT-172 docs or implementation

**Create/Move**:
- Set production MCP Docker default `MCP_SECURITY_AUTH=${MCP_SECURITY_AUTH:-true}`.
- Document `API_SECURITY_AUTH`, `API_AUTH_TOKEN`, `MCP_SECURITY_AUTH`, and `MCP_AUTH_TOKEN`.
- Document migration warning meaning and required operator action.
- Preserve/verify nginx forwarding for `Authorization` and `X-API-Key`.

**Exclude**: TLS termination instructions beyond existing nginx context, OAuth/RBAC/token rotation, public sharing docs.

**Anti-duplication**: Update existing Docker/MCP docs in place; do not add a new competing auth guide.

**Duplication Guard**:
- Search existing Docker/MCP auth sections before adding text.
- If nginx already forwards auth headers, extend the same block and tests rather than duplicating server blocks.
- Verify docs mention MDT-157 auth only and defer sharing to MDT-172.

**Verify**:
```bash
bun test docs/tests/api-auth-docs.test.ts
bun run --cwd mcp-server jest tests/http-security-config.test.ts
```

**Done when**:
- [x] Production Docker defaults MCP HTTP auth on.
- [x] Missing production MCP token fails through existing validation.
- [x] Legacy no-auth warning path is documented and tested.
- [x] nginx forwards `Authorization` and `X-API-Key` unchanged.

### Task 4: Run latency and existing suite preservation gates

**Milestone**: M4 — Regression gates

**Structure**: `docs/CRs/MDT-157/tests.md`

**Makes GREEN (Automated Tests)**:
- `TEST-existing-suite-preservation` → `docs/CRs/MDT-157/tests.md`: existing server, MCP, frontend, and E2E suites remain green outside auth-enabled contexts

**Scope**: Final verification gate after Tasks 0-3.
**Boundary**: Verification only unless a gate failure identifies a scoped regression in owned files from Tasks 0-3.

**Creates**:
- None

**Modifies**:
- None

**Must Not Touch**:
- Any unrelated implementation files
- MDT-172 sharing implementation

**Create/Move**:
- None

**Exclude**: Do not broaden scope to fix unrelated flaky tests without explicit follow-up.

**Anti-duplication**: Use existing suite commands from `docs/CRs/MDT-157/tests.md`; do not invent alternate runners.

**Duplication Guard**:
- Check failure ownership before changing code.
- If a failure belongs outside MDT-157 auth files, report it instead of patching.
- Verify no second auth or test runner path was added.

**Verify**:
```bash
bun run --cwd server jest
bun run --cwd mcp-server jest
bun run --cwd server build
bun run --cwd mcp-server build
bun run build
bun run test:e2e
bun test docs/tests/api-auth-docs.test.ts
```

**Done when**:
- [x] Existing suites GREEN or exclusions are explicitly reported.
- [x] Auth latency remains below the <5ms median overhead budget.
- [x] No unrelated files were changed.

### Task 5: UAT lock Vite frontend logging endpoints to localhost

**Milestone**: UAT — Vite dev logging boundary

**Structure**: `vite.config.ts`, `tests/vite-frontend-logs-security.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-vite-frontend-logs-localhost` -> `tests/vite-frontend-logs-security.test.ts`: Vite-only frontend logging middleware is loopback-only and handles malformed JSON safely

**Scope**: Lock Vite dev-server `/api/frontend/logs*` endpoints to localhost/loopback clients because they bypass backend API auth.
**Boundary**: Do not change backend REST auth, MCP auth, production Docker auth defaults, or MDT-172 public sharing behavior.

**Creates**:
- `tests/vite-frontend-logs-security.test.ts`

**Modifies**:
- `vite.config.ts`

**Must Not Touch**:
- `server/security/apiAuth.ts`
- `server/controllers/**`
- `mcp-server/src/tools/**`
- MDT-172 sharing implementation

**Create/Move**:
- Add a reusable Vite middleware caller check for loopback-only access.
- Apply the check to all `/api/frontend/logs*` Vite middleware endpoints before body parsing or state mutation.
- Reject LAN/tunnel/non-loopback callers with a generic 403.
- Ignore spoofed `X-Forwarded-*` headers for localhost decisions.
- Return controlled 400 for malformed JSON on `POST /api/frontend/logs`.

**Verify**:
```bash
bun test tests/vite-frontend-logs-security.test.ts
bun run test:e2e
```

**Done when**:
- [x] Loopback requests to `/api/frontend/logs*` still work in local dev/E2E.
- [x] Non-loopback requests are rejected before logs are accepted or sessions start/stop.
- [x] Spoofed forwarded headers do not bypass the loopback check.
- [x] Malformed JSON does not crash middleware.

### Task 6: UAT narrow backend no-auth to loopback-host + bind boundary

**Milestone**: UAT — Loopback-host no-auth scope (2026-08-06)

**Structure**: `server/security/apiAuth.ts`, `server/routes/auth.ts`, `server/config/runtimeConfig.ts`, `server/server.ts`, `vite.config.ts`, `docker-compose.yml`, `docker-compose.dev.yml`, `docker-compose.prod.yml`, `.env.example`, `docs/AUTH_SESSION_GUIDE.md`, `docs/ENVIRONMENT_VARIABLES.md`, `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-backend-loopback-host-bypass` → `server/tests/security/apiAuth.test.ts` + `server/tests/api/api-auth.test.ts`: `isLocalHostRequest` accept/reject matrix; loopback `Host` grants owner without token (auth on/off); tunnel `Host` denied when auth off; forged `X-Forwarded-Host` ignored; `GET /api/auth/session` local-exempt consistency.

**Makes GREEN (Behavior)**:
- `backend_loopback_host_local_bypass` → `server/tests/api/api-auth.test.ts` (BR-1.6 narrowed, BR-1.8)
- `loopback_bypass_does_not_escalate_readonly_session` → `server/tests/api/api-auth.test.ts` (BR-1.6, C12)

**Scope**: Narrow the existing backend no-auth local-dev carve-out so it applies only to loopback-host requests, add `API_BIND_ADDRESS`/`API_LOCAL_HOSTS`/`API_LOCAL_HOST_BYPASS`, make the session endpoint share the loopback decision, and ensure read-only sessions take precedence over the bypass.

**Boundary**: Do not add RBAC, per-user auth, mTLS, or change MCP transport auth. Do not change `originPolicy.ts` (CSRF/Origin logic is separate and correct). Do not let the loopback bypass escalate an existing read-only session (C12).

**Creates**:
- `isLocalHostRequest(req, localHosts)` exported from `server/security/apiAuth.ts`.
- `isLoopbackBypassEligible(req, config, readSession)` exported from `server/security/apiAuth.ts` — shared by the `/api` gate and `GET /api/auth/session` so the two cannot diverge on read-session scoping (review-P2 fix). Keys on `readSession.authenticated` alone.

**Modifies**:
- `server/security/apiAuth.ts` — add `localHosts` + `localHostBypassEnabled` to config/parse; loopback branch after exempt-route check; narrow `!config.enabled` owner grant to loopback-host.
- `server/routes/auth.ts` — reuse `isLoopbackBypassEligible` in `GET /api/auth/session`; report `localExempt` AND effective `authEnabled = config.enabled || !localExempt` so a non-exempt caller on a disabled-auth backend sees locked UI (review-P1 fix).
- `server/config/runtimeConfig.ts` — carry `localHosts` + `localHostBypassEnabled`.
- `server/server.ts` — `API_BIND_ADDRESS` (default `127.0.0.1`), `app.listen(PORT, HOST, …)`.
- `vite.config.ts` — `changeOrigin: false` on `/api`, `/api/events`, `/api-docs`; `server.host`/`preview.host` default `127.0.0.1`.
- `docker-compose*.yml` — `API_BIND_ADDRESS=0.0.0.0`, `API_LOCAL_HOST_BYPASS=false`.
- `.env.example`, `docs/AUTH_SESSION_GUIDE.md`, `docs/ENVIRONMENT_VARIABLES.md` — document new env vars + bind default.
- `server/tests/security/apiAuth.test.ts`, `server/tests/api/api-auth.test.ts` — add loopback cases.

**Must Not Touch**:
- `server/security/originPolicy.ts`
- `mcp-server/**` (separate transport)
- MDT-172 sharing implementation
- `server/controllers/**`

**Create/Move**:
- One shared `isLocalHostRequest` helper is the single authority; do not duplicate the loopback check in routes or sessions.
- `changeOrigin: false` aligns dev with `nginx.conf` `Host $host` (Docker already preserves Host).

**Exclude**: IP/`X-Forwarded-For`/`CF-Connecting-IP` authority; per-user auth; proxy-auth layers.

**Verify**:
```bash
bun run validate:ts
bun run --cwd server jest tests/security/apiAuth.test.ts tests/api/api-auth.test.ts tests/api/reverse-proxy-compat.test.ts tests/api/auth-stress-matrix.test.ts
bun run lint
```

**Done when**:
- [x] `API_SECURITY_AUTH=true`, `Host: localhost:3075`, no token → protected route 200.
- [x] `API_SECURITY_AUTH=true`, `Host: tunnel.trycloudflare.com`, no token → 403 (owner-only route).
- [x] `API_SECURITY_AUTH=false`, `Host: localhost:3075` → owner (200).
- [x] `API_SECURITY_AUTH=false`, `Host: tunnel.trycloudflare.com` → NOT owner (MDT-172 policy: public-read 200 / read-only honored / 401 / 403).
- [x] `GET /api/auth/session` with `Host: localhost` reports local-exempt/no-auth-dev; with tunnel `Host` reports auth-enabled/locked.
- [x] Loopback `Host` + valid read-only session cookie → stays read-only, NOT promoted to owner (C12); session reports read-only precedence over `localExempt`.
- [x] Forged `X-Forwarded-Host: localhost` with non-local `Host` → rejected.
- [x] Host lookalikes (`localhost.evil`, `127.0.0.1.evil`) → rejected; bracketed IPv6 (`[::1]:3001`) and ports normalized (Edge-5).
- [x] `changeOrigin: false` does not break SSE `/api/events` or reverse-proxy-compat/stress-matrix suites.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|---|---:|---:|---:|---|
| `server/security/` | 1 | 1 | 0 | ✅ |
| `server/` | 1 | 1 | 0 | ✅ |
| `server/routes/` | 1 | 1 | 0 | ✅ |
| `server/tests/security/` | 1 | 1 | 0 | ✅ |
| `server/tests/api/` | 2 | 2 | 0 | ✅ |
| Vite dev middleware | 1 | 1 | 0 | ✅ |
| `mcp-server/src/transports/` | 3 | 3 | 0 | ✅ |
| `mcp-server/src/` | 1 | 1 | 0 | ✅ |
| `mcp-server/tests/` | 2 | 2 | 0 | ✅ |
| root config | 3 | 3 | 0 | ✅ |
| `docs/` | 3 | 3 | 0 | ✅ |

### File Existence Check

- Missing architecture file at task generation time: `server/security/apiAuth.ts` — created by Task 0.
- All other architecture files existed and are covered by task `Structure`/`Creates`/`Modifies` fields.

## Post-Implementation

- [x] No duplication (grep/check owner modules)
- [x] Scope boundaries respected
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Smoke test passes with real HTTP auth configuration
- [x] Fallback/absence paths match local/test and migration requirements

## Post-Verify Fixes (appended by implement-agentic)

- Added only if `mdt:verify-complete` finds CRITICAL/HIGH issues.
