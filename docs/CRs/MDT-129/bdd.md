# BDD

## Scenarios By Requirement Family

### BR-1

- Active project always visible regardless of ordering (`active_project_always_visible`)
  Covers: `BR-1.3`, `BR-6.5`
  Given: the active project would fall outside the visible subset based on normal ordering rules
  When: the selector rail renders
  Then: the active project is prioritized and remains visible in the rail
- Active project shown as larger card with code, title, and description (`active_project_card_display`)
  Covers: `BR-1.1`
  Given: I am viewing the application with an active project selected
  When: the selector rail renders
  Then: I see the active project displayed as a larger card containing the project code, title, and description
- Favorite indicator on active project card (`active_project_favorite_indicator`)
  Covers: `BR-1.2`
  Given: I am viewing the application and the active project is favorited
  When: the selector rail renders
  Then: I see the favorite state displayed on the active project card
- Toggle favorite by clicking star (`toggle_favorite_by_clicking_star`)
  Covers: `BR-1.4`
  Given: I am viewing the project selector with favorited and unfavorited projects
  When: I click the star icon on any project card
  Then: the favorite state toggles for that project and the change is persisted to project-selector.json

### BR-2

- Inactive visible projects display based on compact mode setting (`inactive_projects_display_mode`)
  Covers: `BR-2.1`, `BR-2.3`
  Given: I have inactive visible projects in the selector rail
  When: the selector renders with <compactMode> setting
  Then: inactive projects appear as <cardStyle>

### BR-3

- Active project card click opens full project browser (`active_project_click_opens_browser`)
  Covers: `BR-3.1`
  Given: I am viewing the application with an active project selected
  When: I click the active project card
  Then: the full project browser panel opens displaying all projects
- Hover card displays on inactive project chip hover (`hover_card_displays_on_chip`)
  Covers: `BR-3.2`, `BR-3.3`, `BR-3.4`
  Given: I am viewing the selector rail with inactive project chips visible
  When: I hover over an inactive project chip
  Then: a hover card appears after a short delay showing the project code, name, description, and favorite status; when I stop hovering, the card dismisses after a short delay

### BR-4

- Panel displays full project list with favorites first (`panel_displays_full_project_list`)
  Covers: `BR-4.1`, `BR-4.2`, `BR-4.3`, `BR-4.4`, `BR-4.5`
  Given: I have opened the full project panel
  When: the panel renders
  Then: I see all projects as cards with code, title, and description; favorites appear first with favorite indicators, followed by non-favorites sorted by lastUsedAt descending

### BR-5

- Select project from panel changes current project (`switch_project_from_panel`)
  Covers: `BR-5.2`, `BR-5.3`, `BR-5.4`, `BR-5.5`
  Given: I have opened the full project panel
  When: I select a project from the panel
  Then: the selected project becomes the current project and its usage state is updated with incremented count and current timestamp
- Select project from selector rail changes current project (`switch_project_from_rail`)
  Covers: `BR-5.1`, `BR-5.3`, `BR-5.4`, `BR-5.5`
  Given: I am viewing the selector rail with multiple visible projects
  When: I select an inactive project from the rail
  Then: the selected project becomes the current project and its usage state is updated with incremented count and current timestamp

### BR-6

- Active project always visible regardless of ordering (`active_project_always_visible`)
  Covers: `BR-1.3`, `BR-6.5`
  Given: the active project would fall outside the visible subset based on normal ordering rules
  When: the selector rail renders
  Then: the active project is prioritized and remains visible in the rail
- Rail ordering prioritizes favorites then sorts by usage (`rail_ordering_prioritizes_favorites`)
  Covers: `BR-6.1`, `BR-6.2`, `BR-6.3`, `BR-6.4`
  Given: I have multiple projects with various favorite states and usage patterns
  When: the selector rail renders
  Then: the active project appears first, followed by favorites sorted by count descending, then non-favorites sorted by lastUsedAt descending

### BR-7

