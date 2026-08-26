-- MDT-226 Slice 9 (C-16): bounded scheduled-maintenance D1 reads.
--
-- The 15-minute audit-retention scan (scheduled/maintenance.ts) selects
-- `WHERE occurred_at < ? ORDER BY occurred_at LIMIT ?`. The existing audit
-- indexes lead with tenant columns (cloud_project_id / principal_kind), so
-- SQLite full-scanned audit_events on every Cron invocation: 12,714 rows read
-- 96x/day ~= 1.22M rows/day against the 5M/day D1 free-tier read budget,
-- while returning zero rows until events age past the 180-day retention.
--
-- A single-column index on occurred_at turns the scan into a range seek that
-- also satisfies the ORDER BY, so maintenance reads are proportional to the
-- retention working set, not the table size. Retention policy is unchanged.
-- Schema is forward-only; application startup never creates or repairs
-- tables (operations.md).

CREATE INDEX audit_by_time
  ON audit_events(occurred_at);
