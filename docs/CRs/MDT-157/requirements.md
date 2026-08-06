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
| C10 | architecture.md Vite dev logging boundary; tests.md localhost-only enforcement for `/api/frontend/logs` |
| C11 | architecture.md backend bind boundary + Docker opt-in; tests.md loopback-default bind and `API_BIND_ADDRESS`/`API_LOCAL_HOST_BYPASS` cases |
| C12 | architecture.md read-only-session precedence over loopback bypass; tests.md read-only-not-escalated cases |

## Edge Case Carryover

| Edge ID | Must Appear In |
|---------|----------------|
| Edge-3 | architecture.md reverse-proxy fail-closed behavior; tests.md stripped-header regression |
| Edge-4 | architecture.md reverse-proxy forwarded-header behavior; tests.md nginx/proxy header-pass regression |
| Edge-5 | architecture.md forged-`Host:localhost` over non-loopback connection + Host lookalikes (`localhost.evil`) + bracketed IPv6/port normalization; tests.md `API_BIND_ADDRESS` loopback-default + Host-parsing accept/reject matrix |

## Non-Ambiguity Table

| Concept | Final Semantic | Rejected Semantic | Why |
|---------|----------------|-------------------|-----|
| Backend credential shape | Accept admin token via `Authorization: Bearer <token>` and `X-API-Key`; never log raw values. | HTTP Basic, OAuth, JWT-only, or URL/query tokens. | Single-user deployments need a small static-token surface that works behind reverse proxies. |
| Backend auth default | Auth remains disabled for **loopback-host** requests when local/test auth env is absent; protected behavior is enabled when auth config is present. A disabled-auth deployment reached on a **non-loopback** host (e.g. a Cloudflare tunnel) is NOT granted owner — it falls through to read-only/401. | Fail closed for every existing no-env deployment; OR grant owner to every host regardless of how the request arrived (the pre-UAT defect). | Ticket requires local development compatibility and migration path. "Local" means the request's `Host` hostname is loopback (`localhost`, `127.0.0.1`, `::1`), not "any host that reached a disabled-auth backend." See UAT 2026-08-06. |
| Loopback-host identity | The request `Host` header hostname is the only signal trusted for the local-dev no-auth carve-out, because it is the one identifier a CDN/tunnel edge fixes into the request and cannot be forged by an internet client. `X-Forwarded-Host`, `Origin`, `Referer`, `X-Forwarded-For`, `CF-Connecting-IP`, and `socket.remoteAddress` are explicitly NOT authorities for the bypass. Host parsing is exact-match on the parsed hostname (rejects `localhost.evil`), with bracketed IPv6 and port normalization. | Trust `X-Forwarded-Host`/`X-Forwarded-For`/`CF-Connecting-IP`/`remoteAddress` to decide "is this local." | Vite's `/api` proxy must preserve `Host` (`changeOrigin: false`) so the backend sees the real browser host; nginx already does `Host $host`. |
| Read-only vs loopback precedence | An authenticated read-only session (MDT-172 scoped read token/cookie) is higher-specificity than the loopback bypass, and the decision keys on `readSession.authenticated` alone — including the valid-but-empty/revoked-scope case. A loopback-host request carrying such a session stays read-only; the bypass does not promote it to owner. `localExempt` is reported only when no authenticated read session is present. One shared helper (`isLoopbackBypassEligible`) enforces this identically in the `/api` gate and the session endpoint. | Let loopback host escalate any request to owner, including read-only sessions; or key the bypass on non-empty scopes so an empty-scope session sneaks through. | Otherwise the local bypass silently defeats the read-token mechanism locally (C12), or the gate and session endpoint diverge. |
| Non-exempt request outcomes | A non-exempt request (non-loopback host, or bypass off) follows normal MDT-172 policy: public-read routes return 200, owner-only routes return 401/403, read-only sessions are honored. | Treat "not owner via bypass" as always 401. | Public-read routes legitimately return 200 anonymously (MDT-172). |
| Production MCP Docker default | MCP HTTP production Docker requires bearer auth by default when `MCP_AUTH_TOKEN` is configured, with migration warning behavior when auth env is absent. | Treat current commented-out Docker auth as acceptable production default. | Assessment found timing-safe/env parsing already exists; Docker default/migration is the remaining gap. |
| `/api/projects` before MDT-172 | Anonymous `GET /api/projects` returns `401` before public sharing exists. | Return filtered public project lists now. | Public sharing and visibility filtering belong to MDT-172. |
| Health endpoints | `GET /api/status` and `GET /api/health` are unauthenticated and expose no sensitive metadata. | Protect health endpoints or expose project/config details through health. | Acceptance requires unauthenticated health/status without widening data exposure. |
| Origin handling | Origin is not an authentication signal; no-Origin requests use the same token rules. | Reject curl/server-to-server requests because Origin is missing. | Authentication must work for API clients and behind proxies. |
| Vite frontend logging endpoints | Vite-only `/api/frontend/logs*` endpoints are reachable only from localhost/loopback clients. | Treat Vite dev logging endpoints as public LAN/tunnel APIs. | These endpoints bypass backend auth and exist only for local debugging. |

