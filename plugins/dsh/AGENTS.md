# dsh-plugin — mdt-cli as DeepSeek Harness tools

This directory holds raw Cordis plugins that expose local CLIs as model tools
inside DeepSeek Harness (DSH) sessions:

- `mdt.js` — `../../cli/bin/mdt-cli`: all 11 non-cloud MDT operations.
- `spec-trace.js` — compiled CLI resolved from `SPEC_TRACE_BIN` in the DSH host environment or preset shell-env contributor: all 8 operational trace tools.

See the [shared coverage matrix](../docs/coverage.md) for the complete inventory and verification status. Cloud management remains CLI-only. Model-facing descriptions and schemas are registered by these adapters; presets should load the [shared native-tool guidance](../bb/skills/mdt-tools/SKILL.md) for procedure and examples, because BB skill discovery does not run inside DSH.

Each plugin is thin glue: it shells out to its CLI through the DSH `shell`
service. They publish no Cordis service, so they mount loose in an agent
preset with no `isolate` realm.

Operational docs: [DEBUG.md](DEBUG.md) — verified procedures (offline
simulate harness, rollout loop, stale-host signature, known limitations);
[TESTING.md](TESTING.md) — live in-session verification prompts.

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

The loader imports the plugin module into the long-running DSH **host
process**: later edits to the file do not reach sessions until the host
restarts (or reloads its plugins). A new session alone re-runs the cached
`apply()` — new tool names and descriptions appear, but execute bodies stay
old. After changing a plugin — or anything under `../_lib/` (and its synced
copies in the bb plugin), which the loader pulls in at import time — restart
the host before live-testing.

## Conventions

- One tool per CLI subcommand surface; parameters mirror the CLI's flags. Do
  not add workflow logic here — process knowledge belongs in the `mdt` and
  `spec-trace-cli` skills, not in tools.
- Always pass a JSON output flag where the CLI supports one; surface non-zero
  exits as tool errors.
- The MDT CLI path is derived from this checkout. spec-trace resolves `SPEC_TRACE_BIN` at call time; configure the host environment or preset contributor.
- Run subprocesses at the calling session's cwd, not the host cwd: derive
  `workdir` from the session's sandbox-policy workspace root, falling back to
  `exec.agent.session.header.cwd` (see `sessionWorkdir`/`execContextFor` in
  `lib/kit.js`). Without it, CLIs that detect project context by walking up
  from cwd (mdt-cli's `.mdt-config.toml` detection) resolve the wrong
  directory and fail with `NO_PROJECT_CONTEXT`.
- Optional ticket-create content is carried through a safely quoted `printf` pipe; the default subprocess stdin stays noninteractive. Preserve body bytes and quoting.
- Tool schemas and descriptions are model-facing contracts: change them
  deliberately, since agents and presets depend on the names.
