---
code: MDT-222
status: Proposed
dateCreated: 2026-08-02T00:00:00.000Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-200
dependsOn: MDT-200
---

# Exercise cloud sync operational drills

## 1. Description

### Requirements Scope

`partial`

### Problem

- `docs/CRs/MDT-200-cloud-sync-first-slice.md` acceptance criterion #19
  ("Backup, restore, export, disable, and vendor-exit procedures are
  exercised") remains open. The procedures are documented under
  `cloud/test/operations/` (`restore.md`, `disable.md`,
  `deployed-concurrency.md`) and the runbooks are complete, but the live drills
  against a real D1 database have never been run and recorded.
- MDT-200 was closed for its implemented slice with this criterion explicitly
  deferred as out-of-scope-at-the-time. The cloud coordination service is now
  deployed (`cloud/test/operations/live-onboarding.md` records Worker
  `68ff9a13-…`, migration `0002` applied, this repo bound to cloud project
  `35863af3-…`). The drills are now runnable.

### Scope

- In scope:
  - Run the backup/export drill and record real D1 export output.
  - Run the restore drill against a temporary isolated D1 database (never the
    production database) and verify restored rows match the export.
  - Run the project-wide disable/suspend drill and verify fail-closed
    mutation behavior plus local Markdown continuity.
  - Run the deployed concurrency drill against the production candidate and
    record request count, concurrency level, latency, monotonic ticket
    numbers, idempotent replay, and D1/audit agreement.
  - Record the vendor-exit (disable + Markdown continuity + detach) drill.
  - Tick the unchecked boxes in `cloud/test/operations/restore.md`,
    `disable.md`, and `deployed-concurrency.md`.
- Out of scope:
  - Restoring over the production database.
  - Changing the documented procedures themselves — this ticket executes and
    records, it does not redesign the runbooks.
  - Any new operational capability; the procedures already exist.

### Affected Artifacts

- `cloud/test/operations/restore.md` — tick live-restore checkboxes.
- `cloud/test/operations/disable.md` — tick live-disable checkboxes.
- `cloud/test/operations/deployed-concurrency.md` — fill in real numbers.
- `docs/CRs/MDT-200-cloud-sync-first-slice.md` — flip criterion #19 to `[x]`
  once drills are recorded.

## 2. Decision

### Chosen Approach

Execute each documented runbook against the deployed Worker and a temporary
isolated D1 database, then record real outputs in the existing operations
files. No new code, no new runbooks.

### Rationale

- The runbooks already encode the correct procedures; the gap is execution and
  recorded evidence, not design.
- A separate isolated D1 database for the restore drill is mandatory — the
  runbook itself states this ("Do not restore the production database merely to
  close a checkbox").
- Recording real numbers (latency, concurrency, monotonicity) is the only
  honest way to satisfy criterion #19. Repeating the runbook text is not
  evidence.

## 3. Acceptance Criteria

- [ ] `cloud/test/operations/restore.md` records a real export-then-restore
  drill against a temporary isolated D1 database, with restored rows matching
  the export, and every checkbox ticked.
- [ ] `cloud/test/operations/disable.md` records a real project-wide
  disable/suspend drill with fail-closed mutation verification and local
  Markdown continuity, with every checkbox ticked.
- [ ] `cloud/test/operations/deployed-concurrency.md` records real concurrency
  numbers (request count, concurrency level, latency summary, monotonic ticket
  numbers, idempotent replay, counter advancement, D1/audit agreement), with
  every checkbox ticked.
- [ ] Vendor-exit (disable + Markdown continuity + detach) is exercised and
  recorded.
- [ ] No credentials, assertions, emails, titles, or request bodies are copied
  into the recorded evidence.
- [ ] `docs/CRs/MDT-200-cloud-sync-first-slice.md` criterion #19 is flipped to
  `[x]` with a reference to the recorded evidence.

## 4. Verification

- Each operations file contains real outputs (timestamps, version IDs, row
  counts, latency figures), not runbook boilerplate.
- The restore drill used an isolated D1 database, not production.
- The production database is untouched and still serves the bound repository.

## 5. Deployment

Operational drills only; no production code deployment.
