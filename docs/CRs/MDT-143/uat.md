# UAT Refinement Brief

**Ticket**: MDT-143
**Round**: 2026-03-31

## Objective

Add subdocument listing to ticket detail view: show 1st-level files and directories in the ticket's CR directory (e.g., `MDT-012/`), excluding the main ticket `.md` file itself. Nested directories are listed by name only — no recursion.

## Approved Changes

1. **Ticket view subdocument listing** — when displaying a ticket via `mdt-cli ticket get`, show the contents of the ticket's CR directory (1st level only) below the path line. Exclude the main ticket `.md` file. Directories are listed by name only (no recursion into subdirectories).

Example:
```text
MDT-012 Add CLI access to tickets and projects
─────────────────────────────────────────────
  status:    [In Progress]
  type:      [Feature Enhancement]
  priority:  [High]
  phase:     Phase B (Enhancement)
─────────────────────────────────────────────
  path: docs/CRs/MDT-012-add-cli-access.md
  docs/CRs/MDT-012/
    bdd.md
    sub-folder/
    anotherfile.md
```

- Section header shows the ticket directory path (trailing `/`)
- Entries are indented under the directory path
- Files and directories appear as plain names (no color, no `./` prefix)
- Directories distinguished by trailing `/`
- If no subdocuments exist, section is omitted entirely
- Tickets without a directory (e.g., flat `.md` in `docs/CRs/`) show no subdocument section

## Changed Requirement IDs

| ID | Action | Summary |
|----|--------|---------|
| BR-1 | refine_in_place | Add subdocument listing to ticket detail output |

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | BR-1 refined |
| architecture | view mockup updated |
| tests | TEST-cli-ticket-read coverage expanded |

## Execution Slices

### Slice 1: Subdocument listing in ticket view

- **Objective**: List 1st-level directory contents in ticket detail output
- **Direct artifacts**: `cli/src/output/formatter.ts`, `cli/src/commands/view.ts`
- **Direct GREEN targets**: `render_colored_relative_ticket_output`, `TEST-cli-ticket-read`
- **Impacted task**: TASK-cli-ticket-read

## Validation

- requirements: passed
- bdd: passed
- architecture: passed
- tests: passed
- tasks: passed

## Watchlist

- Directory derivation from `ticket.filePath` — must handle both flat tickets (no directory) and directory-organized tickets
- File system reads — must be non-blocking and handle missing directories gracefully
- Trace files (`*.trace.md`) — should they be excluded? (decision: no, show all 1st-level entries)

## Open Decisions

None.
