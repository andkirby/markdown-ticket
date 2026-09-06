# DSH mdt-plugin test prompt

Live verification of the session-cwd fix and the `mdt_project_current` tool
(`dsh-plugin/mdt.js`). The DSH **host process** caches plugin modules at
import time — a fresh session alone is NOT enough. Restart the host (`dsh
web`) after any edit to `dsh-plugin/*.js`, then start a new session. A
session in an old host re-runs the cached `apply()`: new tool names and
descriptions appear, but execute bodies stay old (cwd resolution still
broken, `⚠️` warning still leading error text). That mixed signature means
"stale host", not "broken fix".

## Setup

Restart the DSH host if any `dsh-plugin/*.js` changed since it started, then
start a new session with the workspace set to one of:

| Variant | Workspace | What it proves |
|---------|-----------|----------------|
| A | `~/home/gpt-german` | The original failure site: `.mdt-config.toml` present, project resolves from session cwd |
| B | `~/home/markdown-ticket` | Same, in the home project (`MDT`) |
| C | any directory **without** `.mdt-config.toml` up-tree (e.g. `/tmp`) | Clean failure mode: structured error, no sandbox misdirection |

## Prompt A — deterministic checklist (paste verbatim)

```text
You are verifying the MDT tool wiring in this session. Use only the mdt_*
tools — no bash, no direct mdt-cli runs. Do these steps in order, then report
a compact PASS/FAIL table with the observed value for each:

1. Determine the current project and its code.
2. Fetch ticket 1 using only a bare numeric key (no project code in the key)
   and report its title. If no such ticket exists, report the exact error.
3. List tickets filtered by status=In Progress and report the count.
4. Call the full project-list tool once: how many projects are registered,
   and is the current project among them?
5. List every tool you called, in order, and quote any failure verbatim.

Constraint: do not pass a `project` parameter anywhere unless a step fails
without it; if one does, retry once with the code from step 1 and say so.
```

## Prompt B — blind ritual check (paste verbatim)

```text
What MDT project am I in, and what is ticket 1 about? Then show me the
tickets that are currently In Progress.
```

Variant B mentions no tool names on purpose — it observes which tools the
agent reaches for first.

## Evaluator pass/fail

| # | Check | Pass | Pre-fix signature (regression) |
|---|-------|------|-------------------------------|
| A1 | `mdt_project_current` succeeds | ok=true, code matches the workspace's `.mdt-config.toml` | exit 1 `NO_PROJECT_CONTEXT` |
| A2 | Bare-key fetch resolves via cwd | Ticket `1` resolves to `{CODE}-001` in the cwd project | `NO_PROJECT_CONTEXT` — bare keys have no embedded code to fall back on |
| A3 | Ticket list needs no `project` | Filtered list returns | `NO_PROJECT_CONTEXT` |
| A4 | `mdt_project_list` still works | All registered projects; current one present | n/a (unchanged) |
| A5 | Call order + error hygiene | `mdt_project_current` (not the list) is the first project call; no `⚠️ Could not create or write to config directory` line inside any error text | Opening with `mdt_project_list`; error text led by the config-dir warning |
| B | No ritual | Agent answers without calling `mdt_project_list` at all and without bash | Session opens with the full registry dump |
| C | Clean failure mode | `mdt_project_current` fails with the structured JSON error (`ok:false`, `NO_PROJECT_CONTEXT`), warning filtered; agent reports it as "not an MDT project" rather than a sandbox problem | Error led by the `⚠️` warning; agent misdiagnoses as sandbox/config-dir denial |

Note: the `⚠️` warning itself is expected on stderr in sandboxed hosts
(`~/.config` is not writable) and is benign — success output never shows it,
and `errorDetail()` strips it from failures.
