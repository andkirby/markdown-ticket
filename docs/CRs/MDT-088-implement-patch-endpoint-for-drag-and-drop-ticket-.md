---
code: MDT-088
status: Proposed
dateCreated: 2025-12-06T00:42:10.314Z
type: Bug Fix
priority: High
---

# Implement PATCH endpoint for drag-and-drop ticket status updates

## 1. Description

### Problem
- Frontend drag-and-drop operations failing with 501 (Not Implemented) errors when updating ticket status
- PATCH endpoint `/api/projects/:id/crs/:crId` in ProjectController returned empty response with 501 status
- Ticket status changes from Kanban board not persisting to markdown files
- Error originating from ProjectView.tsx line 72 during ticket drop operations

### Affected Artifacts
- `server/controllers/ProjectController.ts` - Missing patchCR implementation
- `server/services/TicketService.ts` - Partial update method incomplete
- `server/server.ts` - Missing TicketService dependency injection
- `src/components/ProjectView.tsx` - Frontend PATCH request calls

### Scope
- **Changes**: Implement PATCH endpoint logic, enhance partial update service, inject dependencies
- **Unchanged**: Existing GET/POST endpoints, frontend UI components, markdown file structure

## 2. Decision

### Chosen Approach
Implement the missing PATCH endpoint in ProjectController with proper status update handling via TicketService.

### Rationale
- REST API completeness: PATCH operation required for partial updates per HTTP semantics
- Maintains existing architecture pattern of Controller -> Service -> Repository layers
- Status updates require separate handling via dedicated updateCRStatus method in shared service
- Dependency injection pattern maintains testability and separation of concerns

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Implement PATCH endpoint with TicketService integration | **ACCEPTED** - Maintains existing architecture, proper HTTP semantics |
| Redirect to /api/tasks/save | Use existing task save endpoint | Rejected - Different API structure, not suitable for partial updates |
| Frontend-only status tracking | Store status in localStorage only | Rejected - Breaks persistence, violates tickets-as-files principle |

## 4. Artifact Specifications

### Modified Artifacts
| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/controllers/ProjectController.ts` | Method implemented | `patchCR()` method to handle PATCH requests |
| `server/controllers/ProjectController.ts` | Error handling enhanced | Specific HTTP status codes: 400 for validation errors, 403 for permissions, 404 for not found |
| `server/services/TicketService.ts` | Method enhanced | `updateCRPartial()` to handle status updates via updateCRStatus |
| `server/server.ts` | Dependency added | TicketService injected into ProjectController constructor |
| `shared/services/TicketService.ts` | Validation source | Status transition validation via STATUS_CONFIG (Updated post-implementation: 2025-12-06) |
### Integration Points
| From | To | Interface |
|------|----|-----------|
| Frontend ProjectView | ProjectController | PATCH `/api/projects/:id/crs/:crId` |
| ProjectController | TicketService | `updateCRPartial(projectId, crId, updates)` |
| ProjectController | Shared TicketService | Status transition validation via STATUS_CONFIG |
| TicketService | Shared MarkdownService | `updateCRStatus()` for status changes |
### Key Patterns
- Controller pattern: Request validation and response formatting in ProjectController
- Service layer: Business logic encapsulated in TicketService
- Shared service: Reusing updateCRStatus from shared services for consistency

## 5. Acceptance Criteria
### Functional
- [ ] PATCH endpoint `/api/projects/:id/crs/:crId` returns 200 OK for status updates
- [ ] Ticket status changes persist to markdown files in docs/CRs/
- [ ] Drag-and-drop operations in Kanban board complete without errors
- [ ] Frontend console shows no 501 errors during ticket moves

### Non-Functional
- [ ] Error responses include descriptive messages for invalid updates
- [ ] Error responses include specific validation details with list of valid transitions
- [ ] Validation errors return 400 Bad Request status (not 500)
- [ ] Status updates use dedicated updateCRStatus method (not generic attribute updates)
- [ ] Existing GET/POST endpoints remain unchanged
### Testing
- Manual: Drag ticket from 'Proposed' to 'In Progress' column and verify file update
- Manual: Drag ticket to 'Implemented' status and confirm persistence
- Integration: Verify SSE events broadcast after status changes

> Full EARS requirements: [requirements.md](./requirements.md)
## 6. Verification

### By CR Type
- **Bug Fix**: 501 errors no longer occur when performing drag-and-drop operations in the Kanban board
- Manual verification: Successfully update ticket status via drag-and-drop and confirm changes persist in markdown files

### Metrics
- No metrics applicable - fix addresses functional error, not performance
- Verification through successful status update operations and error elimination

## 7. Deployment
### Simple Changes
- Build and restart backend server
- No frontend deployment required (changes are backend-only)
- No database migration needed (file-based persistence)
- No configuration changes required

### Session 2025-12-06

#### Specification Corrections
- **Error Handling**: Updated `server/controllers/ProjectController.ts` to return appropriate HTTP status codes (400 for validation errors, 403 for permissions, 404 for not found) instead of generic 500 errors
- **Status Validation**: Clarified that status transition validation occurs in `shared/services/TicketService.ts` via STATUS_CONFIG, not in the controller

#### Edge Case Discoveries  
- **Invalid Status Values**: CR files may contain invalid status values (e.g., "Open" in MDT-084) that don't exist in CRStatus type; these should be validated and corrected

#### Verification Updates
- **Error Response Format**: Error responses must include specific validation details with list of valid transitions (e.g., "Valid transitions from 'Proposed': Approved, Rejected")
- **HTTP Status Codes**: Validation errors must return 400 status, not 500