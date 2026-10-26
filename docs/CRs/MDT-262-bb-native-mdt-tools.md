---
code: MDT-262
status: Implemented
dateCreated: 2026-10-24T13:09:41.658Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-143,MDT-261
implementationDate: 2026-10-26
implementationNotes: User approved closure on 2026-10-26. Delivered 11 MDT and 8 spec-trace native tools; 107 tests and focused checks passed; independent review PASS. Cloud remains CLI-only; DSH live testing separate.
---

# Native mdt tools plugin for bb; restructure dsh-plugin into plugins/{dsh,bb}

## Current UAT scope

The 2026-10-26 refinement expands BB to 11 non-cloud MDT tools and 8 operational spec-trace tools. See [current UAT brief](MDT-262/uat.md) and [plugin coverage](../../plugins/docs/coverage.md). Original scope and verification below describe the 2026-10-24 implementation; the UAT entry in Section 8 supersedes its coverage exclusions.

## Problem

- In bb threads, mdt work relies on the agent shelling out via Bash to `mdt-cli`. BB plugins can register first-class native model tools (`bb.agents.registerTool`), which is exactly what `dsh-plugin/` already does for DeepSeek Harness (Cordis `tools.register`).
- `dsh-plugin/` sits at the repo root as a one-off; more plugin targets are coming, so the layout should be `plugins/{dsh,bb}/`.

## Scope

### 1. Restructure `dsh-plugin/` → `plugins/dsh/`

- `git mv` all files; only `mdt.js` carries a relative CLI-depth constant (`../cli/bin/mdt-cli` → `../../cli/bin/mdt-cli`); spec-trace resolves via `SPEC_TRACE_BIN`. Source comments/doc path mentions (`dsh-plugin/…` → `plugins/dsh/…`) are in scope for the move phase.
- Update ignore whitelists: `.gitignore` + `.zcodeignore` currently have `!/dsh-plugin/*.js` (global `**/*.js` is ignored) and a root-level `_*` rule that would swallow `plugins/_lib/`. Re-include narrowly: `!/plugins/dsh/*.js` + `!/plugins/dsh/lib/*.js` (entry files + kit.js only — do not broadly whitelist every plugin `.js`), and `!/plugins/_lib/` + `!/plugins/_lib/*.js` placed AFTER the `_*` rule (last match wins; verified with `git check-ignore`).
- Leave historical CR docs (MDT-143) untouched; update the `dsh-plugin:` affected-area mention in MDT-261.
- Live check (user): remount `plugins/dsh/mdt.js` + `spec-trace.js` (profile-patch mounting per `plugins/dsh/COOKBOOK.md`); restart host before testing (stale-host signature).

### 2. New `plugins/bb/` — headless bb plugin exposing mdt as native tools

- Scaffold via `bb plugin new` (drop frontend/app files). Tools mirror dsh mdt.js surface: `mdt_ticket_get`, `mdt_ticket_list`, `mdt_ticket_create`, `mdt_ticket_attr`, `mdt_ticket_deps`, `mdt_project_current`, `mdt_project_list`. zod schemas; non-zero exit → throw (tool error).
- **Subprocess contract:** arg-array spawn (`Bun.spawn`, no shell quoting), stdin ignored (the harness relies on this — see `plugins/dsh/debug/simulate.mjs`), 30s timeout, cancellation forwarded from `ctx.signal`, missing binary → explicit error naming the resolution it tried, output cap (256 KiB) with an explicit error on overflow — never silently truncate successful JSON. Preserve full successful CLI output including creation diagnostics (MDT-261).
- **Workspace resolution (corrected per SDK 0.6.49 — codex review):** tool `execute` ctx is `{ threadId, projectId, signal }` — no per-call cwd. Fail-closed resolution: `threads.get({ threadId, signal })` → `environments.get({ environmentId, signal })`; require non-null `path` and host == server primary host. ONLY when the thread has no environment attached, use `projects.get({ projectId, signal }).sources` — pick the default `local_path` source (`isDefault`). Fail with a clear error if no usable path; never silently fall back after an environment lookup failure or remote-host rejection. Spawn with that cwd so `.mdt-config.toml` walk-up detects the right project. Optional `project` param → `-p <code>`.
- **CLI resolution:** `process.env.MDT_CLI_BIN || Bun.which("mdt-cli")` at execute time — no hardcoded paths (plugin installs outside this repo; current install resolves via /usr/local/bin symlink chain).
- **Host guard:** if resolved `hostId` is not the server's primary host, fail the tool with a clear error (no remote spawn).
- Do NOT bundle `@mdt/shared`: the CLI is the packaged thin shell over shared; spawning keeps one tested code path (discovery, numbering, JSON envelopes, exit codes).
- **Reuse dsh code — final `_lib` layout:** `plugins/_lib/run-cli.js` (generic runner: injected exec fn, per-CLI output contract, `kebabFlag`/`flagTokens`, error extraction) + `mdt-tools.js` + `spec-trace-tools.js` tool tables. Output contracts stay distinct, NOT collapsed into one `json` flag: mdt always appends `--json`, returns stdout, prefers stdout on failure and filters the benign `⚠️` stderr line; spec-trace returns `stdout || stderr` on success and stderr on failure (some spec-trace commands request JSON via `--format json`). `SPEC_TRACE_BIN` resolution stays host glue. bb glue = zod schemas + `bb.agents.registerTool` + workspace resolution; DSH keeps its Cordis glue (split `lib/kit.js`: `quote`/`render` → `_lib`; shell/sandbox parts stay in `plugins/dsh/`). Workdir resolution is NOT shared. Verified: `bb plugin build` inlines out-of-root imports into the bundle (bundle runs standalone).
- **_lib covers spec-trace too:** bb spec-trace TOOLS remain out of scope — the tables make them a drop-in later.
- **Sequencing:** land the `git mv` byte-identical first and verify DSH mounting; extract into `_lib` as a second step so a mount failure is unambiguous. Re-verify AFTER extraction too — pre-extraction mounting does not validate the new `../_lib` imports: re-run the simulate harness offline, then the user repeats the fresh-host DSH check.
- Document tools in the plugin's own `skills/` dir; `bb plugin build` must pass; verify tools appear in a bb thread and operate on the thread's workspace project.

