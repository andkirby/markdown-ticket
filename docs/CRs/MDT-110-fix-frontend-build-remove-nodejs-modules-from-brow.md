---
code: MDT-110
status: Implemented
dateCreated: 2025-12-28T20:12:47.297Z
type: Bug Fix
priority: Critical
---

# Fix frontend build: remove Node.js modules from browser bundle

## 1. Description

### Requirements Scope
`brief` — Bug description + fix criteria

### Problem
- Vite build fails with error: `[plugin vite:resolve] Module "fs" has been externalized for browser compatibility`
- Frontend imports `ProjectValidator` from `@mdt/shared/tools/ProjectValidator` which contains Node.js filesystem operations (fs, os, path)
- Browser environment cannot execute Node.js-specific modules
- Build is blocked, preventing frontend deployment

### Affected Areas
- **Frontend**: Components that import shared tools (e.g., AddProjectModal)
- **Shared code**: Tools directory containing Node.js-specific utilities
- **Build**: Vite bundling process cannot resolve Node.js modules

### Scope
- **In scope**: Unblocking frontend build by removing Node.js module dependencies from browser code
- **Out of scope**: CLI functionality that uses Node.js filesystem operations

## 2. Desired Outcome
### Success Conditions
- Frontend build completes without Node.js module resolution errors
- Project validation still works in browser environment
- CLI tools retain filesystem access for server-side validation

### Constraints
- Must maintain existing validation behavior in browser
- Cannot break existing CLI functionality
- Must use browser-safe APIs for frontend

### Non-Goals
- Not changing validation rules or logic
- Not modifying backend validation behavior

> **Extracted**: Complex architecture — see [architecture.md](./MDT-110/architecture.md)

**Summary**:
- Pattern: Conditional Exports
- Components: 3 (ProjectValidator.browser.ts, ProjectValidator.node.ts, path-browser.ts)
- Key constraint: Browser file must not import Node.js modules (fs, os, path)

**Extension Rule**: To add validation method, implement in both .browser.ts and .node.ts files, browser version must be Node.js-free.

**Decisions Made**:
| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Separation strategy | Conditional exports | No code duplication, no import changes needed |
| Export location | Same path (`./tools/ProjectValidator`) | Existing imports continue to work |
| Browser path validation | Format-only (skip filesystem) | Backend validates existence via API |
## 3. Resolved Questions
| Area | Question | Resolution |
|------|----------|------------|
| Architecture | How to separate browser-safe from Node.js validation? | Conditional exports in package.json |
| Implementation | Where to put browser-compatible validator? | Same path, use `browser` condition |
| Behavior | What should validatePath() do in browser? | Format check only, skip filesystem |

### Implementation Phases
1. Create `ProjectValidator.browser.ts` (browser-safe validation)
2. Create `ProjectValidator.node.ts` (full validation with fs)
3. Update `shared/package.json` exports field
4. Verify build succeeds
## 4. Acceptance Criteria

### Functional (Outcome-focused)
- [ ] Frontend build succeeds without Node.js module errors
- [ ] AddProjectModal validates project configurations correctly
- [ ] CLI tools retain filesystem-based validation capabilities

### Non-Functional
- [ ] Build time remains comparable to current baseline
- [ ] No runtime errors in browser console related to missing modules

### Edge Cases
- What happens when validation rules change (must update both environments)
- What happens when a user enters invalid project configuration
- What happens if filesystem access is attempted in browser

## 5. Verification

### How to Verify Success
- **Build verification**: Run `npm run build` — completes without errors
- **Functional verification**: Open AddProjectModal, enter invalid config — validation error displays
- **CLI verification**: Run project creation command — filesystem validation works
- **Browser console**: No warnings about missing Node.js modules
