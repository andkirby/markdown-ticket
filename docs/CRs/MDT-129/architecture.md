# Architecture

## Rationale

# Architecture Narrative

## Overview

Redesigns the project selector from a uniform horizontal list into a tiered rail+panel system. The active project displays as an expanded card, inactive visible projects as compact code-only chips (or medium cards per preference), and a trailing launcher opens a full project browser panel directly below the rail. User preferences are loaded from `CONFIG_DIR/user.toml`; mutable selector state (favorites, usage) persists to `CONFIG_DIR/project-selector.json`. Design philosophy prioritizes visual hierarchy, progressive disclosure, and deterministic ordering.

## Pattern

**Progressive Disclosure with Anchored Overlay** — The rail shows minimal context (active + preference-driven inactive items), the panel reveals full detail on demand. This pattern fits because project selection is a frequent but secondary action; users need quick visual confirmation of current context without navigational clutter.

## Key Dependencies

| Capability | Decision | Scope | Rationale |
|------------|----------|-------|-----------|
| Selector data (preferences + state) | Read `CONFIG_DIR/user.toml` and `CONFIG_DIR/project-selector.json` via single `/api/config/selector` endpoint | runtime | One app-init fetch; backend reads both files and returns `{preferences, selectorState}`; C10 preserved at file layer |
| Panel positioning | CSS relative/absolute | runtime | No external library needed; anchored overlay is trivial with Tailwind |
| Animation | CSS transitions | runtime | Panel open/close uses Tailwind transition utilities |

## Runtime Prerequisites

| Dependency | Type | Required | When Absent |
|------------|------|----------|-------------|
| `CONFIG_DIR/user.toml` | config file | No | Falls back to defaults: `visibleCount=7`, `compactInactive=true` |
| `CONFIG_DIR/project-selector.json` | state file | No | Initializes empty state `{}` |
| `designs/acclaim.svg` | asset | Yes | Launcher icon missing; fallback to text label |
| `/api/config/selector` | endpoint | No | Selector uses default preferences and empty state |

## Test vs Runtime Separation

| Runtime Module | Test Scaffolding | Separation Rule |
|----------------|------------------|-----------------|
| `src/components/ProjectSelector/` | `tests/e2e/selector/MDT-129*.spec.ts` | E2E tests exercise full stack; no unit test mocks of internal component state |
| `src/utils/selectorOrdering.ts` | Jest unit tests | Pure function; test ordering rules in isolation |
| `src/components/ProjectSelector/useSelectorData.ts` | Jest with mock fetch | Hook logic testable with mocked API responses |

## Structure

```
src/
├── components/
│   └── ProjectSelector/              # All selector-specific code colocated
│       ├── index.tsx                 # Public export, renders rail + panel container; owns panel open state
│       ├── ProjectSelectorRail.tsx   # Active card + inactive chips + launcher
│       ├── ProjectSelectorCard.tsx   # Active project expanded card (code + title + favorite)
│       ├── ProjectSelectorChip.tsx   # Inactive compact code-only or medium card
│       ├── ProjectBrowserPanel.tsx   # Full project list overlay panel
│       ├── LauncherButton.tsx        # Trailing launcher using acclaim.svg
│       ├── types.ts                  # ProjectSelectorProps, ProjectWithSelectorState
│       ├── useSelectorData.ts        # Fetches preferences + state via /api/config/selector; manages favorites, usage, persistence (debounced write is a private utility within this file)
│       └── useProjectSelectorManager.ts # Computes visible subset using ordering rules
├── hooks/
│   └── useProjectManager.ts          # Existing — provides onProjectSelect
└── utils/
    └── selectorOrdering.ts           # Pure functions for rail/panel ordering (reusable)

server/
└── routes/
    └── system.ts                     # Add /api/config/selector endpoint (reads user.toml + project-selector.json, returns {preferences, selectorState})
```

## Module Boundaries

