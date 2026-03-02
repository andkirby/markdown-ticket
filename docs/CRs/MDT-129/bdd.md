# BDD Acceptance Tests: MDT-129

**Mode**: Normal
**Source**: requirements.md
**Generated**: 2026-03-02

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Playwright |
| Directory | `tests/e2e/selector/` |
| Command | `npm run test:e2e` |
| Filter | `tests/e2e/selector/MDT-129*.spec.ts` |

## User Journeys

### Journey 1: Active Project Identification (BR-1)

**User Goal**: Clearly identify which project is currently active
**Entry Point**: Selector rail on any project page

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `active_project_larger_card` | Happy path | BR-1.1 |
| `active_project_favorite_indicator` | Happy path | BR-1.2 |
| `active_project_always_visible` | Edge case | BR-1.3 |

### Journey 2: Quick Access to Inactive Projects (BR-2)

**User Goal**: Quickly access frequently-used inactive projects from the rail
**Entry Point**: Selector rail

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `inactive_compact_cards` | Happy path | BR-2.1 |
| `inactive_medium_cards` | Happy path | BR-2.2 |

### Journey 3: Full Project Access via Launcher (BR-3, BR-4)

**User Goal**: Access all registered projects from a single entry point
**Entry Point**: Launcher control at end of selector rail

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `launcher_opens_panel` | Happy path | BR-3.2 |
| `launcher_acclaim_icon` | Happy path | BR-3.3 |
| `panel_displays_all_projects` | Happy path | BR-4.1 |
| `panel_shows_favorites` | Happy path | BR-4.2 |
| `panel_orders_favorites_first` | Happy path | BR-4.3 |

### Journey 4: Project Selection (BR-5)

**User Goal**: Switch projects from both the rail and the full panel
**Entry Point**: Selector rail or full project panel

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `select_from_rail` | Happy path | BR-5.1 |
| `select_from_panel` | Happy path | BR-5.2 |

### Journey 5: Rail Ordering (BR-6)

**User Goal**: See deterministic, predictable ordering of projects
**Entry Point**: Selector rail

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `active_project_first` | Happy path | BR-6.1 |
| `favorites_before_non_favorites` | Happy path | BR-6.2 |

### Journey 6: Responsive Behavior (BR-9)

**User Goal**: Access all projects on mobile-sized viewports
**Entry Point**: Collapsed selector rail on mobile

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `mobile_shows_active_and_launcher` | Happy path | BR-9.1 |
| `mobile_launcher_access` | Happy path | BR-9.2 |

### Journey 7: Edge Cases

**User Goal**: Consistent experience regardless of data conditions
**Entry Point**: Various

#### Scenarios

| Scenario | Type | Requirement |
|----------|------|-------------|
| `long_titles_no_break` | Edge case | Edge-1 |
| `fewer_projects_than_visible` | Edge case | Edge-2 |
| `no_description_selectable` | Edge case | BR-4.1 |
| `no_favorite_spacing_ok` | Edge case | Edge-3 |
| `config_fallback` | Error | BR-7.3 |

## Scenario Specifications

### Feature: Project Selector Rail

**File**: `tests/e2e/selector/MDT-129-rail.spec.ts`
**Covers**: BR-1.1, BR-1.2, BR-1.3, BR-2.1, BR-6.1, BR-6.2, BR-3.1, BR-3.3

```gherkin
Feature: Project Selector Rail
  As a user
  I want to see my active project and quick-access projects in a compact rail
  So that I can quickly navigate between projects

  Background:
    Given I am on a project page
    And the selector rail is visible

  @requirement:BR-1.1 @priority:high
  Scenario: Active project displays as larger card with code and title
    Given I have an active project
    When I view the selector rail
    Then I should see the active project as a larger card
    And the card should display the project code
    And the card should display the project title

  @requirement:BR-1.3 @priority:high
  Scenario: Active project remains visible even when outside visible subset
    Given I have an active project
    And there are many other projects exceeding visibleCount
    When I view the selector rail
    Then the active project card should still be visible

  @requirement:BR-2.1 @priority:medium
  Scenario: Inactive visible projects render as compact code-only cards
    Given compactInactive is true
    And I have multiple projects
    When I view the selector rail
    Then inactive visible projects should appear as compact cards
    And compact cards should show only project codes

  @requirement:BR-3.1 @priority:high
  Scenario: Launcher control appears at end of selector rail
    Given I am viewing the selector rail
    Then I should see exactly one launcher control
    And the launcher should be at the end of the rail
```

