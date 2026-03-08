# Requirements

Ticket: `MDT-131`

## Overview

This feature reduces navigation space from 3 buttons to 2 by merging Board and List views into a single toggle button with hover preview. The button shows the current view icon, hovering reveals the alternate view icon with a 150ms fade-in animation, and clicking toggles between views or returns to the last-used board/list mode. localStorage persists the last-used mode across browser sessions. On mobile (viewport < 768px), only the Board|List toggle is visible (Documents button hidden), project title is removed, mobile logo is used, and theme toggle moves to hamburger menu. List view tickets display in 2-line layout on mobile (CR-key + badges on line 1, title on line 2). All behavior is extracted into a dedicated ViewModeSwitcher component folder following the project's Type-Safe Enum pattern.

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] WHEN application loads in board view, the system shall render a single merged Board|List button displaying the original Board icon from /icon_board_col_64.webp
- `BR-1.2` [bdd] WHEN application loads in list view, the system shall render a single merged Board|List button displaying the original List icon from /icon_list_64.webp
- `BR-1.3` [bdd] WHEN application loads in documents view, the system shall render a single merged Board|List button displaying the last-used board or list icon from original webp files (/icon_board_col_64.webp or /icon_list_64.webp) with a dimmed border

### BR-2

- `BR-2.1` [bdd] WHEN user hovers over the Board|List button while in board or list view, the system shall display an overlay showing the alternate view icon from original webp files (/icon_list_64.webp or /icon_board_col_64.webp) within 150ms with a fade-in animation
- `BR-2.2` [bdd] WHEN user hovers over the Board|List button while in documents view, the system shall NOT display an overlay

### BR-3

- `BR-3.1` [bdd] WHEN user clicks the Board|List button while in board or list view, the system shall navigate to the alternate view (board to list, or list to board)
- `BR-3.2` [bdd] WHEN user clicks the Board|List button while in documents view, the system shall navigate to the last-used board or list view

### BR-4

- `BR-4` [bdd] WHEN user switches between board and list views, the system shall persist the last-used mode to localStorage with key 'lastBoardListMode'

### BR-5

- `BR-5` [bdd] WHEN application loads, the system shall read localStorage key 'lastBoardListMode' to determine the default board or list mode

### BR-6

- `BR-6.1` [bdd] WHEN application loads on mobile viewport (width < 768px), the system shall render only the Board|List toggle button and hide the Documents button
- `BR-6.2` [bdd] WHEN application loads on desktop viewport (width >= 768px), the system shall render both Board|List toggle button and Documents button

### BR-7

- `BR-7.1` [bdd] WHEN application loads on mobile viewport, the system shall NOT display the project title in the navigation header
- `BR-7.2` [bdd] WHEN application loads on mobile viewport, the system shall use the mobile logo from designs/logo-mdt-m-dark_64x64.png instead of the default logo
- `BR-7.3` [bdd] WHEN user opens the hamburger menu on any device (mobile or desktop), the system shall display a button-group with 3 theme options (Light, Dark, System) showing only icons with no text labels. The active theme is highlighted with primary color. The desktop theme toggle button in the top right corner has been removed.

### BR-8

- `BR-8` [bdd] WHEN user switches from Board view to List view, the Board|List toggle button shall display the original List icon from /icon_list_64.webp, and WHEN switching from List to Board view, it shall display the original Board icon from /icon_board_col_64.webp

### BR-9

- `BR-9.1` [bdd] WHEN application displays list view on mobile viewport, the system shall render each ticket card with CR-key and tags/badges on line 1
- `BR-9.2` [bdd] WHEN application displays list view on mobile viewport, the system shall render ticket title on line 2 at 100% width

## Constraints

- `C1` [tests] Hover overlay fade-in animation SHALL complete within 150ms
- `C2` [tests] Hover overlay SHALL have pointer-events-none CSS property to allow click events to pass through to the underlying button
- `C3` [tests] Component SHALL follow the Type-Safe Enum pattern defined in docs/PRE_IMPLEMENT.md for ViewMode type
- `C4` [tests] TypeScript compilation SHALL succeed without errors
- `C5` [tests] All existing tests SHALL pass after component extraction
- `C6` [tests] Mobile viewport breakpoint SHALL be 768px (Tailwind md: breakpoint)
- `C7` [tests] The Board|List toggle button SHALL use the original webp image files (/icon_board_col_64.webp and /icon_list_64.webp) with original button styles (h-12 w-12 rounded-md, border-2 with primary/muted-foreground colors, dark:invert) and SHALL NOT use icon library components (e.g., lucide-react, react-icons)

## Edge Cases

- `Edge-1` [tests] IF localStorage key 'lastBoardListMode' is absent or contains an invalid value, the system shall default to 'board' mode
- `Edge-2` [tests] WHILE localStorage is unavailable (e.g., private browsing mode with disabled storage), the system shall function normally with default 'board' mode

## Route Policy Summary

| Route | Count | IDs |
|---|---:|---|
| bdd | 17 | `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`, `BR-2.2`, `BR-3.1`, `BR-3.2`, `BR-4`, `BR-5`, `BR-6.1`, `BR-6.2`, `BR-7.1`, `BR-7.2`, `BR-7.3`, `BR-8`, `BR-9.1`, `BR-9.2` |
| tests | 9 | `C1`, `C2`, `C3`, `C4`, `C5`, `C6`, `C7`, `Edge-1`, `Edge-2` |
| clarification | 0 | - |
| not_applicable | 0 | - |
