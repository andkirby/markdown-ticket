# Requirements

Ticket: `MDT-136`

## Overview

Cmd+K Quick Search provides keyboard-driven ticket discovery across all views. Users can instantly find tickets by key number or title substring, navigate results with arrow keys, and jump directly to ticket detail. Current-project filtering uses preloaded data; explicitly broader searches use the existing debounced search API.

## Behavioral Requirements

### BR-1

- `BR-1` [bdd] WHEN user presses Cmd+K on Mac or Ctrl+K on Windows/Linux, the system shall open the quick search modal.

### BR-2

- `BR-2` [bdd] WHEN the quick search modal opens, the system shall focus the search input field.

### BR-3

- `BR-3` [bdd] WHEN user types in the search input, the system shall filter current-project tickets in real-time by key, title and stored external references using case-insensitive AND matching.

### BR-4

- `BR-4` [bdd] WHEN user presses up or down arrow keys in the search input, the system shall move selection between visible results and keep the selected result visible within the results scroller without moving input focus.

### BR-5

- `BR-5` [bdd] WHEN user presses Enter with a result selected, the system shall close the modal and open the selected ticket's detail view.

### BR-6

- `BR-6` [bdd] WHEN user presses Escape while the modal is open, the system shall close the modal without selecting a ticket.

### BR-7

- `BR-7` [bdd] WHEN user clicks outside the modal content area, the system shall close the modal without selecting a ticket.

### BR-8

- `BR-8` [bdd] IF no tickets match the search query, the system shall display a 'No results' message in the results area.

## Constraints

- `C1` [tests] The keyboard shortcut shall be Cmd+K on macOS and Ctrl+K on Windows/Linux platforms.
- `C2` [tests] Current-project filtering shall display at most 10 matching tickets; remote search shall retain the existing limit of 5 per project and 15 total.
- `C3` [tests] Title substring matching shall be case-insensitive.
- `C4` [tests] Multi-word queries shall use AND logic across searchable ticket keys, titles and stored references in either project location.

## Edge Cases

_No edge cases recorded._

## UAT 2026-10-28

- `BR-9` [bdd] WHEN Quick Search opens with a current project, the system shall default numbers and text to that project and expose an All projects toggle that broadens both numeric and text discovery without changing the query or entity filter.
- `BR-10` [bdd] WHEN the query supplies a full ticket key or explicit @CODE scope, the system shall honor that explicit cross-project lookup independently of the All projects toggle while preserving external-identity matching for full keys.
- `BR-11` [bdd] WHEN results display matching query text, the system shall highlight matching substrings in ticket keys, titles, project labels and external-reference labels without changing text, accessible identities or link destinations.
- `BR-12` [bdd] WHEN Quick Search is open, the system shall keep concise keyboard guidance below the results, preserve native Tab navigation within the dialog, expose optional action-focus help and restore focus to its connected opener on close.

The All/Tickets/Projects tabs select entity type. Location defaults to the current project on every open; without a current project it defaults to all projects. Explicit Projects selection remains a project-discovery entry point. @CODE syntax is excluded from highlight terms. Full keys retain MDT-252 local/external identity union and exact-first ordering; repetitive provenance labels stay removed under MDT-252. No new global shortcuts are introduced.
