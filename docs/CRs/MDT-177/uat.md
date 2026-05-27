# UAT Refinement Brief

## Objective

Refine the owner Lock and header auth-status journey so access changes are visible, project lists reconcile immediately, and read-only status no longer crowds the header.

## Approved Changes

- Owner Lock must refresh every visible project-list surface from backend-filtered read-only access.
- If the current project is no longer visible after Lock, show a project-unavailable state with a path back to allowed projects or owner unlock.
- Move the `Read only` label from the header into the hamburger menu.
- Add a hamburger access dot: green for owner/admin, orange for share/read-token access, no dot for public-only read-only access.
- Add shared contract vocabulary for the auth access indicator.

## Changed Requirement IDs

- `BR-1.18` added: owner Lock refreshes read-only project visibility and handles unavailable current projects.
- `BR-1.19` added: hamburger owns read-only status and access indicator dots.
- `C12` refined: domain contracts include auth access indicator vocabulary.

## Affected Downstream Trace

- Architecture: `OBL-owner-lock-read-visibility-refresh`, `OBL-hamburger-access-status`
- BDD: `owner_lock_refreshes_read_visibility`, `hamburger_access_status_indicator`
- Tests: `TEST-auth-session-lock-refresh`, `TEST-read-access-journey`, `TEST-access-domain-contracts`
- Tasks: `TASK-10`

## Execution Slices

### Slice 1: Lock Reconciliation

Objective: make owner Lock refresh all project-list instances and avoid stale owner-only selector entries.

Direct artifacts/files:
- `src/auth/AuthSessionProvider.tsx`
- `src/hooks/useProjectManager.ts`
- `src/App.tsx`
- `src/components/RouteErrorModal.tsx`
- `tests/e2e/auth/session-unlock.spec.ts`

Direct GREEN targets:
- `TEST-auth-session-lock-refresh`
- `owner_lock_refreshes_read_visibility`

Impacted canonical task IDs:
- `TASK-10`

Why this slice exists:
- The page-level project manager and ProjectSelector project manager are separate; both must reconcile after access-mode downgrade.

### Slice 2: Hamburger Access Chrome

Objective: move read-only status into the menu and add compact owner/shared indicators on the hamburger trigger.

Direct artifacts/files:
- `domain-contracts/src/access/schema.ts`
- `src/auth/AuthSessionContext.ts`
- `src/auth/AuthSessionProvider.tsx`
- `src/components/HamburgerMenu.tsx`
- `tests/e2e/utils/selectors.ts`
- `tests/e2e/sharing/read-access-journey.spec.ts`

Direct GREEN targets:
- `TEST-access-domain-contracts`
- `TEST-read-access-journey`
- `hamburger_access_status_indicator`

Impacted canonical task IDs:
- `TASK-10`

Why this slice exists:
- The header needs compact status without duplicating owner-session text or showing a public-only read-only dot.

## Validation

```bash
bun run --cwd domain-contracts test -- access --runInBand
bun test src/components/HamburgerMenu.test.tsx src/components/AuthUnlock/AuthStatusAction.test.tsx
bun run validate:ts
bunx playwright test tests/e2e/auth/session-unlock.spec.ts --project=chromium
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "valid invite exchange"
spec-trace validate MDT-177 --stage all --format json
```

## Watchlist

- Do not use sanitized project paths as auth signals.
- Do not keep a separate inline read-only badge in the header.
- Do not treat owner Lock as clearing public/share/read-token access.
- Do not let hidden owner-only components call owner-only endpoints in read-only mode.