| Module | Owns | Must Not |
|--------|------|----------|
| `ProjectSelector/index.tsx` | Composition of rail + panel, visibility coordination, panel open/close state | Direct project switching logic |
| `ProjectSelectorRail.tsx` | Rendering active card, chips, launcher in horizontal layout; responsive collapse | Panel state management |
| `ProjectBrowserPanel.tsx` | Full project list, favorite indicators, panel positioning | Rail composition |
| `ProjectSelector/useProjectSelectorManager.ts` | Computing visible subset from projects + config + selector state | DOM rendering, persistence |
| `ProjectSelector/useSelectorData.ts` | Fetching `{preferences, selectorState}` from `/api/config/selector`; managing favorite toggle, usage tracking, persistence triggers; debounced write utility (private) | Ordering logic, DOM rendering |
| `selectorOrdering.ts` | Pure ordering functions (active-first, favorites-by-count, non-favorites-by-recency) | I/O, state management |
| `server/routes/system.ts` | Serving `/api/config/selector` (reads both config files, returns combined response) | Frontend UI logic |

## Architecture Invariants

- `one transition authority`: `useProjectManager.setSelectedProject` remains the single source for project switching; rail and panel both invoke the same callback.
- `one processing orchestration path`: visible subset computed in `useProjectSelectorManager` once using ordering rules from `selectorOrdering.ts`; rail and panel consume the same derived state.
- `one data fetch`: `useSelectorData` performs a single fetch on init; both preferences and mutable state arrive in one response.
- `no test-only logic in runtime files`: panel state and selector data hooks work identically in tests and production.
- `persistence timing`: usage state writes occur shortly after project selection with debounce, not on shutdown.

## Error Philosophy

Config fetch failures fall back silently to default values (`visibleCount=7`, `compactInactive=true`). The selector remains functional; users see a working UI without indication that configuration failed.

If `project-selector.json` is missing or invalid JSON, the system initializes empty state `{}`.

**Invalid entry handling (per BR-10):**
- Per-project entries with invalid structure are **dropped entirely**; valid entries load normally.
- Within a valid entry, individual field failures are handled gracefully:
  - `favorite` not boolean → field dropped (treated as false)
  - `lastUsedAt` not valid ISO-8601 → field dropped (treated as never used)
  - `count` not integer >= 0 → treated as 0
- Unknown fields in either file are ignored safely.

If persistence writes fail, the UI continues to display current favorite and usage state optimistically. On next app load, state reverts to last successfully persisted values. No error modal is shown; degradation is silent.

## Extension Rule

To add a new selector view mode (e.g., grid): create `ProjectSelectorGrid.tsx`, add mode to `ViewModeSwitcher`, extend `useProjectSelectorManager` to provide grid-specific data. No changes to rail, panel, or ordering logic.

## Obligations

- Prioritize active project to remain visible in rail even when it would fall outside normal visible subset based on ordering rules (`OBL-active-project-always-visible`)
  Derived From: `BR-1.3`, `BR-6.5`, `C7`
  Artifacts: `ART-selector-manager-hook`, `ART-ordering-utils`, `ART-selector-rail`
- Display active project as larger card containing code and title with favorite indicator when favorited (`OBL-active-project-card-display`)
  Derived From: `BR-1.1`, `BR-1.2`
  Artifacts: `ART-selector-card`, `ART-selector-rail`, `ART-selector-index`, `ART-selector-types`
- Validate config values: visibleCount >=1 integer, compactInactive boolean; drop invalid project-state entries or fields; ignore unknown fields (`OBL-config-validation`)
  Derived From: `BR-10.1`, `BR-10.2`, `BR-10.3`, `BR-10.4`, `BR-10.5`, `BR-10.6`, `BR-10.7`
  Artifacts: `ART-selector-data-hook`, `ART-server-system-routes`, `ART-config-user-toml`, `ART-config-selector-state`
