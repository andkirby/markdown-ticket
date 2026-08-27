-- MDT-226 Slice 10 (C-16): bounded reservation-expiry D1 reads.
--
-- The 15-minute reservation-expiry scan (scheduled/maintenance.ts) selects
-- `WHERE state = 'reserved' AND created_at < ?`. The existing
-- reservations_by_state_age index leads with cloud_project_id, which the
-- cron predicate lacks, so SQLite full-scanned ticket_reservations on every
-- invocation (production EXPLAIN 2026-08-26: `SCAN ticket_reservations`;
-- 34 rows then, but the table grows for project lifetime, so the
-- timer-driven scan is unbounded).
--
-- An index leading with (state, created_at) turns the scan into a range
-- seek over only the expired working set. Expiry logic is unchanged.
-- Schema is forward-only; application startup never creates or repairs
-- tables (operations.md).

CREATE INDEX reservations_by_expiry
  ON ticket_reservations(state, created_at);
