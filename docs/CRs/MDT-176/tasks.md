# Tasks: MDT-176

**Source**: canonical architecture/tests/bdd state + [tasks.trace.md](./tasks.trace.md) for trace cross-checking

## Scope Boundaries

- Backend auth: `server/security/apiAuth.ts` remains the protected API auth owner; `server/security/apiSession.ts` owns only signed cookie mechanics.
- Session routes: only `GET/POST/DELETE /api/auth/session` are new auth-route exemptions.
- Frontend auth: `src/auth/AuthSessionProvider.tsx` owns access/session state; `src/auth/authFetch.ts` owns credentials, 401 classification, and mutation intent headers.
- UI gating: owner/admin controls are capability-driven, never project-count-driven.
- MDT-172: MDT-176 distinguishes response semantics but does not add public project filtering.
- Security scope: no raw token browser storage, no OAuth/RBAC/password login/token rotation/refresh-token behavior.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|---|---|---|
| Header-token validation and protected-route auth decision | `server/security/apiAuth.ts` | Task 1 |
| Signed session cookie creation/verification | `server/security/apiSession.ts` | Task 1 |
| Auth route session exchange/logout | `server/routes/auth.ts` | Task 1 |
| Browser access mode and unlock/lock lifecycle | `src/auth/AuthSessionProvider.tsx` | Task 2 |
| Browser API credentials/CSRF intent boundary | `src/auth/authFetch.ts` | Task 2 |
| Locked/public/owner visible UI | `src/components/AuthUnlock/*`, `src/components/RedirectToCurrentProject.tsx` | Task 3/4 |
| SSE convergence after logout/401 | `src/services/sseClient.ts`, `src/auth/AuthSessionProvider.tsx` | Task 4 |
| Operator docs | `docs/AUTH_SESSION_GUIDE.md` | Task 5 |

## Constraint Coverage

| Constraint ID | Tasks |
|---|---|
| C1 no raw token exposure | Task 1, Task 2, Task 3, Task 5, Task 6 |
| C2 cookie flags | Task 1, Task 6 |
| C3 MDT-157 token-rule reuse | Task 1, Task 6 |
| C4 CSRF mitigation | Task 1, Task 2, Task 6 |
| C5 MDT-172 independence | Task 3, Task 4, Task 6 |
| C6 MDT-157/local compatibility | Task 1, Task 2, Task 6 |
| C7 scope boundary | Task 0, Task 5, Task 6 |
| C8 operator docs | Task 5, Task 6 |
| C9 isolated auth E2E | Task 3, Task 4, Task 6 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|---|---|---|---|
| M0: Walking skeleton | — | Task 0 | Runners work; missing modules exist as stubs. |
| M1: Backend session contract | — | Task 1 | `TEST-auth-session-api` GREEN. |
| M2: Auth state boundary and local no-auth | `local_no_auth_loads_normally` | Task 2 | default no-auth E2E remains unchanged. |
| M3: Locked/unlock owner path | `locked_backend_shows_unlock_panel`, `invalid_unlock_stays_locked`, `successful_unlock_starts_owner_session` | Task 3 | auth E2E locked/unlock cases GREEN. |
| M4: Logout and public compatibility | `lock_action_returns_to_locked_state`, `public_projects_remain_read_only`, `public_empty_shows_unlock_only` | Task 4 | logout/SSE/public-state auth E2E subset GREEN; full auth E2E suite closes in Task 6. |
| M5: Docs and closure | all | Task 5-6 | docs tests and full verification GREEN. |

## Tasks

### Task 0: Create auth-session walking skeleton and verify runners

**Skills**: mdt-frontend

**Milestone**: M0 — Walking skeleton

**Structure**: `server/security/apiSession.ts`, `server/routes/auth.ts`, `src/auth/AuthSessionProvider.tsx`, `src/auth/authFetch.ts`, `src/components/AuthUnlock/AuthUnlockPanel.tsx`, `src/components/AuthUnlock/AuthStatusAction.tsx`, `docs/AUTH_SESSION_GUIDE.md`

**Makes GREEN (Automated Tests)**: none; this is dependency/skeleton setup.

**Scope**: Create minimal typed stubs and wiring placeholders for every missing architecture file so later tasks modify a single owner path.

**Boundary**: Skeleton only; no production auth behavior beyond compile-safe exports and route/provider wiring needed by later tasks.