## Configuration

| Setting | Description | Default | When Absent |
|---------|-------------|---------|-------------|
| Backend auth enable flag | Enables backend REST API authentication for protected routes. | Disabled for local/test compatibility unless explicitly configured. | Existing no-auth behavior continues; deployment should emit migration guidance when applicable. |
| Backend admin token | Static admin credential accepted by backend API auth. | None. | Auth-enabled startup/config validation must not silently accept all requests. |
| `MCP_SECURITY_AUTH` | Enables MCP HTTP bearer auth. | Production Docker should enable when MCP HTTP is enabled and token is configured. | Existing deployments continue with observable migration warning if left unset. |
| `MCP_AUTH_TOKEN` | MCP HTTP bearer token, reusing current MCP env pattern. | None. | Explicit MCP auth without token fails startup/config validation. |
| `API_BIND_ADDRESS` | Network interface the backend Express server binds. Mirrors the existing `MCP_BIND_ADDRESS` pattern. | `127.0.0.1` (loopback). | Native dev: backend is unreachable from the LAN/internet; loopback-host bypass is safe. Docker compose sets `0.0.0.0` so the frontend/nginx container can reach it — on that path `API_LOCAL_HOST_BYPASS` defaults off. |
| `API_LOCAL_HOSTS` | CSV of `Host` header hostnames treated as loopback for the local no-auth carve-out. | `localhost,127.0.0.1,::1`. | Default loopback set applies; operator may extend for local dev hostnames that resolve to loopback. |
| `API_LOCAL_HOST_BYPASS` | Master switch for the loopback-host no-auth carve-out. | `true` when `NODE_ENV` is unset/`development`/`local` (the `bunx tsx server.ts` dev path); `false` in `production`, `test`, and Docker compose. | When `false`, even a loopback `Host` does not grant owner without a token — use for intentional deployments (Docker) where the proxy boundary is shared. `test` defaults off so the loopback test harness does not silently pass auth tests through the carve-out. |

Migration documentation must explain existing no-auth deployment behavior, required auth env vars, production Docker defaults, and the meaning/actionability of the migration warning.

## UAT Refinement 2026-08-06 — Loopback-Host No-Auth Scope

Approved change: the local-development no-auth carve-out is narrowed from "any host on a disabled-auth backend" to "requests whose `Host` hostname is loopback." This makes the code match BR-1.6's original intent ("local development workflow continues to work" — local = loopback, not the whole internet via a tunnel) and closes the accidental-exposure hole when one running instance is reached both locally and through a Cloudflare tunnel.

Requirement identity decisions:

- **BR-1.6 (refine_in_place)** — "no-auth config preserves local behavior" is narrowed: the no-auth/`no-auth-dev` owner grant applies only when the request `Host` is loopback. Same ID, clarified/narrowed meaning.
- **C4 (refine_in_place)** — "no proxy/origin headers as credentials" is strengthened to explicitly include `X-Forwarded-Host` and `CF-Connecting-IP` as non-authorities for the loopback bypass.
- **BR-1.8 (additive)** — new behavior: a disabled-auth backend reached on a non-loopback host does NOT grant owner; it falls through to read-only/401.
- **C11 (additive)** — new constraint: backend binds loopback by default (`API_BIND_ADDRESS=127.0.0.1`); Docker must opt into `0.0.0.0` and defaults `API_LOCAL_HOST_BYPASS=false`.
- **Edge-5 (additive)** — forged `Host: localhost` over a non-loopback connection is contained by the bind boundary (`:3001` loopback-only) and is not trusted as a bypass authority. Host parsing rejects lookalikes (`localhost.evil`) and normalizes bracketed IPv6/ports.
- **C12 (additive)** — new constraint: an existing read-only session takes precedence over the loopback bypass on any host; the bypass never silently escalates a read-only request to owner.

This refinement is consistent with C6 (auth-only scope): it changes the *auth decision boundary*, not authorization/sharing. MDT-176's C6 ("preserve MDT-157 behavior") is satisfied because this corrects MDT-157 to match its own requirement text; MDT-176's session UX consumes the corrected decision.

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
- UAT refinement adds localhost-only enforcement for Vite dev frontend logging endpoints that bypass backend auth middleware.
- UAT refinement 2026-08-06 narrows the backend no-auth local-dev carve-out to loopback-host requests, adds `API_BIND_ADDRESS`/`API_LOCAL_HOSTS`/`API_LOCAL_HOST_BYPASS`, rejects `X-Forwarded-Host`/`CF-Connecting-IP` as bypass authorities, makes read-only sessions take precedence over the bypass (C12), and rejects Host lookalikes with IPv6/port normalization (Edge-5).
- No clarification blockers remain for requirements.

---
Use `requirements.trace.md` for canonical requirement rows and route summaries.
