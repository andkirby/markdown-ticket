# UAT Refinement Brief

**Ticket**: MDT-143
**Round**: 2026-04-05 (r2)

## Objective

Add `--project|-p` to `ticket list` so operators can list tickets from any registered project without changing directories. Same explicit-only pattern as `ticket create --project`.

## Approved Changes

1. **`ticket list --project <code>`** — when provided, list tickets from the specified project instead of cwd-detected project. Unknown project code prints "Project `<code>` not found" and exits 1. Without `--project`, behavior is unchanged (cwd detection).

## Changed Requirement IDs

| ID | Action | Summary |
|----|--------|---------|
| BR-4 | refine_in_place | Add `--project` flag semantics to ticket list |
| Edge-8 | additive_change | New: reject unknown project on `ticket list --project` |

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | BR-4 refined, Edge-8 added |
| bdd | 2 new scenarios: `list_tickets_in_target_project`, `list_tickets_rejects_unknown_project` |
| architecture | No changes needed |
| tests | `TEST-cli-list-enhancements` extended |
| tasks | `TASK-cli-list-enhancements` updated |

## Execution Slices

### Slice 1: Wire --project on ticket list

- **Objective**: Add `-p, --project <code>` option to `ticket list` command
- **Direct artifacts**: `cli/src/index.ts`, `cli/src/commands/list.ts`
- **Direct GREEN targets**: `list_tickets_in_target_project`, `list_tickets_rejects_unknown_project`, `TEST-cli-list-enhancements`
- **Impacted task**: TASK-cli-list-enhancements

## Validation

- requirements: passed (strict, relocked)
- bdd: passed (strict)
- architecture: passed (strict)
- tests: passed (strict)
- tasks: passed (1 pre-existing unowned artifact — not from this change)

## Watchlist

None.

## Open Decisions

None.
