## Worktree Path Resolution for Sub-Document Discovery (MDT-094)

### Problem Statement

The server-side `TicketService` in `server/services/TicketService.ts` discovers and retrieves sub-documents by constructing file paths directly from `project.project.path`. This fails in git worktree scenarios where tickets live in worktree directories instead of the main project directory. The shared `TicketService` (`shared/services/TicketService.ts`) already implements worktree resolution (MDT-095), but the server adapter did not use this capability for sub-document operations.

**Symptom**: When a ticket exists in a git worktree, sub-document discovery and retrieval only look in the main project path, missing files that exist in the worktree.

### Solution Pattern

**Constructor Injection with Async Path Resolution** — Inject `WorktreeService` into `server/services/TicketService.ts` and call `resolvePath()` before constructing file paths for sub-document discovery and retrieval. This mirrors the pattern already established in `shared/services/TicketService.ts`, ensuring consistency across the codebase.

### Modified Components

#### 1. `server/services/TicketService.ts`

**Changes:**
- Added `WorktreeService` import from `@mdt/shared/services/WorktreeService.js`
- Added `private readonly worktreeService: WorktreeService` field
- Instantiated `WorktreeService` in constructor: `this.worktreeService = new WorktreeService()`
- Made `discoverSubDocuments()` async (was synchronous) to support worktree path resolution
- Modified `discoverSubDocuments()` to call `worktreeService.resolvePath()` before file system operations
- Modified `getSubDocument()` to call `worktreeService.resolvePath()` before reading file content
- Updated `getCR()` to await the now-async `discoverSubDocuments()`

**Implementation Pattern:**
```typescript
// In constructor (line 72-76)
constructor(projectDiscovery: ProjectDiscovery) {
  this.projectDiscovery = projectDiscovery
  this.sharedTicketService = new SharedTicketService(false)
  this.worktreeService = new WorktreeService()  // MDT-094: Add worktree support
}

// In discoverSubDocuments() (line 122-137)
private async discoverSubDocuments(project: Project, crId: string): Promise<SubDocument[]> {
  const ticketsPath = project.project.ticketsPath ?? 'docs/CRs'
  const projectCode = project.project.code

  // MDT-094: Resolve path using WorktreeService for worktree support
  // If project code is undefined, skip worktree resolution and use main project path
  const resolvedPath = projectCode
    ? await this.worktreeService.resolvePath(
        project.project.path,
        crId,
        ticketsPath,
        projectCode,
      )
    : project.project.path

  const subdocDir = join(resolvedPath, ticketsPath, crId)
  // ... rest of discovery logic
}
```

**Null-Safety**: The implementation uses a ternary check (`projectCode ? ... : project.project.path`) to handle cases where `project.project.code` is undefined, skipping worktree resolution and using the main path directly.

#### 2. `server/controllers/ProjectController.ts`

**Changes:**
- Added `WorktreeService` import from `@mdt/shared/services/WorktreeService.js` (line 9)
- Added `private worktreeService: WorktreeService` field (line 94)
- Instantiated `WorktreeService` in constructor: `this.worktreeService = new WorktreeService()` (line 73)

**Note**: Currently the `ProjectController` doesn't directly pass `WorktreeService` to `TicketService` because `TicketService` creates its own instance. This could be refactored to share a single instance via dependency injection in `server.ts`.

#### 3. `server/server.ts`

**Changes:**
- No changes needed for current implementation
- **Future Enhancement**: Could instantiate a single `WorktreeService` instance and pass it to both `ProjectController` and `TicketService` for better resource management

### Data Flow

```
API Request
  → ProjectController.getCR()
    → TicketService.getCR()
      → SharedTicketService.getCR() [already has worktree support]
    → TicketService.discoverSubDocuments()
      → WorktreeService.resolvePath(projectPath, ticketCode, ticketsPath, projectCode)
        → Checks cache for worktree mapping
        → Returns worktree path if ticket file exists there
        → Falls back to main project path if no worktree or missing file
      → Constructs file path using resolved path
      → Reads directory structure
    → Returns CR with sub-document metadata
  → Response to client
```

### Error Handling

- **Worktree resolution fails**: Falls back to main project path (silent degradation per MDT-095)
- **WorktreeService unavailable**: System continues with main path (feature flag can disable worktrees)
- **File system errors**: Existing error handling remains unchanged
- **Cache miss**: `WorktreeService` detects worktrees on-demand and caches results

### Runtime Prerequisites

| Dependency | Required | When Absent |
|------------|----------|-------------|
| `WorktreeService` initialized | Yes | System falls back to main path behavior |
| Git worktree present | No | Main path used (pre-existing behavior) |
| Ticket file in worktree | No | Falls back to main path if worktree file missing |
| `.mdt-config.toml` with worktree config | No | Uses defaults (enabled=true, code from project config) |

### Architecture Invariants

- **single worktree authority**: `WorktreeService` is the only component that detects worktrees and resolves paths
- **path resolution before file ops**: All file system access for ticket content must go through `resolvePath()` first
- **fallback to main**: If worktree resolution fails or file not found, system gracefully degrades to main project path
- **consistent pattern**: Server-side `TicketService` mirrors the worktree pattern from shared `TicketService`

### Extension Rule

To extend worktree support to other server-side services:
1. Import `WorktreeService` from `@mdt/shared/services/WorktreeService.js`
2. Inject via constructor (or use singleton pattern)
3. Call `resolvePath(projectPath, ticketCode, ticketsPath, projectCode)` before file operations
4. Handle fallback to main path gracefully
5. Add tests for both worktree and non-worktree scenarios

### Related Tickets

- **MDT-095**: Initial worktree support in shared `TicketService`
- **MDT-093**: Sub-document navigation feature (this fix enables it in worktrees)
