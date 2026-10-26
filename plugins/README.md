# Native agent plugins

MDT and spec-trace CLI operations exposed as native model tools for BB and DeepSeek Harness (DSH). Cloud management stays CLI-only.

- [Coverage and verification status](docs/coverage.md): every command, native equivalent, exclusions and remaining checks.
- [Setup and usage](docs/usage.md): install, binary settings, examples and agent discovery.
- [Agent skill](bb/skills/mdt-tools/SKILL.md): on-demand procedural guidance shipped by the BB plugin.
- [DSH host integration](dsh/AGENTS.md), [mount cookbook](dsh/COOKBOOK.md), [live test prompts](dsh/TESTING.md), [debugging](dsh/DEBUG.md).

## Layout and ownership

| Path | Owns |
|---|---|
| `_lib/mdt-tools.js` | MDT tool names, descriptions, schemas, CLI arguments and optional stdin |
| `_lib/spec-trace-tools.js` | Operational spec-trace tool contracts |
| `_lib/run-cli.js` | Shared CLI execution/output helpers |
| `_lib/bb-workspace.js` | BB thread workspace and server-host validation |
| `bb/server.ts` | BB registration, validation, settings and bounded subprocesses |
| `bb/lib/` | Install-safe copies of shared modules; drift-tested |
| `bb/skills/` | Agent guidance included in BB skill discovery |
| `dsh/` | Cordis registration, shell quoting and session sandbox/workdir glue |
| `tests/`, `bb/tests/` | Shared/host contracts and isolated real-CLI acceptance |

Edit `_lib/` first, then copy changed shared modules into `bb/lib/`. BB installation forbids imports outside its plugin directory. Add a shared tool contract and tests for each new operation, then update the coverage matrix and shipped skill. Preserve CLI business-logic ownership.

The historical implementation and current UAT round are tracked in [MDT-262](../docs/CRs/MDT-262-bb-native-mdt-tools.md) and its [execution brief](../docs/CRs/MDT-262/uat.md).
