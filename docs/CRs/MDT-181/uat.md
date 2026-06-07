# UAT Refinement Brief

## Objective

Move project accent controls from the Edit Project form to the Settings modal, fix the immediate-persistence bug, and wire the reset capability.

## Approved Changes

1. **Accent picker location**: Move from `AddProjectModal` edit form → `SettingsModal` Appearance tab, as a "Project Accents" section showing all registered projects with per-project accent pickers.
2. **Persistence semantics**: Stage accent changes locally; persist only on explicit Save in Settings. Cancel discards changes.
3. **Reset to default**: Add "Reset to default" button per project row; removes stored accent key so project reverts to deterministic fallback.
4. **Edit form cleanup**: Remove the "Your Project Accent" section from `AddProjectModal`.

## Changed Requirement IDs

| ID | Change Type | What Changed |
|----|------------|--------------|
| BR-1.1 | refine_in_place | "Project Edit form" → "Settings > Appearance > Project Accents" |
| BR-1.2 | refine_in_place | "Project Edit form" → "Settings", explicit Save persistence |
| BR-1.3 | refine_in_place | "Project Edit form" → "Settings", explicit Save persistence |
| BR-1.4 | refine_in_place | "Project Edit form" → "Settings" |
| BR-1.5 | refine_in_place | "Project Edit form" → "Settings" |
| BR-2.1 | refine_in_place | "saves a project accent" → "saves in Settings" |
| C7 | refine_in_place | "Edit form shall clearly separate" → "Settings modal, completely separate from Edit Project form" |
| BR-9.1 | additive_change | New: reset to default from Settings |

## Affected Downstream Trace

- **bdd**: scenarios `color_picker_preset_selection`, `color_picker_custom_hex`, `color_picker_invalid_hex_rejected`, `choose_color_external_link` — update UI entry point to Settings
- **architecture**: Flow 1 (Edit Form → Settings), Edit Form Separation → Settings Integration, Structure section
- **tests**: E2E tests need Settings modal interaction instead of edit-form hamburger path
- **tasks**: New tasks for Settings integration; remove edit-form accent task content

## Execution Slices

### Slice 1: Create `ProjectAccents` component for Settings

- **Objective**: New component rendering per-project accent rows with pickers and reset buttons
- **Direct artifacts**: `src/components/SettingsModal/ProjectAccents.tsx`
- **GREEN targets**: Unit test for ProjectAccents rendering
- **Impacted tasks**: TASK-3 (refactored)

### Slice 2: Wire into SettingsModal Appearance tab

- **Objective**: Add "Project Accents" section under Appearance tab; stage changes; Save persists; Cancel discards
- **Direct artifacts**: `src/components/SettingsModal.tsx`
- **GREEN targets**: Settings renders project accents; Save persists; Cancel discards

### Slice 3: Remove accent section from AddProjectModal

- **Objective**: Remove "Your Project Accent" section from edit form; clean up imports
- **Direct artifacts**: `src/components/AddProjectModal/AddProjectModal.tsx`
- **GREEN targets**: Edit form no longer shows accent controls; existing form tests still pass

### Slice 4: Update E2E tests for Settings path

- **Objective**: Rewrite accent E2E tests to use Settings modal instead of edit form; add reset test; add form-save-impacts-UI test
- **Direct artifacts**: `tests/e2e/selector/project-accent-colors.spec.ts`
- **GREEN targets**: All 9+ E2E tests pass via Settings interaction

### Slice 5: Verify and clean up

- **Objective**: Full unit + E2E suite green; validate trace; commit
- **Direct artifacts**: None (validation pass)
- **GREEN targets**: `bun run build`, `bun run validate:ts`, all unit tests, all E2E tests

## Validation

- `spec-trace validate MDT-181 --stage requirements` ✅
- `spec-trace render all MDT-181` ✅
- Unit tests: will run after each slice
- E2E: will run after Slice 4

## Watchlist

- Settings modal is already complex — keep the accents section self-contained in `ProjectAccents.tsx`
- Staging semantics: accent changes must NOT persist until explicit Save (fixes the original bug)
- `AccentColorPicker` component is reused as-is; only its host changes

## Open Decisions

None — all approved.
