# Tasks: MDT-181

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **App-config contract**: `domain-contracts/src/app-config/*` remains the single owner of selector accent shape and hex validation rules.
- **Selector-state persistence**: Accent saves only through `/api/config/selector` and `project-selector.json`; shared project metadata and `.mdt-config.toml` stay untouched.
- **Edit-form preference UI**: `AddProjectModal` gains a clearly separated personal-preference section; it must not blur into the shared project update payload.
- **Selector rendering**: Accent resolution, fallback derivation, chip left-edge stripe rendering, and card identity fills stay inside the existing project selector module.
- **No storage/auth expansion**: No new database, no localStorage preference tier, no multi-user auth redesign, no image upload flow in this CR.

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|---|---|---|
| Canonical accent shape + hex validation contract | `domain-contracts/src/app-config/schema.ts`, `domain-contracts/src/app-config/validation.ts` | Task 1 |
| Selector-only storage boundary | `server/repositories/ConfigRepository.ts` + existing `/api/config/selector` owner path | Task 1 |
| Accent palette, fallback, and luminance helpers | `src/utils/accentColors.ts` | Task 2 |
| Personal preference persistence path | `src/components/ProjectSelector/useSelectorData.ts` | Task 2 |
| Edit-form accent controls | `src/components/AddProjectModal/components/AccentColorPicker.tsx` | Task 3 |
| Chip left-edge accent stripe | `src/components/ProjectSelector/ProjectSelectorChip.tsx` | Task 4 |
| Card identity fill + theme-adaptive accent surfaces | `src/components/ProjectSelector/ProjectSelectorCard.tsx`, `src/components/ProjectSelector/project-selector.css` | Task 4 / Task 5 |

## Constraint Coverage

| Constraint ID | Tasks |
|---|---|
| C1 | Task 1, Task 2, Task 3 |
| C2 | Task 2, Task 5 |
| C3 | Task 4, Task 5 |
| C4 | Task 2 |
| C5 | Task 2 |
| C6 | Task 2, Task 4 |
| C7 | Task 3 |
| C8 | Task 1, Task 3 |
| C9 | Task 3 |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|---|---|---|---|
| M0: Walking Skeleton | — | Task 0 | Build passes, missing files exist, RED tests import without `module not found` |
| M1: Storage + Validation Foundation | BR-2.3, BR-8.1 | Task 1-2 | `backend_hex_validation`, `cross_user_accent_independence`, schema/API/hook tests GREEN |
| M2: Accent Selection + Selector Identity | BR-1.1-BR-1.5, BR-2.1-BR-2.2, BR-3.1-BR-3.3, BR-4.1-BR-4.3, BR-5.1-BR-5.2 | Task 3-4 | picker, persistence, fallback, chip, and browser-card scenarios GREEN |
| M3: Theme + Preservation | BR-6.1-BR-6.2, BR-7.1-BR-7.2 | Task 5 | `theme_derivation_single_accent`, `existing_behavior_preserved` GREEN |

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|---|---:|---:|---:|---|
| `domain-contracts/src/app-config/` | 3 | 3 | 0 | ✅ |
| `src/utils/` | 2 | 2 | 0 | ✅ |
| `src/components/AddProjectModal/` | 3 | 3 | 0 | ✅ |
| `src/components/ProjectSelector/` | 7 | 7 | 0 | ✅ |
| `server/` | 2 | 2 | 0 | ✅ |

Missing runtime artifacts already covered by Task 0:
- `src/utils/accentColors.ts`
- `src/components/AddProjectModal/components/AccentColorPicker.tsx`
- `src/components/AddProjectModal/components/AccentColorPicker.css`

## Tasks

### Task 0: Create Missing Accent Infrastructure Stubs + Verify Builds (M0)

**Skills**: mdt-frontend

**Milestone**: M0 — Walking Skeleton

**Structure**: `src/utils/accentColors.ts`, `src/components/AddProjectModal/components/AccentColorPicker.tsx`, `src/components/AddProjectModal/components/AccentColorPicker.css`

**Makes GREEN (Automated Tests)**: *(none — infrastructure prep)*

**Scope**: Create the missing runtime files from the architecture so the repo builds and RED tests fail on behavior, not missing modules.
**Boundary**: Stubs and placeholder exports only. No final palette logic, no persistence logic, no selector rendering changes.

