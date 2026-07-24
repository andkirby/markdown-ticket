# MDT-198 Proof of Concept

> **Durable summary.** Code under `poc/` is throwaway per the `mdt:poc` skill —
> do not adapt it into production. This file records what was proven, the exact
> commands, the actual output, and the limitations.

## Objective

Validate, locally and without deploying production resources, the concurrency,
retry, idempotency, staleness, and failure-recovery claims that the cloud
coordination design (see `research.md`) depends on. Nine lifecycle experiments
use `bun:sqlite`; E10 separately verifies the production-shaped static batch
through a real local D1 binding. The POC does **not** prove Cloudflare Access
identity behavior, which remains documentation-sourced (see `research.md` RQ7).

## Faithfulness: POC vs production D1

| Aspect | Lifecycle POC (E1–E9) | D1-binding POC (E10) | Production |
|---|---|---|---|
| Engine/API | `bun:sqlite` | Wrangler local D1 binding | Cloudflare D1 binding |
| Atomic unit | Branching `db.transaction()` | Static `D1Database.batch()` prepared statements | Static `D1Database.batch()` |
| Concurrency | Sequential lifecycle calls | Concurrent local HTTP requests | Concurrent Worker requests |
| Idempotency | Unique `(cloud_id, idem_key)` | Same, plus guarded static writes | Same design |
| Persistence | In-memory; E8 export/reload simulation | Local persisted D1 state | Durable D1; Time Travel is 30 days Paid / 7 days Free |

E1–E9 validate lifecycle semantics but are **not** evidence that an
application-branching transaction translates directly to D1. E10 closes that
gap for allocation and idempotent replay. It does not replace production load
testing.

Sources: [D1 worker-api](https://developers.cloudflare.com/d1/worker-api/d1-database/),
[D1 limits](https://developers.cloudflare.com/d1/platform/limits/),
[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/)
(accessed 2026-07-24).

## Environment

- Runtime: Bun `1.3.14`, Node `v26.4.0`
- SQLite: `3.43.2` (via `bun:sqlite`)
- Wrangler: `4.111.0`, compatibility date `2026-07-01`
- Date run: 2026-07-24

## How to run

```bash
bun run docs/CRs/MDT-198/poc/src/run.ts
```

Output: per-experiment PASS/FAIL and `docs/CRs/MDT-198/poc/results.json`.

For E10, start the local Worker in one shell:

```bash
cd docs/CRs/MDT-198/poc/d1-binding
wrangler dev --local --port 8798 --inspector-port 9298 \
  --log-level error --show-interactive-dev-session false
```

Then run the verifier in another:

```bash
cd docs/CRs/MDT-198/poc/d1-binding
bun run src/verify.ts
```

## Experiments

For each: hypothesis, exact command, environment, actual output, pass/fail,
limitations, architecture implication.

### E1 — repeated create intents receive unique per-project numbers

- **Hypothesis:** N create intents each receive a unique per-project
  number.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E1)`
- **Method:** 50 sequential allocations through the lifecycle simulator.
- **Actual output:** `count=50, unique=50, numbers=[1..50]`.
- **Result:** ✅ PASS.
- **Limitations:** This does not exercise request concurrency or the D1 binding;
  E10 does.
- **Architecture implication:** The lifecycle model preserves unique
  allocation; D1-specific evidence comes from E10.

### E2 — repeated delivery with same idempotency key returns same result

- **Hypothesis:** A retried create with the same idempotency key returns the
  same result, not a second allocation.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E2)`
- **Method:** allocate with key `idem-A` three times.
- **Actual output:** all three return `local_number=1`; replays have
  `status="replayed"`.
- **Result:** ✅ PASS.
- **Limitations:** Idempotency window is local-table lifetime here. The final
  MDT-199 architecture uses the same project-lifetime retention to protect
  delayed replay.
- **Architecture implication:** Retries after a network blip are safe; no
  duplicate numbers (RQ4/RQ5).

### E3 — different projects allocate independently

- **Hypothesis:** Two projects can independently allocate starting at 1, even
  with identical idempotency keys.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E3)`
- **Method:** same key `iso-1` used in `proj-mdt` and `proj-other`.
- **Actual output:** `proj_mdt=[1,2]`, `proj_other=[1,2]`.
- **Result:** ✅ PASS.
- **Limitations:** Isolation enforced by composite PK; production must scope
  every query by `cloud_id`.
- **Architecture implication:** Multi-tenant coordination in one D1 database is
  safe (RQ3/RQ8).

### E4 — allocation plus metadata creation is atomic

- **Hypothesis:** Number increment, ticket row insert, and idempotency record
  are a single atomic unit.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E4)`
- **Method:** allocate once; assert ticket row, idempotency row, and counter
  agree.
- **Actual output:** allocated=1, ticket reservation=`reserved` version=1,
  idem local_number=1, next counter=2.
- **Result:** ✅ PASS.
- **Limitations:** Atomicity is modeled via a branching `bun:sqlite`
  transaction; E10 verifies the static D1 batch separately.
- **Architecture implication:** No partial-failure inconsistency (RQ5); a failed
  batch leaves no orphan number.

### E5 — failed local file creation produces a recoverable reservation

