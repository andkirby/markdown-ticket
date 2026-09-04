# MDT Working-State Files — Inventory & Git Policy

**Purpose**: Single durable source for *which files the MDT workflow generates, where they appear, and what their git policy is*. This document is the phrase-source for:

1. the managed `.gitignore` block that `mdt-cli project init` scaffolds in new projects (MDT-143, BR-16 / C10), and
2. the consolidated MDT section of this repository's own `.gitignore`.

**Maintenance rule**: change the list **here first**, then mirror the change in the shared scaffold constant (`shared/tools/projectGitignore.ts`) and this repo's `.gitignore`. Never edit one of the three without the other two. Every entry below is grounded in observed locations in this repository (survey 2026-09-03).

## Inventory

| File / dir | Produced by | Observed locations (this repo) | Git policy | Pattern |
|---|---|---|---|---|
| `.mdt-config.toml` | `project init` | project root | **TRACKED** — project identity, never ignore | — |
| `.mdt-next` | `ProjectManager.createProject` (ticket counter, `CONFIG_FILES.COUNTER_FILE`) | project root (new projects; absent here) | ignored | `/.mdt-next` |
| `.mdt/` | MDT workflow-context state (skills) | `.mdt/workflow-context/` at root | ignored | `/.mdt/` |
| `{KEY}/*.trace.md` | `spec-trace render` (projections) | `docs/CRs/MDT-*/` (e.g. 5 in MDT-143) | ignored | `**/*.trace.md` |
| `{ticketsPath}/.trace/{KEY}/` | `spec-trace` canonical store (`store.json`, `baselines/`, `fragments/`) | `docs/CRs/.trace/MDT-*/` (80 tracked files: 62 json, 18 md) | **TRACKED** — canonical state, commit at round end; never ignore | — |
| `spec-trace*.md` | spec-trace debug output | none currently on disk | ignored (defensive) | `**/spec-trace*.md` |
| `pipeline-state.json` | pipeline skills | none currently on disk; referenced in docs | ignored (defensive, any subfolder) | `**/pipeline-state.json` |
| `*.pipeline-state.json` | pipeline skills | none currently on disk | ignored (defensive) | `**/*.pipeline-state.json` |
| `.tasks-status.yaml` | task-status tracking | `docs/CRs/MDT-*/` (31 instances) | ignored; ⚠ MDT-171/MDT-179 are tracked legacy (added before the rule) | `**/*.tasks-status.yaml` |
| `.checkpoint.yaml` | agentic checkpoint | `docs/CRs/MDT-*/` (8 instances) | ignored | `**/.checkpoint.yaml` |
| `poc/` | proof-of-concept convention | `docs/CRs/MDT-*/poc/` (e.g. MDT-143: `cac-shortcuts`, `commander-shortcuts`) | ignored | `**/poc/` |
| `*prompt*.md` | agent prompts | `docs/CRs/MDT-*/pipeline-agent-prompt.md`, `goal-prompt.md`, `prompt.md`; scratch at root (`200-report-prompt.md`, `cloud-visibility-debug-prompt.md`) | ignored, **but ticket files must stay trackable** | `**/*prompt*.md` + negation |
| ticket files `{CODE}-###-slug.md` | `mdt-cli ticket create` | `docs/CRs/` top level | **TRACKED** — must never be silently ignored | `!{ticketsPath}/{CODE}-*.md` |
| dot json/yaml (`.*.json`, `.*.yaml`) | agent state (defensive) | no MDT instances observed on disk; in this repo they also match tool configs (`.knip.json`, `.prettierrc.json`, `.auto-claude-security.json`, `.mcp.json` — all tracked-but-ignored or separately ignored) | repo: ignored (does real work here); **scaffold: omitted** — see Gotcha 3 | repo only: `**/.*.json`, `**/.*.yaml` |

## Canonical managed block (project-init scaffold)

The block `mdt-cli project init` ensures in the target `.gitignore` — marker-delimited, idempotent merge, unmanaged lines untouched (BR-16, Edge-12). `{ticketsPath}` and `{CODE}` are substituted per project (here: `docs/CRs`, `MDT`):

```gitignore
# >>> MDT working state (managed by mdt-cli project init) — docs/MDT_WORKING_STATE_FILES.md >>>
/.mdt-next
/.mdt/
**/*.trace.md
**/spec-trace*.md
**/pipeline-state.json
**/*.pipeline-state.json
**/*.tasks-status.yaml
**/.checkpoint.yaml
**/poc/
**/*prompt*.md
!{ticketsPath}/{CODE}-*.md
# <<< MDT working state <<<
```

