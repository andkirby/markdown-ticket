# MDT-198 Verification

> Second independent audit. The earlier verification was not accepted as
> evidence without rechecking its sources, executable POCs, current repository
> state, and agreement between subdocuments.

Date: 2026-07-24

## Outcome

**Pass after drift repair and User Review.** The research package is internally
consistent and complete. It does not claim a production implementation or a
deployed Cloudflare validation.

The decision remains **Go (reduced scope)**:

- Workers + D1 for centralized allocation, idempotency, and header projection.
- No Durable Object in the first slice.
- Markdown/Git is the approved header authority.
- Presence and offline allocation are excluded from the first slice.

## Verification performed

### Repository evidence

Rechecked current code rather than relying on the prior agent report:

| Claim | Evidence | Verdict |
|---|---|---|
| Local numbering scans existing ticket files and has no cross-clone coordinator | `shared/services/TicketService.ts:602-630` | Confirmed |
| Allocation and file persistence have a non-atomic seam | `shared/services/TicketService.ts:318-345` | Confirmed |
| CLI, MCP, and server create paths delegate to shared ticket creation | `cli/src/commands/create.ts`, `mcp-server/src/services/crService.ts`, `server/services/TicketService.ts` | Confirmed |
| SSE fan-out is process-local | `server/services/fileWatcher/SSEBroadcaster.ts` | Confirmed |
| Current project identity can fall back to a local directory name | `shared/services/project/ProjectFactory.ts`, `ProjectRegistry.ts` | Confirmed |

The pre-existing worktree identity owner document still describes an
unimplemented canonicalization design. This is recorded as a separate
architecture/code gap; fixing it would require production implementation
outside MDT-198.

### Cloudflare evidence

Official documentation was reopened on 2026-07-24:

| Claim | Verdict |
|---|---|
| D1 `batch()` takes a prebuilt list of prepared statements and executes it transactionally | Confirmed; the original dynamic pseudoalgorithm was invalid and was replaced |
| D1 Time Travel retention is 30 days on Paid and 7 days on Free | Corrected |
| Free and Paid D1 pricing allowances are distinct | Corrected |
| Browser and CLI tokens reach Access first; Access injects `Cf-Access-Jwt-Assertion` toward the Worker | Corrected |
| A validated service-token application JWT exposes the machine Client ID in `common_name` | Corrected |

Sources are linked in `research.md`. Access behavior remains documentation-only
until tested in an actual Access-protected deployment.

## Executable evidence

### Lifecycle POC

```bash
bun run docs/CRs/MDT-198/poc/src/run.ts
```

Result:

```text
E1-E9: 9/9 passed, 0 failed
```

This POC validates lifecycle, retry, stale-write, recovery, non-reuse, and
export behavior. It uses a branching `bun:sqlite` transaction and is not, by
itself, proof of D1 batch API compatibility.

### D1-binding concurrency POC

Local Worker:

```bash
cd docs/CRs/MDT-198/poc/d1-binding
wrangler dev --local --port 8798 --inspector-port 9298 \
  --log-level error --show-interactive-dev-session false
```

Verifier:

```bash
cd docs/CRs/MDT-198/poc/d1-binding
bun run src/verify.ts
```

Result:

```text
fiftyConcurrentRequestsUnique: true
tenConcurrentReplaysStable: true
noDuplicateTicketRows: true
counterAdvancedOncePerUniqueIntent: true
projectIsolation: true
oneIdempotencyRowPerIntent: true
```

Evidence totals:

- 50 concurrent unique requests → 50 unique numbers.
- 10 concurrent replays → one number and one reservation.
- `proj-mdt`: 51 ticket rows, `next_number=52`.
- `proj-other`: two ticket rows, `next_number=3`.

This closes the earlier D1-shape gap locally. It does not prove deployed
multi-isolate capacity, network latency, or Access integration.

## Drift fixed in this audit

1. Replaced an impossible dynamic D1 batch algorithm with a static,
   guarded prepared-statement batch and verified it through a D1 binding.
2. Separated the SQLite lifecycle simulation from the D1-specific proof.
3. Corrected browser, CLI, and service-token authentication handshakes and
   sequence diagrams.
4. Corrected Time Travel retention and the Free/Paid pricing table.
5. Corrected idempotent replay from `409 Conflict` to a cached successful
   allocation response.
6. Added the missing ticket `reservation_id` constraint and removed an
   unnecessary per-project binding secret.
7. Corrected the polling calculation: 172,800 requests/day is not necessarily
   172,800 D1 rows read.
8. Corrected `frontend/` to `src/`, `O_EXNL` to `O_EXCL`, and removed an
   unsupported claim that presence doubles cost.
9. Reframed Durable Objects as stateful/realtime infrastructure, not a D1
   throughput workaround.
10. Corrected the dirty-worktree record. Pre-existing board-filter changes are
    present and were not modified by this ticket audit.

## Completion contract

| Contract item | Result |
|---|---|
| RQ1-RQ12 have direct answers and evidence labels | Pass |
| One authority is named for every synchronized field | Pass |
| Collision, replay, isolation, recovery, stale-write, and export cases are executable | Pass |
| Production-shaped D1 allocation batch is executable | Pass locally |
| Human and machine authentication are distinguished | Pass as documentation-sourced design |
| Cost, backup, restore, and vendor-exit assumptions are explicit | Pass |
| Integration map matches current package ownership | Pass |
| No production implementation is claimed | Pass |
| User Review decisions are recorded before research closure | Pass |

## User Review decisions

Approved on 2026-07-24:

1. Markdown-as-authority with a one-way cloud projection.
2. Presence excluded from slice 1.
3. Cloud-bound creation requires connectivity; offline allocation is deferred.
4. Cloud coordination remains opt-in per project.
5. Canonical owner documentation uses `docs/architecture/cloud-sync/`.
6. Architecture follow-up `MDT-199` and dependent Feature follow-up `MDT-200`
   are created; MDT-198 is closed as Implemented.

## Final validation

The final command results are recorded after all drift fixes:

- Lifecycle POC: 9/9 passed.
- D1-binding checks: 6/6 passed.
- Markdown lint: 0 errors.
- Mermaid diagrams: rendered successfully.
- JSON pipeline state: parsed successfully.
- `git diff --check`: no errors.
- Unrelated pre-existing board-filter files: preserved.
