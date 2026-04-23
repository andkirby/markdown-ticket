# Tasks: MDT-136

**Source**: canonical architecture/tests/bdd state (+ rendered projections where needed)

## Scope Boundaries

- **QuickSearch components**: Modal overlay with search input and results list - no command palette actions
- **useGlobalKeyboard hook**: Cmd/Ctrl+K detection only - no other global shortcuts
- **useQuickSearch hook**: Client-side filtering only - no API calls

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Global keyboard shortcuts | `src/hooks/useGlobalKeyboard.ts` | N/A |
| Ticket filtering logic | `src/hooks/useQuickSearch.ts` | N/A |
| Modal visibility state | `src/components/QuickSearch/QuickSearchModal.tsx` | N/A |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 (Cmd+K/Ctrl+K) | Task 2 |
| C2 (Max 10 results) | Task 3, Task 4 |
| C3 (Case-insensitive) | Task 3 |
| C4 (AND logic) | Task 3 |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M0: Walking Skeleton | — | Task 1 | TypeScript compiles, stubs render |
| M1: Modal Open/Close | BR-1, BR-2, BR-6, BR-7 | Task 2 | `open_modal_with_keyboard_shortcut`, `close_modal_with_escape`, `close_modal_with_click_outside` GREEN |
| M2: Search Filtering | BR-3, BR-8, C2-C4 | Task 3, Task 4 | `filter_by_ticket_key`, `filter_by_title_substring`, `show_no_results_state` GREEN |
| M3: Navigation & Selection | BR-4, BR-5 | Task 5 | `navigate_results_with_arrow_keys`, `select_ticket_and_open_detail` GREEN |

## Tasks

### Task 1: Walking Skeleton - Create QuickSearch component stubs (M0)

**Canonical ID**: `TASK-1`

**Structure**:

```
src/components/QuickSearch/
  index.ts
  QuickSearchModal.tsx
  QuickSearchInput.tsx
  QuickSearchResults.tsx
src/hooks/
  useGlobalKeyboard.ts
  useQuickSearch.ts
```

**Makes GREEN (Automated Tests)**: *(none - skeleton only)*

**Scope**: Create minimal stub files for all QuickSearch components and hooks
**Boundary**: No implementation logic, only type definitions and empty exports

**Creates**:
- `src/components/QuickSearch/index.ts` - barrel exports
- `src/components/QuickSearch/QuickSearchModal.tsx` - modal stub
- `src/components/QuickSearch/QuickSearchInput.tsx` - input stub
- `src/components/QuickSearch/QuickSearchResults.tsx` - results stub
- `src/hooks/useGlobalKeyboard.ts` - hook stub
- `src/hooks/useQuickSearch.ts` - hook stub

**Modifies**:
- *(none)*

**Must Not Touch**:
- `src/App.tsx` (integration in Task 2)
- `src/hooks/useProjectManager.ts`
- Existing modal patterns in `src/components/UI/Modal.tsx`

**Exclude**: No actual keyboard handling, filtering logic, or modal behavior

**Anti-duplication**: Import modal patterns from `src/MODALS.md` — do NOT create custom overlay

**Duplication Guard**:
- Check `src/components/UI/Modal.tsx` for existing modal patterns before coding
- Use existing `bg-black/50` backdrop pattern from MODALS.md

**Verify**:

```bash
bun run build
```

**Done when**:
- [x] TypeScript compiles without errors
- [x] All 6 files exist with minimal type definitions
- [x] No runtime logic implemented

---

### Task 2: Modal Open/Close - Global keyboard shortcut and modal visibility (M1 — checkpoint)

**Skills**: frontend-react-component

**Canonical ID**: `TASK-2`

**Milestone**: M1 — Modal Open/Close (BR-1, BR-2, BR-6, BR-7)

