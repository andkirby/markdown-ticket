# Tasks: MDT-129

**Source**: architecture.md + tests.md + bdd.md

## Scope Boundaries

- **Module**: `src/components/ProjectSelector/` — all selector-specific code colocated in this directory
- **Backend**: `server/routes/system.ts` — single `/api/config/selector` endpoint addition
- **Utilities**: `src/utils/selectorOrdering.ts` — pure ordering functions
- **Boundary**: No changes to board, list, or documents views; no changes to unrelated navigation controls

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Project switching | `src/hooks/useProjectManager.ts` | N/A — using existing `setSelectedProject` |
| Load selector config | `src/components/ProjectSelector/useSelectorData.ts` | N/A — new module |
| Compute visible subset | `src/components/ProjectSelector/useProjectSelectorManager.ts` | N/A — new module |
| Ordering logic | `src/utils/selectorOrdering.ts` | N/A — new module |
| Render rail | `src/components/ProjectSelector/ProjectSelectorRail.tsx` | N/A — new module |
| Render panel | `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | N/A — new module |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1, Task 4 |
| C2 | Task 1, Task 4 |
| C3 | Task 8 |
| C4 | Task 5 |
| C5 | Task 6 |
| C6 | Task 1, Task 4 |
| C7 | Task 3, Task 7 |
| C8 | Task 5 |
| C9 | Task 6 |
| C10 | Task 1, Task 4 |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M0: Walking Skeleton | — | Task 1-4 | Backend endpoint works, types/hooks compile |
| M1: Active Card + Launcher | BR-1.1, BR-3.1, BR-3.3, BR-6.1 | Task 5-7 | `active_project_larger_card`, `launcher_single_control`, `active_project_first` GREEN |
| M2: Inactive Chips | BR-2.1 | Task 8 | `inactive_compact_cards` GREEN |
| M3: Panel | BR-3.2, BR-4.1, BR-4.2, BR-4.3 | Task 9-10 | `launcher_opens_panel`, `panel_displays_all_projects` GREEN |
| M4: Selection | BR-5.1, BR-5.2 | Task 11-12 | `select_from_rail`, `select_from_panel` GREEN |
| M5: Responsive + Edge | BR-9.1, BR-9.2, Edge-1, Edge-2, Edge-3, BR-7.3 | Task 13-14 | All edge case scenarios GREEN |

## Tasks

### Task 1: Types for Project Selector (M0)

**Skills**: frontend-react-component

**Structure**: `src/components/ProjectSelector/types.ts`

**Makes GREEN (unit)**:
- `src/utils/selectorOrdering.test.ts`: Type definitions compile

**Scope**: TypeScript interfaces and types for selector components
**Boundary**: Types only — no runtime logic

**Creates**:
- `src/components/ProjectSelector/types.ts`

**Modifies**:
- None

**Must Not Touch**:
- Any existing component files
- `src/hooks/useProjectManager.ts`

**Create/Move**:
- `ProjectSelectorProps` interface
- `ProjectWithSelectorState` interface (extends Project with favorite, lastUsedAt, count)
- `SelectorPreferences` interface (visibleCount, compactInactive)
- `SelectorState` interface (record keyed by project code)

**Exclude**: Runtime functions or hooks

**Anti-duplication**: Import `Project` from `@mdt/shared/models/Project` — do NOT copy

**Duplication Guard**:
- Check `@mdt/shared/models/Project.ts` for existing Project type
- If extending Project, use `extends` or intersection types
- Verify no second runtime owner was introduced

**Verify**:
```bash
npm run validate:ts -- src/components/ProjectSelector/types.ts
```

**Done when**:
- [ ] Types compile without errors
- [ ] No duplicated Project type definition
- [ ] Smoke test passes (tsc --noEmit succeeds)

---

### Task 2: Ordering Utilities (M0)

**Skills**: frontend-react-component

**Structure**: `src/utils/selectorOrdering.ts`

**Makes GREEN (unit)**:
- `src/utils/selectorOrdering.test.ts`: All 15 tests

**Scope**: Pure ordering functions for rail and panel
**Boundary**: No I/O, no state management, no React dependencies

**Creates**:
- `src/utils/selectorOrdering.ts`

**Modifies**:
- None

**Must Not Touch**:
- Any component files
- Backend code

**Create/Move**:
- `orderProjectsForRail(projects, activeProjectCode, selectorState, visibleCount)` — returns ordered visible subset
- `orderProjectsForPanel(projects, selectorState)` — returns full list ordered for panel
- Helper: `compareFavorites(a, b)` — by count desc, then lastUsedAt desc
- Helper: `compareNonFavorites(a, b)` — by lastUsedAt desc, then count desc

**Exclude**: DOM manipulation, async operations

**Anti-duplication**: None — new module

**Duplication Guard**:
- Check existing utils for sorting logic before implementing
- If similar logic exists in components, extract to this file instead
- Verify no second runtime owner was introduced

**Verify**:
```bash
npm test -- src/utils/selectorOrdering.test.ts
```

**Done when**:
- [ ] All 15 unit tests GREEN (were RED)
- [ ] No duplicated logic
- [ ] Pure functions only (no side effects)

---

### Task 3: Backend Endpoint for Selector Config (M0)

**Skills**: architecture-patterns

**Structure**: `server/routes/system.ts`

**Makes GREEN (unit)**:
- `server/tests/api/selector.test.ts`: BR-7.1, BR-7.2, BR-7.3, BR-8.5, BR-8.6, BR-8.7, BR-10.1-10.7 (20 tests)

**Scope**: Single `/api/config/selector` endpoint returning preferences + selector state
**Boundary**: Read-only endpoint, no modification of existing endpoints

**Creates**:
- None (modifies existing file)

**Modifies**:
- `server/routes/system.ts` — add GET `/api/config/selector` endpoint

**Must Not Touch**:
- Other route files
- Frontend code

**Create/Move**:
- Add endpoint handler for `/api/config/selector`
- Read `CONFIG_DIR/user.toml` → parse `[ui.projectSelector]` section
- Read `CONFIG_DIR/project-selector.json` → parse JSON state
- Return `{ preferences: { visibleCount, compactInactive }, selectorState: Record<string, SelectorEntry> }`
- Implement fallbacks: defaults (visibleCount=7, compactInactive=true) when missing; empty state `{}` when missing
- Implement validation per BR-10: drop invalid entries, handle field-level errors gracefully

**Exclude**: POST/PUT endpoints (read-only for now)

**Anti-duplication**: Import `getConfigDir` from `@mdt/shared/utils/constants.js` — do NOT copy

**Duplication Guard**:
- Check existing `/api/config/*` endpoints for TOML parsing patterns
- Reuse existing TOML parsing approach from `/api/config/links`
- Verify no second config reader introduced

**Verify**:
```bash
cd server && npm test -- tests/api/selector.test.ts
```

**Done when**:
- [ ] All 20 API unit tests GREEN (were RED)
- [ ] No duplicated config reading logic
- [ ] Endpoint returns correct fallbacks for missing files
- [ ] Invalid entries dropped per BR-10

---

### Task 4: Selector Data Hook (M0)

**Skills**: frontend-react-component

**Structure**: `src/components/ProjectSelector/useSelectorData.ts`

**Makes GREEN (unit)**:
- `src/utils/selectorOrdering.test.ts`: Hook compiles with types

**Scope**: Fetch preferences + state from `/api/config/selector`, manage favorites and usage tracking
**Boundary**: Data fetching and persistence triggers only — no ordering logic, no DOM

**Creates**:
- `src/components/ProjectSelector/useSelectorData.ts`

**Modifies**:
- None

**Must Not Touch**:
- `src/hooks/useProjectManager.ts`
- `src/utils/selectorOrdering.ts`

**Create/Move**:
- `useSelectorData()` hook
- `fetchSelectorData()` — calls `/api/config/selector` on mount
- `toggleFavorite(projectCode)` — updates favorite field, triggers debounced persist
- `trackUsage(projectCode)` — updates lastUsedAt and count, triggers debounced persist
- Private: `debouncedPersistState()` — writes to `project-selector.json` via backend (future: POST endpoint)
- For now: persist by calling backend (or skip persistence until Task 11)

**Exclude**: Ordering logic, rendering

**Anti-duplication**: Import types from `./types.ts` — do NOT copy

**Duplication Guard**:
- Check `src/hooks/useProjectManager.ts` for similar fetch patterns
- If similar, extract shared pattern but keep selector-specific logic separate
- Verify no second fetch owner introduced

**Verify**:
```bash
npm run validate:ts -- src/components/ProjectSelector/useSelectorData.ts
```

**Done when**:
- [ ] Hook compiles without errors
- [ ] No duplicated fetch logic
- [ ] Types imported from types.ts

---

### Task 5: Launcher Button Component (M1)

**Skills**: frontend-react-component

**Milestone**: M1 — Active Card + Launcher (BR-3.1, BR-3.3)

**Structure**: `src/components/ProjectSelector/LauncherButton.tsx`

**Makes GREEN (BDD)**:
- `launcher_single_control` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-3.1)
- `launcher_acclaim_icon` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-3.3)

**Enables (BDD)**:
- `launcher_opens_panel` (BR-3.2) — needs Task 9 to complete

**Scope**: Single launcher button using acclaim.svg icon
**Boundary**: Button only — no panel state management

**Creates**:
- `src/components/ProjectSelector/LauncherButton.tsx`

**Modifies**:
- None

**Must Not Touch**:
- Panel components
- `src/hooks/useProjectManager.ts`

**Create/Move**:
- `LauncherButton` component with `onClick` prop
- Render `designs/acclaim.svg` as icon
- Add `data-testid="selector-launcher"` to button
- Add `data-testid="launcher-acclaim-icon"` to icon element

**Exclude**: Panel open/close logic

**Anti-duplication**: Import SVG via Vite's `?react` suffix or inline — check existing icon patterns

**Duplication Guard**:
- Check existing components for SVG icon patterns
- Use consistent approach with rest of codebase
- Verify no second icon pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-rail.spec.ts --grep="launcher"
```

**Done when**:
- [ ] E2E tests for launcher visibility GREEN (were RED)
- [ ] Acclaim icon visible
- [ ] No duplicated icon logic

---

### Task 6: Active Project Card Component (M1)

**Skills**: frontend-react-component

**Milestone**: M1 — Active Card + Launcher (BR-1.1, BR-1.2)

**Structure**: `src/components/ProjectSelector/ProjectSelectorCard.tsx`

**Makes GREEN (BDD)**:
- `active_project_larger_card` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-1.1)
- `active_project_favorite_indicator` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-1.2)

**Scope**: Expanded card for active project with code, title, and optional favorite indicator
**Boundary**: Card component only — no selection logic

**Creates**:
- `src/components/ProjectSelector/ProjectSelectorCard.tsx`

**Modifies**:
- None

**Must Not Touch**:
- Rail composition
- Panel components

**Create/Move**:
- `ProjectSelectorCard` component with `project`, `isFavorite`, `onToggleFavorite` props
- Render project code (larger font) and title
- Render favorite icon when `isFavorite=true`
- Add `data-testid="selector-active-project-card"` to container
- Add `data-testid="active-project-code"` to code element
- Add `data-testid="active-project-title"` to title element
- Add `data-testid="active-project-favorite-icon"` to favorite indicator

**Exclude**: Compact/inactive card variant

**Anti-duplication**: Import types from `./types.ts` — do NOT copy

**Duplication Guard**:
- Check existing `ProjectSelector.tsx` for active button patterns
- Extract active card styling from existing component
- Verify no second active card pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-rail.spec.ts --grep="active.*card"
```

**Done when**:
- [ ] E2E tests for active card visibility GREEN (were RED)
- [ ] Code and title visible
- [ ] No duplicated card logic

---

### Task 7: Project Selector Rail Component (M1 — checkpoint)

**Skills**: frontend-react-component

**Milestone**: M1 — Active Card + Launcher (BR-1.3, BR-6.1, BR-6.2)

**Structure**: `src/components/ProjectSelector/ProjectSelectorRail.tsx`

**Makes GREEN (BDD)**:
- `active_project_first` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-6.1)
- `active_project_always_visible` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-1.3)
- `favorites_before_non_favorites` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-6.2)

**Enables (BDD)**:
- `inactive_compact_cards` (BR-2.1) — needs Task 8 to complete

**Scope**: Horizontal rail rendering active card, inactive chips, and launcher
**Boundary**: Rail composition only — no panel management

**Creates**:
- `src/components/ProjectSelector/ProjectSelectorRail.tsx`

**Modifies**:
- None

**Must Not Touch**:
- `ProjectBrowserPanel.tsx`
- `src/hooks/useProjectManager.ts`

**Create/Move**:
- `ProjectSelectorRail` component
- Render `ProjectSelectorCard` for active project (first position)
- Placeholder for inactive chips (Task 8)
- Render `LauncherButton` at end
- Add `data-testid="selector-rail"` to container
- Apply ordering rules via `useProjectSelectorManager` hook

**Exclude**: Panel open/close, panel rendering

**Anti-duplication**: Import `ProjectSelectorCard` from `./ProjectSelectorCard.tsx` — do NOT copy

**Duplication Guard**:
- Check existing `ProjectSelector.tsx` for rail layout patterns
- Reuse horizontal scroll area pattern if applicable
- Verify no second rail layout introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-rail.spec.ts
```

**Done when**:
- [ ] All M1 BDD scenarios GREEN (were RED)
- [ ] Active project first in rail
- [ ] Active project visible even with many projects
- [ ] No duplicated rail logic

---

### Task 8: Inactive Project Chip Component (M2 — checkpoint)

**Skills**: frontend-react-component

**Milestone**: M2 — Inactive Chips (BR-2.1)

**Structure**: `src/components/ProjectSelector/ProjectSelectorChip.tsx`

**Makes GREEN (BDD)**:
- `inactive_compact_cards` → `tests/e2e/selector/MDT-129-rail.spec.ts` (BR-2.1)

**Scope**: Compact code-only chip for inactive visible projects
**Boundary**: Chip component only — no active card variant

**Creates**:
- `src/components/ProjectSelector/ProjectSelectorChip.tsx`

**Modifies**:
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — integrate chips into rail

**Must Not Touch**:
- `ProjectSelectorCard.tsx`
- Panel components

**Create/Move**:
- `ProjectSelectorChip` component with `project`, `onClick` props
- Render project code only (compact style)
- Add `data-testid="selector-inactive-project-card-{CODE}"` to container
- Add `data-testid="inactive-project-code"` to code element
- Integrate into `ProjectSelectorRail` after active card, before launcher

**Exclude**: Medium card variant (future enhancement)

**Anti-duplication**: Import types from `./types.ts` — do NOT copy

**Duplication Guard**:
- Check existing `ProjectSelector.tsx` for inactive button patterns
- Extract compact styling from existing component
- Verify no second chip pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-rail.spec.ts --grep="inactive"
```

**Done when**:
- [ ] E2E test for inactive compact cards GREEN (was RED)
- [ ] Code-only chips visible
- [ ] No duplicated chip logic

---

### Task 9: Project Browser Panel Component (M3)

**Skills**: frontend-react-component

**Milestone**: M3 — Panel (BR-3.2, BR-4.1)

**Structure**: `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Makes GREEN (BDD)**:
- `launcher_opens_panel` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-3.2)
- `panel_displays_all_projects` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-4.1)

**Enables (BDD)**:
- `panel_shows_favorites` (BR-4.2) — needs Task 10 to complete
- `panel_orders_favorites_first` (BR-4.3) — needs Task 10 to complete

**Scope**: Full project list panel anchored below selector
**Boundary**: Panel rendering only — no rail composition

**Creates**:
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Modifies**:
- None

**Must Not Touch**:
- `ProjectSelectorRail.tsx`
- `src/hooks/useProjectManager.ts`

**Create/Move**:
- `ProjectBrowserPanel` component with `projects`, `isOpen`, `onProjectSelect`, `onClose` props
- Render all projects as cards with code, title, description
- Position panel directly below rail (CSS relative/absolute)
- Add `data-testid="selector-panel"` to container
- Add `data-testid="panel-project-card"` to each card
- Add `data-testid="panel-project-code"`, `panel-project-title`, `panel-project-description` to card elements

**Exclude**: Favorite indicators (Task 10), selection logic (Task 11)

**Anti-duplication**: Import types from `./types.ts` — do NOT copy

**Duplication Guard**:
- Check existing modal/dropdown patterns in codebase
- Use consistent overlay approach
- Verify no second panel pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-panel.spec.ts --grep="panel.*displays|launcher.*opens"
```

**Done when**:
- [ ] E2E tests for panel opening GREEN (were RED)
- [ ] Panel shows all projects
- [ ] No duplicated panel logic

---

### Task 10: Panel Favorite Indicators + Ordering (M3 — checkpoint)

**Skills**: frontend-react-component

**Milestone**: M3 — Panel (BR-4.2, BR-4.3)

**Structure**: `src/components/ProjectSelector/ProjectBrowserPanel.tsx`

**Makes GREEN (BDD)**:
- `panel_shows_favorites` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-4.2)
- `panel_orders_favorites_first` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-4.3)

**Scope**: Add favorite indicators and ordering to panel
**Boundary**: Modify panel only — no rail changes

**Creates**:
- None

**Modifies**:
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx` — add favorites, ordering

**Must Not Touch**:
- `ProjectSelectorRail.tsx`
- `src/utils/selectorOrdering.ts`

**Create/Move**:
- Add favorite icon to panel cards when `isFavorite=true`
- Add `data-testid="panel-project-favorite-icon"` to favorite indicator
- Apply `orderProjectsForPanel()` for favorites-first ordering
- Ensure favorites sorted by count desc, lastUsedAt desc
- Ensure non-favorites sorted by lastUsedAt desc, count desc

**Exclude**: Toggle favorite functionality (uses existing from useSelectorData)

**Anti-duplication**: Import `orderProjectsForPanel` from `src/utils/selectorOrdering.ts` — do NOT copy

**Duplication Guard**:
- Use existing ordering function from selectorOrdering.ts
- Do not implement inline sorting
- Verify no second ordering implementation

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-panel.spec.ts
```

**Done when**:
- [ ] All M3 BDD scenarios GREEN (were RED)
- [ ] Favorite icons visible on favorited projects
- [ ] Favorites appear first in panel
- [ ] No duplicated ordering logic

---

### Task 11: Project Selection Manager Hook (M4)

**Skills**: frontend-react-component

**Milestone**: M4 — Selection (BR-5.1, BR-5.2)

**Structure**: `src/components/ProjectSelector/useProjectSelectorManager.ts`

**Makes GREEN (unit)**:
- `src/utils/selectorOrdering.test.ts`: Hook uses ordering correctly

**Scope**: Hook to compute visible subset and coordinate selection
**Boundary**: Logic hook only — no rendering

**Creates**:
- `src/components/ProjectSelector/useProjectSelectorManager.ts`

**Modifies**:
- None

**Must Not Touch**:
- `src/hooks/useProjectManager.ts`
- `src/utils/selectorOrdering.ts`

**Create/Move**:
- `useProjectSelectorManager(projects, activeProject, preferences, selectorState)` hook
- Compute visible subset using `orderProjectsForRail()`
- Return `{ visibleProjects, selectProject }`
- `selectProject` calls `useProjectManager.setSelectedProject` and `useSelectorData.trackUsage`

**Exclude**: DOM rendering

**Anti-duplication**: Import `orderProjectsForRail` from `src/utils/selectorOrdering.ts` — do NOT copy

**Duplication Guard**:
- Use existing ordering function from selectorOrdering.ts
- Do not implement inline sorting
- Verify no second ordering implementation

**Verify**:
```bash
npm run validate:ts -- src/components/ProjectSelector/useProjectSelectorManager.ts
```

**Done when**:
- [ ] Hook compiles without errors
- [ ] Uses ordering utilities correctly
- [ ] No duplicated logic

---

### Task 12: Main Index Component + Selection Integration (M4 — checkpoint)

**Skills**: frontend-react-component

**Milestone**: M4 — Selection (BR-5.1, BR-5.2)

**Structure**: `src/components/ProjectSelector/index.tsx`

**Makes GREEN (BDD)**:
- `select_from_rail` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-5.1)
- `select_from_panel` → `tests/e2e/selector/MDT-129-panel.spec.ts` (BR-5.2)

**Scope**: Main composition component coordinating rail, panel, and selection
**Boundary**: Composition only — delegates to sub-components

**Creates**:
- `src/components/ProjectSelector/index.tsx`

**Modifies**:
- Replace usage of old `src/components/ProjectSelector.tsx` with new component

**Must Not Touch**:
- `src/hooks/useProjectManager.ts` (use existing `setSelectedProject`)

**Create/Move**:
- `ProjectSelector` component (main export)
- Compose `ProjectSelectorRail` + `ProjectBrowserPanel`
- Own panel open/close state (`useState`)
- Pass `onProjectSelect` callback to both rail and panel
- On panel selection: close panel after selection
- Connect to `useSelectorData` and `useProjectSelectorManager`

**Exclude**: Direct project switching logic (delegate to useProjectManager)

**Anti-duplication**: Import all sub-components — do NOT inline

**Duplication Guard**:
- Check existing `ProjectSelector.tsx` for interface compatibility
- Maintain same props interface for drop-in replacement
- Verify no second selector component introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-panel.spec.ts --grep="select"
```

**Done when**:
- [ ] All M4 BDD scenarios GREEN (were RED)
- [ ] Selection from rail works
- [ ] Selection from panel works (and closes panel)
- [ ] No duplicated selection logic

---

### Task 13: Responsive Collapse (M5)

**Skills**: frontend-react-component

**Milestone**: M5 — Responsive + Edge (BR-9.1, BR-9.2)

**Structure**: `src/components/ProjectSelector/ProjectSelectorRail.tsx`

**Makes GREEN (BDD)**:
- `mobile_shows_active_and_launcher` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (BR-9.1)
- `mobile_launcher_access` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (BR-9.2)

**Scope**: Responsive behavior for mobile viewports
**Boundary**: Rail component only

**Creates**:
- None

**Modifies**:
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — add responsive collapse

**Must Not Touch**:
- Panel component
- Ordering logic

**Create/Move**:
- Detect mobile viewport (CSS media query or useMediaQuery hook)
- On mobile: render only active card + launcher (no inactive chips)
- Ensure panel remains accessible via launcher on mobile

**Exclude**: Changes to panel behavior

**Anti-duplication**: Check existing responsive patterns in codebase

**Duplication Guard**:
- Use existing responsive utilities if available
- Verify no second responsive pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-edge-cases.spec.ts --grep="mobile"
```

**Done when**:
- [ ] E2E tests for mobile GREEN (were RED)
- [ ] Only active + launcher visible on mobile
- [ ] Panel accessible from mobile

---

### Task 14: Edge Cases + Final Integration (M5 — checkpoint)

**Skills**: frontend-react-component

**Milestone**: M5 — Responsive + Edge (Edge-1, Edge-2, Edge-3, BR-7.3)

**Structure**: Multiple files

**Makes GREEN (BDD)**:
- `long_titles_no_break` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (Edge-1)
- `fewer_projects_than_visible` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (Edge-2)
- `no_favorite_spacing_ok` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (Edge-3)
- `config_fallback` → `tests/e2e/selector/MDT-129-edge-cases.spec.ts` (BR-7.3)

**Scope**: Handle edge cases for layout, data conditions, and config fallbacks
**Boundary**: Fix edge cases without breaking main flows

**Creates**:
- None

**Modifies**:
- `src/components/ProjectSelector/ProjectSelectorCard.tsx` — truncate long titles
- `src/components/ProjectSelector/ProjectBrowserPanel.tsx` — truncate long titles
- `src/components/ProjectSelector/ProjectSelectorRail.tsx` — handle fewer projects
- `src/components/ProjectSelector/useSelectorData.ts` — ensure fallback defaults work

**Must Not Touch**:
- Core ordering logic
- Backend endpoint

**Create/Move**:
- Add CSS truncation for long titles in cards and panels
- Handle case when project count < visibleCount (show all, no error)
- Ensure layout doesn't break when no favorites exist
- Verify config fallback defaults work when user.toml missing

**Exclude**: Changes to test files

**Anti-duplication**: Use existing CSS utility classes for truncation

**Duplication Guard**:
- Check existing truncation patterns in codebase
- Use consistent approach
- Verify no second truncation pattern introduced

**Verify**:
```bash
npm run test:e2e -- tests/e2e/selector/MDT-129-edge-cases.spec.ts
```

**Done when**:
- [ ] All edge case BDD scenarios GREEN (were RED)
- [ ] Long titles truncated, not broken
- [ ] Fewer projects handled gracefully
- [ ] No favorite spacing correct
- [ ] Config fallback works
- [ ] No duplicated CSS patterns

---

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| src/components/ProjectSelector/ | 9 | 9 | 0 | ✅ |
| src/utils/ | 1 | 1 | 0 | ✅ |
| server/routes/ | 1 | 1 | 0 | ✅ |

**Coverage Details**:

| File | Task(s) | Coverage |
|------|---------|----------|
| `src/components/ProjectSelector/index.tsx` | Task 12 | ✅ |
| `src/components/ProjectSelector/ProjectSelectorRail.tsx` | Task 7, Task 8, Task 13 | ✅ |
| `src/components/ProjectSelector/ProjectSelectorCard.tsx` | Task 6, Task 14 | ✅ |
| `src/components/ProjectSelector/ProjectSelectorChip.tsx` | Task 8 | ✅ |
| `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | Task 9, Task 10, Task 14 | ✅ |
| `src/components/ProjectSelector/LauncherButton.tsx` | Task 5 | ✅ |
| `src/components/ProjectSelector/types.ts` | Task 1 | ✅ |
| `src/components/ProjectSelector/useSelectorData.ts` | Task 4, Task 14 | ✅ |
| `src/components/ProjectSelector/useProjectSelectorManager.ts` | Task 11 | ✅ |
| `src/utils/selectorOrdering.ts` | Task 2 | ✅ |
| `server/routes/system.ts` | Task 3 | ✅ |

## Post-Implementation

- [ ] No duplication (grep check)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test passes (selector works with real execution)
- [ ] Fallback/absence paths match requirements (config missing, state missing)

## Post-Verify Fixes (appended by implement-agentic)

*No fixes yet — will be appended if `/mdt:verify-complete` finds CRITICAL/HIGH issues*
