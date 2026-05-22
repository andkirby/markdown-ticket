# Requirements: MDT-157

**Source**: [MDT-157](../MDT-157-api-auth.md)  
**Generated**: 2026-05-22

## Overview

MDT-157 defines the authentication foundation for the backend REST API and MCP HTTP transport. It protects all non-health backend API routes, preserves local/stdin development flows, and keeps public sharing/authorization behavior out of scope for MDT-172.

Assessment source reality is preserved: MCP `timingSafeEqual` comparison and env parsing already exist; remaining MCP scope is production Docker auth defaults/migration behavior plus regression coverage.

## Constraint Carryover

| Constraint ID | Must Appear In |
|---------------|----------------|
| C1 | architecture.md security utility choice; tests.md token comparison regressions |
| C2 | tests.md latency validation |
| C3 | architecture.md backend auth boundary; tasks.md protected-route coverage check |
| C4 | architecture.md reverse-proxy contract; tests.md no-Origin/proxy-header cases |
| C5 | architecture.md credential parsing contract; tests.md header acceptance and log-safety checks |
| C6 | architecture.md scope guard; tasks.md out-of-scope verification |
| C7 | architecture.md health/status exemption; tests.md unauthenticated health responses |
| C8 | tests.md non-auth regression suite preservation; tasks.md full existing suite verification |
| C9 | architecture.md/docs migration note; tasks.md deployment documentation update |

## Edge Case Carryover

| Edge ID | Must Appear In |
|---------|----------------|
| Edge-3 | architecture.md reverse-proxy fail-closed behavior; tests.md stripped-header regression |
| Edge-4 | architecture.md reverse-proxy forwarded-header behavior; tests.md nginx/proxy header-pass regression |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Backend credential shape | Accept admin token via `Authorization: Bearer <token>` and `X-API-Key`; never log raw values. | HTTP Basic, OAuth, JWT-only, or URL/query tokens. | Single-user deployments need a small static-token surface that works behind reverse proxies. |
| Backend auth default | Auth remains disabled when local/test auth env is absent; protected behavior is enabled when auth config is present. | Fail closed for every existing no-env deployment. | Ticket requires local development compatibility and migration path. |
| Production MCP Docker default | MCP HTTP production Docker requires bearer auth by default when `MCP_AUTH_TOKEN` is configured, with migration warning behavior when auth env is absent. | Treat current commented-out Docker auth as acceptable production default. | Assessment found timing-safe/env parsing already exists; Docker default/migration is the remaining gap. |
| `/api/projects` before MDT-172 | Anonymous `GET /api/projects` returns `401` before public sharing exists. | Return filtered public project lists now. | Public sharing and visibility filtering belong to MDT-172. |
| Health endpoints | `GET /api/status` and `GET /api/health` are unauthenticated and expose no sensitive metadata. | Protect health endpoints or expose project/config details through health. | Acceptance requires unauthenticated health/status without widening data exposure. |
| Origin handling | Origin is not an authentication signal; no-Origin requests use the same token rules. | Reject curl/server-to-server requests because Origin is missing. | Authentication must work for API clients and behind proxies. |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| Backend auth enable flag | Enables backend REST API authentication for protected routes. | Disabled for local/test compatibility unless explicitly configured. | Existing no-auth behavior continues; deployment should emit migration guidance when applicable. |
| Backend admin token | Static admin credential accepted by backend API auth. | None. | Auth-enabled startup/config validation must not silently accept all requests. |
| `MCP_SECURITY_AUTH` | Enables MCP HTTP bearer auth. | Production Docker should enable when MCP HTTP is enabled and token is configured. | Existing deployments continue with observable migration warning if left unset. |
| `MCP_AUTH_TOKEN` | MCP HTTP bearer token, reusing current MCP env pattern. | None. | Explicit MCP auth without token fails startup/config validation. |

Migration documentation must explain existing no-auth deployment behavior, required auth env vars, production Docker defaults, and the meaning/actionability of the migration warning.

## Validation Summary

**Scope coverage**
- Endpoints/routes found: `POST /api/projects/:id/crs`, `GET /api/projects`, `GET /api/status`, `GET /api/health`, MCP HTTP requests, MCP stdio startup.
- Error codes found: `401` for missing/invalid credentials; health/status success stays unauthenticated.
- User-input fields found: `Authorization` bearer token, `X-API-Key`, MCP bearer token, auth env vars.

**Quality checks**
- Each canonical requirement has one required behavior, constraint, or edge-case outcome.
- All delivery timing tags are `timing:in-ticket`.
- Constraint and edge-case records route to `tests`; only behavior records route to `bdd`.
- Security constraints cover timing-safe comparison, raw-token logging, proxy header behavior, and out-of-scope authorization/sharing.
- Regression constraints preserve existing non-auth test behavior outside auth-enabled contexts.
- Migration constraints require docs for no-auth deployments, env vars, production Docker behavior, and warning meaning.
- No clarification blockers remain for requirements.

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
