# UAT Refinement Brief

## Objective

Add a Board settings configuration that lets the user choose which ticket card badges are visible on the board.

Storage decision: browser `localStorage`, following `docs/architecture/preference-storage-architecture.md`.

## Approved Changes

- Add a visible ticket card badges setting to the Settings modal Board tab.
- Persist the selected badge ID list in browser `localStorage`.
- Apply the setting to board ticket cards only.
- Preserve the existing ticket card badge order for selected badges.
- Fall back to the default badge list when storage is missing, malformed, empty, or contains unsupported badge IDs.
- Do not add backend, shared config, CLI, MCP, or project config storage for this visual-only preference.

## Changed Requirement IDs

| ID | Decision | Change |
|----|----------|--------|
| `BR-3.3` | additive_change | Add a Board tab setting for visible ticket card badges. |
| `BR-3.4` | additive_change | Apply selected badge visibility to board ticket cards while preserving standard order. |
| `C3` | additive_change | Require the new localStorage key naming convention. |
| `C4` | additive_change | Scope the badge preference to board ticket cards only. |
| `C5` | additive_change | Require fallback for invalid or unavailable storage. |
| `Edge-1` | additive_change | Track invalid badge preference storage fallback. |

## Affected Downstream Trace

| Stage | Added or Updated |
|-------|------------------|
| Requirements | `BR-3.3`, `BR-3.4`, `C3`, `C4`, `C5`, `Edge-1` |
| BDD | `visible_card_badges_configured` |
| Architecture | `ART-ticket-card-badge-config`, `ART-ticket-attribute-tags`, `OBL-visible-ticket-card-badges` |
| Tests | `TEST-visible-ticket-card-badges-config`, `TEST-ticket-card-badge-rendering` |
| Tasks | `TASK-2`, `TASK-3` |

## Execution Slices

### Slice 1: Badge preference storage

- Objective: Add a typed browser-local preference for visible board ticket card badges.
- Direct artifacts/files: `src/config/ticketCardBadges.ts`, `src/config/ticketCardBadges.test.ts`, `src/config/localStoragePreferences.ts`
- Direct GREEN targets: `TEST-visible-ticket-card-badges-config`
- Impacted canonical task IDs: `TASK-2`
- Why this slice exists: The preference needs validation and defaults before UI or card rendering consume it.

### Slice 2: Board settings control and card rendering

- Objective: Let users change visible badges in Settings and reflect that selection on board ticket cards.
- Direct artifacts/files: `src/components/SettingsModal.tsx`, `src/components/TicketAttributeTags.tsx`, `src/components/TicketCard.tsx`
- Direct GREEN targets: `visible_card_badges_configured`, `TEST-ticket-card-badge-rendering`, `TEST-settings-modal-controls`
- Impacted canonical task IDs: `TASK-2`, `TASK-3`
- Why this slice exists: The user-facing control and board rendering must stay in sync without backend involvement.

## Validation

- `spec-trace validate MDT-167 --stage requirements`
- `spec-trace validate MDT-167 --stage bdd`
- `spec-trace validate MDT-167 --stage architecture`
- `spec-trace validate MDT-167 --stage tests`
- `spec-trace validate MDT-167 --stage tasks`
- `spec-trace validate MDT-167 --stage all`

## Watchlist

- Keep badge visibility scoped to board ticket cards. Ticket viewer badges remain unchanged.
- Use the browser-only preference tier; do not add backend or shared config.
- Preserve canonical badge order even when only a subset is selected.
- Treat invalid storage as default, not as an empty UI.

