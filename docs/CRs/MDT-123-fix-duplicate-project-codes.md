---
code: MDT-123
status: Implemented
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
Auto-discovery returns multiple projects with `code="MDT"` (see [Discovery Table](#phase-1-auto-discovery-layer--completed) below for details).

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

### How Duplicate Codes Were Created

Worktrees and clones created duplicate codes through different mechanisms (see [Discovery Table](#phase-1-auto-discovery-layer--completed)):

| Scenario | Config ID | Code | Why It Passed |
|----------|-----------|------|---------------|
| **Worktree with no ID** | (none) | MDT | ID validation passed (no ID to validate); code check only applied to configs without IDs |
| **Clone with source ID** | markdown-ticket | MDT | ID is valid (just doesn't match directory); code check only applied to configs without IDs |
| **Worktree with mismatched ID** | markdown-ticket | MDT | Should be caught by ID/dir mismatch check, but wasn't enforced consistently |

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

### Phase 1: Auto-Discovery Layer (✅ COMPLETED) {#phase-1-auto-discovery-layer--completed}

**Problem Discovered**: Worktrees and project clones were appearing as duplicates in project discovery:

| Directory                | Config ID       | Config Code | Result                     |
|--------------------------|-----------------|-------------|----------------------------|
| `markdown-ticket`          | markdown-ticket | MDT         | ✅ ACCEPTED (first)        |
| `markdown-ticket-aws-counter` | (none)      | MDT         | ❌ SKIP: duplicate code    |
| `scip-finder/markdown-ticket` | markdown-ticket | MDT       | ❌ SKIP: duplicate code    |
| `markdown-ticket-MDT-123`  | markdown-ticket | MDT         | ❌ SKIP: ID doesn't match dir |
| `other-project`            | other-project   | OTH         | ✅ ACCEPTED (unique code)  |

The duplicate code check only applied to configs **without explicit IDs**, allowing:
- Worktrees with no ID (e.g., `markdown-ticket-aws-counter`)
- Clones with source's ID (e.g., `scip-finder/markdown-ticket`)

**Fix Applied**:

1. **`shared/utils/project-validation-helpers.ts`**:
   - `validateNoDuplicateByCode`: Now checks ALL projects for duplicate codes
   - `validateNoDuplicateByCodeInDiscovery`: Now checks ALL discovery configs
   - Removed the `!p.project.id` condition that was limiting the check

2. **`shared/services/project/ProjectScanner.ts`**:
   - Removed `!config.project.id` condition from duplicate check
   - Now applies duplicate code validation to ALL configs regardless of ID presence
   - Improved logging to show ID status: `(has ID: xxx)` or `(no ID in config)`

**Algorithm** {#algorithm}:
```
For each directory with .mdt-config.toml:
  1. If project.id is set and doesn't match directory name
     → SKIP: ID doesn't match dir (worktree detection)
     Example: `markdown-ticket-MDT-123` with id="markdown-ticket"

  2. If code already exists in already-discovered projects
     → SKIP: duplicate code (regardless of ID presence)
     Example: `markdown-ticket-aws-counter` with no ID, code="MDT"
     Example: `scip-finder/markdown-ticket` with id="markdown-ticket", code="MDT"

  3. Add to discovered list
     → ACCEPTED: first with unique code or matching ID/dir
```

**Test Results**:
- **Before**: Multiple `code="MDT"` projects discovered (main + worktrees + clones)
- **After**: Only 1 `code="MDT"` project discovered (first valid one), per the [Algorithm](#algorithm) above

**Files Changed**:
- `shared/utils/project-validation-helpers.ts` (validation logic)
- `shared/services/project/ProjectScanner.ts` (scanner integration)
- `shared/utils/__tests__/project-validation-helpers.test.ts` (test updates)

### Phase 2: Core Registry Layer (REMAINING)

**Goal**: Add validation at `ProjectRegistry.registerProject()` to catch duplicates that bypass auto-discovery (direct API calls, MCP tool registration).

See [Acceptance Criteria - Phase 2](#phase-2-core-registry-layer-remaining) for detailed requirements.
## 5. Requirements

For Phase 2 (Core Registry Layer), the following requirements apply:

| Entry Point | Behavior |
|-------------|----------|
| **Server Logging** | Log duplicate code with conflicting paths, timestamp, and context |
| **MCP Error Handling** | Return structured error with code + paths; block operation |
| **Frontend Error Handling** | Display duplicate errors with paths and action items |
| **CLI Error Handling** | Show duplicate errors with paths and resolution guidance |
| **Cross-Consistency** | Same error format and information across all entry points |

See [Acceptance Criteria - Phase 2](#phase-2-core-registry-layer-remaining) for detailed verification steps.

## 6. Testing Requirements

- Duplicate codes are rejected at registration time
- Self-update (same project ID) does not throw
- All entry points (CLI, MCP, direct calls) enforce validation
- Error messages show conflicting project paths
- Server logs capture duplicate detection events
- MCP tools receive and return duplicate errors correctly
- Frontend displays duplicate errors to users

## 7. Acceptance Criteria
### Phase 1: Auto-Discovery Layer ✅
- [x] Auto-discovery filters duplicate codes regardless of ID presence
- [x] Clear log messages showing why duplicates are skipped
- [x] Tests pass for updated validation helpers

### Phase 2: Core Registry Layer (Remaining) {#phase-2-core-registry-layer-remaining}
- [ ] `ProjectRegistry.registerProject()` throws `DuplicateProjectCodeError` for duplicate codes
- [ ] All code paths (CLI, MCP tools, agents) enforce code uniqueness
- [ ] Error messages show all conflicting project paths
- [ ] Server logs capture duplicate detection with timestamp and context
- [ ] MCP tools receive structured error with code + paths
- [ ] Frontend displays duplicate errors to users
- [ ] Self-update (same project ID) doesn't throw false positive
- [ ] Tests added for duplicate code rejection at core layer
- [ ] No existing functionality broken