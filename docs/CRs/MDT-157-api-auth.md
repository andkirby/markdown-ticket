---
code: MDT-157
status: Implemented
dateCreated: 2026-05-01T01:22:53.430Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-156,MDT-172,MDT-176
---

# Add authentication to backend API and MCP HTTP transport

Architecture reference: [Authentication and Sharing Architecture](../architecture/auth-and-sharing-architecture.md)

## 1. Description

### Requirements Scope
`full`

### Problem
- All backend REST API endpoints are unauthenticated — anyone with network access can read projects, create/delete CRs, enumerate directories, and write files
- The MCP HTTP transport has auth middleware code (`createAuthMiddleware`) but it is disabled by default in production Docker deployments
- MCP bearer token comparison uses strict equality (`!==`) instead of `crypto.timingSafeEqual`, enabling timing attacks
- No mechanism exists for single-user deployments to protect their API without external infrastructure

### Affected Areas
- `server/` — Express middleware, route protection, error responses
- `mcp-server/` — HTTP transport auth defaults, timing-safe token comparison
- Docker configs — environment variable defaults for production

### Scope

**In scope:**
- Authentication middleware for backend REST API (all non-health endpoints)
- Enable MCP HTTP auth by default in production Docker
- Use timing-safe token comparison for MCP bearer tokens
- Graceful backward compatibility for local development (no auth required)
- Configuration via environment variables

**Out of scope:**
- CORS fixes (MDT-156)
- Filesystem API restrictions (MDT-156)
- Dependency patching (MDT-156)
- RBAC or multi-user system
- TLS/HTTPS termination

## 2. Desired Outcome

### Success Conditions
- All backend API endpoints (except health/status) require a valid auth token
- MCP production Docker config enables authentication by default
- Token comparison is resistant to timing attacks
- Local development workflow (stdio MCP, no auth) continues to work without configuration changes
- Existing deployments without auth configured have a documented migration path

### Constraints
- Must work without external services — single static token or API key is sufficient
- Must not break MCP stdio transport (CLI use)
- Must work behind nginx reverse proxy
- Must reuse existing `MCP_AUTH_TOKEN` env var pattern for consistency
- Auth middleware should be opt-in via env var, not hardcoded on

### Non-Goals
- Multi-tenant or role-based authorization
- User management or registration
- Token rotation or expiration
- OAuth or third-party auth integration

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Auth mechanism | Static API key via header (`X-API-Key`) vs. Bearer token vs. HTTP Basic? | Single-user; no external services |
| Config shape | Shared token for backend + MCP, or separate tokens? | Minimize config surface |
| Health endpoints | Which endpoints remain unauthenticated? | At minimum `/api/health` and `/api/status` |
| Default behavior | Auth disabled by default (opt-in) or enabled by default (opt-out)? | Must not break local dev |

### Decisions Deferred
- Specific middleware implementation (`/mdt:architecture`)
- Test plan (`/mdt:tests`)
- Task breakdown (`/mdt:tasks`)

### End-State Alignment
- MDT-157 owns authentication only. MDT-172 owns public sharing, project visibility filtering, read-only policy, and scoped read tokens.
- `GET /api/projects` may return `401` before public sharing exists. After MDT-172, anonymous access returns only explicit `public-readonly` directory-listed projects, or an empty list when none are public.

## 4. Acceptance Criteria

### Functional
- [x] Unauthenticated `POST /api/projects/:id/crs` returns 401
- [x] Unauthenticated `GET /api/projects` returns 401 when public sharing is not enabled
- [x] Authenticated request with valid token returns normal response
- [x] `GET /api/health` and `GET /api/status` respond without auth
- [x] MCP stdio transport works without any auth configuration
- [x] MCP production Docker enables auth by default

### Loopback-Host No-Auth Scope (UAT 2026-08-06)
- [x] Loopback-host request (`Host: localhost:3075`) with no token gets owner access (auth on or off), only when `API_LOCAL_HOST_BYPASS=true` and no authenticated read session is present
- [x] With `API_LOCAL_HOST_BYPASS=false`, no `Host` value grants local exemption (production/test/Docker default)
- [x] `API_LOCAL_HOST_BYPASS` defaults ON when `NODE_ENV` is unset/`development`/`local` (the `bunx tsx server.ts` dev path) so ordinary local dev keeps no-token owner; OFF in `production`, `test`, and Docker
- [x] Non-loopback-host request (e.g. tunnel `Host`) with auth disabled is NOT granted owner — follows normal MDT-172 policy (public-read 200 / read-only honored / 401 / 403)
- [x] Non-loopback-host request with auth enabled requires token or MDT-176 owner-session
- [x] A loopback-host request carrying an authenticated read-only session stays read-only; the bypass does NOT escalate it to owner (C12) — this holds even when the read session has empty/revoked `projectRefs`/`shareIds`, because the decision keys on `readSession.authenticated`
- [x] `GET /api/auth/session` returns an explicit `localExempt` state using the SAME shared helper (`isLoopbackBypassEligible`) as the protected API gate, so the two cannot diverge; an authenticated read session takes precedence over `localExempt`
- [x] `GET /api/auth/session` reports an EFFECTIVE `authEnabled = config.enabled || !localExempt`, so a non-exempt caller on a disabled-auth backend (e.g. tunnel `Host`) sees locked UI, not `no-auth-dev`
- [x] `X-Forwarded-Host`, `CF-Connecting-IP`, `Origin`, `Referer`, `X-Forwarded-For`, and socket address do not affect the bypass decision
- [x] Host parsing handles ports and bracketed IPv6, and rejects lookalikes such as `localhost.evil`
- [x] Backend binds `127.0.0.1` by default; Docker compose sets `0.0.0.0` + `API_LOCAL_HOST_BYPASS=false`; the `vite` dev script no longer passes `--host` (use `dev:lan` / `VITE_SERVER_HOST=0.0.0.0` for LAN reach)

