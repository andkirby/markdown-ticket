# BDD: MDT-143

**Source**: [MDT-143](../MDT-143-cli-entrypoint-alternative-to-mcp.md)
**Generated**: 2026-03-23

## Overview

BDD for this ticket is organized around six CLI journeys: ticket retrieval, project inspection, project bootstrap, ticket mutation, list filtering, and command guide. The scenario set stays within the normal-mode budget by covering the canonical `commander` command tree while still locking the retained shortcut behaviors where they are operator-visible.

## Acceptance Strategy

| Journey | Scenarios | Covered Requirements |
|---------|-----------|----------------------|
| Ticket retrieval | `view_ticket_from_detected_project`, `view_ticket_across_projects`, `list_tickets_in_detected_project` | BR-1, BR-2, BR-3, BR-4 |
| Project commands | `show_current_project_details`, `list_projects_via_project_namespace`, `resolve_project_token_without_subcommand_collision` | BR-5, BR-14, BR-15, BR-17 |
| Project bootstrap and ticket creation | `initialize_project_in_current_folder`, `create_ticket_from_slug_with_order_independent_tokens`, `create_ticket_from_piped_input` | BR-6, BR-7, BR-8, BR-9, BR-16 |
| Ticket mutation and formatting | `update_ticket_attributes_in_one_command`, `render_colored_relative_ticket_output`, `render_absolute_ticket_path_when_configured` | BR-10, BR-11, BR-12, BR-13 |
| List filtering and paging | `filter_ticket_list_by_multiple_criteria` | BR-18 |
| Command guide | `show_generated_command_guide` | BR-19 |

## E2E Framework

- **Framework**: repo-native CLI E2E in `cli/tests/e2e/`
- **Test library**: `@mdt/shared/test-lib` for isolated temp projects and process helpers
- **Command**: `bun test cli/tests/e2e`
- **Binary**: built `mdt-cli` invoked as real child process

MDT-143 introduces a terminal-first CLI surface. CLI acceptance tests run as real-process E2E against the built binary, using `@mdt/shared/test-lib` for project fixtures and process helpers. Browser Playwright remains for web UI behavior only.

## Test-Facing Contract Notes

- Ticket detail output is acceptance-visible as labeled fields, not as a raw JSON dump.
- The canonical command tree is `ticket get|list|create|attr` and `project current|get|info|ls|list|init`, with shortcut coverage retained only for `mdt-cli 12`, `mdt-cli t 12`, `mdt-cli project`, `mdt-cli project <code>`, `mdt-cli create`, and `mdt-cli attr`.
- `mdt-cli ticket ls` is an alias for `mdt-cli ticket list`, providing consistency with the top-level `ls` shortcut.
- Exact lowercase `ls` and `list` remain reserved project-list aliases, while `LS` remains available for project-code lookup collisions.
- Ticket and project read paths are expected to stand on the shared entity-service surface; project-init stays a separate bootstrap path.
- Attribute mutation is acceptance-visible through canonical `mdt-cli ticket attr <ticket> <attr-op><value>...`, with `mdt-cli attr <ticket> <attr-op><value>...` retained as the shortcut alias; ticket-key-prefixed write shortcuts are out of scope for this ticket.
- Attribute confirmation uses pipe-separated format: `Updated MDT-143 | status: In Progress → Implemented`. No-op (value unchanged) prints an unchanged message and exits 0.
- Relation attributes must cover all three operator paths: `=` replace, `+=` append with dedupe, and `-=` remove.
- Ticket list defaults to 10 tickets sorted newest-first. `--all` shows every ticket, `--limit N` overrides the default.
- Ticket list supports positional filter arguments in `key=value` format: AND across fields, comma-separated fuzzy matching within a field. Filterable fields: status, priority, type, assignee, epic.
- Ticket list output modes: `--files` (paths only), `--info` (info without paths).
- `project init` is expected to materialize project configuration in the current folder, not just print a template to stdout.
- STDIN creation is a no-template path: generated frontmatter plus generated H1, followed by the literal piped body content.
- `--guide` at global scope prints a full command manual; at per-namespace scope (e.g., `ticket --guide`) prints that namespace's commands only. Content is generated from the commander tree.
- Per-element color scheme: ticket title white bold, ticket key light-cyan bold, project code dark cyan bold, project description normal, file paths gray.
- Ticket detail view shows 1st-level subdocuments from the ticket's CR directory (e.g., `docs/CRs/MDT-012/`), excluding the main ticket `.md` file. Directories are shown with trailing `/`; nested contents are not expanded. Omitted when no subdocuments exist.

## Execution Notes

- Original scenario coverage is canonical in `spec-trace`; all scenarios have been translated into CLI E2E suites in `cli/tests/e2e/` and are GREEN.
- UAT session 2026-03-30 added two new scenarios (`filter_ticket_list_by_multiple_criteria`, `show_generated_command_guide`) and refined four existing scenarios. Four new E2E suites are planned in tasks 8-11.
- CLI E2E runs real-process tests using `@mdt/shared/test-lib` for isolated project fixtures and process helpers.

---
*Canonical scenario projection: [bdd.trace.md](./bdd.trace.md)*
*Rendered by /mdt:bdd via spec-trace*
