# Migration Evidence — MDT-200 Slice 2

Manual evidence for `TEST-migration-apply` (C2, C3). Recorded against the live
production D1 `mdt-cloud-sync-production` (`02996cfe…`).

## Procedure (operations.md § Migration Procedure)

1. ✅ Applied and tested the migration against a fresh local D1 — all 6 tables
   + 5 indexes created, `UNIQUE` constraint smoke-tested.
2. N/A Staging export/restore drill — no staging environment (production-only
   deploy per user decision). Production DB was empty (only `_cf_KV`), so there
   was no data to restore-test against.
3. ✅ Ran schema, foreign-key, allocation, idempotency tests —
   `cloud/test/alloc.integration.test.ts` (6 cases, all pass against real SQLite
   with the production schema).
4. ✅ Recorded pre-migration state: `_cf_KV`, `d1_migrations`, `sqlite_sequence`
   (empty — no user data).
5. ✅ Applied `0001_init.sql` with `wrangler d1 migrations apply --remote`:
   `Executed 12 commands in 2.07ms`, status ✅.
6. ✅ Verified applied migration list: `0001_init.sql @ 2026-07-24 21:38:16`.
7. ✅ Schema version present before deploying code: deployed Slice 2 Worker
   after the migration was confirmed.

## Production schema (verified post-apply)

Tables: `cloud_projects`, `memberships`, `ticket_reservations`,
`idempotency_keys`, `ticket_projections`, `audit_events`.
Indexes: `memberships_by_principal`, `projections_by_revision`,
`reservations_by_state_age`, `audit_by_project_time`, `audit_by_principal_time`.

## Live allocation proof (BR-1.1, BR-1.2, C3)

Provisioned a throwaway project (counter 201, owner `andkirby@gmail.com`),
then against the deployed Worker:

| Request | Result |
| --- | --- |
| reserve #201 (key `live-test-1`) | `201` ticket 201, `replayed:false` |
| replay same key/hash | same `reservationId`, `replayed:true` |
| reserve (key `live-test-2`) | `201` ticket 202 |

Production D1 after: **counter = 203** (advanced exactly twice, not thrice —
the replay did not advance it), audit showed `allocated / replayed / allocated`,
reservations `#201, #202` (unique, monotonic). Test project + all rows deleted
after verification.

## Bug found and fixed during integration testing

**Counter advanced on idempotent replay.** Statement 3 (`UPDATE counter WHERE
next_ticket_number = ?`) fired even on replay because the pre-read `ticketNumber`
matched. Fixed by gating the counter advance on `EXISTS (reservation row for
THIS request's reservation_id)` — on replay no such row is inserted, so the
counter is untouched. The integration test (`alloc.integration.test.ts`) and the
live replay both confirm: counter advances exactly once per unique allocation.

## 2026-08-26 — `0003_audit_retention_index.sql` (MDT-226 Slice 9, C-16)

The audit-retention scan `SELECT id FROM audit_events WHERE occurred_at < ?
ORDER BY occurred_at LIMIT ?` had no usable index (both audit indexes lead
with tenant columns) and full-scanned 12,714 rows 96×/day ≈ 1.22M rows/day
against the 5M/day D1 free-tier read budget while deleting nothing (oldest
event was 32 days old; retention is 180 days).

1. ✅ Local: all migrations applied in order against fresh SQLite —
   `cloud/test/maintenance.test.ts` (TEST-audit-retention-index: plan uses
   `audit_by_time`, never `SCAN audit_events`); cloud suite 87/87.
2. ✅ Applied with `wrangler d1 migrations apply mdt-cloud-sync-production
   --remote`: `0003_audit_retention_index.sql` ✅, 2 commands in 9.28ms
   (ledger `applied_at` 2026-08-26 16:23:21).
3. ✅ Verified post-apply: `EXPLAIN QUERY PLAN` → `SEARCH audit_events USING
   INDEX audit_by_time (occurred_at<?)`; measured retention SELECT
   `rows_read: 1` (was 12,714), empty result as expected.

Production indexes now additionally include `audit_by_time`.
