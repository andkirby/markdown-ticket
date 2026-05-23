# BDD: MDT-176

**Source**: [MDT-176](../MDT-176-browser-auth-session-unlock.md)  
**Generated**: 2026-05-23

## Overview

BDD scenarios cover the owner browser unlock journey introduced after MDT-157 backend API auth. The acceptance intent is to make a locked backend visibly locked, allow a valid owner unlock, keep invalid attempts recoverable, end sessions through Lock/Logout, preserve no-auth local development, and keep MDT-172 public sharing out of MDT-176 scope.

## Acceptance Strategy

| Journey | Scenarios | Covered Requirements |
|---------|-----------|----------------------|
| Locked entry | `locked_backend_shows_unlock_panel` | BR-1.1, BR-1.2, BR-1.5 |
| Owner unlock | `successful_unlock_starts_owner_session` | BR-1.3, BR-1.5 |
| Invalid unlock | `invalid_unlock_stays_locked` | BR-1.4, BR-1.10 |
| Session lock/logout | `lock_action_returns_to_locked_state` | BR-1.6 |
| Local no-auth | `local_no_auth_loads_normally` | BR-1.7 |
| MDT-172 compatibility | `public_projects_remain_read_only`, `public_empty_shows_unlock_only` | BR-1.8, BR-1.9, BR-1.5 |

Scenario count: 7 total, within the normal-mode budget.

## E2E Framework

- **Framework detected**: Playwright
- **Directory**: `tests/e2e/`
- **Default command**: `bun run test:e2e`
- **Auth-session target**: isolated auth-enabled Playwright coverage, expected under `tests/e2e/auth/session-unlock.spec.ts`
- **Isolation rule**: auth scenarios must configure `API_SECURITY_AUTH` and `API_AUTH_TOKEN` only for the auth-specific run and must not change the default no-auth E2E suite.

No executable E2E file was generated in this BDD step. The canonical scenarios are ready for `/mdt:tests` to register and implement the isolated auth-enabled Playwright file without widening default no-auth behavior.

## Test-Facing Contract Notes

- BDD scenarios assert visible browser behavior only. Non-visible storage, cookie, API, and log invariants are deferred to `/mdt:tests` and `/mdt:architecture`.
- Locked state must use the visible copy from the design spec: “Board is locked”, access-token input, unlock action, and generic invalid-token error.
- `401` from project loading is locked/auth-required, never “No Projects Found”.
- Admin actions such as Add/Create/Edit Project must be unavailable while locked.
- Successful unlock must expose owner-session status and owner actions.
- Lock/Logout must clear only auth session state; it must not mutate project data.
- Local no-auth mode remains a first-class scenario and must continue to load normal project UI.
- MDT-172 compatibility is a boundary: MDT-176 must not expose public/read-only UI before MDT-172 defines the sharing contract.
- Raw token storage is a tests-routed constraint (`C1`), not a BDD scenario target. `tests.md` must verify storage/log/URL non-exposure using browser storage inspection plus request/log checks.

## Non-BDD Deferrals

These requirements are intentionally not covered by BDD scenarios because they are API, security, documentation, or harness contracts rather than visible journey assertions:

| IDs | Routed To | Deferral |
|-----|-----------|----------|
| BR-2.1, BR-2.2 | `/mdt:tests`, `/mdt:architecture` | API session exchange and protected-route session-cookie authentication. |
| BR-2.3 | `/mdt:tests`; partially visible in `lock_action_returns_to_locked_state` | Logout cookie invalidation must be verified through subsequent protected API/project-load behavior. |
| BR-2.4 | `/mdt:tests` | Missing/invalid session exchange and session-authenticated API rejection. |
| BR-3.1, C8 | `/mdt:tests`, `/mdt:architecture` | Operator docs for enabling auth, browser unlock, cookie/security behavior, logout, and local no-auth mode. |
| C1 | `/mdt:tests`, `/mdt:architecture` | No raw token storage or exposure in browser storage, URL state, logs, telemetry, or visible errors. |
| C2 | `/mdt:tests`, `/mdt:architecture` | Session cookie flags: `HttpOnly`, `SameSite=Strict`, and production/HTTPS `Secure`. |
| C3, C6 | `/mdt:tests`, `/mdt:architecture` | MDT-157 owner token-rule reuse, header-token auth preservation, health/status exemptions, and local no-auth compatibility. |
| C4 | `/mdt:tests`, `/mdt:architecture` | CSRF mitigation decision and verification for cookie-authenticated mutations. |
| C5, C7 | `/mdt:architecture`, `/mdt:tasks` | MDT-176 before MDT-172; no multi-user/RBAC/OAuth/password/rotation/refresh-token expansion. |
| C9 | `/mdt:tests`, `/mdt:tasks` | Isolated auth-enabled Playwright E2E setup with `API_SECURITY_AUTH`/`API_AUTH_TOKEN` only for auth tests; default no-auth E2E suite unchanged. |
| Edge-1 | `/mdt:tests` | Backend-down/network/5xx remains separate from locked state. |
| Edge-2 | `/mdt:tests` | SSE/reconnect after cleared or rejected session converges back to locked state without stale owner controls. |
| Edge-3 | `/mdt:tests`, `/mdt:architecture` | MDT-176 treats auth-enabled anonymous access as locked; MDT-172 owns any future public `200` sharing semantics. |

## Execution Notes

- Canonical scenario projection: [bdd.trace.md](./bdd.trace.md)
- Requirements source: [requirements.trace.md](./requirements.trace.md)
- `spec-trace validate MDT-176 --stage bdd --format json` passed.
- Downstream `/mdt:tests` should add the isolated auth-enabled Playwright setup and API/session checks for non-BDD requirements and constraints.
