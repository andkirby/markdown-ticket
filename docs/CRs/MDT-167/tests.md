# Tests

Ticket: `MDT-167`

## Test Plan

### `TEST-settings-modal-controls`

Kind: integration

Covers: `BR-1.1`, `BR-1.2`, `BR-1.3`, `BR-2.1`, `BR-2.2`, `BR-3.1`, `BR-3.2`, `BR-4.1`, `BR-4.2`, `C1`, `C2`

Verify Settings opens from the hamburger path, renders all tabs, applies settings immediately, uses existing storage/action paths, and does not call backend APIs.

### `TEST-visible-ticket-card-badges-config`

Kind: unit

Covers: `BR-3.3`, `C3`, `C5`, `Edge-1`

Verify the badge preference helper returns defaults for missing, malformed, empty, or unsupported localStorage values and persists only supported badge IDs.

### `TEST-ticket-card-badge-rendering`

Kind: integration

Covers: `BR-3.4`, `C4`

Verify board ticket cards render only the configured badges, preserve the canonical display order, and do not affect ticket viewer badge rendering.