**Structure**: `src/hooks/useGlobalKeyboard.ts`, `src/components/QuickSearch/QuickSearchModal.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `opens modal with Cmd+K keyboard shortcut (BR-1, BR-2)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `closes modal with Escape key (BR-6)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `closes modal when clicking outside (BR-7)`

**Makes GREEN (Behavior)**:
- `open_modal_with_keyboard_shortcut` → `tests/e2e/quick-search/modal.spec.ts` (BR-1, BR-2)
- `close_modal_with_escape` → `tests/e2e/quick-search/modal.spec.ts` (BR-6)
- `close_modal_with_click_outside` → `tests/e2e/quick-search/modal.spec.ts` (BR-7)

**Scope**: Implement global keyboard listener and modal visibility toggle
**Boundary**: No filtering logic, no results display, no ticket selection

**Creates**:
- *(stubs created in Task 1)*

**Modifies**:
- `src/hooks/useGlobalKeyboard.ts` - add Cmd/Ctrl+K detection
- `src/components/QuickSearch/QuickSearchModal.tsx` - modal visibility, Escape/click-outside close
- `src/components/QuickSearch/QuickSearchInput.tsx` - auto-focus on mount
- `src/components/QuickSearch/index.ts` - export components
- `src/App.tsx` - integrate useGlobalKeyboard and QuickSearchModal

**Must Not Touch**:
- `src/hooks/useQuickSearch.ts` (Task 3)
- `src/components/QuickSearch/QuickSearchResults.tsx` (Task 4)
- `src/hooks/useProjectManager.ts`

**Exclude**: No search filtering, no result items, no navigation

**Anti-duplication**:
- Import `Ticket` type from `src/types.ts` — do NOT redefine
- Use modal patterns from `src/MODALS.md` — do NOT create custom overlay

**Duplication Guard**:
- Check `src/MODALS.md` for existing modal patterns before implementing close behavior
- Verify no duplicate keyboard listener in App.tsx

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "opens modal|closes modal"
```

**Done when**:
- [x] Cmd+K (Mac) / Ctrl+K (Windows/Linux) opens modal
- [x] Input field auto-focused when modal opens
- [x] Escape key closes modal
- [x] Click outside closes modal
- [x] E2E tests for open/close scenarios GREEN
- [x] No duplicated modal patterns

---

### Task 3: Search Filtering - useQuickSearch hook with filtering logic (M2)

**Skills**: frontend-react-component

**Canonical ID**: `TASK-3`

**Milestone**: M2 — Search Filtering (BR-3, C2-C4)

**Structure**: `src/hooks/useQuickSearch.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-use-quick-search-unit` → `src/hooks/useQuickSearch.test.ts`: all unit tests

**Makes GREEN (Behavior)**:
- `filter_by_ticket_key` → unit tests validate (BR-3)
- `filter_by_title_substring` → unit tests validate (BR-3)

**Scope**: Implement client-side ticket filtering with key number and title substring matching
**Boundary**: Hook only - no UI rendering

**Creates**:
- `src/hooks/useQuickSearch.test.ts` - unit tests for filtering logic

**Modifies**:
- `src/hooks/useQuickSearch.ts` - implement filtering, selection state, result limit

**Must Not Touch**:
- `src/components/QuickSearch/` components (Task 4)
- `src/hooks/useProjectManager.ts`
- `src/App.tsx`

**Exclude**: No UI components, no E2E integration

**Anti-duplication**: Import `Ticket` type from `src/types.ts` — do NOT redefine

**Duplication Guard**:
- Check if filtering logic exists in `useProjectManager.ts` before implementing
- If similar filtering exists, extract to shared utility

**Verify**:

```bash
bun run --cwd src jest hooks/useQuickSearch.test.ts
```

**Done when**:
- [x] Filters by ticket key number (e.g., "136" matches "MDT-136")
- [x] Filters by title substring (case-insensitive)
- [x] Multi-word queries use AND logic (all words must match)
- [x] Results limited to 10 items
- [x] Selection index state managed
- [x] Unit tests GREEN

---

### Task 4: Results Display - Render filtered results with limits and empty state (M2 — checkpoint)

**Skills**: frontend-react-component

**Canonical ID**: `TASK-4`

**Milestone**: M2 — Search Filtering (BR-3, BR-8, C2)

**Structure**: `src/components/QuickSearch/QuickSearchResults.tsx`

**Makes GREEN (Automated Tests)**:
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `filters tickets by key number (BR-3)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `filters tickets by title substring with AND logic (BR-3, C4)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `shows "No results" when no matches (BR-8)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `limits results to 10 items maximum (C2)`

**Makes GREEN (Behavior)**:
- `filter_by_ticket_key` → `tests/e2e/quick-search/modal.spec.ts` (BR-3)
- `filter_by_title_substring` → `tests/e2e/quick-search/modal.spec.ts` (BR-3)
- `show_no_results_state` → `tests/e2e/quick-search/modal.spec.ts` (BR-8)

**Scope**: Render filtered results with ticket key and title, "No results" empty state
**Boundary**: Display only - no keyboard navigation or selection

**Creates**:
- *(stubs created in Task 1)*

**Modifies**:
- `src/components/QuickSearch/QuickSearchResults.tsx` - render result items, empty state
- `src/components/QuickSearch/QuickSearchModal.tsx` - integrate useQuickSearch, pass results to QuickSearchResults

**Must Not Touch**:
- `src/hooks/useGlobalKeyboard.ts`
- `src/App.tsx`

**Exclude**: No arrow key navigation, no Enter selection

**Anti-duplication**:
- Import `Ticket` type from `src/types.ts` — do NOT redefine
- Import `useQuickSearch` from `./useQuickSearch` — do NOT inline logic

**Duplication Guard**:
- Check `src/components/` for existing ticket card patterns before creating result item styling
- Reuse existing badge/status styling if available

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "filters tickets|shows.*No results|limits results"
```

