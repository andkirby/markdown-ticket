# Tests: MDT-177

> Canonical test-plan projection: [tests.trace.md](./tests.trace.md)

## Overview

MDT-177 test coverage defines RED tests for owner-managed named read access, hash-only token storage, one-time invite exchange, read-session grant merging, public-origin link selection, broad read-only mutation denial, and the Playwright read-access journey.

Frontend component unit tests were not added because project E2E guidance says frontend testing uses Playwright E2E exclusively. UI coverage remains in `TEST-read-access-journey` and `TEST-e2e-selector-contract`.

## Module -> Test Mapping

| Module | Test File | Test Plan |
|--------|-----------|-----------|
| `server/security/readTokenStore.ts` | `server/tests/security/readTokenStore.test.ts` | `TEST-read-token-store-persistence` |
| `server/security/readSession.ts` | `server/tests/security/readSession.test.ts` | `TEST-read-session-merge` |
| `server/routes/readTokens.ts` | `server/tests/api/read-token-management.test.ts` | `TEST-read-token-management-api` |
| `server/routes/share.ts` | `server/tests/api/public-sharing.test.ts` | `TEST-share-session-merge-api` |
| `server/routes/auth.ts` | `server/tests/api/public-sharing.test.ts` | `TEST-env-read-token-compatibility` |
| `server/security/accessPolicy.ts` | `server/tests/api/public-sharing.test.ts` | `TEST-readonly-mutation-denial-api` |
| `server/security/originPolicy.ts` | `server/tests/security/originPolicy.test.ts` | `TEST-origin-public-link-policy` |
| `tests/e2e/sharing/read-access-journey.spec.ts` | `tests/e2e/sharing/read-access-journey.spec.ts` | `TEST-read-access-journey` |
| `tests/e2e/utils/selectors.ts` | `tests/e2e/utils/selectors.ts` | `TEST-e2e-selector-contract` |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Hash-only persistent secrets | `readTokenStore` | raw token/code absent from disk and list responses; hashes match submitted secrets |
| Invite lifecycle | `readTokenStore`, `readTokens` route | short-lived code generation, atomic single-use consume, expired/revoked/generic invalid failure |
| Read-session merge | `readSession`, `share` route | projectRefs/shareIds union, de-dupe, earliest active expiry, invalid existing cookie fallback |
| Origin selection | `publicLinkOrigins` | `PUBLIC_ORIGIN` wins; current origin only when no public origin is configured; no-origin fail closed |
| Backend authorization | API routes | read-only mutation denial across project, ticket, and document write endpoints; owner-only token management for anonymous/read-only/share-only visitors |

## Read-only Mutation Endpoint Coverage

All requested write endpoints exist in current routers and are covered by `TEST-readonly-mutation-denial-api`.

| Endpoint | Route File |
|----------|------------|
| `POST /api/projects/create` | `server/routes/projects.ts` |
| `PUT /api/projects/:code/update` | `server/routes/projects.ts` |
| `PUT /api/projects/:code/sharing` | `server/routes/projects.ts` |
| `PUT /api/projects/:code/enable` | `server/routes/projects.ts` |
| `PUT /api/projects/:code/disable` | `server/routes/projects.ts` |
| `POST /api/projects/:projectId/crs` | `server/routes/projects.ts` |
| `PATCH /api/projects/:projectId/crs/:crId` | `server/routes/projects.ts` |
| `PUT /api/projects/:projectId/crs/:crId` | `server/routes/projects.ts` |
| `DELETE /api/projects/:projectId/crs/:crId` | `server/routes/projects.ts` |
| `PUT /api/documents/favs` | `server/routes/documents.ts` |
| `POST /api/documents/configure` | `server/routes/documents.ts` |

## Constraint Coverage

| Constraint ID | Test Plan(s) |
|---------------|--------------|
| C1 | `TEST-read-token-store-persistence` |
| C2 | `TEST-read-token-store-persistence`, `TEST-read-token-management-api` |
| C3 | `TEST-read-token-management-api` |
| C4 | `TEST-read-token-store-persistence`, `TEST-read-token-management-api` |
| C5 | `TEST-env-read-token-compatibility`, `TEST-readonly-mutation-denial-api` |
| C6 | `TEST-origin-public-link-policy` |
| C7 | `TEST-read-session-merge`, `TEST-share-session-merge-api` |
| C8 | `TEST-env-read-token-compatibility` |
| C9 | `TEST-read-token-management-api` |
| C10 | `TEST-read-access-journey` |
| C11 | `TEST-env-read-token-compatibility` |

## Expected RED Tests

- `server/tests/security/readTokenStore.test.ts`: RED until `server/security/readTokenStore.ts` exists.
- `server/tests/security/readSession.test.ts`: RED until the merge helper is added.
- `server/tests/api/read-token-management.test.ts`: RED until `/api/read-tokens` and invite exchange routes are mounted.
- `server/tests/api/public-sharing.test.ts`: one new RED merge case until share session issuance preserves existing token projects; mutation-denial matrix locks existing read-only middleware behavior.
- `server/tests/security/originPolicy.test.ts`: new RED public-link origin cases until origin selection is exposed.
- `tests/e2e/sharing/read-access-journey.spec.ts`: RED until MDT-177 UI/API journey is implemented.

## Verify

```bash
bun run validate:ts
bun run --cwd server jest tests/security/readTokenStore.test.ts tests/security/readSession.test.ts tests/security/originPolicy.test.ts tests/api/read-token-management.test.ts tests/api/public-sharing.test.ts --runInBand
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium
spec-trace validate MDT-177 --stage tests --format json
spec-trace render tests MDT-177
```
