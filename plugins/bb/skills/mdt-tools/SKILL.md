---
name: mdt-tools
description: Use native mdt_* and spec_trace_* tools for MDT projects, tickets and traceability. Load for tool selection, project context, content, trace ordering, errors and limits. Cloud management stays CLI-only.
---

# MDT native tools

Use the registered tools for supported project, ticket and trace operations. Their descriptions and schemas are the per-call contract; load this skill for procedure. Cloud commands remain CLI-only through `mdt-cli cloud ...`. There is no generic CLI tool.

## Choose context

- Workspace detection is the default. Use `mdt_project_current` when you need the current code; use `mdt_project_list` only for registry discovery.
- Ticket get/list/create/attr/deps accept optional `project` for an intentional cross-project operation.
- `mdt_ticket_delete` is current-project only, without `project`. `mdt_ticket_rename` accepts qualified keys and returns text; it changes title/file slug, not ticket identity.
- `mdt_project_get {"code":"MDT"}` covers CLI get/info aliases. `mdt_project_init` needs `code`, `name`, optional `dir` and `ticketsPath`; the target directory must already exist. It registers the project.
- BB executes on the server host at the thread workspace; remote-host environments fail before spawn. spec-trace optional `workdir` resolves relative to that guarded workspace.

## Ticket operations

```text
mdt_ticket_list {"filters":["status=In Progress"],"limit":10,"offset":0}
mdt_ticket_get {"key":"MDT-262"}
mdt_ticket_create {"title":"Fix login validation","type":"Bug/high","content":"## Problem\nDescribe the issue.\n"}
mdt_ticket_attr {"key":"MDT-262","attrs":["priority=High"]}
mdt_ticket_deps {"key":"MDT-262","check":true}
mdt_ticket_rename {"key":"LAB-001","title":"Clearer ticket title","slug":"clearer-ticket-title"}
mdt_ticket_delete {"key":"LAB-001","force":true}
```

Create `content` is Markdown sent separately to stdin; it is optional. Get/list JSON contains ticket metadata and paths, not the full body. List supports `all`, `limit`, `offset`, `files`, `info` and field=value filters. Other MDT commands return JSON; rename returns CLI text. Delete only when removal is authorized; `force` skips the CLI prompt and native processes are noninteractive.

## Trace operations

1. `spec_trace_init {"ticket":"MDT-262"}` before upsert.
2. `spec_trace_upsert` and `spec_trace_list` take an `entity`: requirement, scenario, artifact, obligation, test-plan or task.
3. `spec_trace_lock_requirements` snapshots approved requirements for strict validation.
4. `spec_trace_validate {"ticket":"MDT-262","stage":"all","strict":true}` returns JSON; `strict` requires the lock.
5. `spec_trace_render {"ticket":"MDT-262","stage":"all"}` writes trace projections; optional `noCrossLinks` suppresses derived links.
6. `spec_trace_bundle {"ticket":"MDT-262","taskId":"TASK-1","format":"json","profile":"executor"}` returns a focused task packet. Format is md/json; profile executor/audit; optional `out` writes a file.
7. `spec_trace_delete` takes entity/ticket/id, optional `dryRun`, and uses idempotent if-exists semantics. Delete dependent records first; do not bypass inbound-reference checks.

```text
spec_trace_upsert {"entity":"requirement","ticket":"MDT-262","id":"BR-1.1","flags":{"kind":"behavior","route":"bdd","text":"WHEN saved, the ticket shall be readable.","tags":["native-tools"]}}
spec_trace_upsert {"entity":"task","ticket":"MDT-262","id":"TASK-1","flags":{"title":"Implement behavior","owns":["ART-1"],"makesGreen":["TEST-1"],"skills":["mdt-tools"]}}
```

Flags use camelCase (`sourceRef`, `derivedFrom`, `makesGreen`); arrays become comma-separated CLI values. Requirements use kind/route/text/tags; scenarios title/covers/given/when/then; artifacts path/kind; obligations title/derivedFrom/artifacts; test-plan kind/title/covers/file; tasks title/owns/makesGreen/skills. All support sourceRef.

Serialize writes for one ticket. Sync and validate requirements → bdd → architecture → tests → tasks. Stages also accept all. Preserve IDs and approved semantics; do not remap or reroute requirements to silence validation. Fragment migration stubs have no native tools.

## Errors and boundaries

Nonzero CLI exits become tool errors; read diagnostics and fix input/context before retrying. Failed spec-trace validation retains stdout JSON issues and remediation guidance with the stderr summary. BB limits combined output to 256 KiB, with explicit overflow failure; narrow lists instead of assuming truncated results. Cancellation/timeouts terminate subprocesses. The literal value `--guide` is rejected because the MDT CLI intercepts it before normal argument parsing.

Ticket/ADR/UAT/pipeline procedure belongs to the separate `mdt` workflow skills. Tool availability does not authorize ticket closure. Full capability and verification inventory is maintained in the source repository at `plugins/docs/coverage.md`; setup/examples at `plugins/docs/usage.md`.
