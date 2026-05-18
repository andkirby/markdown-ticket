# BDD

Ticket: `MDT-167`

## Scenarios

### settings_modal_opens

Covers: `BR-1.1`, `BR-1.2`

Given the user is on the app board
When the user opens Settings from the hamburger menu
Then the Settings modal appears with Appearance, Board, and Advanced tabs

### settings_apply_immediately

Covers: `BR-1.3`

Given the Settings modal is open
When the user changes a setting
Then the setting is applied immediately without requiring a Save action

### appearance_preferences_persist

Covers: `BR-2.1`, `BR-2.2`

Given the Appearance tab is open
When the user changes Theme or Default View
Then the selected preference is persisted in the existing client-side storage

### board_preferences_persist

Covers: `BR-3.1`, `BR-3.2`

Given the Board tab is open
When the user changes Card Density or Smart Links
Then the selected preference is persisted in browser localStorage

### visible_card_badges_configured

Covers: `BR-3.3`, `BR-3.4`

Given the Board tab is open
When the user selects the ticket card badges that should be visible
Then the board persists the selected list and ticket cards render only those badges in the standard order

### advanced_preferences_work

Covers: `BR-4.1`, `BR-4.2`

Given the Advanced tab is open
When the user toggles Event History or clears cache
Then the existing event history preference or cache clear action is used

