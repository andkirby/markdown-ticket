# dsh-plugin — mdt-cli as DeepSeek Harness tools

This directory holds raw Cordis plugins that expose local CLIs as model tools
inside DeepSeek Harness (DSH) sessions:

- `mdt.js` — `../cli/bin/mdt-cli`: `mdt_ticket_get`, `mdt_ticket_list`,
  `mdt_ticket_create`, `mdt_ticket_attr`, `mdt_ticket_deps`,
  `mdt_project_current`, `mdt_project_list`.
- `spec-trace.js` — the compiled spec-trace CLI, resolved from the
  `SPEC_TRACE_BIN` environment variable (set it in the DSH host environment
  or the preset's shell-env contributor): `spec_trace_init`,
  `spec_trace_upsert`, `spec_trace_list`, `spec_trace_delete`,
  `spec_trace_validate`, `spec_trace_render`, `spec_trace_bundle`.

Each plugin is thin glue: it shells out to its CLI through the DSH `shell`
service. They publish no Cordis service, so they mount loose in an agent
preset with no `isolate` realm.

Project targeting differs by CLI: mdt-cli takes `-p <code>` where supported;
spec-trace resolves the project from the nearest `.mdt-config.toml`, so its
tools take a `workdir` parameter instead.

## Mounting

From a DSH copy of the `standard` preset in `~/.dsh/.agent-presets/<id>/`,
add one row to `agent.cordis.yml` pointing at `mdt.js` in this directory:

```yaml
- id: tool-mdt
  name: ./mdt.js
- id: tool-spec-trace
  name: ./spec-trace.js
```

Mount-validate with the preset's `standingKeyFor` check before starting a
session; a broken path fails loudly at mount.

## Conventions

- One tool per CLI subcommand surface; parameters mirror the CLI's flags. Do
  not add workflow logic here — process knowledge belongs in the `mdt` and
  `spec-trace-cli` skills, not in tools.
- Always pass a JSON output flag where the CLI supports one; surface non-zero
  exits as tool errors.
- Binary paths are resolved in one constant at the top of each plugin; update
  them in one place if a CLI moves.
- Tool schemas and descriptions are model-facing contracts: change them
  deliberately, since agents and presets depend on the names.
