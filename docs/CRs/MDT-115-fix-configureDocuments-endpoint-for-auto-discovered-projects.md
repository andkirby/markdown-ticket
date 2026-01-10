---
code: MDT-115
status: Implemented
dateCreated: 2026-01-09T23:00:00.000Z
type: Bug Fix
priority: High
---

# Fix configureDocuments endpoint for auto-discovered projects

## 1. Description

### Requirements Scope
`brief`

### Problem
- `/api/documents/configure` endpoint returns 500 Internal Server Error for auto-discovered projects
- `ProjectConfigService.configureDocuments()` requires a registry file that does not exist for auto-discovered projects
- Projects returned by `/api/projects` include both registered and auto-discovered, but `configureDocuments()` only works with registered projects

### Affected Artifacts
- `shared/services/ProjectService.ts:64-66`
- `shared/services/project/ProjectConfigService.ts:220-247`
- `shared/services/project/types.ts:69`

### Scope
- **Changes**: Make configureDocuments work with auto-discovered projects by finding project path from getAllProjects()
- **Unchanged**: Registry-based project registration flow, existing project discovery mechanisms

## 2. Decision

### Chosen Approach
Modify ProjectService to find projects from getAllProjects() instead of requiring registry lookup, then add configureDocumentsByPath method that accepts direct project path.

### Rationale
- Auto-discovered projects are returned by `/api/projects` but not in global registry at `~/.config/markdown-ticket/projects/`
- `getAllProjects()` merges both registered and auto-discovered projects, providing unified access
- Adding `configureDocumentsByPath()` allows configuration without requiring registry file
- Maintains backward compatibility with existing registered projects

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Find project from getAllProjects(), use direct path | **ACCEPTED** - Works for both registered and auto-discovered projects |
| Require registration | Force all projects to be registered before configuration | Adds manual step, defeats purpose of auto-discovery |
| Skip configuration | Disable document configuration for auto-discovered projects | Breaks expected functionality for these projects |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `ProjectService.configureDocumentsByPath()` | Method | Configure documents using direct project path |
| `ProjectConfigService.configureDocumentsByPath()` | Method | Handle configuration with direct path |
| `IProjectConfigService.configureDocumentsByPath()` | Interface method | Type definition for new method |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `ProjectService.configureDocuments()` | Method signature + implementation | Changed to async, finds project from getAllProjects() |
| `ProjectConfigService.configureDocuments()` | Refactored | Now delegates to configureDocumentsByPath() |
| `types.ts:IProjectConfigService` | Interface updated | Added configureDocumentsByPath signature |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| ProjectController.configureDocuments | ProjectService.configureDocuments | Method call |
| ProjectService.configureDocuments | ProjectService.getAllProjects | Project lookup |
| ProjectService.configureDocuments | ProjectConfigService.configureDocumentsByPath | Configuration with path |

## 5. Acceptance Criteria

### Functional
- [x] `ProjectService.configureDocuments()` is async and returns Promise<void>
- [x] `configureDocumentsByPath(projectId, projectPath, documentPaths)` exists on ProjectService
- [x] `configureDocumentsByPath(projectId, projectPath, documentPaths)` exists on ProjectConfigService
- [x] `IProjectConfigService` interface includes configureDocumentsByPath method
- [x] Auto-discovered projects (e.g., "stihi") can configure document paths via `/api/documents/configure`
- [x] Registered projects continue to work with `/api/documents/configure`
- [x] Local `.mdt-config.toml` file is updated with `document.paths` array

### Non-Functional
- [x] TypeScript compilation passes without errors
- [x] No regression in existing registered project configuration
- [x] Response time for `/api/documents/configure` remains under 1s

### Testing
- [x] Manual: Verified `/api/documents/configure` works for auto-discovered projects by selecting document paths in UI and clicking Save -> paths saved successfully

## 6. Verification

### By CR Type
- `/api/documents/configure` returns 200 (not 500) for auto-discovered projects
- Auto-discovered projects can save document configuration
- Local `.mdt-config.toml` file contains `document.paths = ["./"]` after save

### Metrics
- Response status: 200 OK (previously 500 Internal Server Error)
- Config file updated: `document.paths` array contains selected paths
- No errors in console after clicking "Save Selection"

## 7. Deployment

### Simple Changes
- Build shared code: `npm run build:shared`
- Backend server auto-reloads (nodemon)
- Frontend Vite dev server picks up changes
- No configuration changes required
- No database changes required
- No migration required
