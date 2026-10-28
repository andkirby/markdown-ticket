---
code: MDT-136
status: Implemented
dateCreated: 2026-03-09T20:41:09.373Z
type: Feature Enhancement
priority: Medium
implementationDate: 2026-10-28
implementationNotes: Completed Quick Search UAT: current-project numeric/text default, opt-in All projects, explicit bounded @CODE/full-key lookup, query highlights, selection scroll follow and bottom keyboard help. Added native focus boundaries, opener restoration and dialog semantics. Acceptance: 7 new Chromium UAT, 47 browser regressions, 92 frontend and 20 API tests; production builds, focused lint/typecheck and strict trace validation.
---

# Cmd+K Quick Search for Tickets

## 1. Description

Quick Search opens with Cmd+K (Ctrl+K on Windows/Linux) and defaults to the current project's ticket keys, titles and external refs. All projects explicitly broadens numeric and text search; full ticket keys and @CODE queries retain explicit lookup. Matches are highlighted, arrow selection stays visible and keyboard help remains below results.

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
4. Current-project results update in real-time (max 10); All projects and explicit syntax use the debounced remote search (5/project, 15 total)
5. User navigates with ↑↓ arrows, selects with Enter
6. Modal closes, ticket detail view opens
7. Escape closes modal without action

### Component Structure

```text
frontend/src/components/QuickSearch/
  QuickSearchModal.tsx    # Main modal component
  QuickSearchInput.tsx    # Search input with icon
  QuickSearchResults.tsx  # Results list
  QuickSearchFooter.tsx   # Bottom keyboard guidance
  queryPolicy.ts          # Project-location precedence
  SearchHighlight.tsx     # Literal match presentation
  useQuickSearchKeyboard.ts # Selection scrolling and action focus
  index.ts                # Exports
frontend/src/hooks/useQuickSearch.ts # Current-project filtering
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
- Current-project filtering uses preloaded tickets; opt-in remote search reuses the existing authenticated API

**Result Display:**
- Show ticket key + title
- Retain priority/status glyphs through the shared TicketCode owner
- Highlight matching substrings without changing text, identities or link destinations

### Integration Points
- Reuse the existing global shortcut hook and project overlay integration; keep App.tsx a route table
- Modal uses existing overlay patterns (see `frontend/src/MODALS.md`)
- Navigation: call existing `selectTicket` or equivalent

### Files to Modify/Create
- `frontend/src/components/QuickSearch/` (new)
- `frontend/src/App.tsx` or `frontend/src/hooks/useGlobalKeyboard.ts` (keyboard handler)
- `frontend/src/hooks/useProjectManager.ts` (expose tickets if needed)

## 5. Acceptance Criteria
- [x] Cmd+K opens search modal (Ctrl+K on Windows/Linux)
- [x] Search filters tickets by key number (e.g., "139" → MDT-139)
- [x] Search filters tickets by title substring (case-insensitive)
- [x] Results show ticket key and title
- [x] ↑↓ arrows navigate results
- [x] Enter selects and opens ticket detail
- [x] Escape closes modal
- [x] Click outside modal closes it
- [x] Modal shows "No results" when no matches
- [x] Works on Board, List, and Documents views

> Requirements notes: [requirements.md](./MDT-136/requirements.md)

> BDD notes: [bdd.md](./MDT-136/bdd.md)

> Architecture notes: [architecture.md](./MDT-136/architecture.md)

> Tests notes: [tests.md](./MDT-136/tests.md)

## 8. Clarifications

### UAT Session 2026-05-23

- Fixed current-project quick search result ranking so title matches are ranked before the 10-result cap is applied; this prevents relevant tickets such as `MDT-168` from being hidden behind older `config` matches.
- No spec changes required: existing `BR-3` covers title/key filtering, `C2` covers the 10-result cap, and `TEST-use-quick-search-unit` covers the regression.
- Updated workflow documents: none.
- `uat.md` written: no.
- Strict drift/lock used: no.

### UAT Session 2026-10-28

User approved query highlighting, current-project default, explicit All projects toggle for numbers and text, full-key/@CODE lookup, selected-result scroll follow and bottom keyboard help. MDT-136 owns this refinement; MDT-252 provenance removal remains intact. BR-3/4 refined; BR-9–12 added; C2/C4 reconciled with existing remote/external matching. Current requirements, BDD, architecture, tests, tasks and [uat.md](MDT-136/uat.md) updated. Canonical trace sync and current-round verification are recorded in the brief. Implementation, verification and scoped commits are authorized.

Current-round acceptance: 7/7 Chromium UAT tests (including Board/List/Documents), 47/47 existing browser regressions, 92/92 focused frontend tests and 20/20 search API tests passed. See uat.md for verification scope and tooling notes.

Completion-review corrections: Quick Search now owns native Tab boundaries, opener restoration and dialog semantics without changing the shared modal. Explicit @CODE ticket queries suppress unrelated project-name groups. Surface composition/state descriptions and Projects/key/@CODE mockups were reconciled. BR-12 was refined in place, the approved baseline relocked and all trace stages revalidated.
