# Tests: MDT-176

**Source**: [MDT-176](../MDT-176-browser-auth-session-unlock.md)  
**Trace projection**: [tests.trace.md](./tests.trace.md)  
**Mode**: normal, RED executable tests where this workflow expects implementation coverage

## Scope

This test pass adds canonical `spec-trace` test-plan records plus RED executable coverage for backend browser sessions, auth-enabled browser unlock behavior, operator docs, and default no-auth suite preservation.

## Module -> Test Mapping

| Module or Surface | Test File | Test Type | Coverage |
|---|---|---|---|
| Browser session API | `server/tests/api/auth-session.test.ts` | integration | `/api/auth/session` exchange, cookie flags, protected routes via cookie, invalid token generic failure, logout clear-cookie/invalidation, CSRF Origin + `X-MDT-Owner-Intent`, header-auth and health/status regression. |
| Auth unlock browser flow | `tests/e2e/auth/session-unlock.spec.ts` | e2e | Locked state, successful unlock, invalid unlock, logout/lock return, SSE/reconnect convergence, hidden Create Project while locked/public, backend-down vs locked, no raw token in browser storage or URL. |
| Operator docs | `docs/tests/auth-session-docs.test.ts` | integration/script | Enabling auth, browser unlock, cookie/security behavior, CSRF, logout, local no-auth mode, and auth scope boundary. |
| Default E2E suite | `docs/CRs/MDT-176/tests.md` | suite gate | `bun run test:e2e` remains the no-auth default; auth E2E requires an isolated command/env. |

## Backend Session API Contract

`server/tests/api/auth-session.test.ts` verifies:

- `POST /api/auth/session` accepts the existing MDT-157 owner token and returns an authenticated response without echoing the raw token.
- Session cookie is opaque and uses `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/api`.
- Cookie-authenticated requests can access protected routes.
- Invalid exchange attempts return generic auth failure and do not echo/log the submitted token.
- `DELETE /api/auth/session` clears the cookie and the old cookie no longer authenticates.
- Cookie-authenticated mutations require both trusted/same `Origin` and `X-MDT-Owner-Intent: 1`.
- Header-token API mutation clients using `Authorization: Bearer` or `X-API-Key` do not need browser CSRF intent headers when no session cookie is used.
- Existing `Authorization: Bearer`, `X-API-Key`, `/api/status`, and `/api/health` behavior remains intact.

## Auth-Enabled Browser E2E Contract

`tests/e2e/auth/session-unlock.spec.ts` is skipped by default and only runs when explicitly isolated:

```bash
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=mdt-176-e2e-token \
  bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
```

It verifies visible behavior only:

- 401/project-load locked state shows unlock UI, not empty-project creation UI.
- Invalid unlock keeps the user locked, shows generic error copy, and keeps token correction available.
- Valid unlock loads projects and logout/reload returns to locked state.
- Logout followed by SSE/reconnecting `401` converges back to locked state without stale owner controls.
- Anonymous public sharing behavior is deferred to MDT-172; MDT-176 keeps auth-enabled anonymous access locked.
- Create Project/admin controls are hidden while locked.
- Backend 5xx/unavailable responses show backend-down, not locked.
- Browser URL/localStorage/sessionStorage do not contain the raw admin token.

Server/API tests own cookie flags, CSRF, request/log checks, and raw-token non-exposure outside visible UI. MDT-176 does not add app IndexedDB persistence; this test stage scopes browser storage verification to URL, `localStorage`, and `sessionStorage` plus server cookie/log checks. If implementation adds IndexedDB use, add an IndexedDB token scan before closing the task.

## Operator Documentation Contract

`docs/tests/auth-session-docs.test.ts` is RED until implementation docs exist. It requires operator-facing documentation to cover:

- `API_SECURITY_AUTH` / `API_AUTH_TOKEN` enablement.
- Browser unlock and logout flows.
- Cookie behavior: `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/api`.
- CSRF behavior: `Origin` plus `X-MDT-Owner-Intent` for cookie-authenticated mutations.
- Local no-auth mode.
- Raw-token handling and scope exclusions: no OAuth, RBAC, password login, token rotation, or refresh-token behavior.

## Default No-Auth Suite Preservation

The normal command remains auth-disabled and unchanged:

```bash
bun run test:e2e
```

Auth-specific Playwright coverage must stay isolated to `tests/e2e/auth/session-unlock.spec.ts` with `MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=...`.

## RED Evidence

Executed during this stage:

```bash
bun run --cwd server jest tests/api/auth-session.test.ts --runInBand
# RED: /api/auth/session not implemented yet; session exchange/logout/CSRF cookie paths fail as expected.

bun test docs/tests/auth-session-docs.test.ts
# RED: docs/AUTH_SESSION_GUIDE.md not implemented yet.

bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
# PASS/SKIP: 6 skipped by default, preserving the no-auth E2E suite.
```

## Verify

```bash
spec-trace validate MDT-176 --stage tests --format json
spec-trace render tests MDT-176
```

Implementation verification target:

```bash
bun run --cwd server jest tests/api/auth-session.test.ts --runInBand
bun test docs/tests/auth-session-docs.test.ts
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=mdt-176-e2e-token \
  bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bun run test:e2e
```

## Test Specification Complete

**CR**: MDT-176  
**Output**: `docs/CRs/MDT-176/tests.md`, `docs/CRs/MDT-176/tests.trace.md`, executable RED tests, and canonical test-plan state  
**Next**: `/mdt:tasks MDT-176`
