---
code: MDT-030
title: Add status toggle buttons to Kanban columns
status: Implemented
dateCreated: 2025-09-08T17:20:43.229Z
type: Feature Enhancement
priority: Medium
implementationDate: 2025-09-08T19:46:07.934Z
implementationNotes: Status changed to Implemented on 9/8/2025. Reopened for bug fix.
---

# Add status toggle buttons to Kanban columns

## 1. Description

### Problem Statement
Add toggle buttons for On Hold and Rejected statuses in Kanban columns. In Progress column gets [On Hold] toggle, Done column gets [Rejected] toggle. Users can drag tickets onto toggles to change status, and toggles filter visibility.

### Current State
*To be filled*

### Desired State
*To be filled*

### Rationale
Provide clean UX for handling edge case statuses without cluttering main workflow or adding extra columns

## Bug Report (Reopened)

**Steps to reproduce:**
1. Move a ticket onto On Hold toggle
2. Enable On Hold toggle and move ticket back to In Progress area
3. Repeat step #1

**Actual behavior:** Ticket doesn't get "On Hold" status and stays in In Progress.

**Expected behavior:** Ticket should change to "On Hold" status when dragged onto the toggle.

## 2. Solution Analysis
*To be filled during implementation*

## 3. Implementation Specification
*To be filled during implementation*

## 4. Acceptance Criteria
*To be filled during implementation*

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*