**Creates**:
- `src/utils/accentColors.ts` — stub exports for palette, fallback, foreground, and validation helpers
- `src/components/AddProjectModal/components/AccentColorPicker.tsx` — placeholder component shell with planned props
- `src/components/AddProjectModal/components/AccentColorPicker.css` — placeholder style file for picker-specific classes

**Modifies**:
- (none — purely additive)

**Must Not Touch**:
- `domain-contracts/src/app-config/schema.ts`
- `src/components/ProjectSelector/useSelectorData.ts`
- `src/components/ProjectSelector/ProjectSelectorChip.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`

**Exclude**: Real HSL/luminance math, API calls, edit-form wiring, selector CSS changes

**Anti-duplication**: Reuse existing component/file conventions from `src/components/AddProjectModal/` — do NOT create a parallel modal or selector module.

**Duplication Guard**:
- Check that `accentColors.ts` is the only new accent utility owner before adding any helper elsewhere
- Verify `AccentColorPicker.tsx` is the only new picker component; do not introduce a second accent form widget
- Confirm RED tests fail on expected behavior assertions rather than `module not found`

**Verify**:
```bash
bun run build
bun test src/utils/__tests__/accentColors.test.ts 2>&1 | head -20
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-accent-colors.spec.ts --project=chromium --grep "edit form shows accent controls" 2>&1 | head -20
```

**Done when**:
- [x] Missing runtime files exist at the architecture paths
- [x] `bun run build` exits without import-resolution failures
- [x] RED tests import the new files without `module not found`
- [x] No duplicate accent utility or picker component was introduced

---

### Task 1: Lock Selector Accent Schema and Backend Validation Boundary (M1)

**Milestone**: M1 — Storage + Validation Foundation (BR-2.3, BR-8.1)

**Structure**: `domain-contracts/src/app-config/schema.ts`, `domain-contracts/src/app-config/validation.ts`, `server/repositories/ConfigRepository.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-selector-accent-schema` → `domain-contracts/src/app-config/__tests__/accent.test.ts`: selector accent contract tests
- `TEST-selector-api-accent-validation` → `server/tests/api/selector.test.ts`: selector API validation + storage-isolation tests

**Makes GREEN (Behavior)**:
- `backend_hex_validation` → `server/tests/api/selector.test.ts` (BR-8.1)

**Scope**: Extend the canonical selector-state schema for optional accent values, enforce one hex-validation contract, and preserve the selector-only storage boundary on the backend.
**Boundary**: Contract and backend validation only. No edit-form UI, no selector hook state, no chip/card rendering.

**Creates**:
- (none — existing files extended)

**Modifies**:
- `domain-contracts/src/app-config/schema.ts` — add optional `accent` field and normalization rules
- `domain-contracts/src/app-config/validation.ts` — expose shared selector accent validation helpers
- `domain-contracts/src/app-config/__tests__/accent.test.ts` — cover valid and invalid accent cases
- `server/repositories/ConfigRepository.ts` — preserve shared-config boundary while selector accent stays out of project config paths
- `server/tests/api/selector.test.ts` — assert uppercase normalization, malformed rejection, and no shared-config writes

**Must Not Touch**:
- `src/components/AddProjectModal/AddProjectModal.tsx`
- `src/components/AddProjectModal/components/AccentColorPicker.tsx`
- `src/components/ProjectSelector/useSelectorData.ts`
- `src/components/ProjectSelector/project-selector.css`

**Exclude**: No picker UI, no fallback color algorithm, no selector rendering, no theme styling

**Anti-duplication**: Import and reuse the domain-contracts selector accent validator in backend boundary code — do NOT add a second regex or manual parser in server files.

**Duplication Guard**:
- Check existing `/api/config/selector` validation before adding any new parser path
- Keep `domain-contracts/src/app-config/validation.ts` as the single validation owner
- Verify accent never flows into `.mdt-config.toml` or shared project metadata code paths (C1)

**Verify**:
```bash
bun test domain-contracts/src/app-config/__tests__/accent.test.ts
bun run --cwd server jest tests/api/selector.test.ts --runInBand
```

**Done when**:
- [x] Selector schema accepts optional `accent` values and rejects malformed hex values
- [x] Backend persists valid accents and rejects malformed values before write
- [x] Accent never reaches shared project config paths (C1)
- [x] No second validation regex/parser exists outside the canonical contract

---

### Task 2: Implement Accent Utilities and Selector State Hook (M1)

**Skills**: mdt-frontend

