# BDD: MDT-157

## Overview

MDT-157 acceptance is split into two user-visible journeys:

1. Backend REST API authentication protects all non-health routes while preserving local/test no-auth compatibility.
2. MCP transport behavior preserves stdio, enforces bearer auth for HTTP when enabled, and documents production Docker migration behavior.
3. (UAT 2026-08-06) The local no-auth carve-out is scoped to loopback-host requests only, so one running instance reached both locally and through a tunnel keeps local convenience while the tunnel path still requires auth.
4. (UAT 2026-08-06) The loopback bypass does not silently escalate an existing read-only session to owner; read-only precedence holds on every host.

BDD remains auth-only. Public sharing, project visibility filtering, read-only policy, and scoped sharing behavior stay in MDT-172.

## Acceptance Strategy

- Canonical scenarios are stored in `spec-trace` and rendered to [bdd.trace.md](./bdd.trace.md).
- Scenario coverage targets only behavior requirements routed to BDD (`BR-*`). Constraints and edge cases remain for `mdt:architecture` and `mdt:tests`.
- Scenario budget: 9 total scenarios, grouped under backend API auth and MCP transport/auth deployment behavior.
- (UAT 2026-08-06) Scenario budget raised to 10: added `backend_loopback_host_local_bypass` covering BR-1.6 (narrowed) and the new BR-1.8 (non-loopback host with auth disabled is not owner).
- (UAT 2026-08-06) Scenario budget raised to 11: added `loopback_bypass_does_not_escalate_readonly_session` covering BR-1.6 + constraint C12 (read-only session precedence).
- Playwright exists under `tests/e2e`, but this BDD pass did not create executable E2E files; `mdt:tests` should decide final API/MCP test file placement and whether Supertest-level API acceptance is a better fit than browser E2E.

## Test-Facing Contract Notes

- Backend credentials: valid admin token through `Authorization: Bearer <token>` and `X-API-Key`; no query-token behavior.
- Health bypass: `GET /api/status` and `GET /api/health` stay unauthenticated and must not expose sensitive project/config data.
- `Origin` is not an authentication signal. No-Origin curl/server-to-server requests use the same credential rules.
- MCP timing-safe comparison and env parsing are treated as existing behavior to preserve; remaining MCP scope is production Docker auth defaults, migration warning, and regression coverage.
- Production Docker MCP HTTP should require bearer auth by default when `MCP_AUTH_TOKEN` is configured; existing no-auth deployments continue with observable migration guidance.
- (UAT 2026-08-06) Loopback-host bypass: when the request `Host` hostname is in `API_LOCAL_HOSTS` (default `localhost`, `127.0.0.1`, `::1`), the protected API grants owner/no-auth-dev access without a token — regardless of whether `API_SECURITY_AUTH` is on or off. When the `Host` is non-loopback (e.g. a tunnel hostname), normal auth applies; with auth disabled, a non-loopback host follows normal MDT-172 policy (public-read 200, read-only sessions honored, else 401/403) and is NOT granted owner. The bypass master switch `API_LOCAL_HOST_BYPASS` defaults on for native runs and off for Docker. `X-Forwarded-Host`/`CF-Connecting-IP` must not influence the decision.
- (UAT 2026-08-06) Read-only precedence (C12): a request carrying an existing read-only session is never escalated to owner by the loopback bypass, on any host. `GET /api/auth/session` reports `localExempt` only when no read-only session takes precedence.

## Execution Notes

- BDD validation: `spec-trace validate MDT-157 --stage bdd --format json` passed with no issues.
- Render command: `spec-trace render bdd MDT-157` updated [bdd.trace.md](./bdd.trace.md).
- No blockers recorded for BDD. Architecture/tests must resolve implementation placement and executable test granularity.
