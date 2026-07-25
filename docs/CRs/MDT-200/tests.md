# Tests: MDT-200

Canonical trace state lives in the Spec Trace tool; the rendered projection is
[`tests.trace.md`](tests.trace.md). Each requirement/scenario maps to exact
verification. Kinds: `unit`, `integration` (local D1 + Workers runtime via
Miniflare), `e2e` (Playwright, two clients), `manual` (live Access-protected
Worker / remote D1 / operator procedure).

## Unit (Workers-runtime + pure logic)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-alloc-transaction-shape | BR-1.1, C2, C3 | `cloud/test/alloc.concurrency.test.ts` — production batch under a forced race |
| TEST-access-jwt-validation | BR-2.1, Edge-5 | `cloud/test/access.jwt.test.ts` — RS256/issuer/audience/expiry, kid refresh |
| TEST-machine-attribution | BR-2.2, Edge-6 | `cloud/test/access.jwt.test.ts` — common_name principal mapping |
| TEST-no-fallback-local | BR-1.5, BR-1.7 | `shared/services/cloud-sync/__tests__/no-fallback.test.ts` — no fallback; local-only preserved |
| TEST-package-boundary | C1 | `cloud/test/boundary.test.ts` — import-direction enforcement |
| TEST-opt-in-binding | C4 | `shared/services/cloud-sync/__tests__/opt-in-binding.test.ts` |
| TEST-config-no-secrets | C5 | `shared/services/cloud-sync/__tests__/config.test.ts` |
| TEST-origin-allowlist | C6 | `shared/services/cloud-sync/__tests__/origin-allowlist.test.ts` — shipped origins trusted, custom origins denied by default, project files cannot expand trust |
| TEST-exclusions-enforced | C8 | `cloud/test/boundary.test.ts` — no presence/offline/WS/DO surface |

## Integration (local D1 + Workers runtime)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-alloc-concurrency | BR-1.1 | `cloud/test/alloc.concurrency.test.ts` |
| TEST-alloc-idempotency | BR-1.2, Edge-1 | `cloud/test/alloc.integration.test.ts` |
| TEST-alloc-isolation | BR-1.3 | `cloud/test/alloc.integration.test.ts` |
| TEST-alloc-recovery | BR-1.4, Edge-2 | `shared/services/cloud-sync/__tests__/recovery.test.ts` |
| TEST-create-orchestration | BR-1.4, BR-1.5, BR-1.7 | `shared/services/cloud-sync/__tests__/create-orchestrator.test.ts` |
| TEST-membership-roles | BR-2.3, Edge-4 | `cloud/test/membership.roles.test.ts` |
| TEST-tenant-isolation | BR-2.4, BR-2.5 | `cloud/test/membership.isolation.test.ts` |
| TEST-projection-content | BR-3.1 | `cloud/test/projection.test.ts` |
| TEST-projection-conflict | BR-3.2 | `cloud/test/projection.test.ts` |
| TEST-projection-polling | BR-3.3 | `cloud/test/projection.test.ts`, `shared/services/cloud-sync/__tests__/create-orchestrator.test.ts` |
| TEST-local-projection-feed | BR-3.3, BR-3.4 | `src/hooks/useCloudProjectionFeed.test.ts`, server controller/API tests |
| TEST-audit-redacted | BR-4.1, Edge-3 | membership/ack/projection/maintenance integration tests plus `cloud/test/audit.test.ts` |
| TEST-audit-retention | BR-4.1 | `cloud/test/maintenance.test.ts` |
| TEST-rate-limit-abuse | C7 | `cloud/test/ratelimit.test.ts`, `cloud/test/ratelimit.wiring.test.ts` |
| TEST-http-validation | C2 | `cloud/test/http.body.test.ts`, `cloud/test/router.errors.test.ts` |

## E2E (Playwright, two independent clients)

| Plan | Covers | File |
| --- | --- | --- |
| TEST-board-stub-render | BR-3.3, BR-3.4 | `tests/e2e/cloud-sync-board.spec.ts` — production local-server poll plus deterministic render states |

## Manual (live Access-protected Worker / remote D1)

These cannot be automated locally — they require real Cloudflare Access and the
deployed Worker. They are the runtime gates for slice exit.

| Plan | Covers | Evidence file |
| --- | --- | --- |
| TEST-deployed-access-human | BR-2.1 | `cloud/test/operations/deployed-access.md` |
| TEST-deployed-access-machine | BR-2.2 | `cloud/test/operations/deployed-access.md` |
| TEST-deployed-concurrency | BR-1.1 | `cloud/test/operations/deployed-concurrency.md` (latency + D1 rows) |
| TEST-migration-apply | C2, C3 | `cloud/test/operations/migration.md` (bookmark + FK verify) |
| TEST-disable-markdown | BR-4.2 | `cloud/test/operations/disable.md` |
| TEST-restore-export-drill | BR-4.2 | `cloud/test/operations/restore.md` |

## Coverage invariant

Every BR-*, C*, and Edge-* requirement has at least one test-plan coverage
entry (validated by `spec-trace validate MDT-200 --stage tests`). The
`manual` plans are the deployment evidence gates; the rest run in CI against
local D1 + the Workers runtime.

Coverage routing is not completion evidence. Local automated files now exist
for membership, isolation, orchestration, polling, and concurrency. The
deployed-concurrency evidence checklist exists but remains unchecked because
that live proof has not been rerun. Strict validation also remains blocked
until a human approves and locks the requirements baseline.