**Creates**:
- `server/security/apiSession.ts`
- `server/routes/auth.ts`
- `src/auth/AuthSessionProvider.tsx`
- `src/auth/authFetch.ts`
- `src/components/AuthUnlock/AuthUnlockPanel.tsx`
- `src/components/AuthUnlock/AuthStatusAction.tsx`
- `docs/AUTH_SESSION_GUIDE.md`

**Modifies**:
- `server/server.ts`
- `server/tests/api/test-app-factory.ts`
- `src/App.tsx`
- `tests/e2e/utils/selectors.ts`

**Must Not Touch**:
- `mcp-server/`
- `cli/`
- project visibility/filtering rules for MDT-172

**Create/Move**:
- Add auth route mount before `app.use('/api', createApiAuthMiddleware())` in production and test app factory.
- Add component/test IDs from the design spec; do not invent alternate selector names.

**Exclude**: no OAuth, RBAC, password login, token rotation, refresh tokens, or browser token persistence.

**Anti-duplication**: Import `parseApiAuthConfig` / `timingSafeTokenMatches` from `server/security/apiAuth.ts`; do not copy token parsing.

**Duplication Guard**:
- Check `server/security/apiAuth.ts` and existing app composition before creating new owners.
- If route/provider logic already exists, merge into the owner module instead of adding a parallel path.
- Verify no second credential parser or second frontend auth-state owner was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/api-auth.test.ts --runInBand
bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bun run validate:ts
```

**Done when**:
- [x] ⚠️ Missing architecture files exist with compile-safe exports.
- [x] ⚠️ Existing auth tests still start without module-not-found errors.
- [x] ⚠️ Auth E2E remains skipped by default.
- [x] ⚠️ No duplicated logic.

### Task 1: Implement backend owner session cookie contract and protected-route validation

**Milestone**: M1 — Backend session contract (BR-2.1-BR-2.4)

**Structure**: `server/security/apiSession.ts`, `server/routes/auth.ts`, `server/security/apiAuth.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-auth-session-api` → `server/tests/api/auth-session.test.ts`: session exchange, cookie flags, protected cookie route, invalid token, logout, CSRF, and header-auth regression.

**Scope**: Implement signed opaque owner-session cookie mechanics, auth route contract, route ordering, cookie validation in `apiAuth`, and CSRF checks for cookie-authenticated mutations.

**Boundary**: Backend auth only; do not implement frontend UI here.

**Creates**:
- `server/security/apiSession.ts`
- `server/routes/auth.ts`

**Modifies**:
- `server/security/apiAuth.ts`
- `server/server.ts`
- `server/tests/api/test-app-factory.ts`
- `server/tests/api/auth-session.test.ts`
- `server/tests/api/api-auth.test.ts`
- `server/routes/projects.ts`
- `server/routes/system.ts`

**Must Not Touch**:
- `src/` UI files
- `mcp-server/`
- public project filtering / MDT-172 authorization

**Create/Move**:
- Add `GET /api/auth/session`, `POST /api/auth/session`, and `DELETE /api/auth/session`.
- Set `HttpOnly`, `SameSite=Strict`, `Path=/api`, and `Secure` for HTTPS/production.
- Require allowed/default `Origin` plus `X-MDT-Owner-Intent: 1` only for cookie-authenticated non-GET API mutations.
- Preserve `Authorization: Bearer`, `X-API-Key`, `/api/status`, `/api/health`, and local no-auth behavior.

**Exclude**: no session database, no refresh tokens, no token rotation, no password login, no raw token in cookie payload or logs.

**Anti-duplication**: Import MDT-157 token config and match helpers from `server/security/apiAuth.ts`; keep cookie helpers isolated in `apiSession.ts`.

**Duplication Guard**:
- Check `apiAuth.ts` before adding any auth decision branch elsewhere.
- If controllers need auth context, pass minimal request-local metadata from middleware; do not parse credentials in routes/controllers.
- Verify no second runtime auth middleware was introduced.

**Verify**:

```bash
bun run --cwd server jest tests/api/auth-session.test.ts tests/api/api-auth.test.ts --runInBand
```

**Done when**:
- [x] `TEST-auth-session-api` GREEN.
- [x] Cookie flags and logout invalidation are asserted.
- [x] Header-token mutation clients do not need CSRF intent headers.
- [x] No duplicated auth parser.

### Task 2: Introduce frontend auth state provider and authFetch API boundary

**Skills**: mdt-frontend

**Milestone**: M2 — Auth state boundary and local no-auth (BR-1.7)

**Structure**: `src/auth/AuthSessionProvider.tsx`, `src/auth/authFetch.ts`, `src/hooks/useProjectManager.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-local-no-auth-regression` → `docs/CRs/MDT-176/tests.md`: default no-auth suite unchanged.

**Makes GREEN (Behavior)**:
- `local_no_auth_loads_normally` → `tests/e2e/auth/session-unlock.spec.ts` / default `bun run test:e2e` (BR-1.7)

**Scope**: Add the frontend auth/access mode owner and migrate API call sites needed for project load, ticket ops, selector persistence, data layer, and SSE coordination to use auth-aware semantics.

**Boundary**: State/fetch plumbing only; locked UI polish and admin-gating visuals are Task 3.

**Creates**:
- `src/auth/AuthSessionProvider.tsx`
- `src/auth/authFetch.ts`

**Modifies**:
- `src/App.tsx`
- `src/hooks/useProjectManager.ts`
- `src/services/dataLayer.ts`
- `src/hooks/useTicketOperations.ts`
- `src/components/ProjectSelector/useSelectorData.ts`
- `src/services/sseClient.ts`

**Must Not Touch**:
- `server/security/apiAuth.ts`
- `server/routes/auth.ts`
- modal visual styling outside auth-capability wiring

**Create/Move**:
- Define `accessMode`, `sessionStatus`, `unlock(token)`, `lock()`, and `canManageProjects` in one provider.
- Add `credentials: 'include'` and `X-MDT-Owner-Intent` for non-GET browser calls in `authFetch`.
- Classify `401` as locked and network/5xx as backend-down.
- Clear submitted token from memory after unlock completes or fails.

**Exclude**: no new frontend unit-test framework; no localStorage/sessionStorage/URL persistence of admin token.

**Anti-duplication**: Import and use `authFetch` at browser API boundaries; do not add local `fetchWithAuth` copies in components/hooks.

**Duplication Guard**:
- Search for direct `fetch('/api` call sites in touched files before coding.
- If a direct call remains in a touched auth-sensitive path, migrate it or document why it is read-only and safe.
- Verify there is one frontend access-mode owner.

**Verify**:

```bash
bun run test:e2e
bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bun run validate:ts
```

**Done when**:
- [x] ⚠️ Default no-auth E2E remains GREEN/unchanged.
- [x] ⚠️ Auth E2E remains isolated/skipped without `MDT_E2E_AUTH_ENABLED=true`.
- [x] ⚠️ Browser API calls use `authFetch` where mutation/session semantics matter.

### Task 3: Integrate locked/unlock UI and gate owner-only controls

**Skills**: mdt-frontend

**Milestone**: M3 — Locked/unlock owner path (BR-1.1-BR-1.5, BR-1.10)

**Structure**: `src/components/AuthUnlock/AuthUnlockPanel.tsx`, `src/components/AuthUnlock/AuthStatusAction.tsx`, `src/components/RedirectToCurrentProject.tsx`

**Makes GREEN (Automated Tests)**: partial auth E2E subset only; full `TEST-auth-session-e2e` is claimed by Task 6 final verification.

**Makes GREEN (Behavior)**:
- `locked_backend_shows_unlock_panel` → `tests/e2e/auth/session-unlock.spec.ts` (BR-1.1, BR-1.2, BR-1.5)
- `invalid_unlock_stays_locked` → `tests/e2e/auth/session-unlock.spec.ts` (BR-1.4, BR-1.10)
- `successful_unlock_starts_owner_session` → `tests/e2e/auth/session-unlock.spec.ts` (BR-1.3, BR-1.5)

**Scope**: Render locked and owner-session surfaces from the auth provider and hide owner-only actions until `canManageProjects` is true.

**Boundary**: Do not change backend session mechanics; consume Task 1/2 contracts.

**Creates**:
- `src/components/AuthUnlock/AuthUnlockPanel.tsx`
- `src/components/AuthUnlock/AuthStatusAction.tsx`

**Modifies**:
- `src/App.tsx`
- `src/components/RedirectToCurrentProject.tsx`
- `src/components/SecondaryHeader.tsx`
- `src/components/HamburgerMenu.tsx`
- `src/components/AddProjectModal/AddProjectModal.tsx`
- `src/components/ProjectSelector/index.tsx`
- `tests/e2e/utils/selectors.ts`
- `tests/e2e/auth/session-unlock.spec.ts`

**Must Not Touch**:
- `server/security/apiSession.ts`
- `server/security/apiAuth.ts`
- unrelated board/list/ticket layout components unless needed for auth capability props

**Create/Move**:
- Add design-spec test IDs: `auth-unlock-panel`, `auth-token-input`, `auth-unlock-submit`, `auth-unlock-error`, `auth-status-chip`, `auth-lock-button`.
- Add “Board is locked” copy and generic “Token was not accepted.” error.
- Gate Add/Create/Edit Project and settings-style owner actions behind `canManageProjects`.

**Exclude**: no “No Projects Found” for 401; no raw token in visible error, URL, localStorage, or sessionStorage.

**Anti-duplication**: Import auth state/capabilities from `AuthSessionProvider`; do not infer admin access from project count in components.

**Duplication Guard**:
- Check each admin affordance for existing visibility conditions before adding new props/state.
- Replace project-count gating with capability gating; do not layer both in conflicting ways.
- Verify no duplicated unlock form exists outside `AuthUnlockPanel`.

**Verify**:

```bash
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=mdt-176-e2e-token \
  bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium --grep "locked|invalid unlock|valid unlock"
```

**Done when**:
- [x] Listed BDD scenarios GREEN.
- [x] Admin controls hidden while locked.
- [x] Submitted token is not present in browser URL/localStorage/sessionStorage or visible errors.

### Task 4: Complete logout, SSE convergence, and MDT-172 anonymous compatibility states

**Skills**: mdt-frontend

**Milestone**: M4 — Logout and public compatibility (BR-1.6, BR-1.8, BR-1.9)

**Structure**: `src/services/sseClient.ts`, `src/auth/AuthSessionProvider.tsx`, `src/components/RedirectToCurrentProject.tsx`

**Makes GREEN (Automated Tests)**: partial auth E2E subset only; full `TEST-auth-session-e2e` is claimed by Task 6 final verification.

**Makes GREEN (Behavior)**:
- `lock_action_returns_to_locked_state` → `tests/e2e/auth/session-unlock.spec.ts` (BR-1.6)
- `auth_enabled_200_without_owner_stays_locked` → `tests/e2e/auth/session-unlock.spec.ts` (MDT-172 boundary)

**Scope**: Finish lock/logout state clearing, SSE suppression/reconnect handling, backend-down vs locked distinction, and ensure MDT-172 public/read-only UI is not exposed by MDT-176.

**Boundary**: Do not implement project visibility filtering or sharing; only interpret response semantics.

**Creates**:
- none

**Modifies**:
- `src/auth/AuthSessionProvider.tsx`
- `src/auth/authFetch.ts`
- `src/hooks/useProjectManager.ts`
- `src/services/sseClient.ts`
- `src/components/RedirectToCurrentProject.tsx`
- `src/components/ProjectSelector/index.tsx`
- `src/components/AuthUnlock/AuthStatusAction.tsx`
- `tests/e2e/auth/session-unlock.spec.ts`

**Must Not Touch**:
- project filtering/sharing implementation for MDT-172
- backend route contracts beyond consuming existing 401/200 semantics

**Create/Move**:
- Keep `auth-unlock-affordance` selector for locked state.
- Ensure Lock calls `DELETE /api/auth/session`, clears local owner state, and refreshes project state.
- Disconnect/suppress stale EventSource state when locked; reconnect after unlock.

**Exclude**: no MDT-172 public/read-only state; no stale owner controls after SSE/reconnect 401.

**Anti-duplication**: Use provider access modes for locked/owner/local states; do not add separate MDT-172 public mode in selector/root components.

**Duplication Guard**:
- Search for independent backend-down/empty-state derivations before changing root handling.
- Merge response semantics into `useProjectManager` + provider, not per-component branches.
- Verify EventSource lifecycle has one owner path.

**Verify**:

```bash
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=mdt-176-e2e-token \
  bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium --grep "logout|auth-enabled 200|backend errors"
```

**Done when**:
- [x] Logout and SSE convergence tests GREEN.
- [x] MDT-172 public/read-only behavior is not exposed by MDT-176.
- [x] Backend 5xx/network state does not render locked panel.

### Task 5: Update operator documentation for auth sessions and local no-auth mode

**Milestone**: M5 — Documentation closure (BR-3.1)

**Structure**: `docs/AUTH_SESSION_GUIDE.md`, `docs/DOCKER_GUIDE.md`, `docs/DEVELOPMENT_GUIDE.md`

**Makes GREEN (Automated Tests)**:
- `TEST-auth-session-docs` → `docs/tests/auth-session-docs.test.ts`: operator auth/session docs.

**Scope**: Add operator-facing auth session documentation and update existing Docker/development docs to point operators to the safe setup and local no-auth behavior.

**Boundary**: Documentation only except test expectation adjustments if wording needs exact strings.

**Creates**:
- `docs/AUTH_SESSION_GUIDE.md`

**Modifies**:
- `docs/DOCKER_GUIDE.md`
- `docs/DEVELOPMENT_GUIDE.md`
- `docs/tests/auth-session-docs.test.ts`
- `docs/CRs/MDT-176/architecture.md`
- `docs/CRs/MDT-176/tasks.md`

**Must Not Touch**:
- runtime auth implementation files
- unrelated docs outside auth/session setup

**Create/Move**:
- Document `API_SECURITY_AUTH`, `API_AUTH_TOKEN`, browser unlock, `POST/DELETE /api/auth/session`, cookie flags, CSRF `Origin` + `X-MDT-Owner-Intent`, logout, local no-auth, and MDT-172 sequencing.
- Document explicit non-goals: OAuth, RBAC, password login, token rotation, refresh tokens.

**Exclude**: no secrets in docs examples; no recommendation to store admin token in browser storage or URL.

**Anti-duplication**: Link from Docker/development docs to `docs/AUTH_SESSION_GUIDE.md`; do not duplicate the full guide in multiple files.

**Duplication Guard**:
- Check existing API auth docs from MDT-157 before adding new sections.
- If wording overlaps, consolidate to a cross-link rather than parallel instructions.
- Verify docs tests assert the canonical guide terms.

**Verify**:

```bash
bun test docs/tests/auth-session-docs.test.ts
```

**Done when**:
- [x] `TEST-auth-session-docs` GREEN.
- [x] Operators can enable auth, unlock, logout, understand cookie/security behavior, and run local no-auth mode.
- [x] Scope exclusions are documented.

### Task 6: Run final auth-session verification and trace closure

**Milestone**: M5 — Final verification (all scenarios/tests)

**Structure**: `server/tests/api/auth-session.test.ts`, `tests/e2e/auth/session-unlock.spec.ts`, `docs/CRs/MDT-176/tasks.md`

**Makes GREEN (Automated Tests)**:
- `TEST-auth-session-api` → `server/tests/api/auth-session.test.ts`
- `TEST-auth-session-e2e` → `tests/e2e/auth/session-unlock.spec.ts`
- `TEST-auth-session-docs` → `docs/tests/auth-session-docs.test.ts`
- `TEST-local-no-auth-regression` → `docs/CRs/MDT-176/tests.md`

**Makes GREEN (Behavior)**:
- `locked_backend_shows_unlock_panel` → `tests/e2e/auth/session-unlock.spec.ts`
- `successful_unlock_starts_owner_session` → `tests/e2e/auth/session-unlock.spec.ts`
- `invalid_unlock_stays_locked` → `tests/e2e/auth/session-unlock.spec.ts`
- `lock_action_returns_to_locked_state` → `tests/e2e/auth/session-unlock.spec.ts`
- `local_no_auth_loads_normally` → default `bun run test:e2e`
- `public_projects_remain_read_only` → `tests/e2e/auth/session-unlock.spec.ts`
- `public_empty_shows_unlock_only` → `tests/e2e/auth/session-unlock.spec.ts`

**Scope**: Run the complete verification matrix, close trace gaps, and confirm no scope creep or raw-token storage/log exposure remains.

**Boundary**: Verification and small fixes only; no new feature behavior beyond MDT-176 scope.

**Creates**:
- none

**Modifies**:
- `server/tests/api/auth-session.test.ts`
- `server/tests/api/api-auth.test.ts`
- `tests/e2e/auth/session-unlock.spec.ts`
- `tests/e2e/utils/selectors.ts`
- `docs/CRs/MDT-176/tasks.md`

**Must Not Touch**:
- new auth scope beyond single-owner session
- MDT-172 public filtering implementation
- unrelated failing tests outside MDT-176 without separate approval

**Create/Move**:
- Update trace artifacts only through `spec-trace` commands.
- Add focused regression assertions if final verification finds a gap in existing MDT-176 tests.

**Exclude**: no broad refactors, no new packages unless a prior task documented the need, no untracked server restarts.

**Anti-duplication**: Use `spec-trace` canonical records for trace closure; do not hand-edit `tasks.trace.md`.

**Duplication Guard**:
- Grep for duplicate auth helpers (`authFetch`, token parser, session cookie signer) before final signoff.
- Check all admin-action visibility flows use the same capability source.
- Verify no raw admin token appears in browser storage, URL, logs, visible errors, or session cookie value.

**Verify**:

```bash
bun run --cwd server jest tests/api/auth-session.test.ts tests/api/api-auth.test.ts --runInBand
bun test docs/tests/auth-session-docs.test.ts
MDT_E2E_AUTH_ENABLED=true API_SECURITY_AUTH=true API_AUTH_TOKEN=mdt-176-e2e-token \
  bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bun run test:e2e
bun run validate:ts
spec-trace validate MDT-176 --stage all --format json
spec-trace render all MDT-176
```

**Done when**:
- [x] All MDT-176 RED tests are GREEN.
- [x] Default no-auth E2E suite still passes.
- [x] All BDD scenarios GREEN.
- [x] No duplicated logic.
- [x] Scope boundaries respected.
- [x] Smoke test passes with real auth-enabled execution.

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|---|---:|---:|---:|---|
| `docs/CRs/MDT-176/` | 2 | 2 | 0 | ✅ |
| `docs/` | 3 | 3 | 0 | ✅ |
| `tests/e2e/` | 2 | 2 | 0 | ✅ |
| `server/security/` | 2 | 2 | 0 | ✅ |
| `server/routes/` | 3 | 3 | 0 | ✅ |
| `server/` | 1 | 1 | 0 | ✅ |
| `server/tests/api/` | 3 | 3 | 0 | ✅ |
| `src/` | 1 | 1 | 0 | ✅ |
| `src/auth/` | 2 | 2 | 0 | ✅ |
| `src/components/AuthUnlock/` | 2 | 2 | 0 | ✅ |
| `src/components/` | 4 | 4 | 0 | ✅ |
| `src/components/ProjectSelector/` | 2 | 2 | 0 | ✅ |
| `src/hooks/` | 2 | 2 | 0 | ✅ |
| `src/services/` | 2 | 2 | 0 | ✅ |

### Missing File Assignment

| Missing Architecture File | Creating Task |
|---|---|
| `docs/AUTH_SESSION_GUIDE.md` | Task 0, Task 5 |
| `src/auth/authFetch.ts` | Task 0, Task 2 |
| `src/auth/AuthSessionProvider.tsx` | Task 0, Task 2 |
| `src/components/AuthUnlock/AuthStatusAction.tsx` | Task 0, Task 3 |
| `src/components/AuthUnlock/AuthUnlockPanel.tsx` | Task 0, Task 3 |
| `server/security/apiSession.ts` | Task 0, Task 1 |
| `server/routes/auth.ts` | Task 0, Task 1 |
| `docs/CRs/MDT-176/tasks.md` | Task 0 / this task artifact |

No orphaned architecture files remain.

## Post-Implementation

- [x] No duplicated token parser, session signer, auth provider, or fetch wrapper.
- [x] No raw admin token in cookie payload, browser storage, URL, logs, telemetry, or visible errors.
- [x] Header-token clients keep MDT-157 behavior.
- [x] Cookie-authenticated mutations require CSRF checks.
- [x] Local no-auth and default E2E stay unchanged.
- [x] MDT-172 remains a future authorization/sharing CR.
- [x] Operator docs are updated and linked.

## Task Breakdown Complete

**CR**: MDT-176  
**Output**: `docs/CRs/MDT-176/tasks.trace.md`, `docs/CRs/MDT-176/tasks.md`, `.tasks-status.yaml`  
**Tasks**: 7 tasks  
**Tracker**: 7 tasks, all pending

**Next**: `mdt:implement MDT-176` or `mdt:implement-agentic MDT-176`
