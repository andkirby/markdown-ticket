# Tasks: MDT-182

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Annotation toggle logic**: owns parsing, marker rendering, tooltip interactions — isolated in `wireloomAnnotationToggle.ts`
- **Renderer integration**: owns calling annotation toggle from `wireloomRenderer.ts` — minimal changes
- **Fullscreen compatibility**: owns preserving compact mode state — minimal changes to `wireloomFullscreen.ts`
- **CSS**: new file `wireloom-annotations.css` for compact mode styles — no changes to existing Wireloom styles

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Annotation parsing & marker generation | `src/utils/wireloomAnnotationToggle.ts` | N/A — new module |
| Tooltip show/hide/dismiss | `src/utils/wireloomAnnotationToggle.ts` | N/A — new module |
| Toggle control creation | `src/utils/wireloomAnnotationToggle.ts` | N/A — new module |
| Rendering pipeline integration | `src/utils/wireloomRenderer.ts` | N/A — additive call |
| Fullscreen state preservation | `src/utils/wireloomFullscreen.ts` | N/A — additive guard |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 2 (compact mode dimensions) |
| C2 | Task 2 (ARIA labels, focus management) |
| C3 | Task 3 (error fallback unchanged) |
| C4 | Task 3 (missing Wireloom fallback unchanged) |
| C5 | Task 3 (theme re-render preserves compact state) |
| C6 | Task 3 (fullscreen preserves compact state) |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M1: Toggle + compact mode rendering | toggle_visible_on_wireloom_block, full_callout_mode_default, switch_to_compact_mode, switch_back_to_callout_mode (BR-1.1, BR-1.2, BR-1.3) | Task 1–2 | Unit tests GREEN for toggle + markers |
| M2: Integration + state persistence | — | Task 3 | All unit tests GREEN, integration wired |
| M3: Interactions + E2E | hover_marker_shows_annotation, focus_marker_shows_annotation, click_marker_keeps_annotation, escape_dismisses_annotation, no_toggle_on_non_wireloom, toggle_does_not_modify_source, independent_toggles_per_block, toggle_visible_on_wireloom_block, full_callout_mode_default, switch_to_compact_mode, switch_back_to_callout_mode (all BR) | Task 4 | ALL BDD scenarios GREEN |

## Tasks

### Task 1: Create wireloomAnnotationToggle module with annotation parsing and toggle control (M1)

**Milestone**: M1 — Toggle + compact mode (BR-1.1, BR-1.2, BR-1.3)

**Structure**: `src/utils/wireloomAnnotationToggle.ts`, `src/styles/wireloom-annotations.css`

**Makes GREEN (Automated Tests)**:
- `TEST-annotation-toggle-unit` → `src/utils/wireloomAnnotationToggle.test.ts`: toggle control placement tests, no-toggle-on-empty tests, no-toggle-on-non-wireloom tests

**Enables (BDD)**:
- `toggle_visible_on_wireloom_block` (BR-1.1) — needs Task 3 for renderer integration
- `full_callout_mode_default` (BR-1.2) — needs Task 3 for renderer integration

**Scope**: Create the core annotation toggle module with:
1. `addAnnotationToggle(wrapper, source)` — parses annotations from Wireloom source, adds toggle button to wrapper
2. `extractAnnotations(source)` — uses Wireloom `parse()` to get annotation metadata (target, side, body)
3. Toggle button creation (co-located with fullscreen button)
4. Per-block state via `data-annotation-mode` attribute
5. No-op for blocks without annotations (toggle hidden)

**Boundary**: Only handles toggle creation and annotation data extraction. Does NOT handle compact mode markers or tooltips.

**Creates**:
- `src/utils/wireloomAnnotationToggle.ts` — annotation toggle module
- `src/styles/wireloom-annotations.css` — toggle button styles

**Modifies**:
- None

**Must Not Touch**:
- `src/utils/wireloomRenderer.ts` — integration is Task 3
- `src/utils/wireloomFullscreen.ts` — integration is Task 3
- `src/styles/prose.css` — existing styles untouched
- `wireloom` package — no external package changes

**Exclude**: No compact mode markers, no tooltips, no renderer integration

**Anti-duplication**: Import `WireloomModule` type from `./wireloomRenderer`; import `parse` from `wireloom` directly — do NOT copy type definitions

**Duplication Guard**:
- Check `wireloomRenderer.ts` for existing annotation parsing — reuse pattern, don't duplicate
- Annotation extraction is new logic; verify no existing `parse()` calls extract annotation arrays

**Verify**:
```bash
bun test src/utils/wireloomAnnotationToggle.test.ts --test-name-pattern="toggle control placement"
```

**Done when**:
- [ ] Toggle button appears on Wireloom wrappers with annotations
- [ ] Toggle button hidden on wrappers without annotations
- [ ] Per-block state works via data attribute
- [ ] Unit tests GREEN (were RED)

---

### Task 2: Implement compact mode with numbered markers and tooltip interactions (M1→M3)

**Milestone**: M1 (markers) → M3 (interactions) — BR-1.3, BR-1.4, BR-1.5, BR-1.6, BR-1.10

