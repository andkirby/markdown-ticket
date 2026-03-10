## Overview

Cmd+K Quick Search provides keyboard-driven ticket discovery via a modal overlay. The modal filters preloaded tickets in real-time using client-side logic, requiring no API calls. Users navigate results with arrow keys and jump directly to ticket detail on Enter.

## Pattern: Modal Command Palette

**Selected pattern**: Centered modal with search input + results list
**Rationale**:
- Matches established patterns in Linear, Notion, GitHub
- Reuses existing `UI/Modal.tsx` component for overlay behavior
- Minimal scope with high discoverability

## Structure

```
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

```
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
