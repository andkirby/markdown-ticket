# Tasks

Ticket: `MDT-167`

## Task List

- Finalize Settings modal preference plumbing (`TASK-1`)
  Owns: `ART-settings-modal`, `ART-settings-css`, `ART-local-storage-preferences`, `ART-settings-tests`
  Makes Green: `settings_modal_opens`, `settings_apply_immediately`, `appearance_preferences_persist`, `advanced_preferences_work`, `TEST-settings-modal-controls`
- Add visible ticket card badges preference (`TASK-2`)
  Owns: `ART-ticket-card-badge-config`, `ART-ticket-card-badge-tests`, `ART-settings-modal`, `ART-ticket-attribute-tags`
  Makes Green: `visible_card_badges_configured`, `TEST-visible-ticket-card-badges-config`, `TEST-ticket-card-badge-rendering`
- Wire board preference consumers (`TASK-3`)
  Owns: `ART-ticket-card`, `ART-ticket-attribute-tags`
  Makes Green: `board_preferences_persist`, `visible_card_badges_configured`, `TEST-ticket-card-badge-rendering`

## Artifact Ownership Summary

| Artifact ID | Owning Task IDs |
|---|---|
| `ART-local-storage-preferences` | `TASK-1` |
| `ART-settings-css` | `TASK-1` |
| `ART-settings-modal` | `TASK-1`, `TASK-2` |
| `ART-settings-tests` | `TASK-1` |
| `ART-ticket-attribute-tags` | `TASK-2`, `TASK-3` |
| `ART-ticket-card` | `TASK-3` |
| `ART-ticket-card-badge-config` | `TASK-2` |
| `ART-ticket-card-badge-tests` | `TASK-2` |