**Pattern-depth convention** (why every pattern carries an explicit anchor): in gitignore semantics a pattern *without* a slash already matches at any depth — git documents `**/foo` as "the same as pattern `foo`", so the bare and `**/` forms are functionally identical. But the bare form *reads* as root-only to humans. This list therefore always spells depth out: a leading `/` anchors to the project root (`.mdt-next` counter, `.mdt/` context — both live only at the root), and `**/` marks anything that appears at any depth (per-ticket working state). Do not "simplify" the prefixes away; the explicit form is the point.

The final negation line is load-bearing: it must come **after** the ignore entries (last match wins) so a ticket whose slug contains `prompt` (or later report-style patterns a project adds) can never be silently ignored.

Differences vs this repo's own superset:

- The repo additionally keeps `**/.*.json` / `**/.*.yaml` (historical; they cover tool-config dotfiles here). The scaffold **omits** them — no observed MDT dot-state beyond the explicit `.tasks-status.yaml` / `.checkpoint.yaml`, and they would swallow new projects' tool configs (`.prettierrc.json` etc.).
- The repo's block additionally protects already-tracked files by history; the scaffold protects by negation from day one.

## Gotchas (learned from this repo)

1. **Tracked-but-ignored is invisible footgun fuel.** `git check-ignore` consults the index: a tracked file that matches an ignore pattern reports *not ignored*, so the pattern's danger is hidden until a *new* file hits it. Examples here: `MDT-080-enhance-prompt-command-system-with-structured-work.md` (matches `**/*prompt*.md`; survives only because it predates the rule), `MDT-101/prompt.md`, `MDT-171/*.trace.md` (5 projections predating `**/*.trace.md`), `MDT-171/.tasks-status.yaml`, `MDT-179/.tasks-status.yaml`, `.knip.json`, root `README.md`/`AGENTS.md` (matched by `/*.md`). Use `git check-ignore --no-index <path>` to see what a pattern would do to a fresh file.
2. **Slug collisions with `**/*prompt*.md` are real.** MDT-080 proves the class. Mitigation is the negation line above, which is why it is part of the scaffold contract (BR-16), not an optional nicety.
3. **Broad dot patterns swallow tool configs.** `**/.*.json` / `**/.*.yaml` match `.prettierrc.json`, `.knip.json`, `.auto-claude-security.json`. This repo keeps them deliberately (they predate the explicit state patterns); new projects must not inherit that debt — the scaffold's explicit `.tasks-status.yaml` / `.checkpoint.yaml` entries cover all observed MDT dot-state.
4. **The `.trace/` store is canonical, not noise.** `docs/CRs/.trace/{KEY}/store.json`, `baselines/`, `fragments/` are committed (spec-trace lock baselines live there). Never add `.trace/` to an ignore list; only rendered `*.trace.md` projections are ignorable.
5. **Local excludes distort the picture.** `.git/info/exclude` can carry private patterns (here: a local `MDT-084` entry marks `docs/CRs/MDT-084/tasks.md` tracked-but-ignored on this machine only). `git check-ignore -v` names the source file — always check it when a policy surprise appears.
6. **The `_*` scratch pattern also swallows `__tests__/` directories.** A basename pattern with no slash matches at any depth, so `_*` ignores every `__tests__` dir — new test files placed there are silently untracked (the existing `shared/tools/__tests__/` suites survive only as tracked-but-ignored legacy). New shared tests belong under `shared/tests/…` (jest `testMatch` covers both paths); do not `git add -f` into `__tests__`.

## Related conventions (this repo only, not scaffolded)

These live in this repo's "Project-wide patterns" `.gitignore` section and predate the scaffold; they are general agent-output hygiene, not MDT working state: `**/*.bak.*`, `**/*-report-*.md`, `**/*-report.md`, `**/*-summary.md`, `_*` scratch prefix, `**/.unused`, `**/unused.*`, `**/typescript-graph.md`, `incidents/`.

---

*Source ticket: [MDT-143](./CRs/MDT-143-cli-entrypoint-alternative-to-mcp.md) — UAT session 2026-09-03. Survey method: filesystem glob + `git check-ignore --no-index` + `git ls-files -i -c --exclude-standard`.*
