# Requirements

Ticket: `MDT-136`

## Overview

Cmd+K Quick Search provides keyboard-driven ticket discovery across all views. Users can instantly find tickets by key number or title substring, navigate results with arrow keys, and jump directly to ticket detail. The modal uses preloaded ticket data for zero-latency filtering.

## Behavioral Requirements

### BR-1

- `BR-1` [bdd] WHEN user presses Cmd+K on Mac or Ctrl+K on Windows/Linux, the system shall open the quick search modal.

### BR-2

- `BR-2` [bdd] WHEN the quick search modal opens, the system shall focus the search input field.

### BR-3

- `BR-3` [bdd] WHEN user types in the search input, the system shall filter tickets in real-time by ticket key number or title substring (case-insensitive, all words must match).

### BR-4

- `BR-4` [bdd] WHEN user presses up or down arrow keys, the system shall move selection between result items.

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
- `C2` [tests] The results list shall display a maximum of 10 matching tickets.
- `C3` [tests] Title substring matching shall be case-insensitive.
- `C4` [tests] Multi-word queries shall use AND logic: all words in the query must appear in the ticket title (order-independent).

## Edge Cases

_No edge cases recorded._

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 8 | `BR-1`, `BR-2`, `BR-3`, `BR-4`, `BR-5`, `BR-6`, `BR-7`, `BR-8` |
| tests | 4 | `C1`, `C2`, `C3`, `C4` |
| clarification | 0 | - |
| not_applicable | 0 | - |
