# UAT Refinement Brief

## Objective

Fix the MDT-165 Mermaid rendering follow-up discovered during UAT: valid Mermaid blocks from markdown-it output must render in MDT the same way they render in `mdopen` and the Mermaid online editor.

## Approved Changes

- Preserve decoded Mermaid fence source separately from rendered DOM.
- Render each browser diagram with `mermaid.render(id, source)` from preserved source.
- Scope Mermaid rendering to the current `MarkdownContent` container.
- Do not rewrite existing Mermaid diagrams to remove quotes; quoted labels remain valid Mermaid.

## Changed Requirement IDs

- `BR-6`: refined in place. Mermaid compatibility now means browser rendering uses preserved decoded fence source and does not depend on Mermaid reading markdown-it escaped DOM text.

## Affected Downstream Trace

- Scenario: `mermaid_decoded_source_rendering`
- Artifacts: `ART-mermaid-core`, `ART-mermaid-hooks`, `ART-post-render`, `ART-prose-css`
- Obligation: `OBL-mermaid-source-preservation`
- Tests: `TEST-mermaid-core-unit`, `TEST-processor-pipeline-unit`, `TEST-mermaid-render-runtime`
- Task: `TASK-6`

## Execution Slices

### Slice 1: Mermaid Source Preservation

Objective: Store decoded Mermaid fence source and render browser diagrams from that source.

Direct artifacts/files:
- `src/utils/mermaid/core.ts`
- `src/utils/mermaid/hooks.ts`
- `src/components/MarkdownContent/usePostRender.ts`
- `src/styles/prose.css`

Direct GREEN targets:
- `bun test src/utils/mermaid/core.test.ts`
- `bun test src/components/MarkdownContent/useMarkdownProcessor.test.ts`
- `bun run build`
- `scripts/validate-mermaid-md docs/CRs/MDT-157/architecture.md`

Impacted canonical task IDs:
- `TASK-6`

Why this slice exists: `mdopen` renders Mermaid from preserved source; MDT was using DOM text after markdown-it escaping, which could render Mermaid's syntax-error fallback for valid diagrams.

## Validation

- `spec-trace validate MDT-165 --stage requirements`
- `spec-trace validate MDT-165 --stage bdd`
- `spec-trace validate MDT-165 --stage architecture`
- `spec-trace validate MDT-165 --stage tests`
- `spec-trace validate MDT-165 --stage tasks`
- Browser check: `/prj/MDT/ticket/MDT-157/architecture.md` renders two `.mermaid > svg` diagrams and does not show `Syntax error in text`.

## Watchlist

- Do not remove valid Mermaid quotes from documentation as a workaround.
- Keep the markdown rendering pipeline order intact.
- Re-render on theme changes must continue to use preserved source.
- Fullscreen controls must still attach after SVG rendering.
