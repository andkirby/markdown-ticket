# BDD

## Scenarios By Requirement Family

### BR-1

- Initial view displays Board icon (`initial_view_board_mode`)
  Covers: `BR-1.1`
  Given: the application is loaded in board view
  When: I view the navigation header
  Then: I see a single merged Board|List button displaying the Board icon
- Documents view shows last-used mode with dimmed border (`initial_view_documents_mode`)
  Covers: `BR-1.3`
  Given: the application is loaded in documents view and the last-used board or list mode was board
  When: I view the navigation header
  Then: I see a single merged Board|List button displaying the Board icon with a dimmed border
- Initial view displays List icon (`initial_view_list_mode`)
  Covers: `BR-1.2`
  Given: the application is loaded in list view
  When: I view the navigation header
  Then: I see a single merged Board|List button displaying the List icon

### BR-2

- No hover overlay in documents view (`hover_overlay_no_documents_view`)
  Covers: `BR-2.2`
  Given: I am in documents view
  When: I hover over the Board|List button
  Then: I do not see an overlay
- Hover overlay displays alternate view icon (`hover_overlay_shows_alternate_icon`)
  Covers: `BR-2.1`
  Given: I am in board view
  When: I hover over the Board|List button
  Then: I see an overlay showing the List icon appear within 150ms with a fade-in animation

### BR-3

- Navigate from Board view to Documents view (`board_to_documents_transition`)
  Covers: `BR-3.1`
  Given: I am in board view
  When: I click the Documents button
  Then: I navigate to documents view and the Board|List button displays the Board icon with dimmed border
- Complete circular navigation: Board → Documents → Board (`circular_board_documents_board`)
  Covers: `BR-3.1`, `BR-3.2`
  Given: I am in board view
  When: I click the Documents button then click the Board|List button
  Then: I navigate to documents view and return to board view
- Complete circular navigation: List → Documents → List (`circular_list_documents_list`)
  Covers: `BR-3.1`, `BR-3.2`
  Given: I am in list view
  When: I click the Documents button then click the Board|List button
  Then: I navigate to documents view and return to list view
- Click from documents returns to last-used view (`click_from_documents_to_last_used`)
  Covers: `BR-3.2`
  Given: I am in documents view and the last-used mode was board
  When: I click the Board|List button
  Then: I navigate to board view
- Click toggles from Board to List view (`click_toggle_board_to_list`)
  Covers: `BR-3.1`, `BR-8`
  Given: I am in board view
  When: I click the Board|List button
  Then: I navigate to list view and the Board|List button displays the Board icon
- Click toggles from List to Board view (`click_toggle_list_to_board`)
  Covers: `BR-3.1`, `BR-8`
  Given: I am in list view
  When: I click the Board|List button
  Then: I navigate to board view and the Board|List button displays the List icon
- Navigate from List view to Documents view (`list_to_documents_transition`)
  Covers: `BR-3.1`
  Given: I am in list view
  When: I click the Documents button
  Then: I navigate to documents view and the Board|List button displays the List icon with dimmed border

### BR-4

- Last-used mode is saved to localStorage (`persistence_saves_mode`)
  Covers: `BR-4`
  Given: I am in board view
  When: I switch to list view
  Then: the lastBoardListMode value in localStorage is set to list

### BR-5

- Application loads last-used mode from localStorage (`persistence_loads_mode`)
  Covers: `BR-5`
  Given: the localStorage key lastBoardListMode is set to list
  When: the application loads
  Then: the application displays in list view

### BR-6

- Desktop shows both Board|List and Documents buttons (`desktop_navigation_two_buttons`)
  Covers: `BR-6.2`
  Given: the application loads on desktop viewport (width >= 768px)
  When: I view the navigation header
  Then: I see both the Board|List toggle button and the Documents button
- Mobile shows only Board|List button (`mobile_navigation_one_button`)
  Covers: `BR-6.1`
  Given: the application loads on mobile viewport (width < 768px)
  When: I view the navigation header
  Then: I see only the Board|List toggle button and the Documents button is hidden

### BR-7

- Hamburger menu shows 3-option theme button group on all devices (`hamburger_menu_theme_button_group`)
  Covers: `BR-7.3`
  Given: the application is loaded on any device
  When: I open the hamburger menu
  Then: I see a button-group with 3 icon-only theme options (Sun for Light, Moon for Dark, Monitor for System) and the active theme is highlighted
- Mobile navigation hides project title (`mobile_header_no_project_title`)
  Covers: `BR-7.1`
  Given: the application loads on mobile viewport (width < 768px)
  When: I view the navigation header
  Then: I do not see the project title displayed
- Mobile navigation uses mobile logo (`mobile_header_uses_mobile_logo`)
  Covers: `BR-7.2`
  Given: the application loads on mobile viewport (width < 768px)
  When: I view the navigation header
  Then: I see the mobile logo from designs/logo-mdt-m-dark_64x64.png

### BR-8

- Click toggles from Board to List view (`click_toggle_board_to_list`)
  Covers: `BR-3.1`, `BR-8`
  Given: I am in board view
  When: I click the Board|List button
  Then: I navigate to list view and the Board|List button displays the Board icon
- Click toggles from List to Board view (`click_toggle_list_to_board`)
  Covers: `BR-3.1`, `BR-8`
  Given: I am in list view
  When: I click the Board|List button
  Then: I navigate to board view and the Board|List button displays the List icon

### BR-9

- Mobile list view uses 2-line card layout (`mobile_list_view_two_line_cards`)
  Covers: `BR-9.1`, `BR-9.2`
  Given: the application is in list view on mobile viewport (width < 768px)
  When: I view ticket cards
  Then: I see CR-key and badges on line 1 and title on line 2 at 100% width

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1.1` | 1 | `initial_view_board_mode` |
| `BR-1.2` | 1 | `initial_view_list_mode` |
| `BR-1.3` | 1 | `initial_view_documents_mode` |
| `BR-2.1` | 1 | `hover_overlay_shows_alternate_icon` |
| `BR-2.2` | 1 | `hover_overlay_no_documents_view` |
| `BR-3.1` | 6 | `board_to_documents_transition`, `circular_board_documents_board`, `circular_list_documents_list`, `click_toggle_board_to_list`, `click_toggle_list_to_board`, `list_to_documents_transition` |
| `BR-3.2` | 3 | `circular_board_documents_board`, `circular_list_documents_list`, `click_from_documents_to_last_used` |
| `BR-4` | 1 | `persistence_saves_mode` |
| `BR-5` | 1 | `persistence_loads_mode` |
| `BR-6.1` | 1 | `mobile_navigation_one_button` |
| `BR-6.2` | 1 | `desktop_navigation_two_buttons` |
| `BR-7.1` | 1 | `mobile_header_no_project_title` |
| `BR-7.2` | 1 | `mobile_header_uses_mobile_logo` |
| `BR-7.3` | 1 | `hamburger_menu_theme_button_group` |
| `BR-8` | 2 | `click_toggle_board_to_list`, `click_toggle_list_to_board` |
| `BR-9.1` | 1 | `mobile_list_view_two_line_cards` |
| `BR-9.2` | 1 | `mobile_list_view_two_line_cards` |
