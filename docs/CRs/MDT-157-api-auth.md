---
code: MDT-157
status: Implemented
dateCreated: 2026-05-01T01:22:53.430Z
type: Feature Enhancement
priority: High
relatedTickets: MDT-156, MDT-172
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

### Non-Functional
- [x] Auth middleware adds < 5ms latency per request
- [x] All existing tests pass

### Edge Cases
- [x] Requests with no `Origin` header (curl, server-to-server) still authenticate normally
- [x] Existing deployments with no auth env var continue to function with logged warning
- [x] MCP bearer token comparison is timing-safe

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
