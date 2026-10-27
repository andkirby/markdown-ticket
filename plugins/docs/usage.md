# Setup and native tool usage

See the [coverage matrix](coverage.md) for the full command inventory and current verification status.

## How agents learn the tools

Agents receive each registered tool's name, description and typed parameter schema from the host. They do not need to infer a CLI command line. For procedural guidance, BB discovers `bb/skills/mdt-tools/SKILL.md` through the plugin's default `skills/` directory: its name/description appear in the session skill catalog, and the agent loads the file on demand. A user can request `$mdt-tools` or ask the agent to use the MDT native tools.

The shipped skill explains project selection, content, trace ordering, examples, errors and exclusions. The separate `mdt` workflow skills own UAT, requirements, architecture, implementation and closure; tool availability does not replace those procedures. DSH supplies the registered descriptions/schemas; its preset or agent instructions should load the same usage guidance explicitly, because BB skill discovery does not run inside DSH.

BB resolves the catalog when constructing a provider session. Reloading a plugin does not hot-add tools to a running session; use a fresh thread/session to verify new tools. A busy environment may retain its staged skill catalog until safe relaunch.

## BB setup

Install `mdt-cli` and `spec-trace` on the BB server host, then from the repository root:

```sh
bb plugin build plugins/bb
bb plugin install ./plugins/bb --yes
```

For an existing path installation after changes:

```sh
bb plugin reload mdt
```

Binary lookup happens at call time:

| Binary | Precedence |
|---|---|
| mdt-cli | `MDT_CLI_BIN` → plugin `cliPath` setting → server PATH |
| spec-trace | `SPEC_TRACE_BIN` → plugin `specTracePath` setting → server PATH |

Use Settings → Installed plugins → MDT or `bb plugin config` when the app's launch PATH differs from your terminal. Settings must point to executable files on the server host. Example (replace with real absolute paths):

```sh
bb plugin config mdt set cliPath /absolute/path/to/mdt-cli
bb plugin config mdt set specTracePath /absolute/path/to/spec-trace
```

The subprocess inherits a PATH augmented with standard Bun/local/Homebrew directories. BB resolves the calling thread's environment before spawning. Remote-host workspaces fail with an explicit message; run the CLI inside that environment instead. With no thread environment, only the project's default local-path source is eligible.

## Ticket examples

Examples show tool names and JSON arguments, not shell commands:

```text
mdt_project_current {}
mdt_ticket_list {"filters":["status=In Progress"],"limit":10,"offset":0}
mdt_ticket_get {"key":"MDT-262"}
mdt_ticket_create {"title":"Fix login validation","type":"Bug/high","content":"## Problem\nDescribe the issue.\n"}
mdt_ticket_attr {"key":"MDT-262","attrs":["priority=High"]}
mdt_ticket_deps {"key":"MDT-262","check":true}
```

Omit `project` for the workspace project; pass it to the ticket tools that advertise it when deliberately targeting another registered project. `mdt_project_get {"code":"MDT"}` covers CLI `project get` and `project info`. `mdt_project_list` is for registry discovery, not a mandatory opening ritual.

Initialize only an existing target directory:

```text
mdt_project_init {"code":"LAB","name":"Tool sandbox","dir":"/existing/path/to/sandbox","ticketsPath":"tickets"}
```

Title/file-slug rename returns text:

```text
mdt_ticket_rename {"key":"LAB-001","title":"Clearer ticket title","slug":"clearer-ticket-title"}
```

Deletion operates in the calling workspace project and does not accept `project`. Invoke it only for a ticket whose removal the user authorized:

```text
mdt_ticket_delete {"key":"LAB-001","force":true}
```

`force` suppresses the CLI prompt; native processes have no interactive stdin. Get/list structured output contains metadata/paths; do not assume ticket body text is embedded in the JSON. Create's optional `content` passes Markdown as stdin data.

## External references

`mdt_ticket_attr` uses the same reference operations as the CLI:

```text
mdt_ticket_attr {"key":"MDT-252","attrs":["refs=work:PRJ-123,gh:acme/widgets#42"]}
mdt_ticket_attr {"key":"MDT-252","attrs":["refs+=gh:acme/widgets#43"]}
mdt_ticket_attr {"key":"MDT-252","attrs":["refs-=gh:acme/widgets#42"]}
mdt_ticket_attr {"key":"MDT-252","attrs":["refs="]}
```

`=` replaces, `+=` adds absent identities, `-=` removes exact stored strings, and `refs=` clears. Use a JSON string array operand for identifiers containing commas. Get/list JSON includes stored `refs`; unrelated edits preserve unknown refs and order. Add/replacement shorthand such as `gh:#43` requires that configured instance's `defaultRepo`; existing stored shorthand never rebinds on reads.

`mdt_ticket_create` follows the CLI create contract: create the ticket, then attach refs with `mdt_ticket_attr` using the returned key. It has no dedicated `refs` parameter. Configure tracker instances in the project's `.mdt-config.toml`; tracker configuration is file-only. BB and DSH share this tool contract.

## Trace examples

```text
spec_trace_init {"ticket":"LAB-001"}
spec_trace_upsert {"entity":"requirement","ticket":"LAB-001","id":"BR-1.1","flags":{"kind":"behavior","route":"bdd","text":"WHEN saved, the ticket shall be readable."}}
spec_trace_list {"entity":"requirement","ticket":"LAB-001"}
spec_trace_lock_requirements {"ticket":"LAB-001"}
spec_trace_validate {"ticket":"LAB-001","stage":"requirements","strict":true}
spec_trace_render {"ticket":"LAB-001","stage":"requirements","noCrossLinks":true}
spec_trace_delete {"entity":"task","ticket":"LAB-001","id":"TASK-old","dryRun":true}
spec_trace_bundle {"ticket":"LAB-001","taskId":"TASK-1","format":"json","profile":"executor"}
```

Pass `workdir` only when targeting another project: in BB, relative paths resolve from the guarded thread workspace. DSH forwards its explicit workdir to its shell service; see its host docs. `render` writes stage projections; `bundle` returns stdout unless `out` requests a file.

| Entity | Upsert flag keys |
|---|---|
| requirement | `kind`, `route`, `text`, `sourceRef`, `tags` |
| scenario | `title`, `covers`, `given`, `when`, `then`, `sourceRef` |
| artifact | `path`, `kind`, `sourceRef` |
| obligation | `title`, `derivedFrom`, `artifacts`, `sourceRef` |
| test-plan | `kind`, `title`, `covers`, `file`, `sourceRef` |
| task | `title`, `owns`, `makesGreen`, `skills`, `sourceRef` |

Use arrays for multi-ID/list flags. Serialize writes to the same ticket; validate and render in requirements → bdd → architecture → tests → tasks order. Lock only the approved requirements set; strict checks compare against that baseline. `delete` is non-cascading and rejects referenced records.

## Errors and limits

CLI failures become tool errors. Preserve and read the CLI diagnostic; correct input or context before retrying. Failed spec-trace validation includes its JSON issues/remediation from stdout alongside the stderr summary. Missing binary errors name the environment variable/setting to configure. BB enforces a 256 KiB combined stdout/stderr limit, cancellation, and timeouts (MDT: 30 seconds; spec-trace: 60 seconds); overflow fails explicitly. Narrow growing lists with filters/limit/offset rather than accepting truncated JSON. The exact value `--guide` is rejected as user data because the CLI handles it before normal option parsing.

Cloud management stays CLI-only (`mdt-cli cloud ...`). Native ticket operations still follow the CLI's configured project behavior.