### Feature: Project Selector Panel

**File**: `tests/e2e/selector/MDT-129-panel.spec.ts`
**Covers**: BR-3.2, BR-4.1, BR-4.2, BR-5.1, BR-5.2

```gherkin
Feature: Project Selector Panel
  As a user
  I want to browse all projects in an expandable panel
  So that I can select from any registered project

  Background:
    Given I am on a project page
    And the selector rail is visible

  @requirement:BR-3.2 @priority:high
  Scenario: Activating launcher opens panel directly below selector
    Given I click the launcher control
    Then a panel should appear directly below the selector
    And the panel should be visible

  @requirement:BR-4.1 @priority:high
  Scenario: Panel displays all projects as cards with code, title, and description
    Given the panel is open
    Then I should see all registered projects as cards
    And each card should display the project code
    And each card should display the project title
    And each card should display the project description

  @requirement:BR-5.2 @priority:high
  Scenario: Selecting project from panel changes current project
    Given the panel is open
    And there are multiple projects available
    When I click on a project card
    Then the current project should change to the selected project
    And the panel should close

  @requirement:BR-5.1 @priority:high
  Scenario: Selecting project from rail changes current project
    Given I am viewing the selector rail
    And there are multiple projects available
    When I click on an inactive project card
    Then the current project should change to the selected project
```

### Feature: Project Selector Edge Cases

**File**: `tests/e2e/selector/MDT-129-edge-cases.spec.ts`
**Covers**: BR-9.1, BR-9.2, BR-7.3, Edge-1, Edge-2, Edge-3

```gherkin
Feature: Project Selector Edge Cases
  As a user
  I want consistent selector behavior regardless of data conditions
  So that I can rely on the selector to work correctly

  @requirement:Edge-1 @priority:medium
  Scenario Outline: Long project titles do not break layout
    Given a project with title "<title>"
    When I view the <location>
    Then the layout should not be broken
    And the title should be visible (may be truncated)

    Examples:
      | location | title |
      | active card | This is a Very Long Project Name That Should Not Break The Layout |
      | panel card | This is a Very Long Project Name That Should Not Break The Panel Layout |

  @requirement:BR-9.1 @priority:high
  Scenario: Mobile viewport shows only active project and launcher
    Given the viewport is mobile-sized (375x667)
    And I have multiple projects
    When I view the selector rail
    Then I should see only the active project card
    And I should see the launcher control
    And I should not see inactive project cards

  @requirement:Edge-2 @priority:medium
  Scenario: Selector works correctly with single project
    Given there is only one project
    When I view the selector rail
    Then the active project card should be visible
    And the launcher should be visible
```

## Generated Test Files

| File | Scenarios |
|------|-----------|
| `tests/e2e/selector/MDT-129-rail.spec.ts` | 8 |
| `tests/e2e/selector/MDT-129-panel.spec.ts` | 8 |
| `tests/e2e/selector/MDT-129-edge-cases.spec.ts` | 8 |
| **Total** | **24** |

## Requirement Coverage