- Load visibleCount and compactInactive from user.toml [ui.projectSelector]; fall back to defaults (visibleCount=7, compactInactive=true) when missing or invalid (`OBL-configuration-load-and-defaults`)
  Derived From: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `C6`, `C10`
  Artifacts: `ART-selector-data-hook`, `ART-server-system-routes`, `ART-config-user-toml`
- Render inactive visible rail projects as compact code-only chips (compactInactive=true) or medium cards (compactInactive=false) (`OBL-inactive-projects-display-mode`)
  Derived From: `BR-2.1`, `BR-2.2`, `BR-2.3`
  Artifacts: `ART-selector-chip`, `ART-selector-rail`, `ART-config-user-toml`
- Display single launcher control at rail end using acclaim.svg; clicking opens panel directly below selector showing full project list (`OBL-launcher-and-panel-flow`)
  Derived From: `BR-3.1`, `BR-3.2`, `BR-3.3`, `C4`, `C5`, `C8`
  Artifacts: `ART-launcher-button`, `ART-browser-panel`, `ART-selector-index`, `ART-asset-acclaim-svg`
- Load selector data from single /api/config/selector endpoint combining user.toml preferences and project-selector.json state (`OBL-load-selector-data`)
  Derived From: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-8.5`, `BR-8.6`, `C1`, `C2`, `C10`
  Artifacts: `ART-selector-data-hook`, `ART-server-system-routes`, `ART-config-user-toml`, `ART-config-selector-state`
- Panel displays all registered projects as cards with code, title, description; favorites first (by count desc, lastUsedAt desc), then non-favorites (by lastUsedAt desc, count desc) (`OBL-panel-displays-full-list`)
  Derived From: `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-4.5`, `C9`
  Artifacts: `ART-browser-panel`, `ART-ordering-utils`, `ART-selector-manager-hook`
- Project selection from rail or panel changes current project via useProjectManager.setSelectedProject and updates usage state (lastUsedAt timestamp, increment count) (`OBL-project-switching-flow`)
  Derived From: `BR-5.1`, `BR-5.2`, `BR-5.3`, `BR-5.4`, `BR-5.5`, `C3`
  Artifacts: `ART-selector-rail`, `ART-browser-panel`, `ART-selector-data-hook`, `ART-hook-project-manager`, `ART-config-selector-state`
- Display active project first, then favorites (by count desc, lastUsedAt desc), then non-favorites (by lastUsedAt desc, count desc) within visibleCount limit (`OBL-rail-ordering`)
  Derived From: `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`
  Artifacts: `ART-selector-manager-hook`, `ART-ordering-utils`, `ART-selector-rail`, `ART-config-user-toml`
- On mobile viewport, display only active project card and launcher; activating launcher provides access to remaining projects with same state model (`OBL-responsive-collapse`)
  Derived From: `BR-9.1`, `BR-9.2`, `BR-9.3`
  Artifacts: `ART-selector-rail`, `ART-selector-index`, `ART-browser-panel`
- Persist selector state (favorite, lastUsedAt, count per project) to project-selector.json keyed by project code; write shortly after selection changes; handle missing or invalid JSON gracefully (`OBL-state-persistence`)
  Derived From: `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `C2`, `C3`, `C10`
  Artifacts: `ART-selector-data-hook`, `ART-config-selector-state`, `ART-server-system-routes`
- E2E tests for selector behavior covering BR-1 through BR-10; Jest unit tests for ordering and data hook logic (`OBL-test-coverage`)
  Derived From: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`, `BR-2.2`, `BR-2.3`, `BR-3.1`, `BR-3.2`, `BR-3.3`, `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-4.5`, `BR-5.1`, `BR-5.2`, `BR-5.3`, `BR-5.4`, `BR-5.5`, `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`, `BR-6.5`, `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`, `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`, `BR-9.1`, `BR-9.2`, `BR-9.3`, `BR-10.1`, `BR-10.2`, `BR-10.3`, `BR-10.4`, `BR-10.5`, `BR-10.6`, `BR-10.7`
  Artifacts: `ART-test-e2e-selector`, `ART-test-ordering`, `ART-test-selector-data-hook`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-asset-acclaim-svg` | `designs/acclaim.svg` | doc | `OBL-launcher-and-panel-flow` |