- **Hypothesis:** A reservation that survives a failed local write can be
  acknowledged after the local file is retried.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E5)`
- **Method:** allocate (reservation stays `reserved`), simulate failed local
  write (no ack), retry the local write, then ack.
- **Actual output:** reservationBeforeAck=`reserved`, ack
  status=`acknowledged`, fileWritten=true.
- **Result:** ✅ PASS.
- **Limitations:** Local retry only; production needs a durable client-side
  reservation record (e.g. `.mdt/reservations.json`) to survive process
  restart.
- **Architecture implication:** Failed local creation is recoverable; the number
  is held until ack or abandonment (RQ5).

### E6 — duplicate acknowledgement is harmless

- **Hypothesis:** A second acknowledgement for an already-acknowledged ticket is
  a no-op and does not bump the version again.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E6)`
- **Method:** ack the same reservation twice with the same header.
- **Actual output:** ack1=`acknowledged`, ack2=`noop`, final version=2.
- **Result:** ✅ PASS.
- **Limitations:** No-op defined as same-header ack; a different header would
  be a projection push (E7 path).
- **Architecture implication:** Duplicate ack is harmless (RQ5); clients can
  retry ack freely.

### E7 — stale metadata versions are rejected deterministically

- **Hypothesis:** A projection push with a stale version is rejected
  (conflict); a fresh-version push succeeds and wins.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E7)`
- **Method:** ack (version→2); client A pushes at stale version 1; client B
  pushes at fresh version 2.
- **Actual output:** stalePush=`{conflict:true, currentVersion:2}`,
  freshPush=`{version:3}`, final ticket title=`B-fresh`.
- **Result:** ✅ PASS.
- **Limitations:** Markdown/Git remains authoritative; the version only guards
  the mirror against lost updates, not divergent human edits.
- **Architecture implication:** Stale writes are rejected deterministically
  (RQ6); the client re-reads and retries.

### E8 — cloud gaps do not cause number reuse

- **Hypothesis:** After a cloud gap/restart, allocation continues monotonically
  and never reuses an abandoned number.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E8)`
- **Method:** allocate 1 and 2, abandon 2, export+reload state (simulating a
  restart), allocate again.
- **Actual output:** beforeGap=`[1,2]`, afterGap=`[3,4]`.
- **Result:** ✅ PASS.
- **Limitations:** Reload modeled via export/insert; production D1 is already
  durable across restarts, so reuse is structurally impossible while the
  counter row persists.
- **Architecture implication:** Gaps are acceptable, reuse is not (RQ5); cloud
  restarts do not break the invariant.

### E9 — export produces a repository-independent representation

- **Hypothesis:** The coordination DB exports to a repository-independent JSON
  representation.
- **Command:** `bun run docs/CRs/MDT-198/poc/src/run.ts (E9)`
- **Method:** allocate in two projects, export all tables, assert JSON
  serializability.
- **Actual output:** projectCount=2, ticketCount=2, jsonSerializable=true.
- **Result:** ✅ PASS.
- **Limitations:** JSON shape; production export would also offer SQL dump per
  D1 import/export docs.
- **Architecture implication:** Vendor-exit + backup path is concrete (RQ11);
  Markdown/Git remains the durable authority, so export is a safety net.

### E10 — static D1 batch survives concurrent requests and replays

- **Hypothesis:** A production-shaped prepared-statement `D1Database.batch()`
  can allocate collision-free numbers without branching on intermediate batch
  results, and concurrent idempotent replays return one stable result.
- **Command:** start `wrangler dev` and run `bun run src/verify.ts` as shown
  above.
- **Method:** a Worker with a local D1 binding receives 50 concurrent unique
  allocation requests, 10 concurrent requests sharing one idempotency key, and
  two requests against a second project.
- **Actual output:** all six checks passed; 50 requests produced 50 unique
  numbers; 10 replays produced one number and one reservation; project `proj-mdt`
  persisted 51 tickets with `next_number=52`; `proj-other` persisted two
  tickets with `next_number=3`.
- **Result:** ✅ PASS.
- **Limitations:** Local Wrangler/Miniflare, not a deployed multi-isolate load
  test; Access and production latency are not exercised.
- **Architecture implication:** RQ4's allocation algorithm is executable with
  D1's static batch API; a Durable Object is not required for correctness.

## Summary

```text
9/9 lifecycle experiments passed, 0 failed.
D1-binding concurrency verification: 6/6 checks passed.
```

All hypotheses confirmed. No failed hypothesis drove an alternative design —
the recommended D1 + Workers topology (research.md decision: Go, reduced scope)
is supported by the POC.

## Not proven by this POC (carried as caveats)

- **Cloudflare Access identity** (human JWT, service tokens) — no
  Access-protected environment was exercised. Conclusions are
  documentation-sourced (research.md RQ7). Must be validated against a real
  Access-protected Worker in the Architecture/Feature follow-up.
- **Deployed multi-isolate concurrency and capacity** — E10 exercises
  concurrent HTTP requests through local Wrangler/D1. Production load and
  latency testing belongs in the follow-up.
- **Offline allocation / local-rename** — intentionally deferred; recommended
  first slice is cloud-required.
- **Real-time presence / WebSocket Durable Object** — excluded from the POC and
  the recommended slice (RQ9).
