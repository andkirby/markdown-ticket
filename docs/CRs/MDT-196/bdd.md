# BDD Scenarios

Related CR: `docs/CRs/MDT-196-board-filter-bar.md`
UX contract: `docs/design/surfaces/board-filter-bar.spec.md`
Mockups: `docs/design/surfaces/board-filter-bar.mockups.md`

These scenarios trace 1:1 to the Acceptance Criteria in §4 of the CR and the
States table in the surface spec. Predicate scenarios (S1–S8) verify at the
pure-function unit level; chrome scenarios (S9–S18) verify through the DOM.

## Filter predicate — AND across facets

### S1 — Empty filter shows everything

```gherkin
Feature: Faceted filter predicate
  An empty TicketFilters shows every ticket. No special-case branches.

  Scenario: No filter values set
    Given a ticket set of 14 tickets with mixed statuses, priorities, assignees, and types
    When the predicate is applied with an empty TicketFilters {}
    Then all 14 tickets are returned
```

### S2 — Single facet narrows

```gherkin
  Scenario: Status filter with one value
    Given a ticket set including tickets with status In Progress and others with status Proposed
    When the predicate is applied with TicketFilters { status: ["In Progress"] }
    Then only tickets with status In Progress are returned
```

### S3 — Multiple values within one facet OR-combine

```gherkin
  Scenario: Status filter with two values
    Given a ticket set including tickets with status In Progress and Approved
    When the predicate is applied with TicketFilters { status: ["In Progress", "Approved"] }
    Then tickets with status In Progress OR Approved are returned
    And tickets with status Proposed are excluded
```

### S4 — Multiple facets AND-combine

```gherkin
  Scenario: Status and priority combined
    Given a ticket set with varied status and priority combinations
    When the predicate is applied with TicketFilters { status: ["In Progress"], priority: ["High"] }
    Then only tickets matching status In Progress AND priority High are returned
    And a ticket with status In Progress but priority Medium is excluded
```

### S5 — Free-text query AND-combines with every facet

```gherkin
  Scenario: Query plus status facet
    Given a ticket set where the title "Fix login" has status In Progress
    And another ticket titled "Login redesign" also has status In Progress
    When the predicate is applied with TicketFilters { query: "login", status: ["In Progress"] }
    Then only tickets matching the query AND the status facet are returned
```

### S6 — Multi-term query stays multi-term AND (today's behavior)

```gherkin
  Scenario: Two search terms
    Given a ticket titled "Fix login bug" and another titled "Setup API"
    When the predicate is applied with TicketFilters { query: "fix login" }
    Then only the ticket whose title/code/description contains both "fix" AND "login" is returned
    And the "Setup API" ticket is excluded
```

## Filter predicate — v1 facets

### S7 — Assignee facet includes "Unassigned" sentinel

```gherkin
  Scenario: Filtering for unassigned tickets
    Given a ticket set including tickets with assignee "alice" and tickets with no assignee
    When the predicate is applied with TicketFilters { assignee: ["__none__"] }
    Then only tickets with no assignee are returned
```

### S8 — Priority and type facets narrow independently

```gherkin
  Scenario: Priority and type combined
    Given a ticket set with varied priority and type
    When the predicate is applied with TicketFilters { priority: ["Critical"], type: ["Bug Fix"] }
    Then only tickets matching priority Critical AND type Bug Fix are returned
```

## Filter predicate — edge cases

### S9 — All filters exclude every ticket

```gherkin
  Scenario: No ticket matches the filter
    Given a ticket set of 14 tickets
    When the predicate is applied with TicketFilters { status: ["Rejected"] } and no ticket has status Rejected
    Then 0 tickets are returned
    And the predicate does not throw
```

### S10 — Derived facet value disappears after backend update

```gherkin
  Scenario: Selected assignee removed from ticket set
    Given TicketFilters { assignee: ["bob"] } is active
    And the ticket set is refreshed so no ticket has assignee "bob"
    When the filter state is reconciled against the new ticket set
    Then "bob" is dropped silently from the assignee filter
    And the filter is now empty (showing all tickets)
```

