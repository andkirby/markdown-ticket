# Design Docs Quality Follow-Up Prompt

Use this prompt for a follow-up agent improving MDT design documentation quality.

## Skill Gate

Load the relevant local skills before working. Do not duplicate their instructions in your output or in new docs. Use them as the operating contract, then keep the produced docs concise and project-native.

Expected skills:
- `mdt-ux-designer`
- `ux-designer-specifier`
- `wireloom` when editing Wireloom fences
- `commit` when staging/committing

## Goal

Continue the design-doc quality pass after the Quick Search exemplar. Produce durable, readable source-of-truth docs that help implementers and reviewers understand the UX contract without carrying phase plans, code inventories, deep CSS recipes, or exploratory alternatives.

The target outcome is not "more docs." The target outcome is fewer ambiguous docs and a clearer artifact model:
- `*.spec.md` owns durable UX composition, visible states, boundaries, accessibility, responsive behavior, and a small set of source/verification anchors.
- `*.interactions.md` exists only when behavior complexity would make the spec hard to scan.
- `*.mockups.md` owns canonical review states only, using Wireloom where useful.
- Explorations, option studies, generated HTML, and rejected alternatives do not sit beside canonical surface docs unless clearly marked as non-canonical.

## Current Baseline

Use the latest committed Quick Search docs as the exemplar:
- `docs/design/README.md`
- `docs/design/surfaces/quick-search.spec.md`
- `docs/design/surfaces/quick-search.interactions.md`
- `docs/design/surfaces/quick-search.mockups.md`

Important recent decisions:
- General filename format is `{entity}.{document artifact}.md`.
- Code refs and CSS refs are drift protection, not bureaucracy.
- Keep source/verification refs to roughly 3-6 anchors: owner, key behavior model, semantic style contract when relevant, and user-visible tests.
- Do not add line refs by default.
- CSS refs should name semantic contracts only, not utility classes or token-value inventories.
- Mockups should illustrate canonical review states, not hover-only, selected-only, or color-only variants.

There is also a matching update in the local `ux-designer-specifier` skill. Assume the agent can load it; do not paste its rules into repo docs.

## First Pass: Audit Before Editing

Inspect the current worktree before touching files:
- `git status --short`
- `docs/design/README.md`
- all files under `docs/design/surfaces/`
- relevant source/style/test anchors only after selecting target surfaces

Classify design files into:
- canonical surface docs
- interaction contracts
- mockups
- explorations or option studies
- stale or over-detailed docs

Look specifically for:
- specs that mix multiple surfaces or feature phases
- duplicated app shells in many mockups
- dense keyboard/query/state-machine behavior inside a main spec
- API contracts, backend details, implementation plans, or migration notes inside UX specs
- token/class tables that are really style inventories
- generated visual HTML or option studies living next to canonical docs
- mockups that show tiny variants instead of review states
- source refs that list every component instead of drift anchors

Do not assume dirty files are yours. Preserve unrelated user changes.

## Suggested Target

Start by inspecting the Project Browser docs because there are existing related artifacts and likely exploration material:
- `docs/design/surfaces/project-browser.spec.md`
- `docs/design/surfaces/project-browser.mockups.md`
- `docs/design/surfaces/project-browser-recognition-options.mockups.md`
- `docs/design/surfaces/project-browser-recognition-options.visual.html`

Only refactor them if inspection confirms they are the highest-value next target. If another surface is clearly worse, choose that instead and explain why in the final report.

Prefer one high-quality exemplar over a broad shallow rewrite. A good pass is one or two surfaces made genuinely durable.

## Editing Rules

For each selected surface:
- Keep one focused surface per spec.
- Add `Owns` and `Does Not Own` when ownership is currently blurry.
- Move dense behavior into `{entity}.interactions.md` only if it improves readability.
- Reduce source refs to drift anchors.
- Reduce style refs to semantic style anchors.
- Remove phase plans, historical notes, API payloads, and implementation recipes unless they are essential UX contract.
- Keep mockups reviewable without running the app.
- Keep visible Wireloom copy realistic and product-native.
- Keep annotations about behavior outside the visible UI unless they are real callouts.
- If exploration artifacts are useful, either leave them uncommitted and call them out, or move them to an explicit exploration location only if the repo already has or needs that convention.

Do not modify runtime code in `src/`, `server/`, `shared/`, or `mcp-server/` unless the user explicitly asks.

## Skill / Output Feedback Loop

Only update the local `ux-designer-specifier` skill if the docs refactor reveals a repeatable skill-output gap that the current skill would likely reproduce.

If updating the skill:
- Keep it lean.
- Add only durable behavior, not this task's local details.
- Commit skill changes separately in the `my-skills` repo.

If no skill update is needed, say so.

## Validation

Run focused checks before committing:
- Markdown sanity for edited files: balanced fences, internal links, and artifact naming.
- Wireloom parse for every edited `*.mockups.md` fence.
- `git diff --check` for each touched repo.
- Attempt markdownlint once.

Known local issue: markdownlint may fail because `markdownlint-cli2` tooling is broken or unavailable in this checkout. If that happens, record it as a tooling blocker and do not fix package dependencies as part of the docs commit.

If a commit hook fails only because of that markdownlint tooling problem:
- confirm other checks already passed
- do not hide the failure in the final report
- use a hook bypass only if the staged diff is narrow and the user asked for a commit

## Commit Boundaries

Stage narrowly.

For `markdown-ticket`, stage only files that belong to the selected design-doc refactor. Do not stage unrelated dirty CR files, `.mdt-next`, unrelated ideas, or unrelated project-browser artifacts unless they are the selected target and have been intentionally reviewed.

For `my-skills`, stage only `ux-designer-specifier/*` if the skill is intentionally updated. Do not stage `wireloom/*` or unrelated skill work.

Use separate commits per repo:
- `docs(design): ...`
- `docs(skill): ...` only if skill changes are made

No AI attribution in commit messages.

## Acceptance Criteria

The work is done when:
- at least one selected surface has a clearer source-of-truth contract than before
- canonical docs do not carry exploration or phase-plan material
- source/style refs are useful drift anchors, not maintenance inventory
- mockup state coverage is bounded and reviewable
- validation results are reported honestly
- unrelated dirty work remains unstaged
- commits are created if the user asked for commits

## Final Report Shape

Keep the final report short but complete:
- selected target and why
- files changed
- validation results
- commit hash(es)
- any unrelated dirty files intentionally left alone
- any tooling blocker, especially markdownlint