**Structure**: `src/utils/wireloomAnnotationToggle.ts`, `src/styles/wireloom-annotations.css`

**Makes GREEN (Automated Tests)**:
- `TEST-annotation-toggle-unit` → `src/utils/wireloomAnnotationToggle.test.ts`: compact mode tests, tooltip interaction tests, accessibility tests, edge case tests, constraint C1/C2 tests

**Enables (BDD)**:
- `switch_to_compact_mode` (BR-1.3) — needs Task 3 for renderer
- `hover_marker_shows_annotation` (BR-1.4) — needs Task 4 for E2E
- `focus_marker_shows_annotation` (BR-1.5) — needs Task 4 for E2E
- `click_marker_keeps_annotation` (BR-1.6) — needs Task 4 for E2E
- `escape_dismisses_annotation` (BR-1.10) — needs Task 4 for E2E

**Scope**: Add compact mode rendering and tooltip interactions to the annotation toggle module:
1. `switchToCompactMode(wrapper, annotations)` — hide SVG callout group, create numbered markers at target positions
2. `switchToCalloutMode(wrapper)` — remove markers, restore SVG callout group
3. `createMarker(index, annotation, position)` — create focusable `<button>` with ARIA label
4. `createTooltip(wrapper)` — create tooltip container for annotation text
5. `showTooltip(tooltip, annotation)` — show annotation text on hover/focus/click
6. `hideTooltip(tooltip)` — dismiss on Escape, outside click, or another marker
7. Position markers by finding SVG elements matching annotation target IDs
8. Handle edge cases: same-target annotations, long text wrapping, unresolvable targets

**Boundary**: Only handles compact mode DOM manipulation. Does NOT handle renderer integration.

**Constraint coverage**:
- C1: Markers use `position: absolute` within existing SVG viewport — no canvas expansion
- C2: Markers are `<button>` elements with `aria-label`, `tabindex="0"`, tooltip has `role="tooltip"`

**Creates**:
- Functions within `src/utils/wireloomAnnotationToggle.ts` (already created in Task 1)
- Styles within `src/styles/wireloom-annotations.css` (marker + tooltip styles)

**Modifies**:
- `src/utils/wireloomAnnotationToggle.ts` — add compact mode functions
- `src/styles/wireloom-annotations.css` — add marker + tooltip styles

**Must Not Touch**:
- `src/utils/wireloomRenderer.ts` — integration is Task 3
- `src/utils/wireloomFullscreen.ts` — integration is Task 3
- `src/styles/prose.css` — existing styles untouched

**Exclude**: No renderer integration, no fullscreen handling, no theme handling

**Anti-duplication**: Import `AnnotationNode` type from `wireloom` — do NOT copy annotation interface

**Duplication Guard**:
- Check if `wireloomRenderer.ts` already has SVG position extraction logic — reuse pattern
- Tooltip show/hide is new logic; verify no existing tooltip patterns in the codebase

**Verify**:
```bash
bun test src/utils/wireloomAnnotationToggle.test.ts --test-name-pattern="compact mode|tooltip|accessibility|edge"
```

**Done when**:
- [ ] Compact mode creates numbered markers at correct positions
- [ ] Markers show/hide tooltip on hover, focus, click, Escape
- [ ] Markers have ARIA labels and are keyboard accessible
- [ ] Edge cases handled (same target, long text, unresolvable target)
- [ ] SVG canvas dimensions unchanged in compact mode (C1)
- [ ] Unit tests GREEN (were RED)

---

### Task 3: Integrate annotation toggle into renderer and fullscreen (M2)

**Milestone**: M2 — Integration + state persistence (BR-1.7, BR-1.8, BR-1.9, C3, C4, C5, C6)

**Structure**: `src/utils/wireloomRenderer.ts`, `src/utils/wireloomFullscreen.ts`, `src/components/MarkdownContent/domPurifyConfig.ts`, `src/styles/prose.css`

**Makes GREEN (Automated Tests)**:
- `TEST-annotation-toggle-unit` → `src/utils/wireloomAnnotationToggle.test.ts`: source immutability, per-block state, theme/fullscreen persistence, error fallback tests

**Enables (BDD)**:
- `no_toggle_on_non_wireloom` (BR-1.8) — needs Task 4 for E2E test wiring
- `toggle_does_not_modify_source` (BR-1.7) — needs Task 4 for E2E test wiring
- `independent_toggles_per_block` (BR-1.9) — needs Task 4 for E2E test wiring

**Scope**: Wire the annotation toggle into the existing rendering pipeline:
1. In `renderWireloomElements()`, after creating each `.wireloom` wrapper, call `addAnnotationToggle(wrapper, source)`
2. In theme change handler, re-apply compact mode if `data-annotation-mode="compact"` was set
3. In fullscreen entry/exit, preserve annotation mode state and keep markers/tooltips visible
4. Update `domPurifyConfig.ts` to allow `role="tooltip"`, `aria-describedby`, `aria-label` on marker elements
5. Import `wireloom-annotations.css` alongside existing styles
6. Verify error/fallback paths (C3, C4) still work without toggle

