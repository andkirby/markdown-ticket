---
code: MDT-071
title: Remove .mdt-next Counter File Dependency
status: Proposed
dateCreated: 2025-11-11T17:12:10.842Z
type: Feature Enhancement
priority: High
phaseEpic: MDT-069
---

# Remove .mdt-next Counter File Dependency

## 1. Problem & Scope

**Problem**:
- CR numbering uses dual mechanisms: file scanning + `.mdt-next` counter file
- Counter file can desync from actual CR files
- Bug: `getNextCRNumber()` searches wrong directory when `.mdt-next` missing

**Affected Artifacts**:
- `mcp-server/src/services/crService.ts` (lines 127, 265-309)
- `server/services/ProjectService.ts` (lines 229-230)
- `server/services/TicketService.ts` (line 257)
- `server/utils/ticketNumbering.ts` (lines 127, 154-155)
- `.mdt-next` files (all projects)

**Scope**:
- Remove all `.mdt-next` counter file operations
- Fix directory search bug in `getNextCRNumber()`
- Keep file scanning logic only
- No changes to CR file format or naming

## 2. Decision

**Chosen Approach**: Remove `.mdt-next` file, use file scanning exclusively for CR numbering

**Rationale**:
- File scanning already implemented and working correctly
- Counter file adds 8 file I/O operations per CR creation (read counter, write counter, error handling)
- Bug confirmed: searches `project.project.path` instead of configured CR directory
- File scanning performance cost < 10ms for typical project (< 100 CRs)

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| Keep both mechanisms | Maintain counter file as backup | Adds complexity, requires sync logic |
| Database counter | Store counter in DB | Requires DB dependency, migration overhead |
| Fix bug only | Keep dual mechanism | Doesn't address root cause (redundant systems) |

## 4. Artifact Specifications

#### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `mcp-server/src/services/crService.ts:268` | Method fixed | Use `getCRPath()` instead of `project.project.path` |
| `mcp-server/src/services/crService.ts:127` | Line removed | `updateCounter()` call |
| `mcp-server/src/services/crService.ts:302-309` | Method removed | `updateCounter()` method |
| `server/services/ProjectService.ts:229-230` | Lines removed | Counter file creation |
| `server/services/TicketService.ts:257` | Line removed | Counter file read |
| `server/utils/ticketNumbering.ts:127,154-155` | Lines removed | Counter file operations |

#### Integration Points

| From | To | Interface |
|------|----|-----------|
| `crService.createCR()` | `crService.getNextCRNumber()` | Returns next number |
| `getNextCRNumber()` | `getCRPath()` | Returns CR directory path |
| `getNextCRNumber()` | `glob('*.md')` | Returns CR file list |

#### Key Patterns

- File scanning: Regex match `${code}-(\d+)-` to extract numbers
- Path resolution: Use `getCRPath()` for configured CR directory
- Number selection: `Math.max(highestExisting + 1, startNumber)`

#### Bug Fix Details

**Before** (buggy):
```
Line 268: const crFiles = await glob('*.md', { cwd: project.project.path });
```

**After** (fixed):
```
Line 267: const crPath = await this.getCRPath(project);
Line 271: const crFiles = await glob('*.md', { cwd: crPath });
```

## 5. Acceptance Criteria

**Functional** (artifact-specific, testable):
- [x] `crService.ts:268` uses `getCRPath()` method
- [x] `crService.ts:127` no longer calls `updateCounter()`
- [ ] `crService.ts` has no `updateCounter()` method definition
- [ ] `ProjectService.ts:229-230` removed (no counter file creation)
- [ ] `TicketService.ts:257` removed (no counter file read)
- [ ] `ticketNumbering.ts:127,154-155` removed

**Non-Functional** (measurable):
- [x] Bug fix verified: MDT-077 created (not MDT-001) when `.mdt-next` missing
- [x] DEB-034 created correctly (root path test)
- [ ] All existing tests pass after counter file removal
- [ ] CR creation time increase < 10ms (current avg: ~50ms)

**Testing** (specific test cases):
- [x] Unit: `getNextCRNumber()` with `path="docs/CRs"`, no `.mdt-next` → returns 77
- [x] Unit: `getNextCRNumber()` with `path="."`, no `.mdt-next` → returns 34
- [ ] Integration: Create CR in empty project → returns startNumber (1)
- [ ] Integration: Create 2 CRs concurrently → no duplicate numbers
- [ ] Manual: Delete `.mdt-next` from all projects → CR creation still works

## 6. Verification

**Bug Fix** (completed):
- Bug: `crService.ts:268` searched wrong directory (fixed 2025-11-13)
- Test case: MDT project, deleted `.mdt-next`, highest CR-076
- Before: Created MDT-001 (wrong)
- After: Created MDT-077 (correct)
- Artifact verification: `docs/CRs/MDT-077-final-test-cr-numbering-fix-verification.md` exists

**Full Implementation** (pending):
- Artifacts removed: Counter file operations in 4 files (listed in section 4)
- Test: All unit/integration tests pass
- Test: CR creation in 10 projects with/without `.mdt-next` → sequential numbers
- Metric: CR creation time baseline (current) → target (< +10ms)

## 7. Deployment

**Phase 1** (completed 2025-11-13):

| Artifact | Change | Rollback |
|----------|--------|----------|
| `mcp-server/src/services/crService.ts` | Bug fix deployed | Revert commit 339b633 |

**Phase 2** (pending):

| Artifact | Change | Rollback |
|----------|--------|----------|
| `server/services/*.ts` | Remove counter file ops | Revert commits |
| `mcp-server/dist/` | Rebuild after removal | Rebuild from previous version |

**Configuration**:
- No config changes required
- `.mdt-next` files remain in repos (ignored by new code)
- Optional: Add `.mdt-next` to `.gitignore` after deployment