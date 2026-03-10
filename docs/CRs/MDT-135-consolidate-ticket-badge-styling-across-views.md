---
code: MDT-135
status: Implemented
dateCreated: 2026-03-09T16:23:29.598Z
type: Architecture
priority: Medium
relatedTickets: MDT-042
---

# Consolidate ticket badge styling across views

## 1. Description
### Problem
Ticket badges have inconsistent styling across the application's views and even within the same view:

**Status Badges** (3 implementations):
- `ProjectView.tsx`: `getStatusBadgeClass()` helper
- `TicketAttributeTags.tsx`: `getStatusColor()` helper
- `TicketAttributes.tsx`: `getStatusColor()` helper

**Priority Badges** (2 implementations with DIFFERENT styling):
- `TicketAttributeTags.tsx`: Gradient styling (`bg-gradient-to-r from-rose-50...`)
- `TicketAttributes.tsx`: Solid colors (`bg-red-100`)

**Type Badges** (2 implementations with DIFFERENT styling):
- `TicketAttributeTags.tsx`: Gradient styling
- `TicketAttributes.tsx`: Solid colors

**Relationship/Context Badges** (inline, but could benefit from centralization):
- Phase/Epic, Related, Depends On, Blocks, Worktree, Assignee

This leads to:
1. Different color mappings for the same attribute across views
2. Different visual styles (gradients vs solid) for the same attribute type
3. Different dark mode values (`dark:bg-*-900` vs `dark:bg-*-950`)
4. Missing attribute handling (ON_HOLD, PARTIALLY_IMPLEMENTED missing in some implementations)
5. Seven+ duplicate color-mapping functions that must be kept in sync

### Affected Areas
- `src/components/` - Badge implementations across views
- `tests/e2e/` - Tests verifying badge rendering

### Scope
**In scope**: ALL ticket badge types (status, priority, type, phase/epic, relationships, worktree, assignee)
**Out of scope**: Badge component API changes (keep using shadcn Badge base)
## 2. Rationale

Users expect visual consistency when viewing tickets across different contexts. A ticket with "In Progress" status should look the same whether viewed on the board, in the list, or in detail view.

Current state creates confusion and maintenance burden:
- New statuses require updates in 3 places
- Color changes require syncing multiple files
- Tests may pass in one view but fail in another

## 3. Acceptance Criteria
### Functional
- [ ] Status badge colors are identical across Board, List, and Detail views
- [ ] Priority badge colors are identical across all views (resolve gradient vs solid)
- [ ] Type badge colors are identical across all views (resolve gradient vs solid)
- [ ] All CRStatus values have defined colors (including ON_HOLD, PARTIALLY_IMPLEMENTED)
- [ ] All Priority values have defined colors (Critical, High, Medium, Low)
- [ ] All CRType values have defined colors
- [ ] Dark mode colors are consistent across views (unified shade convention)
- [ ] Relationship badges (related, depends, blocks) are consistent
- [ ] Context badges (phase/epic, assignee, worktree) are consistent

### Non-Functional
- [ ] Single source of truth for ALL badge color mappings
- [ ] No duplicate `getStatusColor()`, `getPriorityColor()`, `getTypeColor()` functions
- [ ] Badge variants use `cva` (class-variance-authority) for type safety

### Quality
- [ ] Existing E2E tests continue to pass
- [ ] TypeScript validation passes
## 4. Open Questions
| Area | Question | Notes |
|------|----------|-------|
| Design | Final color palette for each status? | Current implementations disagree on Proposed (blue vs gray), Implemented (purple vs green) |
| Design | Dark mode shade: 900 vs 950? | List view uses 900, others use 950 |

> Architecture projection: [architecture.md](./architecture.md) (rendered from canonical spec-trace state)

> Test plan: [tests.md](./tests.md) (rendered from canonical spec-trace state)