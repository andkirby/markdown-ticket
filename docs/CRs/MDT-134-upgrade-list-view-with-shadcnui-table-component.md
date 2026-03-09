---
code: MDT-134
status: In Progress
dateCreated: 2026-03-09T15:12:47.497Z
type: Feature Enhancement
priority: Medium
---

# Upgrade List View with shadcn/ui Table component

## 1. Description

### Requirements Scope
`full` — Feature Enhancement default

### Problem
- List view used a basic card-based layout that lacked proper table structure for desktop viewing
- View mode was lost when opening a ticket from list view (switched to board view)
- E2E tests needed updating to support both desktop table and mobile card views

### Affected Areas
- Frontend: `src/components/ProjectView.tsx` - List view rendering
- Frontend: `src/components/UI/table.tsx` - New shadcn/ui Table component
- Frontend: `src/App.tsx` - View mode detection from URL params
- Testing: `tests/e2e/list/view.spec.ts` - List view E2E tests
- Testing: `tests/e2e/utils/selectors.ts` - Viewport-aware selectors
- Testing: `tests/e2e/utils/helpers.ts` - Wait helper for dual layouts

### Scope
- **In scope**: Desktop table layout, mobile card layout, view mode persistence, E2E test updates
- **Out of scope**: Board view changes, Documents view changes, ticket detail modal changes

## 2. Desired Outcome

### Success Conditions
- Desktop users see a proper table with sortable columns (Code, Title, Status, Modified)
- Mobile users see a compact card-based layout
- Opening a ticket from list view preserves the list view mode (URL: `?view=list`)
- Closing a ticket returns to the originating view (list or board)
- All E2E tests pass for both desktop and mobile viewports

### Constraints
- Must use existing shadcn/ui component library pattern
- Must maintain backward compatibility with existing test IDs where possible
- Must support responsive design (breakpoint at `md: 768px`)
- Must maintain dark mode support for status badges

### Non-Goals
- Not adding new columns or filtering capabilities
- Not changing the sorting UI/UX
- Not modifying ticket data structure

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| UI | Should table support column resizing? | Deferred to future enhancement |
| UX | Should table rows have hover states? | Implemented: `hover:bg-muted/50` |

### Known Constraints
- shadcn/ui Table component requires `cn` utility from `../../lib/utils`
- Desktop table uses `ticket-table` testid, mobile uses `ticket-list`
- Desktop rows use `ticket-row-*`, mobile cards use `ticket-card-*`

### Decisions Deferred
- Column customization (user-selectable columns)
- Row selection for bulk operations
- Export functionality

## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Desktop viewport (≥768px) displays table with Code, Title, Status, Modified columns
- [ ] Mobile viewport (<768px) displays compact card layout
- [ ] Clicking a table row opens the ticket detail modal
- [ ] URL includes `?view=list` when ticket opened from list view
- [ ] ViewModeSwitcher shows "List view" icon when ticket is open with `?view=list`
- [ ] Closing ticket modal returns to list view (not board)
- [ ] Status badges display with correct colors for all CRStatus values
- [ ] Dark mode status badges have appropriate contrast

### Non-Functional
- [ ] Table renders 100+ rows without scroll lag
- [ ] Row hover state provides visual feedback

### Edge Cases
- [ ] Empty state: Table shows no rows when no tickets exist
- [ ] Long titles: Truncated with ellipsis in table cells
- [ ] Unknown dates: Display "Unknown" instead of error

## 5. Verification

### How to Verify Success
- Manual verification:
  - Navigate to `/prj/MDT/list` on desktop, verify table layout
  - Resize browser to mobile width, verify card layout
  - Click a ticket row, verify URL has `?view=list`
  - Close ticket, verify return to list view
- Automated verification:
  - `tests/e2e/list/view.spec.ts` - All 3 tests pass
  - `tests/e2e/navigation/view-mode-switcher.spec.ts` - All 16 tests pass
  - TypeScript validation: `bun run validate:ts`