- Configuration controls visible count and compact mode (`configuration_controls_selector`)
  Covers: `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-7.4`, `BR-7.5`
  Given: the user configuration file may have custom visibleCount and compactInactive settings
  When: the selector renders with valid configuration values
  Then: the rail respects the configured visibleCount and compactInactive; invalid or missing values fall back to defaults (visibleCount=7, compactInactive=true)

### BR-8

- State persists to file after project selection (`state_persists_after_selection`)
  Covers: `BR-8.1`, `BR-8.2`, `BR-8.3`, `BR-8.4`, `BR-8.5`, `BR-8.6`, `BR-8.7`
  Given: I select a project and the selector state changes
  When: the state is persisted
  Then: the state is written to project-selector.json keyed by project code containing favorite, lastUsedAt, and count; missing or invalid files are handled gracefully without breaking the UI

### BR-9

- Mobile viewport shows collapsed selector rail (`mobile_responsive_selector`)
  Covers: `BR-9.1`, `BR-9.3`
  Given: I am viewing the application on a mobile-sized viewport
  When: the selector rail renders
  Then: I see only the active project; clicking the active project provides access to remaining projects with the same state model

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1.1` | 1 | `active_project_card_display` |
| `BR-1.2` | 1 | `active_project_favorite_indicator` |
| `BR-1.3` | 1 | `active_project_always_visible` |
| `BR-1.4` | 1 | `toggle_favorite_by_clicking_star` |
| `BR-2.1` | 1 | `inactive_projects_display_mode` |
| `BR-2.3` | 1 | `inactive_projects_display_mode` |
| `BR-3.1` | 1 | `active_project_click_opens_browser` |
| `BR-3.2` | 1 | `hover_card_displays_on_chip` |
| `BR-3.3` | 1 | `hover_card_displays_on_chip` |
| `BR-3.4` | 1 | `hover_card_displays_on_chip` |
| `BR-4.1` | 1 | `panel_displays_full_project_list` |
| `BR-4.2` | 1 | `panel_displays_full_project_list` |
| `BR-4.3` | 1 | `panel_displays_full_project_list` |
| `BR-4.4` | 1 | `panel_displays_full_project_list` |
| `BR-4.5` | 1 | `panel_displays_full_project_list` |
| `BR-5.1` | 1 | `switch_project_from_rail` |
| `BR-5.2` | 1 | `switch_project_from_panel` |
| `BR-5.3` | 2 | `switch_project_from_panel`, `switch_project_from_rail` |
| `BR-5.4` | 2 | `switch_project_from_panel`, `switch_project_from_rail` |
| `BR-5.5` | 2 | `switch_project_from_panel`, `switch_project_from_rail` |
| `BR-6.1` | 1 | `rail_ordering_prioritizes_favorites` |
| `BR-6.2` | 1 | `rail_ordering_prioritizes_favorites` |
| `BR-6.3` | 1 | `rail_ordering_prioritizes_favorites` |
| `BR-6.4` | 1 | `rail_ordering_prioritizes_favorites` |
| `BR-6.5` | 1 | `active_project_always_visible` |
| `BR-7.1` | 1 | `configuration_controls_selector` |
| `BR-7.2` | 1 | `configuration_controls_selector` |
| `BR-7.3` | 1 | `configuration_controls_selector` |
| `BR-7.4` | 1 | `configuration_controls_selector` |
| `BR-7.5` | 1 | `configuration_controls_selector` |
| `BR-8.1` | 1 | `state_persists_after_selection` |
| `BR-8.2` | 1 | `state_persists_after_selection` |
| `BR-8.3` | 1 | `state_persists_after_selection` |
| `BR-8.4` | 1 | `state_persists_after_selection` |
| `BR-8.5` | 1 | `state_persists_after_selection` |
| `BR-8.6` | 1 | `state_persists_after_selection` |
| `BR-8.7` | 1 | `state_persists_after_selection` |
| `BR-9.1` | 1 | `mobile_responsive_selector` |
| `BR-9.3` | 1 | `mobile_responsive_selector` |