## Desktop chrome

### S11 — Empty state renders no chip row

```gherkin
Feature: Desktop filter bar chrome
  The header shows a single compact "Filter" button (no count) when no values
  are selected. Facets, chips, and the count live inside the button's popover.

  Scenario: No filters active on desktop
    Given the board renders on a desktop viewport (>= 768px)
    And TicketFilters is empty
    When the filter bar renders
    Then the header shows a bare "Filter" button with no count badge
    And no chip row is rendered
    And no Clear-all control is rendered
    And the result count reads "Showing all N tickets"
```

### S12 — Active filters render chips and clear-all

```gherkin
  Scenario: Filters active on desktop
    Given the board renders on a desktop viewport
    And TicketFilters { status: ["In Progress", "Approved"], priority: ["High"] } is active
    When the filter bar renders
    Then the header button shows "Filter · 3" (3 active values)
    And opening the popover renders a chip row with one chip per selected value
    And a "Clear all" button is rendered inside the popover
    And the result count reads "Showing N of M tickets"
```


### S13 — Removing a chip removes only that value

```gherkin
  Scenario: Click the remove on one chip
    Given the active filter chips include "In Progress" and "Approved"
    When the user clicks the remove control on the "In Progress" chip
    Then only "In Progress" is removed from the status filter
    And the "Approved" chip remains
    And the status filter is now ["Approved"]
```

### S14 — Clear-all resets to empty state

```gherkin
  Scenario: Click Clear all
    Given TicketFilters has active values across status and priority
    When the user clicks "Clear all"
    Then TicketFilters becomes empty {}
    And the chip row, count badges, and Clear-all control disappear
    And the board shows every ticket
```

### S15 — Filter popover opens and toggles a value

```gherkin
  Scenario: Open the filter popover and toggle a priority value
    Given the desktop filter bar is rendered
    When the user clicks the "Filter" button
    Then a popover opens containing a two-column facet grid
    (Type | Status, Priority | Assignee) with all v1 facets visible at once
    And the current selections are checked
    When the user toggles "High" in the Priority section
    Then the priority filter becomes ["High"]
    And the button label updates to "Filter · 1"
```

### S16 — Static facets draw values from enums, not the ticket set

```gherkin
  Scenario: A status value with no tickets still appears in the section
    Given the ticket set has no ticket with status "Rejected"
    When the filter popover opens
    Then "Rejected" still appears as a selectable value in the Status section
    And it is drawn from CRStatuses, not derived from the tickets
```


## Mobile chrome

### S17 — Mobile filter entry is the Hamburger Menu "Filter · N" row

```gherkin
Feature: Mobile filter chrome
  On mobile (< 640px) the desktop bar is hidden; filtering is reached via the Hamburger Menu.

  Scenario: Open the mobile filter popover
    Given the board renders on a mobile viewport (< 640px)
    And TicketFilters is empty
    When the user opens the Hamburger Menu
    Then a "Filter" row is visible with no count badge
    When the user taps the "Filter" row
    Then a Popover opens containing FreeTextSearch and four FacetSections
    And the popover has a "Clear all" and "Done" footer
```

### S18 — Mobile chip strip renders under the column header when active

```gherkin
  Scenario: Active filters on mobile show a chip strip
    Given the board renders on a mobile viewport
    And TicketFilters { priority: ["High"], type: ["Bug Fix"] } is active
    When the active column header renders
    Then a horizontally-scrollable chip strip appears under the column switcher
    And the strip shows one chip per active value
    And each chip is one-tap removable
    And the hamburger "Filter" row shows a count badge "2"
```

### S19 — Mobile chip strip absent when no filters active

```gherkin
  Scenario: Empty filter on mobile
    Given the board renders on a mobile viewport
    And TicketFilters is empty
    When the active column header renders
    Then no chip strip is rendered
    And no vertical space is consumed by a filter strip
```

