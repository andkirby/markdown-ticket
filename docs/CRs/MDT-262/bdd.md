# Acceptance Scenarios: MDT-262

Canonical Given/When/Then records live in [bdd.trace.md](bdd.trace.md). Executable acceptance uses Bun through the registered BB tools and real CLI binaries in a temporary project and isolated CONFIG_DIR.

## Journeys

1. Project setup: initialize a temporary project, discover current project, look up its code (including info alias semantics) and list registered projects.
2. Ticket lifecycle: create with Markdown content, get, filter/paginate, change attributes, check dependencies, rename title/slug and delete in the current project.
3. Trace lifecycle: initialize, upsert/list trace entities, dry-run/delete a record, lock requirements, validate, render and build a task bundle.
4. Tool discovery: inspect descriptions/schemas, load the shipped mdt-tools skill and select a concrete example; compare coverage against CLI-only cloud commands.

DSH registered adapter tests protect table parity. Fresh-host DSH tool calls are a separately scheduled operator check, not evidence implied by these journeys.