### Non-Functional
- [x] Auth middleware adds < 5ms latency per request
- [x] All existing tests pass

### Edge Cases
- [x] Requests with no `Origin` header (curl, server-to-server) still authenticate normally
- [x] Existing deployments with no auth env var continue to function with logged warning
- [x] MCP bearer token comparison is timing-safe
- [x] Forged `Host: localhost` over a non-loopback connection is contained by the bind boundary; Host lookalikes rejected; IPv6/ports normalized (Edge-5)

## 5. Verification

> Requirements trace projection: [requirements.trace.md](./MDT-157/requirements.trace.md)
>
> Requirements notes: [requirements.md](./MDT-157/requirements.md)
>
> BDD trace projection: [bdd.trace.md](./MDT-157/bdd.trace.md)
>
> BDD notes: [bdd.md](./MDT-157/bdd.md)
>
> Architecture trace projection: [architecture.trace.md](./MDT-157/architecture.trace.md)
>
> Architecture notes: [architecture.md](./MDT-157/architecture.md)
>

### How to Verify Success
- Manual: `curl -X POST http://localhost:3001/api/projects/test/crs` returns 401
- Manual: `curl -H "Authorization: Bearer <token>" ...` returns 200
- Automated: unit tests for auth middleware accept/reject logic
- Automated: `crypto.timingSafeEqual` usage confirmed via code review

## 8. Clarifications

### UAT Session 2026-05-22

- Approved change: Vite dev-server frontend logging endpoints at `/api/frontend/logs*` must be locked to localhost/loopback because they bypass backend API auth and are only for local debugging.
- Changed requirement IDs: added `C10`.
- Updated workflow documents: `requirements.md`, `architecture.md`, `tests.md`, `tasks.md`.
- Wrote current-round brief: `MDT-157/uat.md`.
- Strict drift lock was not used; affected stages should be revalidated and rendered after canonical trace sync.

### UAT Session 2026-08-06

- Approved change: narrow the backend no-auth local-dev carve-out to loopback-host requests only, so one instance reached both locally and through a Cloudflare tunnel keeps local convenience (no token) while the tunnel path still requires auth. Closes the accidental-exposure hole where `API_SECURITY_AUTH=false` granted owner to every host.
- Changed requirement IDs: `BR-1.6` and `C4` refined in place; `BR-1.8`, `C11`, `C12`, `Edge-5` added.
- Updated workflow documents: `requirements.md`, `bdd.md`, `architecture.md`, `tests.md`, `tasks.md`.
- Canonical trace synced in stage order (requirements → bdd → architecture → tests → tasks); `spec-trace validate MDT-157 --stage all` GREEN.
- Wrote current-round brief: `MDT-157/uat.md`.
- Strict drift lock was not used.
- New-CR alternative explicitly rejected: BR-1.6 already promised local-without-auth, so this is that requirement implemented correctly, not a new capability. Consistent with MDT-176 C6 ("preserve MDT-157 behavior") because it corrects MDT-157 to match its own requirement text.
- Implementation deferred to `TASK-6` (current remaining execution slice).

#### Review-round corrections (same UAT, post-implementation)

Two review rounds found defects in the initial TASK-6 implementation; all are fixed, reflected in §4 acceptance, and synced to canonical trace:

- **P1 — effective `authEnabled` for the UI.** `GET /api/auth/session` reported the raw config flag, so a tunnel `Host` on a disabled-auth backend got `authEnabled:false` → UI entered `no-auth-dev` → failed on writes. Fixed: report effective `authEnabled = config.enabled || !localExempt`. Added acceptance criterion + integration test.
- **P2 — gate/session divergence on read-session scoping.** The `/api` gate keyed bypass on `readSession.authenticated`; the session endpoint keyed on `authenticated && non-empty scopes`. An authenticated-but-empty/revoked-scope session made the UI show `no-auth-dev` while the gate denied owner. Fixed: extracted shared `isLoopbackBypassEligible` helper used by both; keys on `authenticated` alone. C12 tightened to state this explicitly; scenario `then` extended; empty-scope test added.
- **P3 — `NODE_ENV`-undefined default.** `API_LOCAL_HOST_BYPASS` defaulted off for undefined `NODE_ENV`, but `bunx tsx server.ts` (the documented dev script) sets none → ordinary local dev lost no-token owner. Fixed: default ON for unset/`development`/`local`; OFF for `production`/`test`/Docker.
- **P2 — `vite --host` override.** Root `dev` script's bare `--host` forced `0.0.0.0`, defeating the loopback listen default. Fixed: dropped `--host`; added `dev:lan` (`VITE_SERVER_HOST=0.0.0.0`) escape hatch.
- Trace re-synced (C12, scenario, obligation, test-plan); `spec-trace validate MDT-157 --stage all` GREEN. `uat.md` "Review-Round Corrections" section records the same.
