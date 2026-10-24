---
name: mdt-tools
description: Use the mdt_* native tools for MDT ticket and project operations instead of shelling out to mdt-cli.
---

# MDT tools (bb plugin)

Native model tools over `mdt-cli`. Seven tools: `mdt_ticket_get`,
`mdt_ticket_list`, `mdt_ticket_create`, `mdt_ticket_attr`, `mdt_ticket_deps`,
`mdt_project_current`, `mdt_project_list` — all return the CLI's JSON output.

## Conventions

- The project resolves from the thread's workspace; omit `project` unless
  targeting a different project (`-p`).
- Run `mdt_project_current` first when you need the session project code to
  anchor keys.
- Non-zero CLI exits surface as tool errors with the CLI's structured JSON
  error message; fix the input rather than retrying.
- Output is capped at 256 KiB — narrow `mdt_ticket_list` with filters.
- These tools run mdt-cli on the bb server host at the thread workspace;
  they do not work for workspaces on remote (enrolled) hosts.

## Not covered here

spec-trace tools are not registered by this plugin yet. Ticket/ADR workflow
knowledge lives in the `mdt` skill, not in these tools.
