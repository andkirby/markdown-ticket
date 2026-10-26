# Native tool coverage

Scope: ticket/project authoring operations and operational spec-trace commands. `ticket validate --staged` is a local Git-commit utility and intentionally CLI-only. CLI aliases reuse the same native operation. Help, version and presentation-format switches are CLI utilities rather than separate tools. Tool definitions are maintained in [`../_lib/`](../_lib/mdt-tools.js).

## MDT commands

BB and DSH share these 11 tool definitions. Native output is CLI JSON except ticket rename, which returns CLI text.

| CLI command | Native tool (BB and DSH) | Parameters / coverage |
|---|---|---|
| `ticket get` | `mdt_ticket_get` | `key`, optional `project` |
| `ticket list`, `ticket ls` | `mdt_ticket_list` | `filters`, `project`, `all`, `limit`, `offset`, `files`, `info` |
| `ticket create` | `mdt_ticket_create` | `title`, optional `type`, `slug`, `project`, `content`; content goes to stdin |
| `ticket attr` | `mdt_ticket_attr` | `key`, `attrs` as field=value tokens, optional `project` |
| `ticket deps` | `mdt_ticket_deps` | `key`, optional `check`, `project` |
| `ticket delete` | `mdt_ticket_delete` | `key`, optional `force`; **current project only**, no project override |
| `ticket rename` | `mdt_ticket_rename` | `key`, `title`, optional `slug`; title/file-slug rename, text output; qualified keys supported |
| `project`, `project current` | `mdt_project_current` | Current workspace project |
| `project ls`, `project list` | `mdt_project_list` | Registered projects |
| `project get`, `project info` | `mdt_project_get` | `code`; both CLI spellings have identical semantics |
| `project init` | `mdt_project_init` | `code`, `name`, optional `dir`, `ticketsPath`; target directory must already exist |

Native operations choose JSON where supported. CLI `--yaml`, human colors, `--no-color`, shortcuts and `--guide` remain CLI presentation/discovery conveniences. `--stdin` is represented by the create tool's `content` parameter. Ticket rename does not rename a ticket key; key-renaming workflow is outside the CLI rename command.

## spec-trace commands

BB and DSH share these 8 definitions. Every tool accepts optional `workdir`; BB defaults to the validated thread workspace and resolves relative overrides from it.

| CLI command | Native tool | Parameters / coverage |
|---|---|---|
| `init` | `spec_trace_init` | `ticket` |
| `<entity> upsert` | `spec_trace_upsert` | `entity`, `ticket`, `id`, structured `flags`; six entity kinds below |
| `<entity> list` | `spec_trace_list` | `entity`, `ticket` |
| `delete <entity>` | `spec_trace_delete` | `entity`, `ticket`, `id`, optional `dryRun`; idempotent `--if-exists`, JSON result |
| `lock requirements` | `spec_trace_lock_requirements` | `ticket`; snapshots approved requirements for strict drift checks |
| `validate` | `spec_trace_validate` | `ticket`, `stage`, optional `strict`; JSON result |
| `render` | `spec_trace_render` | `ticket`, `stage`, optional `noCrossLinks`; writes trace projections |
| `bundle task` | `spec_trace_bundle` | `ticket`, `taskId`, optional `format`, `profile`, `out` |

Entities: `requirement`, `scenario`, `artifact`, `obligation`, `test-plan`, `task`. Stages: `requirements`, `bdd`, `architecture`, `tests`, `tasks`, `all`. Bundle format: `md` or `json`; profile: `executor` or `audit`. Flags use camelCase keys (`sourceRef`, `derivedFrom`, `makesGreen`); array values become comma-separated CLI lists. Supported per-entity fields are in the tool description/schema and [usage guide](usage.md).

`fragment get` / `fragment upsert` are migration-guidance stubs in the CLI, so have no native wrapper. Help/version also stay CLI utilities. Run writes for one ticket serially; deletion honors the CLI's inbound-reference checks.

## Cloud commands: intentionally CLI-only

Neither host registers cloud tools. No generic command execution tool bypasses this boundary. This controls the native management surface; normal ticket commands still follow any cloud coordination configured by the CLI.

| CLI command | Native coverage |
|---|---|
| `cloud enable` | CLI-only |
| `cloud login` | CLI-only |
| `cloud connect` | CLI-only |
| `cloud status` | CLI-only |
| `cloud doctor` | CLI-only |
| `cloud members list` | CLI-only |
| `cloud members add` | CLI-only |
| `cloud members remove` | CLI-only |
| `cloud credentials install` | CLI-only |
| `cloud credentials status` | CLI-only |
| `cloud credentials remove` | CLI-only |
| `cloud disable` | CLI-only |
| `cloud migrate-legacy` | CLI-only |

## Verification status

Current UAT round: 2026-10-26, MDT-262. Availability of a definition is separate from evidence that a host executed it.

| Lane | Status | Evidence / next step |
|---|---|---|
| Shared contract coverage | Passed | Exact 11 + 8 tool set, argv/options, schema and sync tests; 107 plugin tests pass across 7 files |
| BB registered real-CLI acceptance | Passed | All 19 operations, temporary project + isolated CONFIG_DIR; project/ticket lifecycle, all six trace entities, dry-run nonmutation and failed-validation remediation |
| BB build, typecheck and targeted lint | Passed | All commands below exit 0 |
| Installed BB fresh-session discovery | Passed | All 19 schemas discovered, installed mdt-tools skill loaded on demand; five read-only native calls passed (current/get project, get ticket, list requirements, strict all-stage validation). Remaining 14 catalog-inspected only; mutations covered by isolated acceptance. |
| DSH offline adapters | Passed | Registration/schema parity, quoting, stdin, sandbox/workdir and structured failure diagnostics |
| DSH fresh-host live execution | Separate pending check | Operator uses [DSH test prompts](../dsh/TESTING.md) after host remount/restart; no live readiness claim |
| Cloud native registration | Excluded by policy | Continue using `mdt-cli cloud ...` |

Run from `plugins/`:

```sh
/opt/homebrew/bin/bun test tests bb/tests
```

Run from the repository root:

```sh
bun x tsc --project plugins/bb/tsconfig.json --noEmit
bb plugin build plugins/bb
bun x eslint plugins/_lib plugins/dsh/mdt.js plugins/dsh/spec-trace.js plugins/dsh/lib/kit.js plugins/bb/server.ts plugins/tests plugins/bb/tests
```

Bun 1.4.2 is verified for these checks. Older Bun 1.3.14 rejects the existing empty `test.preload` array. Real-CLI tests require `mdt-cli` sources/dependencies and `spec-trace` on PATH; missing binaries fail rather than silently skipping coverage. Fixtures remove their temporary files and leave the user's project registry unchanged.

## Next work

The remaining host check is DSH fresh-host UAT, independently scheduled via its test prompts. Add future non-cloud commands through shared definitions, adapters, tests, matrix and skill in one change. Cloud wrappers require a separate scope decision; they remain CLI-only for now.