**Done when**:
- [x] Results display ticket key and title
- [x] "No results" message shown when no matches
- [x] Maximum 10 results displayed
- [x] E2E tests for filtering and empty state GREEN
- [x] No duplicated styling patterns

---

### Task 5: Navigation & Selection - Arrow keys and Enter to select ticket (M3 — checkpoint)

**Skills**: frontend-react-component

**Canonical ID**: `TASK-5`

**Milestone**: M3 — Navigation & Selection (BR-4, BR-5)

**Structure**: `src/components/QuickSearch/QuickSearchResults.tsx`, `src/hooks/useQuickSearch.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `navigates results with arrow keys (BR-4)`
- `TEST-quick-search-modal` → `tests/e2e/quick-search/modal.spec.ts`: `selects ticket and opens detail with Enter (BR-5)`

**Makes GREEN (Behavior)**:
- `navigate_results_with_arrow_keys` → `tests/e2e/quick-search/modal.spec.ts` (BR-4)
- `select_ticket_and_open_detail` → `tests/e2e/quick-search/modal.spec.ts` (BR-5)

**Scope**: Implement arrow key navigation through results and Enter to select/open ticket
**Boundary**: Navigation within modal results only

**Creates**:
- *(none)*

**Modifies**:
- `src/hooks/useQuickSearch.ts` - add arrow key handlers, Enter handler
- `src/components/QuickSearch/QuickSearchResults.tsx` - highlight selected item, handle click selection
- `src/components/QuickSearch/QuickSearchModal.tsx` - wire up onSelectTicket callback

**Must Not Touch**:
- `src/hooks/useGlobalKeyboard.ts`
- `src/App.tsx` routing logic

**Exclude**: No changes to ticket detail view

**Anti-duplication**:
- Import `useQuickSearch` selection state — do NOT create local selection state
- Use existing `handleTicketClick` pattern from `App.tsx` — do NOT create new navigation

**Duplication Guard**:
- Check `src/App.tsx` for `handleTicketClick` before implementing selection callback
- Verify navigation uses existing routing pattern

**Verify**:

```bash
PWTEST_SKIP_WEB_SERVER=1 bunx playwright test tests/e2e/quick-search/modal.spec.ts --project=chromium --grep "navigates results|selects ticket"
```

**Done when**:
- [x] Arrow Down moves selection to next result
- [x] Arrow Up moves selection to previous result
- [x] Enter closes modal and opens selected ticket detail
- [x] Click on result item selects and opens ticket
- [x] E2E tests for navigation and selection GREEN
- [x] All MDT-136 E2E tests GREEN

---

## Post-Implementation

- [x] No duplication (grep check for duplicate keyboard listeners, duplicate filtering logic)
- [x] Scope boundaries respected
- [x] All unit tests GREEN
- [x] All BDD scenarios GREEN
- [x] Smoke test passes (Cmd+K opens modal, search works, ticket opens)
- [x] Fallback/absence paths match requirements (empty project shows "No results")

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| `src/components/QuickSearch/` | 4 | 4 | 0 | ✅ |
| `src/hooks/useGlobalKeyboard.ts` | 1 | 1 | 0 | ✅ |
| `src/hooks/useQuickSearch.ts` | 1 | 1 | 0 | ✅ |
| `src/App.tsx` (modify) | 1 | 1 | 0 | ✅ |
| `src/hooks/useQuickSearch.test.ts` | 1 | 1 | 0 | ✅ |
| `tests/e2e/quick-search/modal.spec.ts` | 1 | 1 | 0 | ✅ |

## Post-Verify Fixes (appended by implement-agentic)

*(Added only if `/mdt:verify-complete` finds CRITICAL/HIGH issues)*
