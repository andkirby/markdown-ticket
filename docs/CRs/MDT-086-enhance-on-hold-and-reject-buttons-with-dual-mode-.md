---
code: MDT-086
status: Proposed
dateCreated: 2025-12-05T01:19:12.314Z
type: Feature Enhancement
priority: Medium
---

# Enhance On Hold and Reject Buttons with Dual Mode Functionality

## 1. Description

### Problem
- Current on hold button in In Progress column toggles visibility of hidden tickets, causing them to disappear when activated
- Current reject button in Done column has same toggle behavior, making it unclear what state is active
- Users cannot switch between viewing only active tickets vs. only on hold/rejected tickets
- No visual distinction between switch mode and merge mode functionality

### Affected Artifacts
- `src/components/Column.tsx` - Contains embedded StatusToggle that needs extraction
- `src/components/Board/StatusToggle.tsx` - New component to be extracted from Column.tsx
- `src/hooks/useTicketOperations.ts` - Ticket state management with position tracking
- `src/hooks/useButtonModes.ts` - New dedicated hook for button mode state management
### Scope
- **Changes**: Button behavior in column headers, hover interaction patterns, visual states for orange/merge mode
- **Unchanged**: Core ticket state management, drag-and-drop functionality, SSE event handling

## 2. Decision

### Chosen Approach
Modify button component to add hover checkbox and dual modes (switch/merge).

### Rationale
- Maintains existing component structure while adding new functionality
- Hover checkbox pattern provides intuitive merge access without cluttering UI
- Orange color scheme clearly indicates active states
- Dual modes support both ticket type switching and ticket merging workflows
- No breaking changes to existing API or state management

## Architecture Design
### Pattern
Component extraction — isolate UI logic from parent component for testability and reusability.

### Shared Patterns

| Pattern | Occurrences | Extract To |
|---------|-------------|------------|
| Button styling utilities | All UI components | `src/components/ui/` (existing) |
| Hook pattern | State management | `src/hooks/` (existing) |

### Structure
```
src/
  ├── components/
  │   ├── Board/
  │   │   └── StatusToggle.tsx     → Extracted toggle button (new)
  │   └── Column.tsx               → Refactored to use StatusToggle
  └── hooks/
      └── useButtonModes.ts        → Button state management (new)
```

### Size Guidance

| Module | Role | Limit | Hard Max |
|--------|------|-------|----------|
| `StatusToggle.tsx` | UI Component | 150 | 225 |
| `useButtonModes.ts` | Hook | 75 | 110 |
| `Column.tsx` (modified) | Container | 300 | 450 |

### Extension Rule
To add similar toggle: create component in `src/components/Board/` (limit 150 lines) using `useButtonModes` pattern.

## 3. Alternatives Considered
## 4. Artifact Specifications
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `src/components/Board/StatusToggle.tsx` | Component | Extracted status toggle button with hover checkbox functionality |
| `src/hooks/useButtonModes.ts` | Hook | Manage switch vs. merge mode state (new dedicated hook) |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/Column.tsx` | Refactor | Remove embedded StatusToggle, import as separate component |
| `src/components/Board/StatusToggle.tsx` | Behavior added | Add hover checkbox, orange states, mode switching |
| `src/hooks/useTicketOperations.ts` | Methods added | Add ticket position tracking for restore functionality |
| `src/components/Column.tsx` | Integration | Import and use new StatusToggle component |

### Integration Points

| From | To | Interface |
|------|----|-----------| 
| Column component | StatusToggle | Props: status, onToggle, onMerge |
| StatusToggle | useButtonModes | Mode state management |
| StatusToggle hover checkbox | useTicketOperations | Merge on hold tickets with position restore |
| useButtonModes | StatusToggle | Returns: viewMode, mergeMode, activeState |

### Key Patterns
- Hover reveal pattern: Button number transforms to checkbox on hover
- Dual state pattern: Orange background = switch mode, orange border = merge mode, orange rounded number
- Component extraction pattern: Extract embedded StatusToggle for better testability and reusability
- Position restoration pattern: Store ticket position before status change for restoration
## 5. Acceptance Criteria
### Functional
- [ ] StatusToggle component extracted from Column.tsx to `src/components/Board/StatusToggle.tsx`
- [ ] Button toggles between showing In Progress tickets and On Hold tickets when clicked (switch mode)
- [ ] Button shows orange background color when in switch mode (viewing alternate status)
- [ ] Button shows orange border (no background) when in merge mode only
- [ ] Button number shows orange rounded background when merge mode is active
- [ ] Hover over ticket count displays checkbox with Tailwind orange styling
- [ ] Clicking hover checkbox merges On Hold tickets into In Progress column
- [ ] Merged tickets restore to their original position from before they were put on hold
- [ ] Rejected button in Done column has identical behavior pattern
- [ ] Button number displays count of tickets in alternate state (e.g., count of On Hold tickets when viewing In Progress)

### Non-Functional
- [ ] Hover checkbox appears within 200ms of mouse entering number area
- [ ] Orange color scheme uses consistent Tailwind classes (bg-orange-100, border-orange-300, etc)
- [ ] No performance degradation in ticket rendering
- [ ] StatusToggle component is fully unit testable after extraction
- [ ] No file exceeds Hard Max limits without justification
### Testing
- Unit: Test StatusToggle component render and state changes
- Unit: Test useButtonModes hook state management
- Manual: Click On Hold button → verify orange background and only On Hold tickets shown
- Manual: Click On Hold button again → verify normal background and In Progress tickets shown
- Manual: Hover over number → verify checkbox appears with orange styling
- Manual: Click checkbox → verify orange border appears and On Hold tickets merge into In Progress
- Manual: Verify merged tickets appear in original positions
- Manual: Test Rejected button with same workflow
## 6. Verification

### By CR Type
- **Feature Enhancement**: ColumnHeader component exports updated button functionality with hover checkbox and dual modes

### Metrics
- Button hover interaction responds within 200ms
- No increase in render time for ticket columns

## 7. Deployment
### Simple Changes
- Deploy updated frontend build with modified ColumnHeader and TicketCard components
- No backend API changes required
- No database schema changes required

### Session 2025-12-05

- Q: The CR mentions creating a new HoverCheckbox component, but the current StatusToggle is embedded in Column.tsx. Should we extract StatusToggle into a separate component first? → A: Extract StatusToggle to separate component first
- Q: The current button uses Tailwind classes (bg-orange-100, etc). Should the new hover checkbox use the same styling system or custom CSS? → A: Use Tailwind utility classes for consistency
- Q: What should happen when a ticket is moved from 'On Hold' back to 'In Progress' - should it retain its original position or go to the bottom? → A: This behavior stays the same. but yes, retain its original position
- Q: The CR mentions 'switch mode' vs 'merge mode'. What visual indicator should differentiate these modes when both are active? → A: Orange background for switch mode, orange border for the button for merge mode, orange round for the tickets number
- Q: Which specific file should contain the new useButtonModes hook logic? → A: not sure, find a best way accoding to existing code