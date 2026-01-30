---
code: MDT-023
title: Drag and drop tickets not updating UI immediately
status: Implemented
dateCreated: 2025-09-06T22:46:30.513Z
type: Bug Fix
priority: Medium
---

# Drag and drop tickets not updating UI immediately

## 1. Description

### Problem Statement
When dragging and dropping tickets between columns, the UI does not update immediately to show the ticket in the new column. The ticket appears to snap back to the original column, but after page refresh, the ticket is correctly positioned in the target column.

### Current State
Drag-and-drop operations trigger backend API calls that succeed, but the UI reverts tickets to their original column because `Board.tsx` calls `refreshProjectTickets()` after `updateTicket()`, overriding the optimistic UI updates.

### Desired State
Tickets should visually move to the target column immediately when dropped, providing instant user feedback while background sync happens via SSE.

### Rationale
This creates a poor user experience as users cannot see the immediate result of their drag and drop actions, making the interface feel unresponsive.

## 2. Solution Analysis

### Root Cause Analysis (Updated 2025-09-06)
After comparing with working commit `2c8c094`, the actual root cause was **state synchronization disconnect**:

1. **SingleProjectView Component** (lines 79, 185):
   - Had its own `useState<Ticket[]>` for tickets
   - Passed `tickets={tickets}` prop to Board component

2. **Board Component** (lines 62-64):
   - Received `propTickets` from SingleProjectView
   - Used `useMultiProjectData` hook for `updateTicket` function
   - Created **two separate ticket arrays** that weren't synchronized

3. **The Disconnect**:
   - `updateTicket` updated `hookData.tickets` (internal hook state)
   - Board displayed `propTickets` (from SingleProjectView)
   - Optimistic updates worked on hook state, but UI showed prop state
   - Result: Visual updates didn't appear despite successful backend updates

### Solution
Remove redundant prop passing from SingleProjectView to Board:
- **Before**: `<Board tickets={tickets} selectedProject={selectedProject} loading={loading} />`
- **After**: `<Board showHeader={false} enableProjectSwitching={false} />`
- **Result**: Board uses internal `useMultiProjectData` hook for both display and state management

## 3. Implementation Specification

### Code Changes
**File:** `src/components/SingleProjectView.tsx` (lines 180-188)
- **Removed:** `tickets={tickets}` prop
- **Removed:** `selectedProject={selectedProject}` prop
- **Removed:** `loading={loading}` prop
- **Kept:** UI control props: `showHeader={false}`, `enableProjectSwitching={false}`, `sortPreferences={sortPreferences}`

### Technical Details
- Board component now uses internal `useMultiProjectData` hook for complete state management
- Eliminates dual state arrays that caused synchronization issues
- Preserves optimistic updates and SSE real-time sync
- UI integration maintained through control props only

## 4. Acceptance Criteria
- [x] Tickets visually move to target column immediately when dropped
- [x] No visual "snap back" to original column
- [x] Backend state correctly updated (verified by page refresh)
- [x] Error handling works correctly (rollback on API failure)
- [x] Real-time updates continue to work via SSE

## 5. Implementation Notes

**Root Cause Discovery (2025-09-06):**
- User confirmed drag-and-drop worked in commit `2c8c094`
- Git diff analysis revealed Board.tsx refactoring introduced prop-based architecture
- Problem: Dual ticket state arrays in SingleProjectView vs Board component

**Fix Applied (2025-09-06):**
- Removed redundant data prop passing from SingleProjectView to Board
- Board now uses internal `useMultiProjectData` hook exclusively
- State synchronization restored between display and update operations
- Drag-and-drop visual feedback now works immediately

**Verification:**
- Server logs show successful PATCH operations: DEB-001, DEB-027
- Real-time SSE broadcasting to 4 clients working correctly
- No snap-back behavior observed
- Backend state consistency maintained

## 6. References

### Working Commit
- **Last known working**: `2c8c094` (confirmed by user testing)
- **Root cause**: Board.tsx refactoring between `2c8c094` and current HEAD

### Code Changes
- **Modified**: `src/components/SingleProjectView.tsx` (prop removal)
- **Architecture**: Restored single-source-of-truth for ticket state management

### Related CRs
- MDT-014: Real-time SSE updates (fixed earlier)
- MDT-017: URL-based state management (planned enhancement)
