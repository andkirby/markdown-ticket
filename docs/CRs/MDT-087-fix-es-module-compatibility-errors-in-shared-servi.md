---
code: MDT-087
status: Implemented
dateCreated: 2025-12-06T00:29:10.469Z
type: Bug Fix
priority: Medium
---

# Fix ES module compatibility errors in shared services

## 1. Description

### Problem
- ES module compatibility errors occurring when backend and frontend use shared services
- `ReferenceError: require is not defined` in ProjectRegistry.ts:107 during project discovery
- `TypeError: path.isAbsolute is not function` in ProjectValidator.ts:196 during project creation
- `ReferenceError: require is not defined` in ProjectValidator.ts:84 during project creation

### Affected Artifacts
- `shared/services/project/ProjectRegistry.ts` (file system operations using require)
- `shared/tools/ProjectValidator.ts` (path module and require usage)
- `src/utils/linkNormalization.ts` (Node.js path methods in frontend)

### Scope
- **Changes**: Replace CommonJS patterns with ES module compatible code
- **Unchanged**: Business logic and API interfaces remain same

## 2. Decision

### Chosen Approach
Replace CommonJS require() statements with ES module imports and create cross-platform path utilities.

### Rationale
- ES modules don't support require() causing runtime errors
- Browser environment lacks Node.js-specific modules like 'path'
- Cross-platform utilities ensure code works in both Node.js and browser
- Maintains existing functionality while fixing compatibility

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | ES module imports + cross-platform utils | **ACCEPTED** - Fixes both backend and frontend issues |
| Dynamic imports only | Use import() for conditional loading | Doesn't solve browser path utility issue |
| Polyfills only | Add Node.js polyfills to frontend build | Increases bundle size unnecessarily |

## 4. Artifact Specifications

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `shared/utils/path-browser.ts` | Utility | Cross-platform path functions for browser/Node.js |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `shared/services/project/ProjectRegistry.ts` | Import update | Replaced require() with listFiles/readFile imports |
| `shared/tools/ProjectValidator.ts` | Import update | Added ES module path import, removed require() |
| `src/utils/linkNormalization.ts` | Import update | Switched to cross-platform path utility |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| ProjectRegistry | file-utils | listFiles(), readFile() |
| ProjectValidator | path-browser | isAbsolute(), normalize() |
| linkNormalization | path-browser | dirname(), basename(), join() |

### Key Patterns

- Environment detection: Check for process.versions.node to detect Node.js runtime
- Cross-platform utilities: Same API surface for browser and Node.js
- ES module imports: Static imports at top level instead of dynamic require()

## 5. Acceptance Criteria

### Functional
- [ ] Backend server starts without `require is not defined` errors
- [ ] Frontend loads without `path.isAbsolute is not function` errors
- [ ] Project creation form submits successfully
- [ ] Project discovery finds all registered projects
- [ ] File watchers initialize for all projects

### Non-Functional
- [ ] Shared code builds successfully with TypeScript
- [ ] No runtime errors in browser console related to path utilities
- [ ] No backend errors during startup sequence

### Testing
- Unit: Test path-browser utility functions in Node.js and browser environments
- Integration: Test project creation API endpoint completes without errors
- Manual: Start both frontend and backend, verify no ES module errors

## 6. Verification

### By CR Type
- **Bug Fix**: ES module compatibility errors no longer occur in both frontend and backend

### Metrics

Artifacts verified after implementation:
- Backend server log shows successful project discovery and file watcher initialization
- Frontend console shows no errors related to path utilities
- Project creation API returns success response

## 7. Deployment

### Simple Changes
- Build shared TypeScript code: `npm run build:shared`
- Restart backend server: `npm run dev:server`
- Restart frontend server: `npm run dev`
- Verify both start without errors