| `ART-browser-panel` | `src/components/ProjectSelector/ProjectBrowserPanel.tsx` | runtime | `OBL-launcher-and-panel-flow`, `OBL-panel-displays-full-list`, `OBL-project-switching-flow`, `OBL-responsive-collapse` |
| `ART-config-selector-state` | `CONFIG_DIR/project-selector.json` | config | `OBL-config-validation`, `OBL-load-selector-data`, `OBL-project-switching-flow`, `OBL-state-persistence` |
| `ART-config-user-toml` | `CONFIG_DIR/user.toml` | config | `OBL-config-validation`, `OBL-configuration-load-and-defaults`, `OBL-inactive-projects-display-mode`, `OBL-load-selector-data`, `OBL-rail-ordering` |
| `ART-hook-project-manager` | `src/hooks/useProjectManager.ts` | runtime | `OBL-project-switching-flow` |
| `ART-launcher-button` | `src/components/ProjectSelector/LauncherButton.tsx` | runtime | `OBL-launcher-and-panel-flow` |
| `ART-ordering-utils` | `src/utils/selectorOrdering.ts` | runtime | `OBL-active-project-always-visible`, `OBL-panel-displays-full-list`, `OBL-rail-ordering` |
| `ART-selector-card` | `src/components/ProjectSelector/ProjectSelectorCard.tsx` | runtime | `OBL-active-project-card-display` |
| `ART-selector-chip` | `src/components/ProjectSelector/ProjectSelectorChip.tsx` | runtime | `OBL-inactive-projects-display-mode` |
| `ART-selector-data-hook` | `src/components/ProjectSelector/useSelectorData.ts` | runtime | `OBL-config-validation`, `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-project-switching-flow`, `OBL-state-persistence` |
| `ART-selector-index` | `src/components/ProjectSelector/index.tsx` | runtime | `OBL-active-project-card-display`, `OBL-launcher-and-panel-flow`, `OBL-responsive-collapse` |
| `ART-selector-manager-hook` | `src/components/ProjectSelector/useProjectSelectorManager.ts` | runtime | `OBL-active-project-always-visible`, `OBL-panel-displays-full-list`, `OBL-rail-ordering` |
| `ART-selector-rail` | `src/components/ProjectSelector/ProjectSelectorRail.tsx` | runtime | `OBL-active-project-always-visible`, `OBL-active-project-card-display`, `OBL-inactive-projects-display-mode`, `OBL-project-switching-flow`, `OBL-rail-ordering`, `OBL-responsive-collapse` |
| `ART-selector-types` | `src/components/ProjectSelector/types.ts` | runtime | `OBL-active-project-card-display` |
| `ART-server-system-routes` | `server/routes/system.ts` | runtime | `OBL-config-validation`, `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-state-persistence` |
| `ART-test-e2e-selector` | `tests/e2e/selector/project-selector.spec.ts` | test | `OBL-test-coverage` |
| `ART-test-ordering` | `src/utils/selectorOrdering.test.ts` | test | `OBL-test-coverage` |
| `ART-test-selector-data-hook` | `src/components/ProjectSelector/useSelectorData.test.ts` | test | `OBL-test-coverage` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1.1` | 2 | `OBL-active-project-card-display`, `OBL-test-coverage` |
| `BR-1.2` | 2 | `OBL-active-project-card-display`, `OBL-test-coverage` |
| `BR-1.3` | 2 | `OBL-active-project-always-visible`, `OBL-test-coverage` |
| `BR-2.1` | 2 | `OBL-inactive-projects-display-mode`, `OBL-test-coverage` |
| `BR-2.2` | 2 | `OBL-inactive-projects-display-mode`, `OBL-test-coverage` |
| `BR-2.3` | 2 | `OBL-inactive-projects-display-mode`, `OBL-test-coverage` |
| `BR-3.1` | 2 | `OBL-launcher-and-panel-flow`, `OBL-test-coverage` |
| `BR-3.2` | 2 | `OBL-launcher-and-panel-flow`, `OBL-test-coverage` |
| `BR-3.3` | 2 | `OBL-launcher-and-panel-flow`, `OBL-test-coverage` |
| `BR-4.1` | 2 | `OBL-panel-displays-full-list`, `OBL-test-coverage` |
| `BR-4.2` | 2 | `OBL-panel-displays-full-list`, `OBL-test-coverage` |
| `BR-4.3` | 2 | `OBL-panel-displays-full-list`, `OBL-test-coverage` |
| `BR-4.4` | 2 | `OBL-panel-displays-full-list`, `OBL-test-coverage` |
| `BR-4.5` | 2 | `OBL-panel-displays-full-list`, `OBL-test-coverage` |
| `BR-5.1` | 2 | `OBL-project-switching-flow`, `OBL-test-coverage` |
| `BR-5.2` | 2 | `OBL-project-switching-flow`, `OBL-test-coverage` |
| `BR-5.3` | 2 | `OBL-project-switching-flow`, `OBL-test-coverage` |
| `BR-5.4` | 2 | `OBL-project-switching-flow`, `OBL-test-coverage` |
| `BR-5.5` | 2 | `OBL-project-switching-flow`, `OBL-test-coverage` |
| `BR-6.1` | 2 | `OBL-rail-ordering`, `OBL-test-coverage` |
| `BR-6.2` | 2 | `OBL-rail-ordering`, `OBL-test-coverage` |
| `BR-6.3` | 2 | `OBL-rail-ordering`, `OBL-test-coverage` |
| `BR-6.4` | 2 | `OBL-rail-ordering`, `OBL-test-coverage` |
| `BR-6.5` | 2 | `OBL-active-project-always-visible`, `OBL-test-coverage` |
| `BR-7.1` | 3 | `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-test-coverage` |
| `BR-7.2` | 3 | `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-test-coverage` |
| `BR-7.3` | 3 | `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-test-coverage` |
| `BR-7.4` | 2 | `OBL-configuration-load-and-defaults`, `OBL-test-coverage` |
| `BR-7.5` | 2 | `OBL-configuration-load-and-defaults`, `OBL-test-coverage` |
| `BR-8.1` | 2 | `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.2` | 2 | `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.3` | 2 | `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.4` | 2 | `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.5` | 3 | `OBL-load-selector-data`, `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.6` | 3 | `OBL-load-selector-data`, `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-8.7` | 2 | `OBL-state-persistence`, `OBL-test-coverage` |
| `BR-9.1` | 2 | `OBL-responsive-collapse`, `OBL-test-coverage` |
| `BR-9.2` | 2 | `OBL-responsive-collapse`, `OBL-test-coverage` |
| `BR-9.3` | 2 | `OBL-responsive-collapse`, `OBL-test-coverage` |
| `BR-10.1` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.2` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.3` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.4` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.5` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.6` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `BR-10.7` | 2 | `OBL-config-validation`, `OBL-test-coverage` |
| `C1` | 1 | `OBL-load-selector-data` |
| `C2` | 2 | `OBL-load-selector-data`, `OBL-state-persistence` |
| `C3` | 2 | `OBL-project-switching-flow`, `OBL-state-persistence` |
| `C4` | 1 | `OBL-launcher-and-panel-flow` |
| `C5` | 1 | `OBL-launcher-and-panel-flow` |
| `C6` | 1 | `OBL-configuration-load-and-defaults` |
| `C7` | 1 | `OBL-active-project-always-visible` |
| `C8` | 1 | `OBL-launcher-and-panel-flow` |
| `C9` | 1 | `OBL-panel-displays-full-list` |
| `C10` | 3 | `OBL-configuration-load-and-defaults`, `OBL-load-selector-data`, `OBL-state-persistence` |
