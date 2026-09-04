# UAT Refinement Brief

## Objective

Make `mdt-cli project init` scaffold the MDT working-state gitignore entries as
part of project initialization, so newly initialized projects get the same
generated-artifact ignores the source repo maintains by hand (`*.trace.md`
projections, pipeline state, tasks-status, checkpoints, poc, prompts) instead
of surfacing them as untracked git noise.

## Approved Changes

| Change | Detail |
|--------|--------|
| Init scaffolds `.gitignore` | `ProjectManager.createProject` ensures the target folder's `.gitignore` contains a marker-delimited managed MDT block, delegating to one new shared module (`shared/tools/projectGitignore.ts`). Covers every entrypoint routing through `createProject`: `mdt-cli project init`, `project:create` script flow, web-driven creation. |
| Durable single-source doc | [docs/MDT_WORKING_STATE_FILES.md](../../MDT_WORKING_STATE_FILES.md) — canonical inventory (file → producer → observed locations → git policy → pattern), the scaffold block, and gotchas; the shared constant must mirror it, and this repo's `.gitignore` now carries the same list in one consolidated marked block referencing the doc. |
| Entry set (evidence-upgraded) | Grounded in the repo survey (2026-09-03), all patterns depth-explicit (`/` = project root, `**/` = any depth): `**/*.trace.md`, `**/spec-trace*.md`, `**/pipeline-state.json`, `**/*.pipeline-state.json`, `**/*.tasks-status.yaml`, `**/.checkpoint.yaml`, `/.mdt-next` (written by `createProject` itself), `/.mdt/` (workflow-context observed), `**/poc/`, `**/*prompt*.md`, closing negation `!{ticketsPath}/{CODE}-*.md`. Broad `**/.*.json`/`**/.*.yaml` **omitted** — no observed MDT dot-state beyond the explicit entries, and they swallow tool configs (`.prettierrc.json`, `.knip.json`). |
| Merge semantics (user: "1, consider best practices") | Idempotent managed-block merge: create `.gitignore` when absent; append the block when missing; no-op when already current; never modify unmanaged lines; re-running init produces no diff. Negation placed last so ticket files always stay trackable (MDT-080 proves slug collisions are real). |
| Trace store stays trackable | `{ticketsPath}/.trace/**/store.json` is canonical spec-trace state and is intentionally NOT ignored (committed in the source repo). Only rendered projections and working state are ignored. |

## Changed Requirement IDs

- `BR-16` — refined in place (init also ensures the managed MDT gitignore block)
- `Edge-12` — added (existing user `.gitignore`: preserve unmanaged lines, append block once, idempotent re-run)
- `C10` — added (single shared entry-list constant consumed by all `createProject` entrypoints; marker-delimited re-mergeable block)

## Affected Downstream Trace

- requirements: BR-16 refined; Edge-12, C10 added → validated, **relocked**, rendered; refined again after the repo survey (doc as phrase-source, ticket negation, dot-pattern omission) → revalidated, relocked
- bdd: `project_init_scaffolds_mdt_gitignore`, `project_init_merges_existing_gitignore` added (both cover BR-16) → rendered
- architecture: `ART-shared-gitignore-scaffold`, `OBL-init-gitignore-scaffold` added → rendered
- tests: `TEST-cli-init-gitignore` added → rendered
- tasks: `TASK-cli-init-gitignore` added → rendered

## Execution Slices

### Slice 1 — shared scaffold module + ProjectManager wiring

- **Objective**: one constant + one idempotent merge function, called from `createProject` on the non-globalOnly path after local-config/counter creation.
- **Direct artifacts**: `shared/tools/projectGitignore.ts` (new), `shared/tools/ProjectManager.ts`, `shared/dist` rebuild.
- **Direct GREEN targets**: `TEST-cli-init-gitignore`, `project_init_scaffolds_mdt_gitignore`, `project_init_merges_existing_gitignore`.
- **Impacted canonical tasks**: `TASK-cli-init-gitignore`.
- **Why**: the entry list must live in shared so CLI/script/web cannot drift (C10); the CLI keeps zero ignore logic (business-logic boundary).

