# UAT Refinement Brief

## Objective

Make the MDT-165 Wireloom integration explicit after the upstream Wireloom upgrade to `0.7.0` (`bc075376`): `wireloom` fenced blocks should render as inline SVG through the existing markdown pipeline with centralized MDT defaults, compact annotation layout, useful inline errors, and no regression for other fenced code blocks.

## Approved Changes

- Treat Wireloom fenced blocks as first-class markdown content in this ticket.
- Centralize Wireloom render defaults in the MDT integration boundary.
- Use `theme: "default"` for light mode and `theme: "dark"` for dark mode.
- Compact long annotation bodies before render so callouts wrap and stay close to the target surface.
- Keep graceful fallback to escaped plain code when Wireloom cannot load.
- Show useful inline parse errors, including line/column when Wireloom exposes them.
- Keep the markdown-it pipeline shape unchanged.

## Changed Requirement IDs

- `BR-12`: added for `wireloom` fenced blocks rendering as inline SVG with explicit MDT defaults.
- `BR-13`: added for malformed Wireloom source showing inline errors without crashing markdown rendering.
- `C6`: added for centralized Wireloom render defaults, including theme and compact annotation layout.
- `Edge-6`: added for missing/unloadable Wireloom fallback.

## Affected Downstream Trace

- Scenarios: `wireloom_block_renders_with_defaults`, `malformed_wireloom_error_visible`
- Artifacts: `ART-wireloom-plugin`, `ART-wireloom-renderer`, `ART-wireloom-renderer-test`, `ART-wireloom-fullscreen`, `ART-wireloom-fullscreen-test`, `ART-prose-css`
- Obligations: `OBL-wireloom-fence-rendering`, `OBL-wireloom-render-defaults`, `OBL-wireloom-error-surface`, `OBL-wireloom-fallback`
- Tests: `TEST-wireloom-plugin-unit`, `TEST-wireloom-renderer-unit`, `TEST-wireloom-live-document-e2e`
- Task: `TASK-7`

## Execution Slices

### Slice 1: Wireloom Defaults and Error Surface

Objective: Make Wireloom render options explicit and make malformed-source failures useful without escaping the markdown surface.

Direct artifacts/files:
- `src/utils/wireloomRenderer.ts`
- `src/utils/wireloomRenderer.test.ts`
- `src/utils/markdownItWireloomPlugin.ts`
- `src/utils/wireloomFullscreen.ts`
- `src/utils/wireloomFullscreen.test.ts`
- `src/styles/prose.css`

Direct GREEN targets:
- `bun test src/utils/wireloomRenderer.test.ts`
- `bun test src/utils/wireloomFullscreen.test.ts`
- `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/live-updates.spec.ts --project=chromium --grep "Wireloom"`

Impacted canonical task IDs:
- `TASK-7`

Why this slice exists: Wireloom `0.7.0` is now the integration target, but the app-level defaults, compact annotation layout, and malformed-source behavior need to be explicit and regression-tested rather than inferred from the current package behavior.

## Validation

- `spec-trace validate MDT-165 --stage requirements`
- `spec-trace validate MDT-165 --stage bdd`
- `spec-trace validate MDT-165 --stage architecture`
- `spec-trace validate MDT-165 --stage tests`
- `spec-trace validate MDT-165 --stage tasks`
- `spec-trace validate MDT-165 --stage all`
- `bun test src/utils/wireloomRenderer.test.ts`
- `bun test src/utils/wireloomFullscreen.test.ts`
- `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/live-updates.spec.ts --project=chromium --grep "Wireloom"`

Result:
- `spec-trace validate MDT-165 --stage all` passed.
- `bun test src/utils/wireloomRenderer.test.ts src/utils/wireloomFullscreen.test.ts` passed.
- `PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/live-updates.spec.ts --project=chromium --grep "Wireloom"` passed.
- Targeted ESLint for the edited Wireloom files passed.
- `bun run validate:ts` is blocked by unrelated ProjectSelector/accent-color TypeScript errors in the dirty worktree.

## Watchlist

- Do not change the markdown pipeline order.
- Do not render non-Wireloom fences through Wireloom.
- Do not rely on implicit Wireloom package defaults for theme behavior.
- Do not require document authors to hand-wrap long annotation text for compact rendering.
- Preserve theme-change re-rendering for already-rendered Wireloom blocks.
- Keep rendered SVG insertion inside the existing DOMPurify and SVG safety boundary.
