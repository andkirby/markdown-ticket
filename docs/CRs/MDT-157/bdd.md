# BDD: MDT-157

## Overview

MDT-157 acceptance is split into two user-visible journeys:

1. Backend REST API authentication protects all non-health routes while preserving local/test no-auth compatibility.
2. MCP transport behavior preserves stdio, enforces bearer auth for HTTP when enabled, and documents production Docker migration behavior.

BDD remains auth-only. Public sharing, project visibility filtering, read-only policy, and scoped sharing behavior stay in MDT-172.

## Acceptance Strategy

- Canonical scenarios are stored in `spec-trace` and rendered to [bdd.trace.md](./bdd.trace.md).
- Scenario coverage targets only behavior requirements routed to BDD (`BR-*`). Constraints and edge cases remain for `mdt:architecture` and `mdt:tests`.
- Scenario budget: 9 total scenarios, grouped under backend API auth and MCP transport/auth deployment behavior.
- Playwright exists under `tests/e2e`, but this BDD pass did not create executable E2E files; `mdt:tests` should decide final API/MCP test file placement and whether Supertest-level API acceptance is a better fit than browser E2E.

## Test-Facing Contract Notes

- Backend credentials: valid admin token through `Authorization: Bearer <token>` and `X-API-Key`; no query-token behavior.
- Health bypass: `GET /api/status` and `GET /api/health` stay unauthenticated and must not expose sensitive project/config data.
- `Origin` is not an authentication signal. No-Origin curl/server-to-server requests use the same credential rules.
- MCP timing-safe comparison and env parsing are treated as existing behavior to preserve; remaining MCP scope is production Docker auth defaults, migration warning, and regression coverage.
- Production Docker MCP HTTP should require bearer auth by default when `MCP_AUTH_TOKEN` is configured; existing no-auth deployments continue with observable migration guidance.

## Execution Notes

- BDD validation: `spec-trace validate MDT-157 --stage bdd --format json` passed with no issues.
- Render command: `spec-trace render bdd MDT-157` updated [bdd.trace.md](./bdd.trace.md).
- No blockers recorded for BDD. Architecture/tests must resolve implementation placement and executable test granularity.
