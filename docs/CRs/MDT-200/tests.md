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
| TEST-local-projection-feed | BR-3.3, BR-3.4 | `frontend/src/hooks/useCloudProjectionFeed.test.ts`, server controller/API tests |
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

## UAT 2026-10-24 — additional verification targets

PoC evidence is in [poc.md](poc.md); it is not production regression coverage.
The automated plans below are implemented and locally verified. The manual
production-reconciliation plan remains open. Exact results and limits are in
[verification.md](verification.md).

| Plan | Kind | Covers | Primary file |
| --- | --- | --- | --- |
| TEST-uat-allocation-floor | integration | BR-1.1,BR-1.2,BR-1.8,C3,C10,Edge-9 | `cloud/test/alloc.concurrency.test.ts` |
| TEST-uat-key-identity | integration | BR-1.1,BR-1.4,BR-1.8,BR-1.10,C9,Edge-7,Edge-9 | `shared/services/cloud-sync/__tests__/create-orchestrator.test.ts` |
| TEST-uat-manual-observation | integration | BR-1.9,C9,C11,Edge-7,Edge-8,Edge-9 | `shared/services/cloud-sync/__tests__/ticket-identity.test.ts` |
| TEST-uat-watcher-paths | integration | BR-1.9,C11,Edge-8 | `server/tests/unit/PathWatcherService.test.ts` |
| TEST-uat-create-adapters | e2e | BR-1.1,BR-1.8,BR-1.10,C9 | `cli/tests/e2e/ticket/create.spec.ts` |
| TEST-uat-counter-repair | integration | BR-4.3,C3,C9,C10 | `cloud/test/counter-reconciliation.test.ts` |
| TEST-uat-production-reconciliation | manual | BR-4.3,BR-4.1,C2,C3 | `cloud/test/operations/counter-reconciliation.md` |


### Required adversarial cases

- Existing 258 under a different slug with local high-water 262 and cloud counter
  258: no second 258; fresh capable allocation returns at least 263. A previously
  held 258 conflict stays held and cannot be repaired by changing its floor.
- Differing floors race from one pre-read; concurrent operator advance; transaction
  failure; integer overflow; scan permissions; disabled/invalid binding; old-client
  protocol mismatch. No committed reservation without matching counter advancement.
- Same-key retry preserves original floor/creationId. Changed floor or identity is
  rejected even when an opaque client requestHash is deliberately unchanged.
- Exact-file same bytes with unrelated creation identity is NOT an owned replay.
  Known worktree collisions and filename/frontmatter disagreement fail closed.
- Manual file collides with cloud `reserved`, `acknowledged`, `orphaned`, or
  `abandoned` identity. No projection is not evidence that a number is free.
- Matching creationId from Git is the existing creation; a reservation for a
  different key or a copied ID is conflict; missing evidence is unverified.
- Repeated add/change events, partial writes, startup scan, watcher error, and
  cloud/auth failures preserve bytes and yield bounded deduplicated diagnostics.
  Neither watcher event nor verification failure may acknowledge or publish.
- Two local same-key files: CLI get/attr, MCP get/update, HTTP read/update return
  typed ambiguity and never modify the first file found. Explicit authorized
  path-based inspection remains possible; no frontend redesign is required.
- An audited repair dry-run changes no rows; two applies are idempotent, preserve
  reservation/audit history, and block resumption for unresolved associations.

### Runners and evidence limits

Cloud uses `bun:test` against every ordered production migration. Shared, server,
and MCP use Jest; CLI uses `bun:test`. Extend the primary CLI adapter plan with
`mcp-server/src/tools/handlers/__tests__/crHandlers.test.ts` and server
`tests/unit/TicketService.boundary-compatibility.test.ts` plus controller tests;
a CLI-only pass cannot establish all-adapter acceptance.

Run focused package checks after implementation; run required schema/build/lint
checks for changed packages. Worker/D1 runtime, real Access, and multi-client
acceptance require separate authorized evidence. PoC SQLite and direct handler
invocation do not prove those lanes. Historical manual gates retain their own
owner tickets and evidence; do not silently close them in this round.

## Review regression plans 2026-10-25 — locally verified 2026-10-26

Repository regressions were captured RED before source edits and proved GREEN
through actual services, HTTP adapters and Worker/SQL boundaries. The independent
completion review passed. See verification.md for the912-test scoped checkpoint,
immutable evidence digests and the full-suite/live release gates.

| Plan | Kind | Covers | Primary file |
| --- | --- | --- | --- |
| TEST-review-creation-recovery | integration | BR-1.4,BR-1.5,C9,C10,Edge-2 | `shared/services/cloud-sync/__tests__/recovery.test.ts` |
| TEST-review-legacy-journal-inspection | integration | BR-1.4,C5,C9,C10,Edge-8 | `shared/services/cloud-sync/__tests__/operation-journal.test.ts` |
| TEST-review-lock-owner-diagnostics | unit | BR-1.4,Edge-2,Edge-8 | `shared/services/cloud-sync/__tests__/operation-journal.test.ts` |
| TEST-review-project-code-normalization | integration | BR-1.1,BR-1.4,BR-1.7,BR-1.8,C9,Edge-9 | `shared/services/cloud-sync/__tests__/create-orchestrator.test.ts` |
| TEST-review-canonical-code-ack | integration | BR-1.1,BR-1.4,C9,C10,Edge-7 | `cloud/test/identity-allocation.test.ts` |
| TEST-review-inventory-diagnostics | integration | BR-1.8,BR-1.9,C11,Edge-8 | `shared/services/cloud-sync/__tests__/ticket-identity.test.ts` |
| TEST-review-observation-stability | integration | BR-1.9,C9,C11,Edge-8 | `shared/services/cloud-sync/__tests__/ticket-identity.test.ts` |
| TEST-review-recovery-adapter | integration | BR-1.4,C5,C9,Edge-8 | `server/tests/services/cloud-sync/CloudCreationRecovery.test.ts` |
| TEST-review-recovery-http-integration | integration | BR-1.4,C5,C9,Edge-8 | `server/tests/unit/TicketService.boundary-compatibility.test.ts` — actual HTTP→facade→shared journal and terminal-state preservation |

Required cases: restart with retained valid journal and no repeated create
arguments; legacy/corrupt inspection without writes; changed expected file digest
blocks reconciliation; unproven provenance remains manual review; PID reuse is
inspectable without live-lock theft; validation before journal persistence;
canonical lowercase-code create/ACK plus real wrong-code/ID rejection; unavailable
worktree and huge-number filename preserve named diagnostics;130 real files across
three waves, each <=64 probes, stable unchanged classifications and bounded
notifications; file/identity/binding/principal/authorization changes invalidate
old claim evidence; cross-project cache isolation; owner-only recovery route with
no public-read access or startup/read side effects.

`server/tests/services/cloud-sync/TicketIdentityObservation.test.ts` covers
cached-result notification behavior and the shared service integration. Existing
create, recovery, journal, cloud allocation and adapter regressions remain
mandatory. Counts from the earlier1068 passing tests do not include these new
cases. Local, deployed and incident-operation gates remain separate.

Review acceptance extension (2026-10-26): TEST-review-recovery-http-integration
provides actual HTTP requests for acknowledged
journals with and without held receipt/ACK fields. Resume must return
manual-review-required and preserve exact active bytes; inspection offers
archive-terminal only for a parseable held receipt. Reconciliation still
requires fresh terminal/canonical proof. These cases cover the existing
corrupt/legacy evidence preservation constraint; no requirement is weakened.
