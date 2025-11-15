---
code: MDT-041
title: Project Edit Modal with Real-time Updates
status: Implemented
dateCreated: 2025-09-10T22:30:24.211Z
type: Feature Enhancement
priority: Medium
description: Implement functionality to edit existing projects through the UI with immediate reflection of changes. Users can modify project name, description, CRs path, and repository URL through a modal interface. Additionally, add pencil icon to Documents view for configuring document paths with preselected checkboxes.
rationale: Users need the ability to modify project metadata and document configuration without manually editing configuration files. The UI should immediately reflect changes after saving to provide seamless user experience.
assignee: Development Team
implementationDate: 2025-09-11T00:05:11.083Z
implementationNotes: Status changed to Implemented on 9/11/2025
---


# Project Edit Modal with Real-time Updates - Tilde Expansion Support for Project Creation Paths

## 1. Description

### Problem
- Project creation functionality in `server/services/ProjectService.ts:145-247` does not support tilde (`~`) expansion in project paths
- Users cannot use `~/path/to/project` syntax when creating new projects through the UI
- Path validation at `server/services/ProjectService.ts:156-163` fails on tilde-prefixed paths because `fs.stat()` cannot resolve `~` 
- Frontend project creation at `src/components/AddProjectModal.tsx:238` submits paths with tildes but backend rejects them


### Affected Artifacts
- `server/services/ProjectService.ts` - `createProject()` method path handling 
- `server/services/ProjectService.ts:152-153` - Path expansion logic needed
- `server/services/ProjectService.ts:156-163` - Path validation logic
- `src/components/AddProjectModal.tsx:238` - Frontend form submission (unchanged, but benefits from this fix)


### Scope
**Changes**: Add tilde expansion to `ProjectService.createProject()` method
**Unchanged**: Frontend components, project editing functionality, other path handling logic

## 2. Solution Analysis

### Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Add `os.homedir()` expansion in `ProjectService.createProject()` | **ACCEPTED** - Minimal change, leverages Node.js built-in, maintains existing API |
| Frontend Path Expansion | Expand tildes in `AddProjectModal` before sending to backend | Requires frontend changes, inconsistent with other path handling |
| Path Validation Wrapper | Create separate path validation utility function | Over-engineering for simple expansion need |
| User Education Only | Require users to input full absolute paths | Poor user experience, doesn't match shell expectations |


### Technical Approach
- Use `os.homedir()` to get user's home directory
- Replace `~` or `~/` at start of path with expanded path using regex
- Apply expansion before path validation, but after required field checks
- Maintain all existing path validation logic unchanged

## 3. Implementation Specification

### Code Changes

**File: `server/services/ProjectService.ts`**


#### Addition: Path Expansion Logic
```typescript
// Lines 152-153: Add after required field validation
// Expand ~ to home directory
const expandedPath = projectPath.replace(/^~($|\/)/, `${os.homedir()}$1`);
```


#### Modification: Path Validation
**Before:**
```typescript
const stats = await fs.stat(projectPath);
```

**After:**
```typescript
const stats = await fs.stat(expandedPath);
```


#### Modification: Path Usage Throughout Method
Replace all `projectPath` references with `expandedPath` except:
- Keep original `projectPath` for config file naming logic (line 173)
- Use `expandedPath` for file system operations and paths stored in config

**Specific lines to update:**
- Line 167: `const projectDirName = path.basename(expandedPath);`
- Line 199: `const crsDir = path.join(expandedPath, crsPath);`
- Line 205: `path = "${expandedPath}"` in global config content
- Line 229: `const localConfigPath = path.join(expandedPath, '.mdt-config.toml');`
- Line 233: `const counterFile = path.join(expandedPath, '.mdt-next');`
- Line 241: `path: expandedPath` in return object


### Integration Points
- **From**: `AddProjectModal` form submission (`/api/projects/create`)
- **To**: `ProjectService.createProject()` method
- **Interface**: Existing HTTP API, no changes required

## 4. Acceptance Criteria

### Functional
- [ ] `ProjectService.createProject()` expands `~/path` to user's home directory
- [ ] `ProjectService.createProject()` expands `~` to user's home directory  
- [ ] Project creation succeeds with tilde-prefixed paths in form input
- [ ] Generated configuration files contain expanded absolute paths
- [ ] Project directory creation uses expanded path successfully
- [ ] Path validation works correctly with expanded paths
- [ ] Existing absolute paths continue to work unchanged
- [ ] Existing relative paths continue to work unchanged


### Non-Functional
- [ ] No performance impact on project creation (< 5ms additional processing time)
- [ ] Cross-platform compatibility maintained (macOS, Linux, Windows)
- [ ] No breaking changes to existing API contracts
- [ ] All existing project creation tests continue to pass


### Testing
- Unit: Test `ProjectService.createProject()` with `~/simple` input → expands to home path
- Unit: Test `ProjectService.createProject()` with `~/complex/path` input → expands correctly  
- Unit: Test `ProjectService.createProject()` with `/absolute/path` input → unchanged
- Unit: Test `ProjectService.createProject()` with `relative/path` input → unchanged
- Integration: Frontend form submission with `~/new-project` creates project successfully
- Manual: User enters `~/my-test-project` in project creation form → project created in home directory

## 5. Implementation Notes

### Key Implementation Details
- **Regex Pattern**: `/^~($|\/)/` matches `~` or `~/` at start of string only
- **Replacement**: `${os.homedir()}$1` preserves trailing slash if present
- **Import Requirement**: Ensure `os` module is imported (already imported on line 3)
- **Error Handling**: Path validation errors now reference expanded paths in error messages
- **File Storage**: Both global and local config files store expanded absolute paths


### Code Pattern Established
```typescript
// Pattern for path expansion in future methods
const expandedPath = originalPath.replace(/^~($|\/)/, `${os.homedir()}$1`);
```


### Testing Considerations
- Mock `os.homedir()` in unit tests for consistent test environments
- Test with various home directory configurations
- Verify Windows path compatibility if needed in future


### Future Enhancement Opportunities
- Consider expanding user home patterns like `~username` if multi-user support needed
- Apply similar pattern to `updateProject()` method if path editing becomes supported

## 6. References

### Related Code
- `server/services/ProjectService.ts:145-247` - `createProject()` method implementation
- `server/services/ProjectService.ts:3` - `os` module import (existing)
- `server/routes/projects.ts:45` - `POST /api/projects/create` endpoint
- `server/controllers/ProjectController.ts:319-341` - Project creation controller
- `src/components/AddProjectModal.tsx:238` - Frontend form submission to create endpoint


### Related Documentation
- Node.js `os.homedir()` documentation: https://nodejs.org/api/os.html#oshomedir
- Project configuration format in `.mdt-config.toml` specification
- Project registry format in `~/.config/markdown-ticket/projects/` specification


### Test Coverage
- `server/tests/ProjectService.test.js` - Add tilde expansion test cases
- Consider integration tests for full project creation flow