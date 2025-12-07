---
code: MDT-089
status: In Progress
dateCreated: 2025-12-07T09:54:59.679Z
type: Bug Fix
priority: High
---

# Fix drag and drop ticket fetching - implement missing CR endpoints

## 1. Description

### Problem
- Frontend drag and drop operations fail with 501 error when fetching ticket data
- `/api/projects/:id/crs/:code` endpoint returns "Not implemented" in ProjectController
- SSE events trigger ticket fetch but backend endpoints are missing

### Affected Artifacts
- `server/controllers/ProjectController.ts` - Missing implementations for getCR, createCR, updateCR, deleteCR
- `server/services/TicketService.ts` - Has required methods but not used by ProjectController
- `src/services/dataLayer.ts` - Attempts to call `/api/projects/:projectId/crs/:ticketCode`

### Scope
- **Changes**: Implement missing CRUD methods in ProjectController using existing TicketService
- **Unchanged**: Frontend API calls, TicketService implementation, route definitions

## 2. Decision

### Chosen Approach
Implement missing ProjectController CRUD methods by delegating to existing TicketService

### Rationale
- TicketService already has all required methods (getCR, createCR, updateCRPartial, deleteCR)
- ProjectController already receives TicketService instance but wasn't using it
- No breaking changes to API contracts - endpoints already exist and documented

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Implement ProjectController methods using TicketService | **ACCEPTED** - Leverages existing service, no duplication |
| Use /api/tasks endpoint | Change frontend to use filename-based endpoint | Requires frontend changes, breaks semantic API |
| Direct file access | ProjectController reads markdown files directly | Bypasses shared service logic and validation |

## 4. Artifact Specifications

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `server/controllers/ProjectController.ts` | Methods added | getCR(), createCR(), updateCR(), deleteCR() |
| `server/controllers/ProjectController.ts` | Method updated | getCR() now calls ticketService.getCR() |
| `server/controllers/ProjectController.ts` | Method updated | createCR() now calls ticketService.createCR() |
| `server/controllers/ProjectController.ts` | Method updated | updateCR() now calls ticketService.updateCRPartial() |
| `server/controllers/ProjectController.ts` | Method updated | deleteCR() now calls ticketService.deleteCR() |

### Integration Points

| From | To | Interface |
|------|----|-----------| 
| ProjectController.getCR() | TicketService.getCR() | projectId, crId → Ticket |
| ProjectController.createCR() | TicketService.createCR() | projectId, crData → CreateCRResult |
| ProjectController.updateCR() | TicketService.updateCRPartial() | projectId, crId, updates → UpdateCRResult |
| ProjectController.deleteCR() | TicketService.deleteCR() | projectId, crId → DeleteResult |

### Key Patterns
- Service delegation pattern: ProjectController delegates to TicketService for all CR operations
- Error handling pattern: Consistent 404/400/500 status codes across all CRUD methods
- Optional service pattern: Graceful fallback when TicketService not available

## 5. Acceptance Criteria

### Functional
- [ ] GET /api/projects/:id/crs/:code returns 200 with ticket data
- [ ] POST /api/projects/:id/crs returns 201 with created ticket data
- [ ] PATCH /api/projects/:id/crs/:code returns 200 with updated ticket data
- [ ] DELETE /api/projects/:id/crs/:code returns 200 with deletion confirmation
- [ ] Frontend drag and drop operations complete without 501 errors
- [ ] SSE events successfully trigger ticket data fetch

### Non-Functional
- [ ] All endpoints return appropriate HTTP status codes (200, 201, 400, 404, 500)
- [ ] Error responses include descriptive error messages
- [ ] No regression in existing /api/tasks endpoints

### Testing
- Unit: Test ProjectController.getCR() with valid projectId/crId → returns Ticket
- Unit: Test ProjectController.getCR() with invalid crId → returns 404
- Integration: Frontend drag and drop → SSE event → ticket fetch → UI update
- Integration: Create ticket via API → file created in docs/CRs/

## 6. Verification

### By CR Type
- **Bug Fix**: Drag and drop operations complete without 501 errors; endpoints return expected responses

## 7. Deployment

### Simple Changes
- Restart backend server after code changes
- No database migrations required
- No frontend deployment needed (API contract unchanged)