**Milestone**: M1 — Storage + Validation Foundation (BR-2.3)

**Structure**: `src/utils/accentColors.ts`, `src/components/ProjectSelector/useSelectorData.ts`, `src/components/ProjectSelector/types.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-accent-color-utilities` → `src/utils/__tests__/accentColors.test.ts`: palette, fallback, luminance, and hex utility tests
- `TEST-selector-hook-accent-state` → `src/components/ProjectSelector/useSelectorData.test.ts`: accent load/persist and no-owner-state hook tests

**Makes GREEN (Behavior)**:
- `cross_user_accent_independence` → `src/components/ProjectSelector/useSelectorData.test.ts` (BR-2.3)

**Scope**: Implement the pure accent utility module and extend selector-state types/hook behavior for accent reads, writes, fallback resolution inputs, and no-owner-state safety.
**Boundary**: Utilities + selector hook only. No edit-form controls, no selector chip/card UI, no route/controller changes.

**Creates**:
- (none — Task 0 stubs become full implementations)

**Modifies**:
- `src/utils/accentColors.ts` — final palette, fallback, foreground, and `#RRGGBB` helpers
- `src/utils/__tests__/accentColors.test.ts` — align tests with final helper behavior
- `src/components/ProjectSelector/useSelectorData.ts` — load/persist `accent`, preserve existing favorite/usage fields
- `src/components/ProjectSelector/useSelectorData.test.ts` — cover accent update path and `loadOwnerState: false` guard
- `src/components/ProjectSelector/types.ts` — expose accent-aware selector state typing

**Must Not Touch**:
- `src/components/AddProjectModal/AddProjectModal.tsx`
- `src/components/AddProjectModal/components/AccentColorPicker.tsx`
- `src/components/ProjectSelector/ProjectSelectorChip.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`

**Exclude**: No DOM/UI rendering, no modal layout changes, no theme CSS, no browser-card identity markup

**Anti-duplication**: Import palette/fallback/foreground helpers from `src/utils/accentColors.ts` everywhere — do NOT duplicate fallback hashing or luminance logic in hooks or components.

**Duplication Guard**:
- Confirm `accentColors.ts` is the only owner of palette + fallback + foreground math
- Verify `useSelectorData.ts` remains the only selector-state persistence owner for frontend accent writes
- Keep `loadOwnerState: false` behavior intact for read-only/no-owner flows (Edge-7)

**Verify**:
```bash
bun test src/utils/__tests__/accentColors.test.ts
bun test src/components/ProjectSelector/useSelectorData.test.ts
```

**Done when**:
- [x] Palette/fallback/foreground tests are GREEN
- [x] `useSelectorData` loads and persists accent alongside favorite/count/lastUsedAt
- [x] No-owner-state path does not persist owner selector writes (Edge-7)
- [x] No duplicate fallback or luminance logic exists outside `accentColors.ts`

---

### Task 3: Integrate the Personal Accent Picker into the Project Edit Form (M2)

**Skills**: mdt-frontend

**Milestone**: M2 — Accent Selection + Selector Identity (BR-1.4, BR-1.5)

**Structure**: `src/components/AddProjectModal/AddProjectModal.tsx`, `src/components/AddProjectModal/components/AccentColorPicker.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-project-accent-colors` → `tests/e2e/selector/project-accent-colors.spec.ts`: edit-form helper-link + invalid-input flow subset

**Makes GREEN (Behavior)**:
- `choose_color_external_link` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-1.5)
- `color_picker_invalid_hex_rejected` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-1.4)

**Enables (BDD)**:
- `color_picker_preset_selection` (BR-1.1, BR-1.2) — needs Task 4 to complete
- `color_picker_custom_hex` (BR-1.3) — needs Task 4 to complete
- `accent_persistence_personal_only` (BR-2.1, BR-2.2) — needs Task 4 to complete

**Scope**: Add the visually separated “Your Project Accent” section, wire picker interactions to the selector-state hook, and keep the shared project update payload free of accent data.
**Boundary**: Edit-form preference UI only. No selector chip/card rendering and no fallback styling.

**Creates**:
- (none — Task 0 created the files)

**Modifies**:
- `src/components/AddProjectModal/AddProjectModal.tsx` — add personal accent section and separate persistence flow
- `src/components/AddProjectModal/components/AccentColorPicker.tsx` — implement preset grid, custom hex input, and helper link
- `src/components/AddProjectModal/components/AccentColorPicker.css` — final picker-specific layout/states
- `tests/e2e/selector/project-accent-colors.spec.ts` — keep selector/test IDs aligned if implementation details shift