### Slice 2 — CLI surfacing + agent reference

- **Objective**: init output names the scaffolded file; structured `project.init` payload reflects it; the canonical agent-facing skill doc stays truthful.
- **Direct artifacts**: `cli/src/output/formatter.ts` (`formatProjectInit`), `cli/src/commands/project.ts`, `cli/mdt-cli/SKILL.md`.
- **Direct GREEN targets**: `TEST-cli-init-gitignore` (output assertions), existing `TEST-cli-structured-output` regression.
- **Impacted canonical tasks**: `TASK-cli-init-gitignore`.
- **Why**: per `cli/AGENTS.md`, any interface change must update `cli/mdt-cli/SKILL.md`; structured consumers need the new field.

### Slice 3 — E2E coverage

- **Objective**: prove create / merge / idempotent-re-run against the built binary in isolated fixtures.
- **Direct artifacts**: `cli/tests/e2e/project/init-gitignore.spec.ts` (new, `@mdt/shared/test-lib`).
- **Direct GREEN targets**: `TEST-cli-init-gitignore`.
- **Impacted canonical tasks**: `TASK-cli-init-gitignore`.
- **Why**: Edge-12 routes to tests; the byte-identical re-run assertion is the regression guard for duplicate blocks.

## Validation

**Implemented 2026-09-03 (TASK-cli-init-gitignore) — all GREEN:**

- TDD: `init-gitignore.spec.ts` 3/3 RED → GREEN; unit suite `shared/tools/__tests__/projectGitignore.test.ts` 6/6 (RED on missing module → GREEN)
- Full CLI e2e: 117/117 across 15 files (includes new spec)
- Shared jest project suites: 47/47 (`project-management` + `projectGitignore`)
- `eslint` clean on all changed files (one `perfectionist/sort-imports` fix applied); `bun run validate:ts` 5/5 projects pass
- Manual acceptance in an isolated temp project with real `git init`: user `.gitignore` preserved, managed block appended once, re-run byte-identical, `git check-ignore` confirms working state ignored and ticket files (incl. a `prompt`-slug ticket) trackable via the negation
- Lesson learned: `**/` inside a JSDoc comment closes the block comment early (`*/` substring) — tsc parse errors pointed mid-file while the real culprit was a pattern literal in a doc comment above

Earlier spec-round evidence (repo survey 2026-09-03): filesystem glob + `git check-ignore --no-index` + `git ls-files -i -c --exclude-standard` — results recorded in docs/MDT_WORKING_STATE_FILES.md. `.gitignore` consolidation verified behavior-preserving (274-file battery identical before/after except the intended MDT-080 negation protection; tracked-but-ignored 666 → 665).
- Requirements lock refreshed after approved changes; `--stage requirements --strict` now passes (the previous baseline was stale — it predated the already-approved BR-22/C7–C9/Edge-9–11 additions recorded in CR Section 8).
- Entry forms verified against the source repo with `git check-ignore` before being specified.

## Watchlist

- Broad dot patterns (`**/.*.json` / `**/.*.yaml`) stay in THIS repo's `.gitignore` (they cover tool configs like `.auto-claude-security.json`) but are deliberately omitted from the scaffold — the durable doc records the divergence and the reason.
- Managed-block markers are a public convention once shipped: other tools editing `.gitignore` must respect them; keep the merge conservative (append-only outside markers).
- Explicit-project precedence is "flag wins" across list/create/deps/get/attr — keep MCP `resolveProject` consistent if precedence is ever revisited.
- `dsh-plugin` tool names and non-`project` schema fields are preset contracts; do not rename.
- Deferred concerns UC-1 (orphan `{KEY}/` subdocument folder on delete) and UC-2 (`.trace/{KEY}/` never cleaned on delete), raised 2026-07-26, remain open for a separate session.

## Open Decisions

None. Entry set ("1 and 2") and merge semantics ("1, with best practices") were confirmed by the user; best practices applied: repo-proven pattern forms, marker-delimited block, append-only outside markers, idempotent no-diff re-run, trace store left trackable.
