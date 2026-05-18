# Requirements

Ticket: `MDT-167`

## Behavioral Requirements

### BR-1

- `BR-1.1` [bdd] WHEN the user opens Settings from the hamburger menu, the system shall display a dedicated Settings modal.
- `BR-1.2` [bdd] WHEN the Settings modal opens, the system shall display Appearance, Board, and Advanced tabs.
- `BR-1.3` [bdd] WHEN the user changes a setting, the system shall apply the change immediately without a Save button.

### BR-2

- `BR-2.1` [bdd] WHEN the user changes Theme in Settings, the system shall persist the selected mode to the existing theme cookie and apply it immediately.
- `BR-2.2` [bdd] WHEN the user changes Default View in Settings, the system shall persist the preference to browser localStorage.

### BR-3

- `BR-3.1` [bdd] WHEN the user changes Card Density in Settings, the system shall persist the preference to browser localStorage.
- `BR-3.2` [bdd] WHEN the user changes Smart Links in Settings, the system shall read and write the existing auto-linking localStorage preference.
- `BR-3.3` [bdd] WHEN the user configures visible ticket card badges in Settings, the system shall persist the selected badge list to browser localStorage.
- `BR-3.4` [bdd] WHEN the board renders ticket cards, the system shall show only the configured visible ticket card badges while preserving the standard badge order.

### BR-4

- `BR-4.1` [bdd] WHEN the user changes Event History in Settings, the system shall show or hide the SSE event history panel using the existing localStorage preference.
- `BR-4.2` [bdd] WHEN the user clicks Clear Cache in Settings, the system shall run the existing cache clear action.

## Constraints

- `C1` [tests] Settings remain client-side only; no backend API, shared config, CLI, or MCP behavior is introduced.
- `C2` [tests] Browser-only settings use the preference tier defined in `docs/architecture/preference-storage-architecture.md`.
- `C3` [tests] New localStorage keys follow `markdown-ticket:<scope>:<feature>[:<projectId>]`.
- `C4` [tests] The visible ticket card badges setting controls board ticket cards only and does not change ticket viewer badges.
- `C5` [tests] Invalid, missing, or unavailable localStorage values fall back to defaults.

## Edge Cases

- `Edge-1` [tests] WHEN the stored badge list is empty, malformed, or contains unsupported badge IDs, the system shall fall back to the default badge list.