**Must Not Touch**:
- Shared project update endpoint payload shape (`/api/projects/:code/update`)
- `src/components/ProjectSelector/ProjectSelectorChip.tsx`
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`
- `src/components/ProjectSelector/project-selector.css`

**Exclude**: No fallback rendering, no chip/card markup, no auth/session redesign, no image upload support

**Anti-duplication**: Import palette and validation helpers from `src/utils/accentColors.ts` — do NOT hard-code a second preset list or custom-hex validator in the picker.

**Duplication Guard**:
- Verify the accent section is the only personal-preference UI added to AddProjectModal
- Confirm the accent write path uses selector-state persistence, not the shared project update request
- Reuse existing modal/form field patterns instead of creating a second modal or separate save flow (C7)

**Verify**:
```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-accent-colors.spec.ts --project=chromium --grep "edit form shows accent controls and a secure choose-color link|invalid custom hex shows a field error and preserves the previous accent"
```

**Done when**:
- [x] Edit form shows a separated personal accent section (C7)
- [x] Helper link opens with secure new-tab attributes (C9)
- [x] Invalid custom hex shows a field-level error and preserves the previous accent
- [x] Accent is not added to the shared project update payload

---

### Task 4: Render Selector Chip and Browser-Card Accent Identity States (M2)

**Skills**: mdt-frontend

**Milestone**: M2 — Accent Selection + Selector Identity (BR-1.1-BR-1.3, BR-2.1-BR-2.2, BR-3.1-BR-3.3, BR-4.1-BR-4.3, BR-5.1-BR-5.2)

**Structure**: `src/components/ProjectSelector/ProjectSelectorChip.tsx`, `src/components/ProjectSelector/ProjectSelectorCard.tsx`, `src/components/ProjectSelector/project-selector.css`

**Makes GREEN (Automated Tests)**:
- `TEST-selector-accent-rendering` → `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx`: chip/card accent rendering tests
- `TEST-e2e-project-accent-colors` → `tests/e2e/selector/project-accent-colors.spec.ts`: preset-save, fallback, and identity-render subset

**Makes GREEN (Behavior)**:
- `color_picker_preset_selection` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-1.1, BR-1.2)
- `color_picker_custom_hex` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-1.3)
- `accent_persistence_personal_only` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-2.1, BR-2.2)
- `rail_chip_accent_identity` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-3.1, BR-3.3)
- `rail_fallback_derivation` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-3.2, BR-5.1)
- `rail_fallback_session_stability` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-3.2, BR-5.1)
- `rail_fallback_user_override` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-5.2)
- `browser_card_filled_identity` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-4.1, BR-4.2, BR-4.3)

**Scope**: Implement resolve-at-render accent application for chips and cards, including deterministic fallback, compact left-edge chip stripe, filled browser-card identity area, and no-image default behavior.
**Boundary**: Selector rendering only. No edit-form layout, no shared-config validation, no auth/session changes.

**Creates**:
- (none — existing selector files extended)

**Modifies**:
- `src/components/ProjectSelector/ProjectSelectorChip.tsx` — apply resolved accent per style (gradient, flat, plate) without size growth
- `src/components/ProjectSelector/ProjectSelectorCard.tsx` — add identity slot/fill and consume resolved accent
- `src/components/ProjectSelector/project-selector.css` — chip/card accent variables and compact layout styles
- `src/components/ProjectSelector/ProjectBrowserPanel.test.tsx` — extend browser-card regression coverage
- `src/components/ProjectSelector/ProjectSelectorAccent.test.tsx` — align rendering tests with final markup/classes
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx` — pass accent-bearing project state through browser-panel cards if required
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — preserve current rail ordering while chip rendering changes
- `tests/e2e/selector/project-accent-colors.spec.ts` — keep rendering and selector flow assertions aligned

**Must Not Touch**:
- `domain-contracts/src/app-config/schema.ts`
- `server/repositories/ConfigRepository.ts`
- `src/components/AddProjectModal/AddProjectModal.tsx`
- `src/components/AddProjectModal/components/AccentColorPicker.tsx`

**Exclude**: No image upload/discovery logic, no favorite-ordering refactor, no project-browser search redesign

