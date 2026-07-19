---
code: MDT-194
status: Proposed
dateCreated: 2026-07-19T16:19:25.854Z
type: Technical Debt
priority: High
phaseEpic: MDT-188
dependsOn: MDT-189
---

# Run Real `blocks` Migration Write From Clean Session

**Split from:** MDT-189 (where it was TASK-migrate-real, deferred by operator
decision during a session with concurrent agents in flight).

## 1. Description

### Problem Statement

MDT-189 shipped the `blocks := inverse(dependsOn)` derivation logic, the
write-path removal, and the migration script. The script's **dry-run** ran
against the live repo and produced a committed report
(`docs/CRs/MDT-189/blocks-migration-report.md`) — but the **real write** that
rewrites every ticket's `blocks` frontmatter was intentionally **not** executed.

The reason: the migration rewrites frontmatter on every ticket file (a one-way
door), and the branch had concurrent agents editing `docs/CRs/` for unrelated
tickets (MDT-168, MDT-193, etc.). Running it then risked data loss and merge
conflicts. The deferral is documented in the report and was the operator's
explicit decision.

### Current Impact

- The repo still has 11 edges with missing `blocks` reciprocals and one
  outright contradiction (`MDT-082 ↔ MDT-071`).
- The `blocks` write path has been removed from `TicketService`, but the
  back-catalog data has not been reconciled to match. New writes derive
  correctly; old data is stale until the migration runs.
- The invariant `blocks === inverse(dependsOn)` holds only for tickets touched
  after MDT-189 shipped — not for the 100% claim BR-4.3 requires.

### Root Cause

Two-source-of-truth drift that pre-dates MDT-189. The migration is the
reconciliation; it was deferred for operational safety, not for lack of code.

### Future Impact

If the migration never runs, the `blocks` field remains unreliable for any
ticket not touched post-MDT-189. Downstream consumers (UI badges, future MCP
`list_unblocked`) will display stale blocking relationships. The
derived-field contract is half-enforced.

## 2. Solution Analysis

### Proposed Solution

Run `bun scripts/migrate-blocks.ts --write` from a clean worktree (no
concurrent agents), review the data diff interactively, decide each
contradiction per the script's y/N prompt, commit the data change as its own
commit.

### Refactoring Strategy

None — this is data reconciliation, not code change. The script exists and is
tested; only its real-world execution remains.

## 3. Implementation Specification

### Technical Requirements

1. **Pre-flight:** confirm no concurrent agents are editing `docs/CRs/`.
   Coordinate or wait for a quiet session.
2. **Branch hygiene:** the migration commit must be the only change in its
   commit. Stage only `docs/CRs/*.md` files; verify with
   `git diff --cached --name-status` before committing.
3. **Run:** `bun scripts/migrate-blocks.ts --write` (interactive) — answer the
   contradiction prompt per the decision in
   `docs/CRs/MDT-189/blocks-migration-report.md`. Default per the script: keep
   `dependsOn`, drop contradictory `blocks`.
4. **Review the diff.** Sanity-check a sample of the rewritten files.
5. **Commit** with title `chore(MDT-194): migrate blocks to derived inverse of dependsOn`.
6. **Verify invariant:** re-run `bun scripts/migrate-blocks.ts` (dry-run) —
   expect "Files changed: 0" and "Invariant verified: 100% of N tickets".
7. **Update the report:** append a "Real write completed YYYY-MM-DD" section
   to `docs/CRs/MDT-189/blocks-migration-report.md` referencing this ticket
   and the commit hash.

### Breaking Changes

None to code. Frontmatter on every ticket with stale `blocks` changes — that's
the point.

### Testing Strategy

- The migration script already has fixture tests (TEST-migration-* in MDT-189).
- The real-run invariant check (step 6) is the acceptance test.
- No new unit tests needed.

## 4. Acceptance Criteria

- [ ] Migration ran from a clean session (no concurrent agent edits to
  `docs/CRs/` during the run).
- [ ] All contradictions (`MDT-082 ↔ MDT-071` and any others surfaced by the
  script) resolved with an explicit y/N decision; default = keep `dependsOn`.
- [ ] Single commit contains only `docs/CRs/*.md` frontmatter changes; no
  unrelated files swept in.
- [ ] Post-migration dry-run reports "Files changed: 0" and
  "Invariant verified: 100% of N tickets".
- [ ] `docs/CRs/MDT-189/blocks-migration-report.md` updated with a "Real write
  completed" section naming this ticket and the commit hash.

## 5. Implementation Notes

*To be filled during/after the real run.*

## 6. References

- **Split from:** [MDT-189](MDT-189-dep-graph-foundation.md) — TASK-migrate-real
- **Epic:** [MDT-188](MDT-188-dependency-graph-epic.md)
- **Migration script:** `scripts/migrate-blocks.ts`
- **Dry-run report (the audit artifact to review before running):** [MDT-189/blocks-migration-report.md](MDT-189/blocks-migration-report.md)
- **Original spec for the migration:** MDT-189 architecture.md §3.2, bdd.md S11–S13