**Boundary**: Only handles integration wiring. Core toggle logic stays in wireloomAnnotationToggle.ts.

**Constraint coverage**:
- C3: Malformed source → `.wireloom-error` div → no toggle (verified)
- C4: Missing Wireloom → plain `<pre><code>` → no toggle (verified)
- C5: Theme re-render preserves `data-annotation-mode="compact"` state
- C6: Fullscreen toggle preserves compact mode state and marker visibility

**Modifies**:
- `src/utils/wireloomRenderer.ts` — add `addAnnotationToggle()` call after wrapper creation
- `src/utils/wireloomFullscreen.ts` — preserve annotation mode state during fullscreen transitions
- `src/components/MarkdownContent/domPurifyConfig.ts` — allow tooltip ARIA attributes
- `src/styles/prose.css` — import `wireloom-annotations.css`

**Must Not Touch**:
- `src/utils/wireloomAnnotationToggle.ts` — core logic complete from Tasks 1-2
- `wireloom` package — no external changes
- `src/utils/markdownItWireloomPlugin.ts` — fence rendering unchanged

**Exclude**: No new annotation toggle logic, no new CSS rules (all in wireloom-annotations.css from Task 1-2)

**Anti-duplication**: Import `addAnnotationToggle` from `./wireloomAnnotationToggle` — do NOT inline the logic

**Duplication Guard**:
- Renderer already calls `addWireloomFullscreenButtons()` — follow same pattern for `addAnnotationToggle()`
- Theme handler already re-renders Wireloom — add compact mode re-application to same handler

**Verify**:
```bash
bun test src/utils/wireloomAnnotationToggle.test.ts
bun test src/utils/wireloomRenderer.test.ts
bun test src/utils/wireloomFullscreen.test.ts
```

**Done when**:
- [ ] Toggle appears on rendered Wireloom blocks with annotations
- [ ] Non-Wireloom blocks have no toggle
- [ ] Source Markdown unchanged after toggling
- [ ] Multiple blocks have independent toggles
- [ ] Error/fallback paths unchanged (C3, C4)
- [ ] Theme change preserves compact mode (C5)
- [ ] Fullscreen preserves compact mode (C6)
- [ ] All unit tests GREEN

---

### Task 4: Wire E2E tests and make all BDD scenarios GREEN (M3)

**Milestone**: M3 — Interactions + E2E (BR-1.4, BR-1.5, BR-1.6, BR-1.10)

**Structure**: `tests/e2e/documents/wireloom-annotation-toggle.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-annotation-toggle-e2e` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts`: all 11 E2E scenarios

**Makes GREEN (Behavior)**:
- `toggle_visible_on_wireloom_block` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.1)
- `full_callout_mode_default` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.2)
- `switch_to_compact_mode` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.3)
- `switch_back_to_callout_mode` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.2, BR-1.3)
- `hover_marker_shows_annotation` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.4)
- `focus_marker_shows_annotation` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.5)
- `click_marker_keeps_annotation` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.6)
- `escape_dismisses_annotation` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.10)
- `toggle_does_not_modify_source` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.7)
- `no_toggle_on_non_wireloom` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.8)
- `independent_toggles_per_block` → `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` (BR-1.9)

**Scope**: Implement all E2E test scenarios:
1. Remove `test.skip` from all tests
2. Implement page navigation to document with Wireloom annotations
3. Implement selector helpers for toggle, markers, tooltips
4. Implement interaction assertions (hover, focus, click, Escape)
5. Create test fixture document with annotated Wireloom blocks

**Boundary**: Only test files. No production code changes.

**Creates**:
- Test fixture document (if needed) for Wireloom annotation testing

**Modifies**:
- `tests/e2e/documents/wireloom-annotation-toggle.spec.ts` — replace stubs with real test implementations

**Must Not Touch**:
- Any `src/` production code
- Any existing test files

**Exclude**: No production code changes, no new test utilities (use existing Playwright patterns from the project)

**Anti-duplication**: Import selectors from existing E2E test utilities if available — do NOT create new page object models

**Duplication Guard**:
- Check `tests/e2e/documents/` for existing Wireloom E2E tests — extend if they exist
- Check for existing test fixtures with Wireloom source — reuse if available

**Verify**:
```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/documents/wireloom-annotation-toggle.spec.ts --project=chromium
```

**Done when**:
- [ ] All 11 E2E scenarios GREEN
- [ ] Test fixture document exists with annotated Wireloom blocks
- [ ] No production code modified
- [ ] Smoke test passes (feature works in browser)

---

## Post-Implementation

- [ ] No duplication (grep check for compact marker logic outside wireloomAnnotationToggle.ts)
- [ ] Scope boundaries respected (no Wireloom package changes)
- [ ] All unit tests GREEN (`bun test src/utils/wireloomAnnotationToggle.test.ts`)
- [ ] All BDD scenarios GREEN (E2E test suite)
- [ ] Smoke test: open annotated Wireloom doc, toggle compact, verify markers + tooltips
- [ ] Fallback paths: malformed source, missing Wireloom both work unchanged

## Post-Verify Fixes

*(Appended during mdt:implement-agentic if issues found)*