**Anti-duplication**: Resolve accent, fallback, and foreground from `src/utils/accentColors.ts` — do NOT recompute fallback hashes or contrast logic inside chip/card components.

**Duplication Guard**:
- Check existing chip/card styling before adding new classes; extend current selector CSS instead of creating a parallel stylesheet
- Keep one identity-slot pattern for browser cards; do not introduce separate color and image layouts
- Verify current project search, selection, and favorite ordering logic remains untouched (BR-7.1)

**Verify**:
```bash
bun test src/components/ProjectSelector/ProjectSelectorAccent.test.tsx
bun test src/components/ProjectSelector/ProjectBrowserPanel.test.tsx
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-accent-colors.spec.ts --project=chromium --grep "preset accent saves through selector state and renders on inactive chips and browser cards|fallback accent is stable across reloads and is replaced by a user-selected accent"
```

**Done when**:
- [x] Chip/card rendering tests are GREEN
- [x] Preset/custom accents persist and render on selector chips and browser cards
- [x] Fallback accents are deterministic and replaced by user accents when configured
- [x] Card/chip identity treatment stays dimensionally stable (C3)
- [x] No duplicate fallback or accent-resolution logic exists in components

---

### Task 5: Finalize Theme Derivation and Preserved Selector Interactions (M3)

**Skills**: mdt-frontend, playwright-skill

**Milestone**: M3 — Theme + Preservation (BR-6.1, BR-6.2, BR-7.1, BR-7.2)

**Structure**: `src/components/ProjectSelector/project-selector.css`, `src/components/ProjectSelector/ProjectSelectorCard.tsx`, `tests/e2e/selector/project-accent-colors.spec.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-e2e-project-accent-colors` → `tests/e2e/selector/project-accent-colors.spec.ts`: theme-switch + preserved-interaction subset

**Makes GREEN (Behavior)**:
- `theme_derivation_single_accent` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-6.1, BR-6.2)
- `existing_behavior_preserved` → `tests/e2e/selector/project-accent-colors.spec.ts` (BR-7.1, BR-7.2)

**Scope**: Finish light/dark accent surface treatment, preserve existing selector/browser interactions, and close the remaining end-to-end regression coverage.
**Boundary**: Final selector theming and preserved interactions only. No schema changes, no new persistence flows, no new palette entries.

**Creates**:
- (none)

**Modifies**:
- `src/components/ProjectSelector/project-selector.css` — theme-adaptive accent surfaces and foreground variables
- `src/components/ProjectSelector/ProjectSelectorCard.tsx` — final foreground/application hook-up if theme surfaces need component-level variables
- `src/components/ProjectSelector/ProjectBrowserPanel.test.tsx` — preserve keyboard/focus/browser-panel assumptions while accent styling lands
- `tests/e2e/selector/project-accent-colors.spec.ts` — close theme/preservation assertions

**Must Not Touch**:
- `domain-contracts/src/app-config/schema.ts`
- `server/tests/api/selector.test.ts`
- `src/components/AddProjectModal/AddProjectModal.tsx`
- `src/utils/accentColors.ts` palette membership unless a proven contrast bug is found

**Exclude**: No auth model changes, no read-only storage redesign, no new preset colors, no project ordering changes

**Anti-duplication**: Use the shared accent utility outputs for foreground and theme surfaces — do NOT add a second theme-derivation branch inside E2E helpers or component-local constants.

**Duplication Guard**:
- Keep theme adaptation centralized in selector CSS + shared helpers rather than per-component ad hoc styles
- Verify existing project switching, favorites, search, and keyboard flows still use their current owners
- If preservation fixes touch non-selector behavior, split a follow-up refactor task instead of broadening this task

**Verify**:
```bash
bun test src/components/ProjectSelector/ProjectBrowserPanel.test.tsx
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/selector/project-accent-colors.spec.ts --project=chromium --grep "theme switching keeps the same stored accent across light and dark mode|preset accent saves through selector state and renders on inactive chips and browser cards"
```

**Done when**:
- [x] Theme-switch E2E coverage is GREEN
- [x] Existing selector/browser interactions still work with accent treatment applied
- [x] No second theme-derivation path exists outside shared helpers + selector CSS
- [x] Fallback/absence behavior still matches requirements in both themes

## Post-Implementation

- [x] No duplication (grep check)
- [x] Scope boundaries respected
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Smoke test passes (feature works with real execution)
- [x] Fallback/absence paths match requirements
