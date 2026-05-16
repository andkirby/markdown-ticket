# Architecture

## Rationale

## Overview

Cmd+K Quick Search provides keyboard-driven ticket discovery via a modal overlay. The modal filters preloaded tickets in real-time using client-side logic, requiring no API calls. Users navigate results with arrow keys and jump directly to ticket detail on Enter.

## Pattern: Modal Command Palette

**Selected pattern**: Centered modal with search input + results list
**Rationale**:
- Matches established patterns in Linear, Notion, GitHub
- Reuses existing `UI/Modal.tsx` component for overlay behavior
- Minimal scope with high discoverability

## Structure

```text
src/
├── components/QuickSearch/
│   ├── index.ts                    # Exports
│   ├── QuickSearchModal.tsx        # Modal container, keyboard state
│   ├── QuickSearchInput.tsx        # Search input with icon
│   └── QuickSearchResults.tsx      # Results list with selection
├── hooks/
│   ├── useGlobalKeyboard.ts        # Global Cmd/Ctrl+K listener
│   └── useQuickSearch.ts           # Filter logic + selection state
└── App.tsx                         # Integrates useGlobalKeyboard
```

## Module Boundaries

| Module | Owns |
|--------|------|
| `useGlobalKeyboard` | Global keydown listener, modal open/close toggle |
| `useQuickSearch` | Query state, filtered results, selection index |
| `QuickSearchModal` | Modal visibility, portal rendering |
| `QuickSearchInput` | Input field, auto-focus |
| `QuickSearchResults` | Result items, keyboard highlight, click handling |

## Runtime Flow

```text
User presses Cmd/Ctrl+K
  → useGlobalKeyboard detects combo
  → Sets modalOpen=true
  → QuickSearchModal renders
  → QuickSearchInput auto-focuses
  → User types query
  → useQuickSearch filters tickets (key match OR title substring AND logic)
  → QuickSearchResults displays up to 10 matches
  → User navigates with ↑↓ (useQuickSearch tracks selectedIndex)
  → User presses Enter
  → Parent's onSelectTicket called with selected ticket
  → Modal closes, ticket detail opens
```

## Extension Rule

Future expansions (actions, filters, navigation) should:
1. Add new result types to `useQuickSearch` filter logic
2. Extend `QuickSearchResults` with type-specific rendering
3. Keep modal component unchanged (presentational)

## Invariants

- Modal always uses `UI/Modal.tsx` (no custom overlay)
- Search filtering is client-side only (no API)
- Results capped at 10 items
- All keyboard shortcuts respect platform (Cmd vs Ctrl)

## Obligations

- Display 'No results' message when no matches (`OBL-empty-state`)
  Derived From: `BR-8`
  Artifacts: `ART-quick-search-results`, `ART-quick-search-e2e-test`
- Escape key and click-outside close modal without selection (`OBL-modal-close`)
  Derived From: `BR-6`, `BR-7`
  Artifacts: `ART-quick-search-modal`, `ART-quick-search-index`
- Keyboard shortcut opens modal with auto-focused input (`OBL-modal-open`)
  Derived From: `BR-1`, `BR-2`, `C1`
  Artifacts: `ART-use-global-keyboard`, `ART-quick-search-modal`, `ART-quick-search-input`, `ART-quick-search-index`
- Results list limited to 10 items maximum (`OBL-result-limit`)
  Derived From: `C2`
  Artifacts: `ART-use-quick-search`, `ART-quick-search-results`, `ART-quick-search-e2e-test`
- Arrow keys navigate through result items (`OBL-results-navigation`)
  Derived From: `BR-4`
  Artifacts: `ART-quick-search-results`, `ART-use-quick-search`, `ART-quick-search-e2e-test`
- Filter tickets by key number or title substring (case-insensitive, AND logic) (`OBL-search-filter`)
  Derived From: `BR-3`, `C3`, `C4`
  Artifacts: `ART-use-quick-search`, `ART-quick-search-input`, `ART-quick-search-results`, `ART-quick-search-index`, `ART-quick-search-e2e-test`
- Enter selects ticket and opens detail view (`OBL-ticket-selection`)
  Derived From: `BR-5`
  Artifacts: `ART-quick-search-modal`, `ART-quick-search-results`, `ART-quick-search-e2e-test`

## Artifacts

| Artifact ID | Path | Kind | Referencing Obligations |
|---|---|---|---|
| `ART-quick-search-e2e-test` | `tests/e2e/quick-search/modal.spec.ts` | test | `OBL-empty-state`, `OBL-result-limit`, `OBL-results-navigation`, `OBL-search-filter`, `OBL-ticket-selection` |
| `ART-quick-search-index` | `src/components/QuickSearch/index.ts` | runtime | `OBL-modal-close`, `OBL-modal-open`, `OBL-search-filter` |
| `ART-quick-search-input` | `src/components/QuickSearch/QuickSearchInput.tsx` | runtime | `OBL-modal-open`, `OBL-search-filter` |
| `ART-quick-search-modal` | `src/components/QuickSearch/QuickSearchModal.tsx` | runtime | `OBL-modal-close`, `OBL-modal-open`, `OBL-ticket-selection` |
| `ART-quick-search-results` | `src/components/QuickSearch/QuickSearchResults.tsx` | runtime | `OBL-empty-state`, `OBL-result-limit`, `OBL-results-navigation`, `OBL-search-filter`, `OBL-ticket-selection` |
| `ART-use-global-keyboard` | `src/hooks/useGlobalKeyboard.ts` | runtime | `OBL-modal-open` |
| `ART-use-quick-search` | `src/hooks/useQuickSearch.ts` | runtime | `OBL-result-limit`, `OBL-results-navigation`, `OBL-search-filter` |

## Derivation Summary

| Requirement ID | Obligation Count | Obligation IDs |
|---|---:|---|
| `BR-1` | 1 | `OBL-modal-open` |
| `BR-2` | 1 | `OBL-modal-open` |
| `BR-3` | 1 | `OBL-search-filter` |
| `BR-4` | 1 | `OBL-results-navigation` |
| `BR-5` | 1 | `OBL-ticket-selection` |
| `BR-6` | 1 | `OBL-modal-close` |
| `BR-7` | 1 | `OBL-modal-close` |
| `BR-8` | 1 | `OBL-empty-state` |
| `C1` | 1 | `OBL-modal-open` |
| `C2` | 1 | `OBL-result-limit` |
| `C3` | 1 | `OBL-search-filter` |
| `C4` | 1 | `OBL-search-filter` |
