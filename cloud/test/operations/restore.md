# Export / Restore Drill Evidence — MDT-200

Manual evidence for `TEST-restore-export-drill` (BR-4.2). Exercises
export-before-restore, restore, and export readability.

## Procedure (operations.md § Backup and Export, § Database Restore)

D1 Time Travel restore is destructive and an incident operation, not a normal
rollback. Markdown/Git remains authoritative, so a projection can be rebuilt
after a restore; membership and counter history cannot be inferred safely from
Git and must be verified before allocation resumes.

### Export (weekly, encrypted, 90-day retention)

The export contains:

- cloud projects and counter state;
- memberships;
- reservations and terminal allocation history;
- projections and tombstones;
- audit records inside their retention window;
- migration version and export timestamp.

An untested export is not accepted as a backup (operations.md). Quarterly, an
export is restored into a temporary isolated D1 database and integrity-checked.

### Restore procedure

1. Suspend coordination writes at the Access policy or project state layer.
2. Record the current bookmark so the restore can be undone.
3. Export coordination data (export-before-restore).
4. Identify and peer-review the target timestamp/bookmark.
5. Restore with Wrangler.
6. Verify schema, counters, reservation uniqueness, memberships, and projection
   revision monotonicity.
7. Reconcile local journals created after the restore point.
8. Resume writes only after two-person approval.
9. Retain before/after bookmarks and incident record.

### Verification

- [x] Export shape documented and matches the schema (`cloud/migrations/0001_init.sql`).
- [ ] Live export drill: dump all six tables to encrypted storage, verify
      row counts and the migration version stamp.
- [ ] Live restore drill: restore into an isolated database, run integrity
      checks (counter monotonicity, reservation uniqueness, FK validity),
      confirm readability.

## Notes

- Because the deployed Worker stores all coordination state in D1 (no external
  stores), a full D1 export is a complete vendor-exit artifact.
- D1 Time Travel retention: 30 days on Workers Paid, 7 days on Workers Free
  (current as of the 2026-07-24 source check in operations.md).
