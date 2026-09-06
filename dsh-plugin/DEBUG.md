# dsh-plugin DEBUG — runtime operations contract

Scope: only the runtimes in this directory (the two DSH tool plugins and
their subprocesses), per the owner's instruction. This is not the
repo-wide protocol. Verified evidence only; refresh when a mount, entry
point, or command below changes.

Related: [TESTING.md](TESTING.md) holds the live in-session verification
prompts; [AGENTS.md](AGENTS.md) holds the authoring conventions.

## Topology

```
dsh-host (user-operated, long-running)
  └─ cordis loader — mount list: ~/.dsh/profiles/web/cordis.patch.yml
       ├─ mdt-plugin          dsh-plugin/mdt.js
       │    └─ subprocess:    cli/bin/mdt-cli  (cwd = calling session)
       └─ spec-trace-plugin   dsh-plugin/spec-trace.js
            └─ subprocess:    $SPEC_TRACE_BIN (see limitation L4)
```

## Runtime inventory

| id | class | entry | owner | observe | control | rollout | test |
|----|-------|-------|-------|---------|---------|---------|------|
| `dsh-host` | host (root) | user's DSH install | user | session behavior only | user restart | user restart | TESTING.md Prompt A in a fresh session |
| `mdt-plugin` | tool-plugin | `dsh-plugin/mdt.js` | `dsh-host` | `debug/simulate.mjs` output | mount row in cordis.patch.yml | host restart | simulate harness + TESTING.md |
| `spec-trace-plugin` | tool-plugin | `dsh-plugin/spec-trace.js` | `dsh-host` | `debug/simulate.mjs` output | mount row in cordis.patch.yml | host restart | simulate harness |
| `mdt-cli` (substrate) | cli | `cli/bin/mdt-cli` | `mdt-plugin` | stdout/stderr JSON | direct invocation | none (interpreted) | `bun run --cwd cli build` + e2e |

## Capability evidence

### `mdt-plugin` / OBSERVE / VERIFIED

- Action: `bun dsh-plugin/debug/simulate.mjs "$PWD" mdt_project_current`
- Signal: `"id": "markdown-ticket"`, `"code": "MDT"`, exit 0
- Constraints: harness registers both plugins through fake DSH services and
  executes the tool offline; no host or session involved.

### `mdt-plugin` / INJECT / VERIFIED

- Action: `bun dsh-plugin/debug/simulate.mjs "$PWD" mdt_ticket_list '{"filters":["status=Implemented"]}'`
- Signal: returns ticket keys (`MDT-184`, `MDT-244`) — live execute() bodies
  run without host restart, which is the whole point.
- Constraints: the fake shell passes **no sandbox policy** — subprocesses
  run with the caller's privileges. Use read-only tools, or point workdir at
  a throwaway project. Fake-shell stdin is `ignore`; a live stdin pipe hangs
  CLIs that poll it (`ticket create`).

### `mdt-plugin` / CONTROL / VERIFIED

- Action: add/remove loader rows in `~/.dsh/profiles/web/cordis.patch.yml`
  (`- id: tool-mdt / name: <abs path>/dsh-plugin/mdt.js`), then start a host.
- Signal: tools registered in every new session (tool list shows
  `mdt_*`); a broken path fails loudly at mount.
- Constraints: plugins load loose (no realm), available to all sessions.
  Editing the file affects only hosts started afterwards.

### `mdt-plugin` / ROLLOUT / VERIFIED

- Action: edit `dsh-plugin/mdt.js` → user restarts the DSH host → fresh
  session → run TESTING.md Prompt A.
- Signal: recorded behavior delta across two runs after the session-cwd fix:
  `mdt_ticket_list` went `NO_PROJECT_CONTEXT` → PASS with
  `meta.projectCode` resolved from the workspace.
- Constraints: **the host caches plugin modules at import time.** A new
  session alone re-runs the cached `apply()`. Stale-host mixed signature:
  new tool names/descriptions present, old execute behavior. That signature
  always means "restart the host", never "hot reload".

### `mdt-plugin` / TEST / VERIFIED

Three layers, cheapest first:

1. Offline: `debug/simulate.mjs` (see OBSERVE/INJECT above) — catches
   arg-construction and workdir regressions in seconds.
2. CLI substrate: run `cli/bin/mdt-cli <cmd>` directly from a project cwd —
   isolates plugin glue from CLI behavior.
3. Live: TESTING.md Prompt A (deterministic) and Prompt B (blind ritual
   check) in a fresh session after any host restart. Recorded result:
   full pass, no `project` param needed anywhere.

### `mdt-plugin` / STATE / VERIFIED

- Action: throwaway project lifecycle — `mdt-cli project init TSTT 'Sim'
  -d /tmp/sim` → `ticket create` → `attr` → `list` → cleanup
  (`rm -rf /tmp/sim` + delete `~/.config/markdown-ticket/projects/<id>.toml`).
- Signal: create→attr→deps→list→get all pass with session cwd = project dir.
- Constraints: registration writes to `~/.config` — needs an unsandboxed
  context (see L2). Always remove the registry toml with the directory.

### `dsh-host` / EGRESS / BLOCKED

- Attempted: `ps ax -o pid,command | grep -iE "dsh|deepseek"` to identify
  the host process and its module state.
- Failure: no identifiable DSH host process; module-cache state is not
  queryable from sessions or the shell.
- Next action: detect staleness behaviorally via the mixed signature above.

### `spec-trace-plugin` / OBSERVE + INJECT + TEST / VERIFIED

- Action: `bun dsh-plugin/debug/simulate.mjs "$PWD" spec_trace_list '{"entity":"requirement","ticket":"MDT-101","workdir":"'$PWD'"}'`
- Signal: `ERROR: spec-trace exited 1: ENOENT ... docs/CRs/.trace/MDT-101/store.json`
  — the binary executes and the CLI's real answer (no trace store for that
  ticket) surfaces as a clean tool error. Wiring verified end-to-end.
- Constraints: binary comes from `$SPEC_TRACE_BIN`; see L4.

## Known limitations

- **L1 — host module cache.** Plugin edits require a host restart to reach
  sessions. No hot reload. (Evidence: ROLLOUT above.)
- **L2 — sandboxed first-registration.** Under a workspace-write sandbox,
  `~/.config/markdown-ticket` is not writable, so `project init` and the
  first-ever resolution of an *unregistered* local project fail inside DSH
  sessions. Evidence: `project init` failed with `Failed to write file
  ~/.config/markdown-ticket/projects/...` under workspace-write and
  succeeded under full access. Pre-register projects from an unsandboxed
  context once; afterwards, sandboxed sessions resolve them read-only.
- **L3 — benign `⚠️` config-dir warning.** Sandboxed hosts print
  `Could not create or write to config directory ... Using fallback` on
  stderr; mdt-cli continues. Never a failure cause by itself; the plugin's
  `errorDetail()` keeps it out of tool errors.
- **L4 — spec-trace binary is foreign.** `$SPEC_TRACE_BIN` points at a
  compiled binary in a different checkout (`mdt-prompts`), not this repo's
  `tools/spec-trace`. Edits here do not reach DSH sessions until that
  binary is rebuilt or the variable is repointed in the host env.

## Refresh triggers

Re-verify the affected sections when: a plugin mounts/unmounts (CONTROL),
`dsh-plugin/*.js` changes (ROLLOUT + TESTING.md live run), the mdt-cli
interface changes (skill contract in `cli/AGENTS.md`), or `SPEC_TRACE_BIN`
moves (L4).
