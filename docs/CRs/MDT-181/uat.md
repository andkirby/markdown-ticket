# UAT Refinement Brief

## Objective

Replace the "Gradient Accents" toggle with a "Style" dropdown offering three named accent rendering styles (Gradient, Flat, Plate). Add "Plate" as a new style that renders the project code as a colored badge (identity plate concept).

## Approved Changes

1. **Replace `accentGradients: boolean` with `accentStyle: string`**: Schema field change from boolean toggle to string enum (`"gradient"` | `"flat"` | `"plate"`). Default: `"gradient"`.
2. **Replace "Gradient Accents" toggle with "Style" dropdown**: In Settings > Appearance, the second toggle becomes a select dropdown with three named options: Gradient, Flat, Plate.
3. **Add Plate style**: New rendering style where the project code element becomes a colored badge filled with the accent color and computed foreground text. On chips, the code gets a right-rounded accent background. On cards, the code badge replaces the identity area. Foreground auto-selected via `getForegroundForAccent()` for WCAG contrast.
4. **Add Autocolor toggle** (Switch, default on): When on, projects without a user-set accent receive a deterministic fallback color. When off, unconfigured projects show no accent. Reset behavior changes: when autocolor is off and the hex input is empty, reset fills the computed fallback hex into the input.
5. **Migrate data attribute**: Replace `data-accent-gradients="true|false"` with `data-accent-style="gradient|flat|plate"` on chips and cards.
6. **Migrate stored preference**: Existing `accentGradients: true` → `accentStyle: "gradient"`, `accentGradients: false` → `accentStyle: "flat"`.

## Changed Requirement IDs

| ID | Change Type | What Changed |
|----|------------|--------------|
| BR-11.1 | refine_in_place | "gradient accents enabled" → "Gradient style selected" |
| BR-11.2 | refine_in_place | "gradient accents disabled" → "Flat style selected" |
| BR-11.3 | additive_change | New: Plate accent style scenario with auto-contrast foreground |
| BR-12.1 | additive_change | New: Autocolor on — deterministic fallback applied |
| BR-12.2 | additive_change | New: Autocolor off — no fallback, no accent for unconfigured projects |
| BR-12.3 | additive_change | New: Reset fills auto hex when autocolor off and input empty |
| C10 | refine_in_place | Boolean flag → string enum with migration; autocolor flag added |

## Affected Downstream Trace

- **requirements**: Non-ambiguity table entries for gradient mode and accent coloring toggle updated
- **bdd**: BR-11.1, BR-11.2 refined; BR-11.3 added (plate style scenario)
- **architecture**: Accent Rendering Modes → Accent Rendering Styles; data attribute migration; schema change
- **tests**: New E2E test for plate style; existing gradient/flat tests updated for dropdown interaction
- **tasks**: New tasks for schema migration, CSS plate style, component style prop, Settings dropdown

## Execution Slices

### Slice 1: Schema migration — `accentGradients` → `accentStyle`

- **Objective**: Update `SelectorPreferencesSchema` in domain-contracts to replace `accentGradients: boolean` with `accentStyle: z.enum(["gradient", "flat", "plate"])`. Default `"gradient"`. Add migration logic for existing stored values.
- **Direct artifacts**: `domain-contracts/src/app-config/schema.ts`
- **GREEN targets**: Schema parse validates new and legacy values; migration tests pass
- **Impacted tasks**: Schema update task

### Slice 2: CSS — add Plate style rules

- **Objective**: Add CSS rules for `data-accent-style="plate"` on chips and cards. Chip: code element gets accent-filled background, right-rounded corners, computed foreground. Card: same badge treatment, identity area hidden.
- **Direct artifacts**: `src/components/ProjectSelector/project-selector.css`
- **GREEN targets**: Plate style renders correctly in light and dark mode

### Slice 3: Components — wire `accentStyle` prop to data attributes

- **Objective**: Update `ProjectSelectorChip.tsx` and `ProjectSelectorCard.tsx` to read `accentStyle` from preferences and set `data-accent-style` attribute. Remove `data-accent-gradients`.
- **Direct artifacts**: `src/components/ProjectSelector/ProjectSelectorChip.tsx`, `src/components/ProjectSelector/ProjectSelectorCard.tsx`
- **GREEN targets**: Chips and cards render correct style based on preference

### Slice 4: Settings — replace toggle with Style dropdown + Autocolor toggle

- **Objective**: In `ProjectAccents.tsx`, replace "Gradient Accents" Switch with a "Style" select dropdown (Gradient / Flat / Plate). Add "Autocolor" Switch toggle. Persist `accentStyle` and `autocolor` to localStorage. Update reset button behavior for autocolor-off state.
- **Direct artifacts**: `src/components/SettingsModal/ProjectAccents.tsx`
- **GREEN targets**: Dropdown shows three options; autocolor toggle works; reset fills auto hex when appropriate; rendering updates immediately

### Slice 5: E2E tests — add plate scenario, update existing

- **Objective**: Add E2E test for plate style rendering. Update gradient/flat test selectors to use dropdown instead of toggle.
- **Direct artifacts**: `tests/e2e/selector/project-accent-colors.spec.ts`
- **GREEN targets**: All accent E2E tests pass

### Slice 6: Verify and clean up

- **Objective**: Full unit + E2E suite green; validate trace; commit
- **Direct artifacts**: None (validation pass)
- **GREEN targets**: `bun run build`, `bun run validate:ts`, all unit tests, all E2E tests

## Validation

- `spec-trace validate MDT-181 --stage requirements` ✅
- `spec-trace render all MDT-181` ✅
- Unit tests: will run after each slice
- E2E: will run after Slice 5

## Watchlist

- Schema migration: existing `accentGradients` boolean values must gracefully convert to `accentStyle` string
- CSS specificity: plate style must work alongside existing gradient and flat rules without conflicts
- Dark mode: plate badge foreground must remain readable on dark accent backgrounds
- The plate style removes the identity area from cards — ensure layout doesn't shift

## Open Decisions

None — all approved.