### 3. Tests (bun:test, `plugins/tests/`, own config avoiding the root bunfig preload)

- `core.test.ts` — table-driven: flag conversion (camelCase, booleans, omitted/null, zero, empty string, arrays), exact argv mapping for all mdt + spec-trace tools, per-CLI success/error stream behavior, `⚠️` warning filtering, diagnostics preservation.
- `dsh.test.ts` — register both plugins through fake Cordis services; assert tool names/required params; capture shell calls to verify quoting, CLI path, timeouts, `-p` override, workdir and sandbox-policy forwarding.
- `bb.test.ts` — fake plugin host with injected execution: 7 registrations, invalid args prevent execution, workspace-resolution precedence (environment → project default source → clear failure), remote-host rejection, missing binary, cancellation forwarding.
- `simulate.mjs` stays as a real-CLI smoke check (it has no assertions — it does not replace these). Live pass per host after implementation: DSH fresh host; bb after build/install (workspace selection, `-p`, invalid args, CLI failure).

### Out of scope
- spec-trace tools for bb (follow-up once mdt tools land).
- MCP/HTTP or CLI behavior changes.
- Playwright/full CLI lifecycle suites — add little value for thin glue (codex review).

## Acceptance
- [x] `plugins/dsh/` mounts (simulate harness passes post-move: mdt_project_current, mdt_ticket_get, spec_trace_list against a real store).
- [x] Simulate harness passes AGAIN after `_lib` extraction.
- [x] `plugins/bb/` builds + installs (`mdt@0.1.0 running`); tools register (server log confirms).
- [x] Live bb thread check PASSED (attempt 4): fresh thread called `mdt_project_current` natively → returned `MDT`. Fixes found by live verification: tool harness has NO Bun global (ported adapter to node:child_process), daemon PATH is broken (`PATH=/Applications/LLM`) → added `cliPath` plugin setting + child PATH augmentation (`augmentedPath`).
- [x] bun:test suite green (`plugins/tests/` + `plugins/bb/tests/`, 44 tests).
- [x] No repo-absolute paths in either plugin; ignore whitelists cover the new layout without exposing build output.
- Pending verification (user): in-session UAT (`TESTING.md` Prompt A) in a fresh DSH session. Host-side remount DONE 2026-10-24: `~/.dsh/profiles/web/cordis.patch.yml` repointed to `plugins/dsh/*.js`, host restarted, boot clean (no mount errors — broken paths fail loudly per DEBUG.md).

## Implementation notes (deviations found during implementation)

- **bb install-time bundler enforces the plugin directory boundary**: `bb plugin install` refuses `../` source imports (build passed, install failed — server log). Resolution: `plugins/bb/lib/` holds a synced copy of the three shared `_lib` files; `plugins/tests/lib-sync.test.ts` fails on drift. Edit `plugins/_lib/` only, re-copy into `plugins/bb/lib/`.
- DSH `spec-trace.js` now resolves `SPEC_TRACE_BIN` at execute time (was module load) — matches bb's execute-time CLI resolution and makes the missing-bin test possible.
- Workspace resolution implemented in `plugins/_lib/bb-workspace.js` (pure, sdk clients injected) per the corrected fail-closed contract; SDK arg shapes verified against 0.6.49 declarations.
- bb subprocess adapter: `Bun.spawn` argv array, stdin ignored, `AbortSignal.any([ctx.signal, 30s timeout])`, 256 KiB cap → explicit error, `mdtErrorDetail` reused from `_lib`.

