---
code: MDT-071
title: Remove .mdt-next Counter File Dependency
status: Implemented
dateCreated: 2025-11-11T17:12:10.842Z
type: Feature Enhancement
priority: High
phaseEpic: MDT-069
implementationDate: 2025-11-24T01:20:13.389Z
implementationNotes: Status changed to Implemented on 11/24/2025
---


# Remove .mdt-next Counter File Dependency

## 1. Problem & Scope
**Problem**:
- **Critical tech debt**: Duplicate ticket numbering logic across two codebases (MCP server + Web server)
- CR numbering uses dual mechanisms: file scanning + `.mdt-next` counter file
- Counter file can desync from actual CR files, causing cross-project interference
- **Architecture violation**: No shared ticket management - business logic implemented separately

**Affected Artifacts**:
- `mcp-server/src/services/crService.ts` (lines 127, 265-309) ✅ Fixed
- `server/services/TicketService.ts` (lines 132, 244-245) ❌ Duplicate logic
- `server/utils/ticketNumbering.ts` (lines 126-136) ❌ Duplicate counter dependency
- `.mdt-next` files (all projects) - cross-project contamination source

**Scope** (Updated post-implementation 2025-11-23):
- **Immediate**: Remove all `.mdt-next` counter file operations from both codebases
- **Technical debt migration**: Consolidate ticket management to `shared/` directory
- Fix directory search bug in `getNextCRNumber()` across both implementations
- Keep file scanning logic only (single source of truth)
- No changes to CR file format or naming
- **Future**: Migrate duplicate ticket management systems to shared architecture
## 2. Decision
**Chosen Approach**: Remove `.mdt-next` file, use file scanning exclusively for CR numbering

**Rationale** (Updated post-implementation 2025-11-23):
- File scanning already implemented and working correctly
- **Technical debt elimination**: Counter file adds synchronization complexity across duplicate systems
- Counter file adds 8 file I/O operations per CR creation (read counter, write counter, error handling)
- Bug confirmed: searches `project.project.path` instead of configured CR directory
- Cross-project interference: SUML project read wrong counter file (86 vs 2)
- **Architecture requirement**: Must consolidate duplicate ticket management systems to `shared/`
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
| `mcp-server/src/services/crService.ts:268` | Method fixed | Use `getCRPath()` instead of `project.project.path` ✅ |
| `mcp-server/src/services/crService.ts:127` | Line removed | `updateCounter()` call ✅ |
| `mcp-server/src/services/crService.ts:302-309` | Method removed | `updateCounter()` method ✅ |
| `server/services/ProjectService.ts:229-230` | Lines removed | Counter file creation ✅ |
| `server/services/TicketService.ts:132` | Line identified | Calls duplicate `getNextTicketNumber()` ❌ |
| `server/services/TicketService.ts:244-245` | Lines identified | Counter file update logic (duplicate) ❌ |
| `server/utils/ticketNumbering.ts:126-136` | Block identified | Counter file reading logic (duplicate) ❌ |
| `shared/services/` | **NEW REQUIRED** | Consolidated ticket management (future) 🔄 |

**Legend**: ✅ Completed, ❌ Technical Debt, 🔄 Future Migration
#### Integration Points
| From | To | Interface | Status |
|------|----|-----------|---------|
| `crService.createCR()` | `crService.getNextCRNumber()` | Returns next number | ✅ Working |
| `getNextCRNumber()` | `getCRPath()` | Returns CR directory path | ✅ Working |
| `getNextCRNumber()` | `glob('*.md')` | Returns CR file list | ✅ Working |
| `TicketService.createCR()` | `getNextTicketNumber()` | **Duplicate** file scanning | ❌ Tech Debt |
| `TicketService.createCR()` | **Counter file** | **Duplicate** counter dependency | ❌ Tech Debt |
| `shared/services/TicketManager` | **FUTURE** | **Unified** ticket management | 🔄 Required |

**Legend**: ✅ Working, ❌ Technical Debt, 🔄 Future Consolidation
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
- [x] `crService.ts:268` uses `getCRPath()` method ✅
- [x] `crService.ts:127` no longer calls `updateCounter()` ✅
- [x] `crService.ts` has no `updateCounter()` method definition ✅
- [x] `ProjectService.ts:229-230` removed (no counter file creation) ✅
- [ ] `TicketService.ts:244-245` counter file update logic ❌ **Tech Debt**
- [ ] `ticketNumbering.ts:126-136` counter file reading logic ❌ **Tech Debt**
- [ ] **Migration to `shared/services/TicketManager`** 🔄 **Future Required**

