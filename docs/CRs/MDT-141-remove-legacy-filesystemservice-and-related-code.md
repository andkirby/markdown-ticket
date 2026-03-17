---
code: MDT-141
status: Implemented
dateCreated: 2026-03-17T09:57:19.691Z
type: Technical Debt
priority: Low
---

# Remove legacy FileSystemService and related code

## 1. Description

The `server/services/FileSystemService.ts` was a legacy service that provided task file CRUD operations and a `sample-tasks` directory. This was superseded by the multi-project architecture and was no longer needed.

## 2. Rationale

- **Redundancy**: The service only wrapped `TreeService.getPathSelectionTree()` - we can call TreeService directly
- **Legacy endpoints**: The `/api/tasks/*` routes served a legacy workflow that is no longer used
- **Simplification**: Removes unnecessary abstraction layer

## 3. Solution Analysis

### Option A: Delete FileSystemService (Selected)
- **Pros**: Clean removal, reduces complexity,- **cons**: None - this is unused code

### Option B: Keep and deprecate
- **pros**: Maintains backward compatibility
- **cons**: Adds maintenance burden for unused code

**Selected**: Option A - clean removal

## 4. Implementation Specification

### Files Deleted
- `server/services/FileSystemService.ts`
- `server/controllers/TicketController.ts`
- `server/routes/tickets.ts`
- `server/tests/api/tickets.test.ts`
- `server/tests/api/fixtures/tickets.ts`

### Files Updated
- `server/server.ts`:
  - Removed FileSystemService import and instantiation
  - Removed TicketController import and instantiation
  - Removed tickets router import and registration
  - Removed TICKETS_DIR constant
  - Updated ProjectController to inject TreeService directly
  - Removed legacy /api/tasks route registration
  - Removed initializeServer function that used fileSystemService
  - Updated server startup logging to remove legacy endpoints

- `server/controllers/ProjectController.ts`:
  - Changed FileSystemService interface to TreeServiceInterface
  - Updated getFileSystemTree to call treeService.getPathSelectionTree directly

- `server/tests/api/test-app-factory.ts`:
  - Replaced FileSystemService with TreeService
  - Removed TicketController
  - Removed legacy /api/tasks route

- `server/tests/utils/setupTests.ts`:
  - Renamed createMockFileSystemService to createMockTreeService

- `server/tests/unit/ProjectController.test.ts`:
  - Updated to use TreeServiceInterface instead of FileSystemService

### Documentation Updated
- `docs/DEVELOPMENT_GUIDE.md` - Removed FileSystemService reference
- `server/docs/REFACTORING_SUMMARY.md` - Updated to reflect TreeService
- `server/docs/DESIGN_ANALYSIS.md` - Updated TreeService reference

## 5. Acceptance Criteria

- [x] FileSystemService.ts deleted
- [x] TicketController.ts deleted
- [x] routes/tickets.ts deleted
- [x] Legacy tests deleted
- [x] Server builds successfully
- [x] Server tests pass (except pre-existing failures)
- [x] MCP server builds successfully
- [x] No references to FileSystemService remain in server code
- [x] Documentation updated to remove references