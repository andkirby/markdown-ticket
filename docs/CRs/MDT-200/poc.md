# Proof of Concept: allocation floor and watcher identity

**CR**: MDT-200

**Date**: 2026-10-24

**Scope**: isolated SQLite and direct watcher handler; no production networking.

## Question

Can a local allocation minimum preserve the static transactional allocation
model under races? Can the current watcher distinguish two same-key manual files
or establish that a key already reserved in the cloud belongs to that file?

## Hypothesis

A max-only counter change is insufficient when the candidate differs from the
observed counter. A guarded INSERT plus observed-counter advance can keep
allocation atomic. Watcher events and number/state alone cannot prove ownership.

## Experiment

Spike location: `poc/allocator-and-watcher/` (ignored throwaway code).

| File | Purpose |
| --- | --- |
| `run.ts` | Invoke actual current allocator, disposable variants, and actual watcher handler |
| `allocator-naive.ts` | Production source copied with candidate=max(counter,floor) only |
| `allocator-guarded.ts` | Disposable candidate adding counter-guarded INSERT, observed-counter advance, and no-row retry |
| `d1-adapter.ts` | Transactional bun:sqlite adapter/rendezvous copied from production concurrency test harness |
| `README.md` | Run instructions only |

All ordered `cloud/migrations/*.sql` were applied to in-memory SQLite. The
rendezvous forces three allocations to pre-read258 before their batches execute.
The operator-race case advances the counter between pre-read and batch. An audit
trigger injects a transactional failure. Two real temporary Markdown paths are
sent directly through the production watcher handler; no live chokidar delivery
is exercised. No packages were installed.

## Findings

Command from repository root:

```bash
CONFIG_DIR=/tmp/mdt200-poc-config BUN_RUNTIME_TRANSPILER_CACHE_PATH=/tmp/mdt200-poc-cache bun docs/CRs/MDT-200/poc/allocator-and-watcher/run.ts
```

Observed output (temporary fixture path omitted):

```text
CURRENT: counter=258, supplied floor=263 -> reserves 258; existing request contract ignores floor.
NAIVE MAX-ONLY PATCH: fails coordination_unavailable; reservation 263 committed but counter remains 258. Rejected.
GUARDED BATCH: 258/floor263 -> 263, next264; original replay stable after later floor600; changed hash rejected without counter advance.
FORCED SAME-COUNTER RACE: {"floors":[263,600,400],"numbers":[263,600,601],"next":602,"reservations":3}
OPERATOR-ADVANCE RACE: counter moved to900 after pre-read; stale insert suppressed; retry reserves900; exactly one reservation.
INJECTED AUDIT FAILURE: transaction rolls back reservation and counter together.
CURRENT WATCHER HANDLER: two distinct slugged paths emit indistinguishable key-only MDT-258.md events; no reservation ownership evidence.
PASS: isolated SQLite/handler PoC only; no live D1, Access, chokidar delivery, or production fix is claimed.
```

### What worked

The guarded candidate reserved above each caller's floor, retried differing-floor
and operator-advance races without extra reservations, replayed a fixed intent
without a counter bump, and rolled back the injected audit failure completely.

### What did not work

Changing only the candidate to max(counter,floor) committed a reservation while
the existing UPDATE guard compared the counter to the higher candidate. Recovery
then exhausted retries. This experimentally rules out that minimal patch.

The current watcher handler normalizes BOTH `MDT-258-original.md` and
`MDT-258-manual.md` into `MDT-258.md`; it carries neither original physical path
nor creation identity. Its event cannot authorize cloud adoption. Source contract
inspection additionally confirms ReservationDTO exposes number/id/state/replay,
not proof binding a newly observed file to that creation; a reservation lookup
also requires knowing its reservationId. A projection miss cannot exclude an
unacknowledged reservation.

### Constraints and limits

The candidate code is a throwaway algorithm experiment, not the proposed API,
schema migration, input validation, or complete recovery implementation. In
particular it does NOT verify unchanged opaque hashes against changed minimum or
creationId; production must hash/store those immutable inputs server-side. It
does not prove provenance migration, actual D1 scheduling/costs, Access, live
filesystem-event delivery, or all-adapter behavior. No performance claim is made.

## Decision

**Answer**: the guarded transactional floor approach is locally feasible;
max-only is unsafe. A watcher can initiate safe classification but cannot infer
same-creation rights from an occupied key. Use durable creation identity and
membership-checked claim evidence; otherwise retain an unverified/conflict
state and preserve the file.

## Impact on Architecture

| Aspect | Required implication |
| --- | --- |
| Cloud batch | Guard reservation INSERT against the observed counter as well as advancing it; no-result lost guard retries boundedly |
| Replay | Persist immutable minimum and creationId; reject changes independently of caller-supplied digest |
| Shared create | Key-wide collision checks and verified same-creation replay before write/ack |
| Watcher | Preserve original physical identity internally; classify without automatic reservation/ack/publication |
| Legacy files | Explicit reviewed reconciliation; number or header equality never bootstraps ownership |
| Verification | Production regression, Workers/D1, and adapter lanes remain required |

## Cleanup

- [x] Spike code is throwaway and already ignored by the existing `**/poc/` rule.
- [x] No production source, schema, deployment, credentials, or D1 state changed.
- [ ] Re-run the durable production regression suite after implementation.

## Next Steps

Consume these constraints in [architecture.md](architecture.md) and implement
only through the current [uat.md](uat.md) execution slices. The current UAT
procedure writes specifications/trace, not production fixes.