**Non-Functional** (measurable):
- [x] Bug fix verified: MDT-077 created (not MDT-001) when `.mdt-next` missing ✅
- [x] SUML-003 created correctly after MCP reconnection ✅
- [x] Cross-project counter interference eliminated ✅
- [ ] **Technical debt**: Duplicate ticket management systems consolidated 🔄
- [ ] All existing tests pass after counter file removal from both codebases 🔄

**Testing** (specific test cases):
- [x] Unit: `getNextCRNumber()` with `path="docs/CRs"`, no `.mdt-next` → returns 77 ✅
- [x] Unit: `getNextCRNumber()` with `path="."`, no `.mdt-next` → returns 34 ✅
- [x] **Cross-project**: SUML project reads correct counter (not shared) ✅
- [ ] Integration: Create CR in empty project → returns startNumber (1) 🔄
- [ ] Integration: Create 2 CRs concurrently → no duplicate numbers 🔄
- [ ] **Technical debt**: Both MCP and web servers use shared logic 🔄
## 6. Verification
**Bug Fix** (completed):
- Bug: `crService.ts:268` searched wrong directory (fixed 2025-11-13) ✅
- Test case: MDT project, deleted `.mdt-next`, highest CR-076 ✅
- Before: Created MDT-001 (wrong) ❌
- After: Created MDT-077 (correct) ✅
- Artifact verification: `docs/CRs/MDT-077-final-test-cr-numbering-fix-verification.md` exists ✅

**Cross-Project Interference** (discovered and fixed):
- Bug: SUML project reading `/Users/kirby/home/.mdt-next` (86) instead of project-specific ✅
- Evidence: Created SUML-085, SUML-086 (wrong numbers) ❌
- Fix verification: After MCP reconnection, created SUML-003 (correct) ✅
- Counter file contamination eliminated ✅

**Technical Debt Verification** (partial):
- **MCP Server**: Counter file dependency removed ✅
- **Web Server**: Counter file logic still exists ❌ **Tech Debt**
- **Architecture**: Duplicate ticket management systems identified ❌ **Tech Debt**

**Full Implementation Status**:
- ✅ MCP server: Counter file operations removed
- ❌ Web server: Counter file operations identified but not removed
- 🔄 **Future**: Migrate to `shared/services/TicketManager` for consolidation

### Post-Implementation Session 2025-11-23

**Session Context**: MCP server implementation completed, discovered critical technical debt in duplicate ticket management systems.

**Artifact Discoveries**:
- **Duplicate Architecture**: Found `server/services/TicketService.ts` and `server/utils/ticketNumbering.ts` contain identical ticket numbering logic to MCP server
- **Cross-Project Counter Contamination**: SUML project read from `/Users/kirby/home/.mdt-next` (86) instead of project-specific counter file (2)
- **Technical Debt Surface**: Two independent ticket creation systems requiring dual maintenance

**Specification Corrections**:
- Original scope incomplete: Only addressed MCP server, not web server duplicate logic
- Architecture assumption incorrect: Assumed shared business logic between systems
- Bug impact underestimated: Cross-project interference more severe than described

**Integration Changes**:
- **Status**: MCP server ✅ fixed, Web server ❌ technical debt identified
- **Future Required**: Migration to `shared/services/TicketManager` for unified ticket management
- **Impact**: Bug fixes, features, and changes require dual implementation until consolidated

**Code Evidence**:
```typescript
// Duplicate logic found in server/utils/ticketNumbering.ts:126-136
const counterFile = path.join(projectPath, '.mdt-next');
let counterNumber = 0;
try {
  const content = await fs.readFile(counterFile, 'utf8');
  counterNumber = parseInt(content.trim()) || 0;
} catch {
  // Counter file doesn't exist
}
const nextNumber = Math.max(maxNumber + 1, counterNumber);
```

```typescript
// Duplicate logic found in server/services/TicketService.ts:244-245
const counterPath = path.join(project.project.path, config.project?.counterFile || '.mdt-next');
await fs.writeFile(counterPath, String(nextNumber + 1), 'utf8');
```

**Next CR Required**: Technical debt migration to consolidate ticket management into `shared/` directory.

**Technical Debt Follow-up:**
- All remaining technical debt items identified in this CR will be implemented in MDT-082
- MDT-082 consolidates ticket CRUD operations from MCP server to shared layer
- MDT-082 removes duplicate web server logic and enables unified ticket management
- **Relation**: MDT-082 depends on MDT-071 and blocks MDT-071 completion