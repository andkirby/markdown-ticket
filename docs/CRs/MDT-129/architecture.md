# Architecture: MDT-129

**Source**: [MDT-129](../MDT-129-redesign-project-selector-launcher-panel.md)
**Generated**: 2026-03-02

## Overview

Redesigns the project selector from a uniform horizontal list into a tiered rail+panel system. The active project displays as an expanded card, inactive visible projects as compact code-only chips (or medium cards per preference), and a trailing launcher opens a full project browser panel directly below the rail. User preferences are loaded from `CONFIG_DIR/user.toml`; mutable selector state (favorites, usage) persists to `CONFIG_DIR/project-selector.json`. Design philosophy prioritizes visual hierarchy, progressive disclosure, and deterministic ordering.

## Constraint Carryover

| Constraint ID | Enforcement |
|---------------|-------------|
| C1 | Runtime Prerequisites — `CONFIG_DIR/user.toml` under `[ui.projectSelector]` |
| C2 | Runtime Prerequisites — `CONFIG_DIR/project-selector.json` keyed by project code |
| C3 | Canonical Runtime Flows — persistence shortly after selection, not on shutdown |
| C4 | Runtime Prerequisites — uses existing `designs/acclaim.svg` |
| C5 | Module Boundaries — panel anchored to selector via shared container |
| C6 | Runtime Prerequisites — `visibleCount` default 7; `compactInactive` default true |
| C7 | Selection Logic — active project always visible regardless of ordering rules |
| C8 | Module Boundaries — selector rail ends with exactly one launcher control |
| C9 | Module Boundaries — panel renders registered projects only; no synthetic "All Projects" |
| C10 | Data Model — mutable selector state (`project-selector.json`) separate from immutable preferences (`user.toml`) on disk; combined over a single transport endpoint |

## Pattern

**Progressive Disclosure with Anchored Overlay** — The rail shows minimal context (active + preference-driven inactive items), the panel reveals full detail on demand. This pattern fits because project selection is a frequent but secondary action; users need quick visual confirmation of current context without navigational clutter.

## Canonical Runtime Flows

| Critical Behavior | Canonical Runtime Flow (single path) | Owner Module |
|-------------------|--------------------------------------|--------------|
| Load selector data | App init → `useSelectorData` fetches `CONFIG_DIR/user.toml` and `CONFIG_DIR/project-selector.json` via single `/api/config/selector` call → parses `{preferences, selectorState}` → provides to selector | `src/components/ProjectSelector/` |
| Display selector rail | `useProjectSelectorManager` computes visible subset using ordering rules → `ProjectSelectorRail` renders active card + compact/medium inactive chips + launcher | `src/components/ProjectSelector/` |
| Compute rail ordering | Active project first → favorites (by `count` desc, then `lastUsedAt` desc) → non-favorites (by `lastUsedAt` desc, then `count` desc) → enforce active visibility | `src/utils/selectorOrdering.ts` |
| Open project panel | User clicks launcher → panel open state (`useState` in `index.tsx`) sets `isOpen=true` → `ProjectBrowserPanel` renders below rail: favorites first (by `count` desc, then `lastUsedAt` desc), then non-favorites (by `lastUsedAt` desc, then `count` desc) | `src/components/ProjectSelector/` |
| Switch project from rail | User clicks chip → `onProjectSelect` callback → `useProjectManager.setSelectedProject` updates selection → `useSelectorData` persists `lastUsedAt` and `count` → rail re-renders with new active | `src/hooks/useProjectManager.ts` |
| Switch project from panel | User clicks panel card → `onProjectSelect` callback → panel closes → same flow as rail selection | `src/components/ProjectSelector/` |
| Toggle favorite | User clicks favorite indicator → `useSelectorData.toggleFavorite` updates `favorite` field → persists to `project-selector.json` → UI reflects change | `src/components/ProjectSelector/` |
| Persist usage state | Project selection → debounced write to `CONFIG_DIR/project-selector.json` (updates `lastUsedAt` timestamp, increments `count`) via private utility inside `useSelectorData` | `src/components/ProjectSelector/` |
| Responsive collapse | Viewport < mobile breakpoint → `ProjectSelectorRail` renders active card + launcher only (no inactive chips) | `src/components/ProjectSelector/` |

Rules:
- One behavior = one canonical flow
- One behavior = one owner module
- No duplicate owners

## Alternatives (if proposing simplifications)

None — the CR scope is well-defined. All decisions below support the stated requirements.

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

---
*Generated by /mdt:architecture*
