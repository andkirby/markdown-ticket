# BDD

## Scenarios By Requirement Family

### BR-1

- Open quick search modal with keyboard shortcut (`open_modal_with_keyboard_shortcut`)
  Covers: `BR-1`, `BR-2`
  Given: I am on the board view with multiple tickets visible
  When: I press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  Then: the quick search modal opens and the search input is focused

### BR-2

- Open quick search modal with keyboard shortcut (`open_modal_with_keyboard_shortcut`)
  Covers: `BR-1`, `BR-2`
  Given: I am on the board view with multiple tickets visible
  When: I press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
  Then: the quick search modal opens and the search input is focused

### BR-3

- Filter tickets by key number (`filter_by_ticket_key`)
  Covers: `BR-3`
  Given: the quick search modal is open with multiple tickets available
  When: I type a ticket key number like "136"
  Then: the results show only tickets with matching key numbers (e.g., MDT-136)
- Filter tickets by title substring (`filter_by_title_substring`)
  Covers: `BR-3`
  Given: the quick search modal is open with tickets titled "Badge Color Fix" and "Header Badge"
  When: I type "badge color"
  Then: the results show only "Badge Color Fix" (AND logic, case-insensitive)

### BR-4

- Navigate results with arrow keys (`navigate_results_with_arrow_keys`)
  Covers: `BR-4`
  Given: the quick search modal shows multiple results
  When: I press the down arrow key then the up arrow key
  Then: the selection moves to the next result then back to the previous result

### BR-5

- Select ticket and open detail view (`select_ticket_and_open_detail`)
  Covers: `BR-5`
  Given: the quick search modal shows results with one selected
  When: I press Enter
  Then: the modal closes and the selected ticket detail view opens

### BR-6

- Close modal with Escape key (`close_modal_with_escape`)
  Covers: `BR-6`
  Given: the quick search modal is open
  When: I press Escape
  Then: the modal closes without selecting a ticket

### BR-7

- Close modal by clicking outside (`close_modal_with_click_outside`)
  Covers: `BR-7`
  Given: the quick search modal is open
  When: I click outside the modal content area
  Then: the modal closes without selecting a ticket

### BR-8

- Display no results message (`show_no_results_state`)
  Covers: `BR-8`
  Given: the quick search modal is open
  When: I type a query that matches no ticket titles or keys
  Then: the results area displays a "No results" message

## Coverage Summary

| Requirement ID | Scenario Count | Scenario IDs |
|---|---:|---|
| `BR-1` | 1 | `open_modal_with_keyboard_shortcut` |
| `BR-2` | 1 | `open_modal_with_keyboard_shortcut` |
| `BR-3` | 2 | `filter_by_ticket_key`, `filter_by_title_substring` |
| `BR-4` | 1 | `navigate_results_with_arrow_keys` |
| `BR-5` | 1 | `select_ticket_and_open_detail` |
| `BR-6` | 1 | `close_modal_with_escape` |
| `BR-7` | 1 | `close_modal_with_click_outside` |
| `BR-8` | 1 | `show_no_results_state` |
