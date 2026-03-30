# UAT Refinement Brief

**Ticket**: MDT-143
**Round**: 2026-03-30

## Objective

Apply post-implementation UX refinements to the CLI based on operator feedback: improved output formatting, list command filtering/paging, generated help guide, and element-level color scheme.

## Approved Changes

1. **Attr output format** — pipe-separated old→new values; no-op exits 0 with `unchanged` message
2. **Color scheme specificity** — ticket title white, ticket key light-blue, project code dark cyan, project ID gray, project description normal, file paths gray
3. **`project ls` output format** — `CODE (id) Title\n  description\n  path` with per-element colors
4. **`ticket list` default limit** — 10 tickets newest-first, `--all` and `--limit N` flags
5. **`ticket list` filters** — positional `key=value` args, AND across fields, comma+fuzzy within field
6. **`ticket list` output modes** — `--files` (file paths only), `--info` (info without paths)
7. **`ticket ls` alias** — `mdt-cli ticket ls` as consistency alias for `mdt-cli ticket list`
8. **`--guide` flag** — global and per-namespace, generated from commander tree

## Changed Requirement IDs

| ID | Action | Summary |
|----|--------|---------|
| BR-4 | refine_in_place | Added default limit, filters, output modes, ticket ls alias |
| BR-5 | refine_in_place | Added per-element output format and color spec |
| BR-10 | refine_in_place | Added pipe-separated old→new format and no-op exit 0 |
| BR-11 | refine_in_place | Added per-element color assignments (title, key, code, id, path) |
| BR-18 | additive_change | NEW — positional list filter behavior |
| BR-19 | additive_change | NEW — --guide flag behavior |

## Affected Downstream Trace

| Stage | Impact |
|-------|--------|
| requirements | 4 refined, 2 added |
| bdd | 4 scenarios refined, 2 scenarios added |
| architecture | 2 obligations added, 1 artifact added (ART-cli-guide) |
| tests | 4 test plans added |
| tasks | 4 tasks added, 2 tasks updated |

## Execution Slices

### Slice 1: Output refinements (color + attr format)

- **Objective**: Apply element-level color scheme and attr pipe-separated output format
- **Direct artifacts**: `cli/src/output/formatter.ts`, `cli/src/output/colors.ts`, `cli/src/commands/attr.ts`
- **Direct GREEN targets**: `update_ticket_attributes_in_one_command`, `render_colored_relative_ticket_output`, `TEST-cli-attr-output`, `TEST-cli-color-scheme`
- **Impacted task**: TASK-cli-output-refinements

### Slice 2: List enhancements (filters + paging + modes)

- **Objective**: Add positional filters, default 10-ticket limit, --all/--limit, --files/--info, ticket ls alias
- **Direct artifacts**: `cli/src/commands/list.ts`, `cli/src/output/formatter.ts`
- **Direct GREEN targets**: `list_tickets_in_detected_project`, `filter_ticket_list_by_multiple_criteria`, `TEST-cli-ticket-list-enhancements`
- **Impacted task**: TASK-cli-list-enhancements

### Slice 3: --guide flag

- **Objective**: Add global and per-namespace --guide that generates command manual from commander tree
- **Direct artifacts**: `cli/src/output/guide.ts`, `cli/src/index.ts`
- **Direct GREEN targets**: `show_generated_command_guide`, `TEST-cli-guide`
- **Impacted task**: TASK-cli-guide

### Slice 4: E2E coverage for refinements

- **Objective**: Add E2E suites covering all refinement scenarios
- **Direct artifacts**: `cli/tests/e2e/`
- **Direct GREEN targets**: `TEST-cli-ticket-list-enhancements`, `TEST-cli-guide`, `TEST-cli-attr-output`, `TEST-cli-color-scheme`
- **Impacted task**: TASK-cli-e2e-refinements

## Validation

All five spec-trace stages validated and rendered:
- requirements: passed
- bdd: passed
- architecture: passed
- tests: passed
- tasks: passed

## Watchlist

- Filter fuzzy matching implementation — ensure `status=impl` matches `Implemented` (case-insensitive substring)
- `ticket ls` alias registration — must not collide with commander's existing `ls` handling
- `--guide` generation — must reflect all registered commands including dynamically added ones
- Default sort by dateModified — confirm TicketService returns modification timestamps

## Open Decisions

None — all design decisions resolved in conversation.
