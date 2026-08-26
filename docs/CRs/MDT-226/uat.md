# UAT Refinement Brief

## Objective

Eliminate the scheduled-maintenance D1 read amplification discovered while
investigating the 2026-08-26 cloud-quota report (~1M rows read/day against the
5M/day D1 free-tier budget with no project activity), and keep the 180-day
audit retention policy.

## Approved Changes

- Add `C-16 Bounded scheduled-maintenance D1 reads`: scheduled maintenance
  locates its working set through indexes; the audit-retention scan reads only
  rows before its `occurred_at` cutoff.
- Add forward-only migration `0003` creating `audit_by_time ON
  audit_events(occurred_at)`. Maintenance logic is unchanged.
- Keep audit retention at 180 days: the whole database is ≈ 6 MB; storing
  audit rows costs ~nothing, the forensic window is kept, and the quota defect
  is the scan pattern, not the row count.
- Keep reservation expiry as an eager idempotent cron transition (34 rows
  read/day is noise); lazy expiry was evaluated and rejected because it would
  spread the 24h TTL rule across every reader of reservation state.
- Keep `TEST-idle-zero-d1` and `TEST-deployed-stream-handshake` as the
  remaining deployed gates for this ticket; the maintenance index removes the
  cron's audit scan as a contaminant in instrumented idle-D1 windows.

## Changed Requirement IDs

- Added `C-16` (additive change). `C-1` and `C-15` keep their meanings: they
  bound the local-server stream path; `C-16` bounds Worker-side scheduled
  maintenance.

## Affected Downstream Trace

- Add `TEST-audit-retention-index` (unit, `cloud/test/maintenance.test.ts`).
- Add `TASK-audit-retention-index` (Slice 9) owning `ART-audit-migration`,
  `ART-maintenance-tests`, and `ART-data-doc`.
- No BDD scenario change: `C-16` is a maintenance-cost constraint routed to
  tests, not a user-visible scenario.

## Execution Slices

1. **Audit-retention index**
   - Objective: make the 15-minute retention scan read only its bounded
     working set (≈ 0 rows today) instead of the full table.
   - Direct artifacts: `cloud/migrations/0003_audit_retention_index.sql`,
     `cloud/test/maintenance.test.ts`,
     `docs/architecture/cloud-sync/data-and-consistency.md`.
   - Direct GREEN targets: TEST-audit-retention-index (migrations apply in
     order; retention scan uses `audit_by_time`, never a full scan).
   - Canonical task: `TASK-audit-retention-index`.
   - Deploy: apply migration 0003 to production D1, then verify remotely with
     `EXPLAIN QUERY PLAN` and a measured `rows_read` near zero for the
     retention SELECT.

## Validation

- RED evidence (production, 2026-08-26): D1 insights show the retention
  `SELECT id FROM audit_events WHERE occurred_at < ? ORDER BY occurred_at
  LIMIT ?` reading 12,714 rows per invocation, 96 invocations/day ≈ 1.22M
  rows/day; `audit_events` holds 12,714 rows (oldest 2026-07-25, newest
  2026-08-24); `COUNT(*)` itself reported `rows_read: 12714`.
- Neither existing audit index (`audit_by_project_time`,
  `audit_by_principal_time`) can serve the cutoff predicate — both lead with
  tenant columns, so SQLite full-scans.
- GREEN target: local suite green including the new index-plan test; deployed
  `EXPLAIN QUERY PLAN` shows `USING INDEX audit_by_time` and the retention
  SELECT reports `rows_read` ≈ 0.
- Remaining deployed gates for the ticket (unrelated to this slice):
  `TEST-deployed-stream-handshake` formal D1 telemetry counts and
  `TEST-idle-zero-d1` 30-minute instrumented window.

## Watchlist

- `CREATE INDEX` on a 12,714-row table is an online one-time build; no worker
  code change or redeploy is required for the fix itself (the Worker's
  maintenance query is unchanged), but apply the migration with
  `wrangler d1 migrations apply` so the migration ledger stays authoritative.
- Do not shorten retention to chase quota: after the index, stored rows cost
  ~nothing; revisit 180-day retention only as a deliberate forensic-policy
  decision.