## Post-review fixes (codex implementation review, round 2)

1. **`primaryHostId` endpoint corrected**: it lives on `bb.sdk.system.config()`, NOT `status.get()` (whose result has no such field — the original probe test fixture invented it). `plugins/_lib/bb-workspace.js` now reads `system.config({ signal }).primaryHostId`.
2. **Output cap now bounds memory and counts bytes while streaming**: combined stdout+stderr budget; the child is killed when the cap is exceeded; explicit error (was: buffer-everything then count JS chars — 400 KB passed a 256 KiB cap).
3. **Removed the non-default-source fallback**: only `isDefault` `local_path` source; otherwise a clear error (was: silently picked the first source). Negative test added.
4. **DSH mdt output parity restored**: mdt passes explicit `successText: stdout` (was inheriting runCli's stdout→stderr fallback, so an empty-stdout success with a stderr warning returned the warning); `mdtErrorDetail` returns trimmed stdout; error prefixes use the CLI label (`mdt-cli`/`spec-trace`, basename of bin), matching the pre-_lib messages.
5. bb adapter testable: `registerMdtTools(bb, { run })` injectable; `resolveCliBin(which)` injectable; `plugins/bb/tests/plugin.test.ts` executes registered tools with SDK-shaped fixtures (registration, zod rejection, cwd/argv forwarding, remote-host no-spawn, real-spawn happy path, byte-cap kill, missing binary).
6. Nits: AGENTS.md/COOKBOOK.md CLI-depth mentions fixed; AGENTS.md restart guidance covers `../_lib` changes.

## 8. Clarifications

### UAT Session 2026-10-26

Reopened by user request. Current scope supersedes the original seven-tool BB limit and spec-trace exclusion: full non-cloud MDT operations and eight operational spec-trace tools, agent skill guidance, organized `plugins/` docs and concise root README entry. Cloud stays CLI-only. DSH fresh-host verification is separate.

No prior canonical trace store or workflow artifacts existed for MDT-262; this round adds BR-1.1, BR-1.2, BR-2.1, BR-3.1, C1–C5 and stage-ordered downstream trace. Updated artifacts: assess.md, requirements.md, bdd.md, architecture.md, tests.md, tasks.md and uat.md under MDT-262/. `uat.md` is the current-round brief. A requirements lock was created from the approved UAT scope and all five stages pass strict validation. Reasonable scoped commits and temporary test projects are authorized.


### UAT verification progress 2026-10-26

Fresh BB session discovered all 19 tools and loaded the installed on-demand mdt-tools skill. Five native read-only calls passed: current project, project lookup, MDT-262 lookup (In Progress), requirement listing (9 records), strict validation (all five stages, zero issues). Other 14 tools were catalog-inspected; isolated real-CLI acceptance owns mutation verification.

Independent preparation review found stdout JSON diagnostics lost on failed spec-trace validation. A real failing strict-validation regression captured RED before the fix; summary plus detailed JSON must survive for BB and DSH under C3. Initial and diagnostic RED evidence are retained in repository-local .git/mdt/evidence/MDT-262/.


### UAT implementation and review 2026-10-26

Delivered 11 MDT and 8 operational spec-trace native tools, including create content/pagination, cwd-only deletion, text rename, project get/init and trace lock/dry-run/render/bundle. Cloud management remains CLI-only. The on-demand mdt-tools skill, plugin entry point, coverage matrix, usage guide, DSH operational docs and concise root README links are reconciled.

Verification: 107 plugin tests across 7 files pass; targeted ESLint, BB TypeScript check, BB build and all five strict trace stages exit 0. The complete registered-tool real-CLI lifecycle uses temporary storage and isolated CONFIG_DIR; no normal project registry mutations. Failed validation retains remediation JSON and stderr summary in both adapters. Independent semantic review: PASS, no blocking issues. DSH fresh-host live testing remains separate and unverified. BB plugin reloaded with 19 tools; local specTracePath configured.

No blocking technical debt or artifact drift was identified. Install-safe copies are intentional and drift-tested; business logic remains in CLI/shared services. User approved closure on 2026-10-26; status is Implemented. Verification plans, RED captures, runs and semantic-review JSON live under .git/mdt/evidence/MDT-262/.


### UAT closure approved 2026-10-26

User approved the reviewed result and requested ticket resolution and remaining task commits. MDT-262 is Implemented. The separately scheduled DSH fresh-host live check remains explicitly unverified; cloud management remains CLI-only. Implementation commits: `caa5aaa7`, `ce188d3d`.
