# Tasks

## Task List

- Create ViewMode type-safe enum and persistence hook (`TASK-1`)
  Owns: `ART-use-view-mode-persistence`, `ART-view-mode-types`
  Makes Green: `TEST-use-view-mode-persistence`
- Create BoardListToggle component with hover overlay using original webp icons (`TASK-2`)
  Owns: `ART-board-list-toggle`
  Makes Green: `hover_overlay_no_documents_view`, `hover_overlay_shows_alternate_icon`, `TEST-board-list-toggle`
- Create ViewModeSwitcher container component (`TASK-3`)
  Owns: `ART-view-mode-switcher-component`, `ART-view-mode-switcher-index`
  Makes Green: `board_to_documents_transition`, `initial_view_board_mode`, `initial_view_documents_mode`, `initial_view_list_mode`, `list_to_documents_transition`, `TEST-view-mode-switcher`
- Integrate ViewModeSwitcher into App.tsx with state management (`TASK-4`)
  Owns: `ART-app-modified`
  Makes Green: `circular_board_documents_board`, `circular_list_documents_list`, `click_from_documents_to_last_used`, `click_toggle_board_to_list`, `click_toggle_list_to_board`, `desktop_navigation_two_buttons`, `mobile_navigation_one_button`, `persistence_loads_mode`, `persistence_saves_mode`
- Create AppHeader components (MobileLogo, HamburgerMenu, ButtonGroup) (`TASK-5`)
  Owns: `ART-app-header-index`, `ART-button-group`, `ART-button-group-separator`, `ART-hamburger-menu`, `ART-mobile-logo`, `ART-mobile-logo-asset`
  Makes Green: `hamburger_menu_theme_button_group`, `mobile_header_no_project_title`, `mobile_header_uses_mobile_logo`, `TEST-button-group`, `TEST-hamburger-menu`, `TEST-mobile-logo`
- Implement mobile card layout in ProjectView (`TASK-6`)
  Owns: `ART-project-view-modified`
  Makes Green: `mobile_list_view_two_line_cards`, `TEST-mobile-responsive`
- Build verification and integration tests (`TASK-7`)
  Owns: `ART-app-modified`, `ART-project-view-modified`
  Makes Green: `TEST-build-integration`
- Verify original icon and button style preservation (C7) (`TASK-8`)
  Owns: `ART-board-list-toggle`
  Makes Green: `TEST-view-mode-switcher`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-app-header-index` | `TASK-5` |
| `ART-app-modified` | `TASK-4`, `TASK-7` |
| `ART-board-list-toggle` | `TASK-2`, `TASK-8` |
| `ART-button-group` | `TASK-5` |
| `ART-button-group-separator` | `TASK-5` |
| `ART-hamburger-menu` | `TASK-5` |
| `ART-mobile-logo` | `TASK-5` |
| `ART-mobile-logo-asset` | `TASK-5` |
| `ART-project-view-modified` | `TASK-6`, `TASK-7` |
| `ART-use-view-mode-persistence` | `TASK-1` |
| `ART-view-mode-switcher-component` | `TASK-3` |
| `ART-view-mode-switcher-index` | `TASK-3` |
| `ART-view-mode-types` | `TASK-1` |

## Makes Green Summary

| ID | Task IDs |
|---|---|
| `board_to_documents_transition` | `TASK-3` |
| `circular_board_documents_board` | `TASK-4` |
| `circular_list_documents_list` | `TASK-4` |
| `click_from_documents_to_last_used` | `TASK-4` |
| `click_toggle_board_to_list` | `TASK-4` |
| `click_toggle_list_to_board` | `TASK-4` |
| `desktop_navigation_two_buttons` | `TASK-4` |
| `hamburger_menu_theme_button_group` | `TASK-5` |
| `hover_overlay_no_documents_view` | `TASK-2` |
| `hover_overlay_shows_alternate_icon` | `TASK-2` |
| `initial_view_board_mode` | `TASK-3` |
| `initial_view_documents_mode` | `TASK-3` |
| `initial_view_list_mode` | `TASK-3` |
| `list_to_documents_transition` | `TASK-3` |
| `mobile_header_no_project_title` | `TASK-5` |
| `mobile_header_uses_mobile_logo` | `TASK-5` |
| `mobile_list_view_two_line_cards` | `TASK-6` |
| `mobile_navigation_one_button` | `TASK-4` |
| `persistence_loads_mode` | `TASK-4` |
| `persistence_saves_mode` | `TASK-4` |
| `TEST-board-list-toggle` | `TASK-2` |
| `TEST-build-integration` | `TASK-7` |
| `TEST-button-group` | `TASK-5` |
| `TEST-hamburger-menu` | `TASK-5` |
| `TEST-mobile-logo` | `TASK-5` |
| `TEST-mobile-responsive` | `TASK-6` |
| `TEST-use-view-mode-persistence` | `TASK-1` |
| `TEST-view-mode-switcher` | `TASK-3`, `TASK-8` |