| Req ID | Scenarios | Routed To | Covered? |
|--------|-----------|-----------|----------|
| BR-1.1 | active_project_larger_card | bdd | ✅ |
| BR-1.2 | active_project_favorite_indicator | bdd | ✅ |
| BR-1.3 | active_project_always_visible | bdd | ✅ |
| BR-2.1 | inactive_compact_cards | bdd | ✅ |
| BR-2.2 | inactive_medium_cards | bdd | ✅ |
| BR-2.3 | no_title_expansion_in_rail | bdd | ✅ |
| BR-3.1 | launcher_single_control | bdd | ✅ |
| BR-3.2 | launcher_opens_panel | bdd | ✅ |
| BR-3.3 | launcher_acclaim_icon | bdd | ✅ |
| BR-4.1 | panel_displays_all_projects | bdd | ✅ |
| BR-4.2 | panel_shows_favorites | bdd | ✅ |
| BR-4.3 | panel_orders_favorites_first | bdd | ✅ |
| BR-4.5 | favorites_overflow_to_panel_top | bdd | ✅ |
| BR-5.1 | select_from_rail | bdd | ✅ |
| BR-5.2 | select_from_panel | bdd | ✅ |
| BR-6.1 | active_project_first | bdd | ✅ |
| BR-6.2 | favorites_before_non_favorites | bdd | ✅ |
| BR-7.3 | config_fallback | bdd | ✅ |
| BR-9.1 | mobile_shows_active_and_launcher | bdd | ✅ |
| BR-9.2 | mobile_launcher_access | bdd | ✅ |
| Edge-1 | long_titles_no_break | bdd | ✅ |
| Edge-2 | fewer_projects_than_visible | bdd | ✅ |
| Edge-3 | no_favorite_spacing_ok | bdd | ✅ |
| BR-5.3 | usage_state_updated | tests | ✅ Routed |
| BR-5.4 | lastUsedAt_updated | tests | ✅ Routed |
| BR-5.5 | count_incremented | tests | ✅ Routed |
| BR-6.3 | favorite_ordering_by_count | tests | ✅ Routed |
| BR-6.4 | non_favorite_ordering_by_recency | tests | ✅ Routed |
| BR-7.1 | visibleCount_from_config | tests | ✅ Routed |
| BR-7.2 | compactInactive_from_config | tests | ✅ Routed |
| BR-7.4 | invalid_visibleCount_fallback | tests | ✅ Routed |
| BR-7.5 | invalid_compactInactive_fallback | tests | ✅ Routed |
| BR-8.1 | persistence_to_json | tests | ✅ Routed |
| BR-8.2 | keyed_by_project_code | tests | ✅ Routed |
| BR-8.3 | stores_favorite_lastUsedAt_count | tests | ✅ Routed |
| BR-8.4 | persistence_after_selection | tests | ✅ Routed |
| BR-8.5 | missing_state_initializes_empty | tests | ✅ Routed |
| BR-8.6 | invalid_json_fallback | tests | ✅ Routed |
| BR-8.7 | partially_malformed_entries | tests | ✅ Routed |
| BR-10.1-10.7 | validation_fallbacks | tests | ✅ Routed |

### Coverage Gaps

| Requirement | Reason | Action |
|-------------|--------|--------|
| BR-5.3-5.5 | Internal state updates | Cover in `/mdt:tests` |
| BR-6.3-6.4 | Ordering logic details | Cover in `/mdt:tests` |
| BR-7.1-7.5 | Configuration parsing | Cover in `/mdt:tests` |
| BR-8.1-8.7 | File persistence | Cover in `/mdt:tests` |
| BR-10.1-10.7 | Validation edge cases | Cover in `/mdt:tests` |

## Verification

```bash
npm run test:e2e -- tests/e2e/selector/MDT-129*.spec.ts
```

**Expected Result** (Normal mode):
- `24 failed, 0 passed` until implementation exists
- Tests should fail because MDT-129 selectors don't exist yet

**Verification Status**: ✅ Tests run and fail as expected (RED phase)

## Acceptance Gating

| Field | Value |
|-------|-------|
| Executable Required | true |
| Waiver Granted | false |
| Waiver Reason | n/a |

## Implementation Handoff

For `/mdt:implement`:
1. Run unit/integration tests from `/mdt:tests` (when available)
2. Run BDD scenarios: `npm run test:e2e -- tests/e2e/selector/MDT-129*.spec.ts`
3. All 24 scenarios should pass before completion
4. Add data-testid attributes to components as specified in tests

### Required data-testid Attributes

| Component | testid | Description |
|-----------|--------|-------------|
| SelectorRail | `selector-rail` | Container for project cards |
| ActiveProjectCard | `selector-active-project-card` | Larger card for active project |
| ActiveProjectCode | `active-project-code` | Code element in active card |
| ActiveProjectTitle | `active-project-title` | Title element in active card |
| ActiveProjectFavoriteIcon | `active-project-favorite-icon` | Favorite indicator |
| InactiveProjectCard | `selector-inactive-project-card-{CODE}` | Compact card for inactive |
| InactiveProjectCode | `inactive-project-code` | Code in inactive card |
| Launcher | `selector-launcher` | Launcher button |
| LauncherIcon | `launcher-acclaim-icon` | Acclaim icon |
| SelectorPanel | `selector-panel` | Full project panel |
| PanelProjectCard | `panel-project-card` | Card in panel |
| PanelProjectCard | `panel-project-card-{CODE}` | Specific card in panel |
| PanelProjectCode | `panel-project-code` | Code in panel card |
| PanelProjectTitle | `panel-project-title` | Title in panel card |
| PanelProjectDescription | `panel-project-description` | Description in panel card |

*Generated by /mdt:bdd v2*
