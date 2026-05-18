# Architecture

Ticket: `MDT-167`

## Preference Tier

All Settings modal preferences in this ticket are browser-only UI state. Per `docs/architecture/preference-storage-architecture.md`, they belong in frontend `localStorage`, not backend config, shared services, project config, CLI, or MCP.

## Artifacts

| ID | Path | Kind | Purpose |
|----|------|------|---------|
| `ART-settings-modal` | `src/components/SettingsModal.tsx` | runtime | Renders tabs and controls for client-side preferences. |
| `ART-settings-css` | `src/components/SettingsModal/settings.css` | runtime | Provides Settings modal tab and control styling. |
| `ART-local-storage-preferences` | `src/config/localStoragePreferences.ts` | runtime | Provides safe typed localStorage read/write helpers. |
| `ART-ticket-card-badge-config` | `src/config/ticketCardBadges.ts` | runtime | Owns visible ticket card badge defaults, validation, getter, and setter. |
| `ART-ticket-attribute-tags` | `src/components/TicketAttributeTags.tsx` | runtime | Renders board ticket card badges using the configured visible badge list. |
| `ART-ticket-card` | `src/components/TicketCard.tsx` | runtime | Applies board card presentation and density consumers. |
| `ART-settings-tests` | `src/components/SettingsModal.test.tsx` | test | Verifies Settings controls and persistence. |
| `ART-ticket-card-badge-tests` | `src/config/ticketCardBadges.test.ts` | test | Verifies badge preference defaults, filtering, and invalid storage fallback. |

## Obligations

### `OBL-client-side-settings`

Derived from: `BR-1.1`, `BR-1.2`, `BR-1.3`, `C1`, `C2`

Artifacts: `ART-settings-modal`, `ART-settings-css`, `ART-local-storage-preferences`, `ART-settings-tests`

Settings controls must read initial state from client-side storage, apply changes immediately, and avoid backend requests.

### `OBL-board-preferences`

Derived from: `BR-3.1`, `BR-3.2`

Artifacts: `ART-settings-modal`, `ART-ticket-card`

Board tab controls must keep card density and smart-link behavior on existing or browser-only preference paths.

### `OBL-visible-ticket-card-badges`

Derived from: `BR-3.3`, `BR-3.4`, `C3`, `C4`, `C5`, `Edge-1`

Artifacts: `ART-settings-modal`, `ART-ticket-card-badge-config`, `ART-ticket-attribute-tags`, `ART-ticket-card-badge-tests`

Visible ticket card badge selection must be stored under a `markdown-ticket:<scope>:<feature>` localStorage key, validate stored badge IDs, fall back to defaults when invalid, and affect only board ticket cards.