### S20 — Mobile chip one-tap remove updates shared state

```gherkin
  Scenario: Tap the remove on a mobile chip
    Given the mobile chip strip shows chips "High" and "Bug Fix"
    When the user taps the remove control on the "High" chip
    Then "High" is removed from the priority filter
    And the "Bug Fix" chip remains in the strip
    And the shared TicketFilters is updated identically to desktop
```

## Persistence

### S21 — Filter state persists across reloads

```gherkin
Feature: Filter persistence
  TicketFilters persists to localStorage mirroring the sort-preferences pattern.

  Scenario: Reload restores the last filter state
    Given the user has set TicketFilters { status: ["In Progress"] } on the board
    When the page is reloaded
    Then the board re-applies TicketFilters { status: ["In Progress"] }
    And the chip row and count are restored
```

### S22 — Old schema in localStorage is reset, never throws

```gherkin
  Scenario: Migrating from an older filter schema
    Given localStorage["markdown-ticket-filter-preferences"] holds a JSON shape that does not match TicketFilters
    When the board loads and reads the preference
    Then the preference is reset to empty {}
    And no exception is thrown
    And the board shows every ticket
```

## Accessibility

### S23 — Facet dropdown is keyboard navigable

```gherkin
Feature: Filter accessibility
  The filter bar meets the surface spec a11y contract.

  Scenario: Arrow-key navigation in a facet dropdown
    Given a facet dropdown is open
    When the user presses ArrowDown
    Then focus moves to the next value in the list
    And Escape closes the dropdown
    And the trigger has aria-expanded reflecting open/closed state
```

### S24 — Chips and clear-all are real buttons with labels

```gherkin
  Scenario: Chip remove control has an accessible label
    Given active filter chips are rendered
    Then each chip remove control is a button with aria-label "Remove filter: {facet} {value}"
    And the Clear-all control is a button with aria-label "Clear all filters"
```

### S25 — Result count is an aria-live region

```gherkin
  Scenario: Screen reader hears filter effects
    Given the desktop filter bar is rendered
    Then the result-count text is in an aria-live="polite" region
    When the user changes a filter value
    Then the region announces the new count
```

## UAT Round 1 (2026-08-01)

### S26 — Click outside the filter popover closes it

```gherkin
Feature: Filter popover dismissal (UAT)
  The desktop filter popover closes when the user clicks anywhere outside it,
  reusing the event-based outside-click guard pattern from the shared <Modal>
  primitive. A position:fixed click-away overlay cannot be used because the app
  header's backdrop-filter creates a containing block that traps fixed
  descendants to header bounds.

  Scenario: Click outside closes the popover
    Given the desktop filter popover is open
    When the user clicks on the board area outside the popover
    Then the popover closes
    And the Filter button reflects the closed (not expanded) state
  ```

### S27 — Faceted filters apply to the list view, not only the board

```gherkin
Feature: Cross-view filter scope (UAT)
  The app-level TicketFilters narrows every ticket surface — board AND list —
  because filter state is lifted to App.tsx and both views consume the same
  pre-filtered ticket set.

  Scenario: Filter narrows the list view
    Given the board renders with 185 tickets and TicketFilters is empty
    And the user has switched to the list (table) view
    When the user applies a status facet that matches 32 tickets
    Then the list view shows exactly 32 rows
    And the row set is identical to the board's filtered card set
    And the "Showing 32 of 185 tickets" count is accurate
  ```

### S28 — Active-filter chips block has proper spacing

```gherkin
Feature: Filter chip layout (UAT)
  The active-filter-chips block inside the popover/mobile sheet is visually
  separated from the facet grid above it.

  Scenario: Chips block is spaced below the facet grid
    Given the filter popover is open with at least one active filter value
    Then the active-filter-chips block has a top gap (mt-3) separating it
    from the facet grid
    And inter-chip spacing is consistent (gap-2)
  ```

