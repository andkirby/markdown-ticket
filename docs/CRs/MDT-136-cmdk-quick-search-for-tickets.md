---
code: MDT-136
status: Implemented
dateCreated: 2026-03-09T20:41:09.373Z
type: Feature Enhancement
priority: Medium
---

# Cmd+K Quick Search for Tickets

## 1. Description

Implement a minimal Cmd+K (Ctrl+K on Windows/Linux) keyboard shortcut that opens a quick search modal for finding tickets by title or key.

**Current state**: Users must visually scan the board or use browser find to locate tickets.

**Desired state**: Press Cmd+K, type search query, select ticket from results, navigate directly to ticket detail.
## 2. Rationale

- Cmd+K is the de facto standard for quick search/command palette in modern web apps (Linear, Notion, Slack, GitHub)
- Provides immediate productivity boost for users who know what they're looking for
- Minimal implementation with high value
- Foundation for future expansion (actions, filters, navigation)

## 3. Solution Analysis

**Evaluated options:**

1. **Full command palette** - Search + actions + filters - Rejected: Too complex for MVP
2. **Search-only modal** - Just ticket search - Selected: Minimal scope, high value
3. **Browser's native find** - Rejected: Not keyboard-accessible, doesn't navigate to detail

**Selected approach:** Modal overlay with search input, filtering preloaded tickets by title/key.

## 4. Implementation Specification

### User Flow
1. User presses Cmd+K (Mac) or Ctrl+K (Windows/Linux)
2. Modal overlay appears with focused search input
3. User types query (title substring or ticket key like "MDT-123")
4. Results list updates in real-time (max 10 items)
5. User navigates with ↑↓ arrows, selects with Enter
6. Modal closes, ticket detail view opens
7. Escape closes modal without action

### Component Structure

```
src/components/QuickSearch/
  QuickSearchModal.tsx    # Main modal component
  QuickSearchInput.tsx    # Search input with icon
  QuickSearchResults.tsx  # Results list
  useQuickSearch.ts       # Hook for filtering logic
  index.ts                # Exports
```

### Technical Details

**Keyboard Handler:**
- Global event listener on `document` for `keydown`
- Detect `(Meta|Ctrl)+K`
- Prevent default browser behavior
- Toggle modal visibility

**Search Logic:**
- Filter tickets by:
  - Ticket key match (e.g., "139" matches "MDT-139")
  - Title substring match (case-insensitive)
- Use existing `tickets` array from `useProjectManager`
- No API calls needed (data preloaded)

**Result Display:**
- Show ticket key + title
- Show status badge (optional, minimal)
- Highlight matching text (optional enhancement)

### Integration Points
- Add keyboard listener in `App.tsx` or dedicated hook
- Modal uses existing overlay patterns (see `src/MODALS.md`)
- Navigation: call existing `selectTicket` or equivalent

### Files to Modify/Create
- `src/components/QuickSearch/` (new)
- `src/App.tsx` or `src/hooks/useGlobalKeyboard.ts` (keyboard handler)
- `src/hooks/useProjectManager.ts` (expose tickets if needed)

## 5. Acceptance Criteria
- [ ] Cmd+K opens search modal (Ctrl+K on Windows/Linux)
- [ ] Search filters tickets by key number (e.g., "139" → MDT-139)
- [ ] Search filters tickets by title substring (case-insensitive)
- [ ] Results show ticket key and title
- [ ] ↑↓ arrows navigate results
- [ ] Enter selects and opens ticket detail
- [ ] Escape closes modal
- [ ] Click outside modal closes it
- [ ] Modal shows "No results" when no matches
- [ ] Works on Board, List, and Documents views

> Requirements projection: [requirements.md](./MDT-136/requirements.md) (rendered from canonical spec-trace state)

> BDD projection: [bdd.md](./MDT-136/bdd.md) (rendered from canonical spec-trace state)

> Architecture projection: [architecture.md](./MDT-136/architecture.md) (rendered from canonical spec-trace state)

> Tests projection: [tests.md](./MDT-136/tests.md) (rendered from canonical spec-trace state)