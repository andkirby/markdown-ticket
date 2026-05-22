# UAT Refinement Brief

## Objective

Record the approved UAT refinement for MDT-173 after reviewing wide rendered mockups in Documents View. The current round keeps normal document prose readable while letting rendered artifacts use the available document pane, and adds a resizable/collapsible document navigation panel.

## Approved Changes

- Wide rendered document artifacts such as Wireloom, Mermaid, tables, and code blocks may use the full available document preview width.
- Normal prose remains constrained to a readable measure instead of spanning the full desktop pane.
- Wireloom SVGs render at native width inline and scroll horizontally only when the artifact is wider than the available pane.
- Wireloom artifacts get a fullscreen/zoom inspection control using the existing Mermaid zoom behavior.
- Documents View navigation becomes resizable and collapsible.
- Document navigation width and collapsed state persist per project.

## Changed Requirement IDs

| ID | Decision | Change |
|----|----------|--------|
| `BR-10.1` | additive_change | Add wide artifact behavior for Documents View while preserving readable prose. |
| `BR-10.2` | additive_change | Add resizable/collapsible document navigation with project-scoped persistence. |
| `C10` | additive_change | Constrain prose width so artifact widening does not make paragraphs full-width. |

## Affected Downstream Trace

- Scenarios: `document_artifacts_use_available_width`, `document_navigation_resizes_and_collapses`
- Obligations: `OBL-wide-document-artifacts`, `OBL-resizable-document-navigation`, `OBL-wireloom-inspection`
- Tests: `TEST-document-artifact-layout`, `TEST-document-navigation-layout`, `TEST-wireloom-inspection`, `TEST-browser-wide-artifact-check`
- Tasks: `TASK-10`, `TASK-11`, `TASK-12`

## Execution Slices

### TASK-10: Expand document artifact layout without widening prose

- Objective: Let artifacts use available Documents View width while text remains readable.
- Direct artifacts/files: `src/components/DocumentsView/MarkdownViewer.tsx`, `src/components/DocumentsView/documents-view.css`, `src/styles/prose.css`
- Direct GREEN targets: `document_artifacts_use_available_width`, `TEST-document-artifact-layout`, `TEST-browser-wide-artifact-check`
- Impacted canonical task IDs: `TASK-10`
- Why this slice exists: It separates document layout semantics from rendered artifact sizing.

### TASK-11: Add resizable and collapsible document navigation

- Objective: Replace the fixed document sidebar split with a resizable/collapsible panel.
- Direct artifacts/files: `src/components/DocumentsView/DocumentsLayout.tsx`, `src/components/DocumentsView/documents-view.css`, `src/config/documentNavigation.ts`, `src/components/ui/resizable.tsx`
- Direct GREEN targets: `document_navigation_resizes_and_collapses`, `TEST-document-navigation-layout`, `TEST-browser-wide-artifact-check`
- Impacted canonical task IDs: `TASK-11`
- Why this slice exists: It addresses available layout width at the pane level instead of only inside Markdown rendering.

### TASK-12: Add Wireloom native-width rendering and zoomable inspection

- Objective: Keep Wireloom readable inline and inspectable in a zoomable overlay.
- Direct artifacts/files: `src/utils/wireloomRenderer.ts`, `src/utils/wireloomFullscreen.ts`, `src/utils/mermaid/zoom.ts`, `src/styles/prose.css`
- Direct GREEN targets: `document_artifacts_use_available_width`, `TEST-wireloom-inspection`
- Impacted canonical task IDs: `TASK-12`
- Why this slice exists: Wireloom has artifact-specific sizing and inspection needs distinct from normal prose.

## Validation

- `spec-trace validate MDT-173 --stage requirements`
- `spec-trace validate MDT-173 --stage bdd`
- `spec-trace validate MDT-173 --stage architecture`
- `spec-trace validate MDT-173 --stage tests`
- `spec-trace validate MDT-173 --stage tasks`
- Implementation validation already run: `bun run validate:ts`
- Implementation validation already run: `bun run build`
- Focused tests already run for document navigation, Markdown viewer, Mermaid zoom/fullscreen, and Wireloom rendering/fullscreen.
- Browser check already confirmed document content width, readable paragraph width, wide Wireloom artifact width, and sidebar collapse behavior.

## Watchlist

- Existing MarkdownViewer tests can leak Mermaid DOM when combined with Mermaid fullscreen tests in one process; run those groups separately unless test cleanup is improved.
- `react-resizable-panels` v4 uses the `Group`, `Panel`, and `Separator` API; keep the local `resizable.tsx` wrapper aligned with that version.
- Do not widen the whole document prose block without keeping paragraph/list/heading width constraints.
