# Tasks

## Task List

- Create missing infrastructure files and verify dependencies (`TASK-0`)
  Owns: `ART-selector-types`
  Makes Green: `TEST-selector-api`, `TEST-selector-data-hook`, `TEST-selector-ordering`
- Create selector types and interfaces (`TASK-1`)
  Owns: `ART-selector-types`
  Makes Green: `TEST-selector-api`, `TEST-selector-data-hook`
- Implement ordering utility functions (`TASK-2`)
  Owns: `ART-ordering-utils`, `ART-test-ordering`
  Makes Green: `active_project_always_visible`, `panel_displays_full_project_list`, `rail_ordering_prioritizes_favorites`, `TEST-selector-ordering`
- Add /api/config/selector endpoint to server (`TASK-3`)
  Owns: `ART-config-selector-state`, `ART-config-user-toml`, `ART-server-system-routes`
  Makes Green: `configuration_controls_selector`, `state_persists_after_selection`, `TEST-selector-api`
- Implement useSelectorData hook with configuration loading and persistence (`TASK-4`)
  Owns: `ART-selector-data-hook`, `ART-test-selector-data-hook`
  Makes Green: `configuration_controls_selector`, `state_persists_after_selection`, `TEST-selector-data-hook`
- Implement useProjectSelectorManager hook for visible subset computation (`TASK-5`)
  Owns: `ART-selector-manager-hook`
  Makes Green: `active_project_always_visible`, `panel_displays_full_project_list`, `rail_ordering_prioritizes_favorites`
- Create ProjectSelectorCard component for active project display (`TASK-6`)
  Owns: `ART-selector-card`
  Makes Green: `active_project_card_display`, `active_project_favorite_indicator`, `TEST-project-selector-e2e`, `toggle_favorite_by_clicking_star`
- Create ProjectSelectorChip component for inactive project display (`TASK-7`)
  Owns: `ART-selector-chip`
  Makes Green: `inactive_projects_display_mode`, `TEST-project-selector-e2e`
- Create ProjectSelectorRail component with responsive layout (`TASK-8`)
  Owns: `ART-selector-rail`
  Makes Green: `active_project_always_visible`, `inactive_projects_display_mode`, `mobile_responsive_selector`, `rail_ordering_prioritizes_favorites`, `TEST-project-selector-e2e`
- Create LauncherButton component using acclaim.svg asset (`TASK-9`)
  Owns: `ART-asset-acclaim-svg`, `ART-launcher-button`
  Makes Green: `launcher_opens_panel`, `TEST-project-selector-e2e`
- Create ProjectBrowserPanel component with full project list (`TASK-10`)
  Owns: `ART-browser-panel`
  Makes Green: `panel_displays_full_project_list`, `TEST-project-selector-e2e`
- Create ProjectSelector index component with panel state management (`TASK-11`)
  Owns: `ART-selector-index`
  Makes Green: `launcher_opens_panel`, `mobile_responsive_selector`, `TEST-project-selector-e2e`
- Integrate project switching with useProjectManager and state persistence (`TASK-12`)
  Owns: `ART-browser-panel`, `ART-hook-project-manager`, `ART-selector-data-hook`, `ART-selector-rail`, `ART-test-e2e-selector`
  Makes Green: `state_persists_after_selection`, `switch_project_from_panel`, `switch_project_from_rail`, `TEST-project-selector-e2e`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-asset-acclaim-svg` | `TASK-9` |
| `ART-browser-panel` | `TASK-10`, `TASK-12` |
| `ART-config-selector-state` | `TASK-3` |
| `ART-config-user-toml` | `TASK-3` |
| `ART-hook-project-manager` | `TASK-12` |
| `ART-launcher-button` | `TASK-9` |
| `ART-ordering-utils` | `TASK-2` |
| `ART-selector-card` | `TASK-6` |
| `ART-selector-chip` | `TASK-7` |
| `ART-selector-data-hook` | `TASK-4`, `TASK-12` |
| `ART-selector-index` | `TASK-11` |
| `ART-selector-manager-hook` | `TASK-5` |
| `ART-selector-rail` | `TASK-8`, `TASK-12` |
| `ART-selector-types` | `TASK-0`, `TASK-1` |
| `ART-server-system-routes` | `TASK-3` |
| `ART-test-e2e-selector` | `TASK-12` |
| `ART-test-ordering` | `TASK-2` |
| `ART-test-selector-data-hook` | `TASK-4` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `active_project_always_visible` | `TASK-2`, `TASK-5`, `TASK-8` |
| `active_project_card_display` | `TASK-6` |
| `active_project_favorite_indicator` | `TASK-6` |
| `configuration_controls_selector` | `TASK-3`, `TASK-4` |
| `inactive_projects_display_mode` | `TASK-7`, `TASK-8` |
| `launcher_opens_panel` | `TASK-9`, `TASK-11` |
| `mobile_responsive_selector` | `TASK-8`, `TASK-11` |
| `panel_displays_full_project_list` | `TASK-2`, `TASK-5`, `TASK-10` |
| `rail_ordering_prioritizes_favorites` | `TASK-2`, `TASK-5`, `TASK-8` |
| `state_persists_after_selection` | `TASK-3`, `TASK-4`, `TASK-12` |
| `switch_project_from_panel` | `TASK-12` |
| `switch_project_from_rail` | `TASK-12` |
| `TEST-project-selector-e2e` | `TASK-6`, `TASK-7`, `TASK-8`, `TASK-9`, `TASK-10`, `TASK-11`, `TASK-12` |
| `TEST-selector-api` | `TASK-0`, `TASK-1`, `TASK-3` |
| `TEST-selector-data-hook` | `TASK-0`, `TASK-1`, `TASK-4` |
| `TEST-selector-ordering` | `TASK-0`, `TASK-2` |
| `toggle_favorite_by_clicking_star` | `TASK-6` |
