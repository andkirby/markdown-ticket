# Architecture Narrative

## Overview

Redesigns the project selector from a uniform horizontal list into a tiered rail+panel system. The active project displays as an expanded card, inactive visible projects as compact code-only chips, and clicking the active project card opens a full project browser panel directly below the rail. Hovering over inactive project chips reveals full project details in hover cards. User preferences are loaded from `CONFIG_DIR/user.toml`; mutable selector state (favorites, usage) persists to `CONFIG_DIR/project-selector.json`. Design philosophy prioritizes visual hierarchy, progressive disclosure, and deterministic ordering.

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
│   ├── UI/
│   │   └── hover-card.tsx            # Hover card primitive with delay defaults (100ms open/close)
│   └── ProjectSelector/              # All selector-specific code colocated
│       ├── index.tsx                 # Public export, renders rail + panel container; owns panel open state
│       ├── ProjectSelectorRail.tsx   # Active card + inactive chips; active card click opens browser
│       ├── ProjectSelectorCard.tsx   # Active project expanded card (code + title + description + favorite)
│       ├── ProjectSelectorChip.tsx   # Inactive compact chip with hover card
│       ├── ProjectBrowserPanel.tsx   # Full project list overlay panel
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
| `ProjectSelectorRail.tsx` | Rendering active card and chips in horizontal layout; active card click opens browser; responsive collapse | Panel state management |
| `ProjectBrowserPanel.tsx` | Full project list, favorite indicators, panel positioning | Rail composition |
| `UI/hover-card.tsx` | Hover card primitive with default delays | None (reusable component) |
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
