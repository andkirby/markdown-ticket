# UAT Refinement Brief

## Objective

Move pure MDT-177 read-access boundary contracts into `domain-contracts` so frontend, backend, and tests share one source of truth.

## Approved Changes

- Add `domain-contracts/src/access/schema.ts` for access modes, session status, auth capability flags, public-link-origin options, and read-token API DTOs.
- Keep runtime policy and persistence behavior in server modules.
- Update consumers to import contract types instead of redeclaring local DTOs.

## Changed Requirement IDs

- `C12` added: shared access/read-token boundary contracts live in `domain-contracts`.

## Affected Downstream Trace

- Architecture: `OBL-access-contract-boundary`
- Tests: `TEST-access-domain-contracts`
- Tasks: `TASK-9`

## Execution Slices

### Slice 1: Contract Extraction

Objective: create schema-first access/read-token contracts and update direct consumers.

Direct artifacts/files:
- `domain-contracts/src/access/schema.ts`
- `src/auth/AuthSessionContext.ts`
- `src/services/sseClient.ts`
- `src/components/SettingsModal/ReadAccessTokens.tsx`
- `server/security/apiAuth.ts`
- `server/security/publicLinkOrigins.ts`
- `server/security/readTokenStore.ts`
- `server/routes/readTokens.ts`

Direct GREEN targets:
- `TEST-access-domain-contracts`
- `TEST-read-token-management-api`
- `TEST-read-access-journey`

Impacted canonical task IDs:
- `TASK-9`

Why this slice exists:
- Prevents frontend/backend drift in auth modes and read-token DTOs without moving server policy into the contract layer.

## Validation

```bash
bun run --cwd domain-contracts test -- access --runInBand
bun run --cwd domain-contracts build
bun run validate:ts
bun run --cwd server jest tests/api/read-token-management.test.ts tests/security/readTokenStore.test.ts --runInBand
bunx playwright test tests/e2e/sharing/read-access-journey.spec.ts --project=chromium --grep "share session survives refresh"
spec-trace validate MDT-177 --stage all --format json
```

## Watchlist

- Do not extract `authFetch`, cookie signing/parsing, route allow/deny policy, or read-token persisted JSON internals.
- Keep `shared/models/PublicLinkOrigin.ts` as a temporary compatibility re-export only.
