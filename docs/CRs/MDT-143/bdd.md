# BDD: MDT-143

**Source**: [MDT-143](../MDT-143-cli-entrypoint-alternative-to-mcp.md)
**Generated**: 2026-03-23

## Overview

BDD for this ticket is organized around four CLI journeys: ticket retrieval, project inspection, project bootstrap, and ticket mutation or formatting. The scenario set stays within the normal-mode budget by covering the canonical `commander` command tree while still locking the retained shortcut behaviors where they are operator-visible.

## Acceptance Strategy

| Journey | Scenarios | Covered Requirements |
|---------|-----------|----------------------|
| Ticket retrieval | `view_ticket_from_detected_project`, `view_ticket_across_projects`, `list_tickets_in_detected_project` | BR-1, BR-2, BR-3, BR-4 |
| Project commands | `show_current_project_details`, `list_projects_via_project_namespace`, `resolve_project_token_without_subcommand_collision` | BR-5, BR-14, BR-15, BR-17 |
| Project bootstrap and ticket creation | `initialize_project_in_current_folder`, `create_ticket_from_slug_with_order_independent_tokens`, `create_ticket_from_piped_input` | BR-6, BR-7, BR-8, BR-9, BR-16 |
| Ticket mutation and formatting | `update_ticket_attributes_in_one_command`, `render_colored_relative_ticket_output`, `render_absolute_ticket_path_when_configured` | BR-10, BR-11, BR-12, BR-13 |

## E2E Framework

- **Framework detected**: Playwright
- **Directory**: `tests/e2e/`
- **Command**: `bun run test:e2e`
- **Current stance**: spec-only for this stage

Playwright exists for browser E2E in this repository, but MDT-143 introduces a terminal-first CLI surface rather than a browser flow. This stage keeps canonical BDD scenarios in `spec-trace` and defers executable CLI acceptance-harness decisions to `/mdt:architecture` and `/mdt:tests` instead of inventing an ad hoc runner here.

## Test-Facing Contract Notes

- Ticket detail output is acceptance-visible as labeled fields, not as a raw JSON dump.
- The canonical command tree is `ticket get|list|create`, `project current|get|info|ls|list|init`, and top-level `attr`, with shortcut coverage retained only for `mdt-cli 12`, `mdt-cli t 12`, `mdt-cli project`, `mdt-cli project <code>`, and `mdt-cli create`.
- Exact lowercase `ls` and `list` remain reserved project-list aliases, while `LS` remains available for project-code lookup collisions.
- Attribute mutation is acceptance-visible only through `mdt-cli attr <ticket> <attr-op><value>...`; ticket-key-prefixed write shortcuts are out of scope for this ticket.
- Relation attributes must cover all three operator paths: `=` replace, `+=` append with dedupe, and `-=` remove.
- `project init` is expected to materialize project configuration in the current folder, not just print a template to stdout.
- STDIN creation is a no-template path: generated frontmatter plus generated H1, followed by the literal piped body content.

## Execution Notes

- Current scenario coverage is canonical in `spec-trace`; no executable CLI suite was added in this stage.
- `/mdt:architecture` has now chosen a spawned-process integration harness inside `cli/tests/integration/` for CLI acceptance rather than the browser Playwright suite.
- `/mdt:tests` should translate these journeys into concrete failing suites once the CLI package layout and invocation contract are finalized.

---
*Canonical scenario projection: [bdd.trace.md](./bdd.trace.md)*
*Rendered by /mdt:bdd via spec-trace*
