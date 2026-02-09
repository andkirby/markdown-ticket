---
code: MDT-123
status: Proposed
dateCreated: 2026-02-08T14:29:39.209Z
type: Bug Fix
priority: High
phaseEpic: Project Discovery
---

# Multiple projects with duplicate code=MDT appearing in project registry

## 1. Description

### Problem Statement
Multiple projects with `code="MDT"` are appearing in the project registry, causing confusion and potential incorrect project resolution when using MCP tools like `get_cr`.

### Current State
```
list_projects returns 4 projects with code="MDT":

• MDT - markdown-ticket (real project at /Users/kirby/home/markdown-ticket)
• MDT - mdt-smoke-1770507021 (test project at /tmp/mdt-smoke-1770507021)
• MDT - mdt-test-1770506866 (test project at /tmp/mdt-test-1770506866)
• MDT - mdt-test-cli (test project at /tmp/mdt-test-cli)
```

### Desired State
- Only 1 project with `code="MDT"` should appear (the real project)
- Test projects should not pollute the production project registry
- All entry points (registration, MCP, frontend) handle duplicates consistently
- Server logs record duplicate detection events
- Users see clear actionable error messages with conflicting paths

### Business/Technical Justification
When `get_cr` is called with a project code, it needs to uniquely identify which project to query. Having multiple projects with the same code leads to:
- Ambiguous project resolution
- Potential data corruption or incorrect CR retrieval
- Confusion for users

## 2. Rationale

### Why This Change is Necessary
Project codes must be unique identifiers. The system currently allows multiple projects with the same code to coexist, which breaks the fundamental assumption that `code` uniquely identifies a project.

### What It Accomplishes
- Ensures project code uniqueness in the registry
- Prevents test projects from polluting production registry
- Makes MCP tool behavior predictable

## 3. Solution Analysis

### Root Cause
**Validation exists at CLI layer but NOT at core registry layer:**

```
CLI Layer (ProjectManager.ts)
    ↓ has validation ✅ "Project with code X already exists"
    ↓
Core Layer (ProjectRegistry.registerProject())
    ↓ NO validation ❌ allows any code
    ↓
Registry File System
```

When agents, tests, or MCP tools call `ProjectRegistry.registerProject()` directly, they **bypass the CLI validation** and can register projects with duplicate codes.

### Current Validation (Wrong Layer)
```typescript
// shared/tools/ProjectManager.ts lines 86-93
// Only enforced when using CLI command "mdt project:create"
const existingProjectByCode = allProjects.find(p => p.project.code === code)
if (existingProjectByCode) {
  throw new ProjectError(`Project with code "${code}" already exists...`)
}
```

**Problem:** This validation is:
1. Only enforced at CLI layer
2. Bypassed by direct `ProjectRegistry.registerProject()` calls
3. Not enforced for MCP tools, agents, or tests

### How Test Projects Were Created
Test projects like `mdt-smoke-1770507021` have:
- `id = "mdt-smoke-1770507021"` (unique, matches directory)
- `code = "MDT"` (copied from source project)
- ID validation passes (id matches directory)
- Code validation bypassed (not in core layer)

### Evaluated Alternatives

| Approach | Pros | Cons | Selected |
|----------|------|------|----------|
| **A. Validate at registration (core layer)** | Prevents ALL code paths from creating duplicates | Needs proper error handling | ✅ |
| B. Filter at load time | Registry still polluted, wrong layer | Doesn't prevent root cause | ❌ |
| C. Filter by test paths (/tmp) | Simple | Blocks legitimate tests, fragile | ❌ |
| D. Separate test registry | Clean isolation | Requires test infrastructure changes | Later |

### Selected Approach
**Add code uniqueness validation at `ProjectRegistry.registerProject()`**:

Move validation from CLI layer to core registry layer so that **ALL code paths** (CLI, MCP tools, agents, tests) are protected from creating duplicate project codes.

## 4. Architecture

See: `docs/CRs/MDT-123/architecture.md` for detailed design.

### High-Level Requirements

1. **Validation at core layer**: Move code uniqueness validation from CLI to `ProjectRegistry.registerProject()`
2. **All code paths protected**: CLI, MCP tools, agents, and tests must enforce code uniqueness
3. **Clear error messages**: Show conflicting project paths when duplicates detected
4. **No blocking**: Allow self-updates (same project ID) without false positives

### Error Output Format

When duplicate code detected:
```
Duplicate project code "MDT" detected:

  /Users/kirby/home/markdown-ticket
  /tmp/mdt-test-123

Action: Remove duplicate projects from ~/.config/markdown-ticket/projects/
```

## 5. Requirements

### 5.1 Server Logging
- When duplicate project code is detected, log to server with:
  - Duplicate code
  - All conflicting project paths
  - Timestamp
  - Context (registration vs. operation)

### 5.2 MCP Error Handling
- When MCP tool attempts operation on duplicate project code:
  - Return error with duplicate code
  - Return all conflicting project paths
  - Operation is blocked

### 5.3 Frontend Error Handling
- Frontend receives and displays duplicate code errors
- Shows conflicting project paths to user
- Provides clear action items (delete duplicates, use CONFIG_DIR for tests)

### 5.4 CLI Error Handling
- CLI commands show duplicate code errors with paths
- Provides clear guidance on resolution

### 5.5 Cross-Consistency
- Same error format across all entry points
- Same information (code + paths) in all contexts

## 6. Testing Requirements

- Duplicate codes are rejected at registration time
- Self-update (same project ID) does not throw
- All entry points (CLI, MCP, direct calls) enforce validation
- Error messages show conflicting project paths
- Server logs capture duplicate detection events
- MCP tools receive and return duplicate errors correctly
- Frontend displays duplicate errors to users

## 7. Acceptance Criteria
- [ ] `ProjectRegistry.registerProject()` throws `DuplicateProjectCodeError` for duplicate codes
- [ ] All code paths (CLI, MCP tools, agents) enforce code uniqueness
- [ ] Error messages show all conflicting project paths
- [ ] Server logs capture duplicate detection with timestamp and context
- [ ] MCP tools receive structured error with code + paths
- [ ] Frontend displays duplicate errors to users
- [ ] Self-update (same project ID) doesn't throw false positive
- [ ] Tests added for duplicate code rejection at core layer
- [ ] No existing functionality broken
