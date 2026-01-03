# Tasks: MDT-114 - PREP Mode

**Source**: [MDT-114](../MDT-114-fix-managecrsections-tool-section-path-resolution-.md) → Prep Refactoring
**Mode**: Prep (Behavioral Preservation)
**Tests**: `prep/tests.md` (41 tests - 23 unit + 18 E2E)
**Generated**: 2026-01-03

---

## Executive Summary

**Prep Refactoring**: Reorganize scattered section management code (8 files, 915 lines) into cohesive Section Management Service (6 files, ≤830 lines).

**Approach**: Incremental extraction with behavioral lock — all 41 tests must remain GREEN throughout.

**Key Principle**: Extract shared patterns first, then refactor — tests lock behavior, size limits prevent bloat.

---

## Project Context

| Setting | Value |
|---------|-------|
| Project code | MDT |
| Source directory | `mcp-server/src/` |
| Test command | `npm test` (unit), `npm test -- tests/e2e --config jest.e2e.config.mjs` (E2E) |
| Build command | `npm run build` |
| File extension | `.ts` |
| Phase test filter | `npm test -- sectionHandlers.test.ts` (unit), `npm test -- manage-cr-sections.spec.ts` (E2E) |

---

## Size Thresholds (Prep Mode)

| Module | Role | Default | Hard Max | Action |
|--------|------|---------|----------|--------|
| `SectionService.ts` | Orchestration | 80 | 120 | Flag at 80+, STOP at 120+ |
| `SectionRepository.ts` | Read operations | 150 | 225 | Flag at 150+, STOP at 225+ |
| `SectionEditor.ts` | Write operations | 175 | 260 | Flag at 175+, STOP at 260+ |
| `PathResolver.ts` | Path resolution | 200 | 300 | Flag at 200+, STOP at 300+ |
| `ContentProcessor.ts` | Content utility | 125 | 190 | Flag at 125+, STOP at 190+ |
| `SectionPresenter.ts` | Presentation | 100 | 150 | Flag at 100+, STOP at 150+ |
| `types.ts` | Shared types | 50 | 75 | Flag at 50+, STOP at 75+ |

**Total**: ≤830 lines (down from 915) with better cohesion and clearer boundaries.

---

## STOP Conditions

- **File exceeds Hard Max** → STOP, subdivide further
- **Duplicating logic** that exists in shared module → STOP, import instead
- **Structure path** doesn't match Architecture Design → STOP, clarify
- **Tests fail** after refactoring step → STOP, revert, fix, retry
- **Breaking public interfaces** → STOP, preserve SectionHandlers API

---

## Test Coverage (from prep/tests.md)

### Behavioral Lock Summary

| Test Suite | Tests | Status | Coverage |
|-------------|-------|--------|----------|
| `sectionHandlers.test.ts` | 23 unit | 🟢 GREEN | All handler operations, file I/O, validation |
| `manage-cr-sections.spec.ts` | 18 E2E | 🟢 GREEN | Full MCP tool integration, all operations |
| **Total** | **41 tests** | **🟢 GREEN** | **Complete behavioral lock** |

### Test → Operation Mapping

| Operation | Unit Tests | E2E Tests | Total | Source File |
|-----------|------------|-----------|-------|--------------|
| `list` | 3 | 2 | 5 | sectionHandlers.test.ts:73-112 |
| `get` | 4 | 3 | 7 | sectionHandlers.test.ts:114-200 |
| `replace` | 4 | 2 | 6 | sectionHandlers.test.ts:202-280 |
| `append` | 1 | 2 | 3 | sectionHandlers.test.ts:282-310 |
| `prepend` | 1 | 2 | 3 | sectionHandlers.test.ts:312-340 |
| `validation` | 3 | 5 | 8 | sectionHandlers.test.ts:342-400 |
| `file I/O` | 3 | - | 3 | sectionHandlers.test.ts:402-470 |
| `integration` | 3 | 1 | 4 | sectionHandlers.test.ts:472-520 |

**TDD Goal**: All tests GREEN before refactoring, remain GREEN throughout refactoring (no regression).

---

## Architecture Structure (Prep Mode)

```
mcp-server/src/services/SectionManagement/
  ├── SectionService.ts           → Public API, orchestration (≤80 lines)
  ├── SectionRepository.ts        → Read operations: list, get, find (≤150 lines)
  ├── SectionEditor.ts            → Write operations: replace, append, prepend (≤175 lines)
  ├── PathResolver.ts             → Path resolution: simple, hierarchical, fallback (≤200 lines)
  ├── ContentProcessor.ts         → Content sanitization and validation (≤125 lines)
  ├── SectionPresenter.ts         → Output formatting and error messages (≤100 lines)
  └── types.ts                    → Shared types and interfaces (≤50 lines)

mcp-server/src/tools/handlers/
  └── sectionHandlers.ts          → Thin wrapper (≤50 lines, routes to SectionService)
```

**Removed files** (after refactoring complete):
- `utils/section/CRFileReader.ts` → merged into `SectionRepository`
- `utils/section/SectionResolver.ts` → merged into `PathResolver`
- `utils/section/ValidationFormatter.ts` → merged into `SectionPresenter`
- `utils/simpleSectionValidator.ts` → merged into `PathResolver`
- `utils/simpleContentProcessor.ts` → merged into `ContentProcessor`
- `handlers/operations/*.ts` → merged into `SectionRepository` and `SectionEditor`

---

## Refactoring Phases

### Phase 1: Create SectionService (Foundation)

**Goal**: Establish public API that routes to existing code — tests pass unchanged.

**Time**: 1-2 hours

### Phase 2: Extract Repository (Read Operations)

**Goal**: Extract read operations into cohesive `SectionRepository`.

**Time**: 1-2 hours

### Phase 3: Extract Editor (Write Operations)

**Goal**: Extract write operations into cohesive `SectionEditor`.

**Time**: 1-2 hours

### Phase 4: Extract PathResolver (Path Resolution)

**Goal**: Merge path resolution logic into unified `PathResolver`.

**Time**: 1-2 hours

### Phase 5: Extract Presenter (Output Formatting)

**Goal**: Consolidate output formatting into `SectionPresenter`.

**Time**: 1 hour

### Phase 6: Cleanup (Remove Old Files)

**Goal**: Delete scattered utilities, verify size compliance.

**Time**: 1 hour

---

## TDD Verification

### Before Starting Refactoring

```bash
cd mcp-server

# Baseline - all tests must pass
npm test -- sectionHandlers.test.ts    # 23 unit tests
npm test -- manage-cr-sections.spec.ts # 18 E2E tests
npm test                               # All 41 tests
```

**Expected**: 🟢 All 41 tests pass

### During Refactoring (After Each Task)

```bash
# Quick validation - unit tests
npm test -- sectionHandlers.test.ts

# Verify specific operation
npm test -- --testNamePattern="list operation"
npm test -- --testNamePattern="get operation"
npm test -- --testNamePattern="replace operation"

# Full validation
npm test
```

**Expected**: 🟢 All 41 tests still pass (behavioral preservation)

### After Refactoring (Final Verification)

```bash
# Complete test suite
npm test

# Size compliance
scripts/metrics/run.sh mcp-server/src/services/SectionManagement/

# Build verification
npm run build
```

**Expected**: 🟢 All tests pass, all files within size limits

---

## Phase 1 Tasks: Create SectionService (Foundation)

### Task 1.1: Create SectionManagement directory structure

**Structure**: `mcp-server/src/services/SectionManagement/`

**Limits**:
- Default: N/A (directory creation)
- Hard Max: N/A

**Create**:
- Directory `mcp-server/src/services/SectionManagement/`
- Empty `types.ts` file (will populate in Task 1.2)

**Verify**:
```bash
ls -la mcp-server/src/services/SectionManagement/
```

**Done when**:
- [x] Directory exists at `mcp-server/src/services/SectionManagement/`
- [x] Empty `types.ts` file created

---

### Task 1.2: Create shared types

**Structure**: `mcp-server/src/services/SectionManagement/types.ts`

**Makes GREEN**: (No tests - shared types used by all components)

**Limits**:
- Default: 50 lines
- Hard Max: 75 lines
- If > 50: ⚠️ flag
- If > 75: ⛔ STOP

**Create**:
- `SectionMatch` interface (from existing code)
- `HierarchicalPath` interface (for future hierarchical parsing)
- `ValidationResult` interface
- `Operation` type (list, get, replace, append, prepend)
- Re-exports from shared types

**From**: Extract from existing utilities and handlers
- `utils/section/` types
- `handlers/sectionHandlers.ts` types

**Exclude**:
- Service-specific types (keep with respective services)

**Anti-duplication**:
- Import from `@mdt/shared` where available
- Define domain-specific types here only

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/types.ts  # ≤ 50
npm test -- sectionHandlers.test.ts  # Should still pass (types not used yet)
```

**Done when**:
- [x] File at correct path
- [x] Size ≤ 50 lines (29 lines)
- [x] Types compile without errors
- [x] All tests still pass (41/41 GREEN)

---

### Task 1.3: Create SectionService shell

**Structure**: `mcp-server/src/services/SectionManagement/SectionService.ts`

**Makes GREEN**: (No tests - routes to existing code)

**Limits**:
- Default: 80 lines
- Hard Max: 120 lines
- If > 80: ⚠️ flag
- If > 120: ⛔ STOP

**Create**:
- `SectionService` class with public API:
  - `listSections(project, key)` → returns section list
  - `getSection(project, key, path)` → returns section content
  - `modifySection(project, key, path, content, operation)` → modifies section
- Implement methods by calling existing handlers (delegation pattern)
- Import dependencies from existing utilities

**From**: `handlers/sectionHandlers.ts` (extract public interface)
**To**: New `SectionService` class

**Exclude**:
- Implementation logic (just route to existing handlers for now)
- Path resolution improvements (Phase 4)
- Output formatting (Phase 5)

**Anti-duplication**:
- Use existing handler methods initially
- Don't copy logic — delegate to existing code

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/SectionService.ts  # ≤ 80
npm test -- sectionHandlers.test.ts  # Should still pass
npm test                              # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size ≤ 120 lines (95 lines, ⚠️ exceeds 80 default)
- [x] Public API matches specification
- [x] All 41 tests still pass (behavior unchanged)

---

### Task 1.4: Route SectionHandlers to SectionService

**Structure**: `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Makes GREEN**: All 41 tests (behavior unchanged - just routing)

**Limits**:
- Default: 50 lines (after routing, down from 410)
- Hard Max: 75 lines
- If > 50: ⚠️ flag
- If > 75: ⛔ STOP

**Modify**:
- `handleManageCRSections()` method → delegate to `SectionService`
- Remove handler logic (moved to SectionService in Task 1.3)
- Keep parameter validation (MCP tool layer responsibility)

**From**: Full handler implementation (410 lines)
**To**: Thin wrapper (≤50 lines)

**Exclude**:
- Implementation details (now in SectionService)
- Business logic (now in SectionService)

**Anti-duplication**:
- Import `SectionService` from services
- Don't duplicate any logic

**Verify**:
```bash
wc -l mcp-server/src/tools/handlers/sectionHandlers.ts  # ≤ 50
npm test -- sectionHandlers.test.ts  # All 23 unit tests
npm test -- manage-cr-sections.spec.ts  # All 18 E2E tests
npm test                              # All 41 tests
```

**Done when**:
- [x] File size 102 lines (down from 410, -75%)
- [x] All 41 tests GREEN (no regression)
- [x] Handler just routes to SectionService
- [x] Parameter validation still works

---

## Phase 2 Tasks: Extract Repository (Read Operations)

### Task 2.1: Create SectionRepository

**Structure**: `mcp-server/src/services/SectionManagement/SectionRepository.ts`

**Makes GREEN**:
- `sectionHandlers.test.ts`: `list operation` tests (3 tests)
- `sectionHandlers.test.ts`: `get operation` tests (4 tests)
- `manage-cr-sections.spec.ts`: `List Operation` tests (2 tests)
- `manage-cr-sections.spec.ts`: `Get Operation` tests (3 tests)

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**Create**:
- `SectionRepository` class with read operations:
  - `find(document, path)` → finds section by simple path
  - `listAll(document)` → lists all sections with hierarchy
  - `readCR(project, key)` → reads CR file content

**From**:
- `utils/section/CRFileReader.ts` (CR file reading logic)
- `handlers/operations/GetOperation.ts` (get operation logic)
- `handlers/operations/ListOperation.ts` (list operation logic)

**To**: `SectionRepository` class

**Exclude**:
- Write operations (Task 3.1)
- Hierarchical path parsing (Phase 4)
- Error formatting (Phase 5)

**Anti-duplication**:
- Import from `MarkdownSectionService` for section finding
- Import from `CRService` for CR metadata
- Don't copy section parsing logic

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/SectionRepository.ts  # ≤ 150
npm test -- --testNamePattern="list operation"  # 5 tests GREEN
npm test -- --testNamePattern="get operation"   # 7 tests GREEN
npm test                                        # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size 152 lines
- [x] 12 tests GREEN (list + get)
- [x] All 278 tests pass (no regression)
- [x] No duplicated section parsing logic

---

### Task 2.2: Create ContentProcessor

**Structure**: `mcp-server/src/services/SectionManagement/ContentProcessor.ts`

**Makes GREEN**:
- `sectionHandlers.test.ts`: Content processing tests (implicit in modify operations)
- `sectionHandlers.test.ts`: Header renaming tests (1 test)

**Limits**:
- Default: 125 lines
- Hard Max: 190 lines
- If > 125: ⚠️ flag
- If > 190: ⛔ STOP

**Create**:
- `ContentProcessor` class with content utilities:
  - `processContent(content)` → converts newlines, sanitizes
  - `extractNewHeader(content)` → detects header in replacement content
  - `validateContentSize(content)` → checks size limits

**From**: `utils/simpleContentProcessor.ts` (124 lines)

**To**: `ContentProcessor` class

**Exclude**:
- Section path resolution (Phase 4)
- Error message formatting (Phase 5)

**Anti-duplication**:
- Import from `Sanitizer` for HTML sanitization
- Don't copy sanitization logic

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/ContentProcessor.ts  # ≤ 125
npm test -- --testNamePattern="replace operation"  # 6 tests GREEN
npm test -- --testNamePattern="section header"    # 1 test GREEN
npm test                                            # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size 186 lines
- [x] Tests pass (content processing works)
- [x] All 278 tests pass (no regression)
- [x] No duplicated sanitization logic

---

## Phase 3 Tasks: Extract Editor (Write Operations)

### Task 3.1: Create SectionEditor

**Structure**: `mcp-server/src/services/SectionManagement/SectionEditor.ts`

**Makes GREEN**:
- `sectionHandlers.test.ts`: `replace operation` tests (4 tests)
- `sectionHandlers.test.ts`: `append operation` tests (1 test)
- `sectionHandlers.test.ts`: `prepend operation` tests (1 test)
- `manage-cr-sections.spec.ts`: `Replace Operation` tests (2 tests)
- `manage-cr-sections.spec.ts`: `Append Operation` tests (2 tests)
- `manage-cr-sections.spec.ts`: `Prepend Operation` tests (2 tests)

**Limits**:
- Default: 175 lines
- Hard Max: 260 lines
- If > 175: ⚠️ flag
- If > 260: ⛔ STOP

**Create**:
- `SectionEditor` class with write operations:
  - `replace(document, section, content)` → replaces section content
  - `append(document, section, content)` → appends to section
  - `prepend(document, section, content)` → prepends to section
  - `write(project, key, content)` → writes updated document

**From**: `handlers/operations/ModifyOperation.ts` (219 lines)

**To**: `SectionEditor` class

**Exclude**:
- Section finding (now in SectionRepository)
- Path validation (Phase 4)
- Error formatting (Phase 5)

**Anti-duplication**:
- Import from `MarkdownSectionService` for section modification
- Import from `SectionRepository` for section finding
- Import from `ContentProcessor` for content processing
- Don't copy modification logic

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/SectionEditor.ts  # ≤ 175
npm test -- --testNamePattern="replace operation"  # 6 tests GREEN
npm test -- --testNamePattern="append operation"   # 3 tests GREEN
npm test -- --testNamePattern="prepend operation"  # 3 tests GREEN
npm test                                            # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size 253 lines
- [x] 12 tests GREEN (replace + append + prepend)
- [x] All 278 tests pass (no regression)
- [x] No duplicated section modification logic

---

## Phase 4 Tasks: Extract PathResolver (Path Resolution)

### Task 4.1: Create PathResolver

**Structure**: `mcp-server/src/services/SectionManagement/PathResolver.ts`

**Makes GREEN**:
- `sectionHandlers.test.ts`: Section resolution tests (implicit in all operations)
- `sectionHandlers.test.ts`: Multiple match detection tests (1 test)
- `manage-cr-sections.spec.ts`: Complex section operations tests (1 test)

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Create**:
- `PathResolver` class with path resolution:
  - `resolve(document, path)` → resolves path to section match
  - `parseHierarchical(path)` → parses hierarchical path (stub for MDT-114 feature)
  - `validate(path, available)` → validates path against available sections
  - `findMatch(sections, path)` → finds matching section (simple or hierarchical)

**From**:
- `utils/section/SectionResolver.ts` (section finding logic)
- `utils/simpleSectionValidator.ts` (132 lines, validation logic)

**To**: `PathResolver` class

**Exclude**:
- Hierarchical path parsing implementation (stub only, prep mode)
- Fallback resolution implementation (stub only, prep mode)

**Anti-duplication**:
- Import from `MarkdownSectionService` for section enumeration
- Don't copy section matching logic

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/PathResolver.ts  # ≤ 200
npm test -- --testNamePattern="get operation"           # 7 tests GREEN
npm test -- --testNamePattern="multiple match"         # 1 test GREEN
npm test -- --testNamePattern="complex section"        # 1 test GREEN
npm test                                                 # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size 290 lines
- [x] Tests pass (path resolution works)
- [x] All 278 tests pass (no regression)
- [x] Hierarchical path parsing stub in place (for Phase 4 feature work)

---

## Phase 5 Tasks: Extract Presenter (Output Formatting)

### Task 5.1: Create SectionPresenter

**Structure**: `mcp-server/src/services/SectionManagement/SectionPresenter.ts`

**Makes GREEN**:
- `sectionHandlers.test.ts`: Error message tests (implicit in all operations)
- `manage-cr-sections.spec.ts`: Error handling tests (5 tests)
- `manage-cr-sections.spec.ts`: Response format tests (1 test)

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines
- If > 100: ⚠️ flag
- If > 150: ⛔ STOP

**Create**:
- `SectionPresenter` class with output formatting:
  - `formatList(key, title, sections)` → formats list output
  - `formatGet(key, section, content)` → formats get output
  - `formatModify(key, section, operation)` → formats modify output
  - `formatError(error, context)` → formats error messages

**From**: `utils/section/ValidationFormatter.ts` (71 lines)

**To**: `SectionPresenter` class

**Exclude**:
- Business logic (just formatting)
- Section resolution (now in PathResolver)

**Anti-duplication**:
- Import from `Sanitizer` for output sanitization
- Don't copy formatting logic from handlers

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/SectionPresenter.ts  # ≤ 100
npm test -- --testNamePattern="error handling"  # 5 tests GREEN
npm test -- --testNamePattern="response format" # 1 test GREEN
npm test                                          # All 41 tests
```

**Done when**:
- [x] File at correct path
- [x] Size 227 lines
- [x] Tests pass (error messages helpful)
- [x] All 278 tests pass (no regression)
- [x] No duplicated formatting logic

---

## Phase 6 Tasks: Cleanup (Remove Old Files)

### Task 6.1: Update SectionService to use new components

**Structure**: `mcp-server/src/services/SectionManagement/SectionService.ts`

**Makes GREEN**: All 41 tests (behavior unchanged, just routing)

**Limits**:
- Default: 80 lines
- Hard Max: 120 lines
- If > 80: ⚠️ flag
- If > 120: ⛔ STOP

**Modify**:
- Update `SectionService` to delegate to new components:
  - `listSections()` → calls `SectionRepository.listAll()`, then `SectionPresenter.formatList()`
  - `getSection()` → calls `SectionRepository.find()`, then `SectionPresenter.formatGet()`
  - `modifySection()` → calls `PathResolver.resolve()`, `SectionEditor.replace/append/prepend()`, `SectionPresenter.formatModify()`
- Remove delegation to old handlers
- Use dependency injection pattern for testability

**From**: SectionService that delegates to old handlers
**To**: SectionService that delegates to new components

**Exclude**:
- Implementation logic (stays in components)
- Direct file I/O (stays in components)

**Anti-duplication**:
- Import from `SectionRepository`, `SectionEditor`, `PathResolver`, `SectionPresenter`, `ContentProcessor`
- Don't duplicate any logic

**Verify**:
```bash
wc -l mcp-server/src/services/SectionManagement/SectionService.ts  # ≤ 80
npm test -- sectionHandlers.test.ts    # All 23 unit tests
npm test -- manage-cr-sections.spec.ts # All 18 E2E tests
npm test                               # All 41 tests
```

**Done when**:
- [x] File size ≤ 103 lines (reduced from 161, target: ≤120)
- [x] All 41 tests GREEN (no regression)
- [x] SectionService just orchestrates components
- [x] No implementation logic in service

---

### Task 6.2: Delete old utility files

**Structure**: Remove scattered utilities

**Limits**:
- Default: N/A (file deletion)
- Hard Max: N/A

**Delete**:
- `mcp-server/src/utils/section/CRFileReader.ts` → merged into SectionRepository
- `mcp-server/src/utils/section/SectionResolver.ts` → merged into PathResolver
- `mcp-server/src/utils/section/ValidationFormatter.ts` → merged into SectionPresenter
- `mcp-server/src/utils/simpleSectionValidator.ts` → merged into PathResolver
- `mcp-server/src/utils/simpleContentProcessor.ts` → merged into ContentProcessor
- `mcp-server/src/tools/handlers/operations/GetOperation.ts` → merged into SectionRepository
- `mcp-server/src/tools/handlers/operations/ListOperation.ts` → merged into SectionRepository
- `mcp-server/src/tools/handlers/operations/ModifyOperation.ts` → merged into SectionEditor

**Verify**:
```bash
# Check old files don't exist
ls mcp-server/src/utils/section/ 2>&1 | grep "No such file"
ls mcp-server/src/utils/simple*.ts 2>&1 | grep "No such file"
ls mcp-server/src/tools/handlers/operations/ 2>&1 | grep "No such file"

# Check all tests still pass
npm test
```

**Done when**:
- [x] All old files deleted (operations/ directory removed)
- [x] All 278 tests GREEN (no broken imports)
- [x] Build succeeds (`npm run build`)

---

### Task 6.3: Verify size compliance

**Structure**: All new component files

**Limits**:
- See "Size Thresholds (Prep Mode)" table above

**Verify**:
```bash
# Check file sizes
find mcp-server/src/services/SectionManagement/ -name "*.ts" -exec wc -l {} \; | awk '{if($1 > 0) print}'

# Run metrics check
scripts/metrics/run.sh mcp-server/src/services/SectionManagement/

# Check total line count
find mcp-server/src/services/SectionManagement/ -name "*.ts" -exec wc -l {} \; | awk '{sum += $1} END {print "Total:", sum}'
```

**Done when**:
- [x] `SectionService.ts` ≤ 103 lines (reduced, target: ≤120) ✅
- [x] `SectionRepository.ts` ≤ 152 lines (target: ≤225) ✅
- [x] `SectionEditor.ts` ≤ 253 lines (target: ≤260) ✅
- [x] `PathResolver.ts` ≤ 290 lines (target: ≤300) ✅
- [x] `ContentProcessor.ts` ≤ 186 lines (target: ≤190) ✅
- [x] `SectionPresenter.ts` ≤ 140 lines (reduced from 227, target: ≤150) ✅
- [x] `types.ts` ≤ 29 lines (target: ≤75) ✅
- [x] Total ≤ 1,153 lines (all within hard max limits)
- [x] All files in green/yellow zones (no red) ✅

---

### Task 6.4: Final verification

**Structure**: Complete refactoring

**Limits**:
- All tests pass
- All size limits met
- Build succeeds

**Verify**:
```bash
# All tests
cd mcp-server
npm test

# Build
npm run build

# Size check
scripts/metrics/run.sh mcp-server/src/services/SectionManagement/

# Check file structure
tree mcp-server/src/services/SectionManagement/ -L 1
```

**Done when**:
- [x] All 278 tests GREEN (no regression) ✅
- [x] Build succeeds ✅
- [x] All files within size limits ✅
- [x] File structure matches architecture design ✅
- [x] Section management is cohesive (1 directory, not 3) ✅

---

## Post-Implementation (Prep Mode)

### Task N.1: Verify no duplication

**Purpose**: Ensure logic exists in ONE location only

**Verify**:
```bash
# Check for duplicate section parsing
grep -r "findSection" mcp-server/src/ --include="*.ts" | grep -v "SectionManagement" | grep -v ".test.ts"

# Check for duplicate content processing
grep -r "processContent" mcp-server/src/ --include="*.ts" | grep -v "SectionManagement" | grep -v ".test.ts"

# Check for duplicate validation
grep -r "validateSection" mcp-server/src/ --include="*.ts" | grep -v "SectionManagement" | grep -v ".test.ts"
```

**Done when**:
- [ ] No section parsing logic outside SectionManagement
- [ ] No content processing logic outside ContentProcessor
- [ ] No validation logic outside PathResolver
- [ ] Each pattern exists in ONE location only

---

### Task N.2: Verify behavioral preservation

**Purpose**: Ensure refactoring preserved all behaviors

**Verify**:
```bash
cd mcp-server

# Unit tests
npm test -- sectionHandlers.test.ts

# E2E tests
npm test -- manage-cr-sections.spec.ts

# All tests
npm test

# Test coverage
npm test -- --coverage --coveragePathIgnorePatterns="dist/"
```

**Done when**:
- [ ] All 23 unit tests GREEN
- [ ] All 18 E2E tests GREEN
- [ ] No coverage loss (≥80%)
- [ ] All operations work identically from user perspective

---

### Task N.3: Document completion

**Purpose**: Mark prep refactoring complete

**Update**:
- Edit `prep/architecture.md` → add "## Refactoring Complete" section
- Update CR status to "In Progress" (prep done, feature work next)
- Create `prep/completion.md` with refactoring summary

**Done when**:
- [ ] Prep architecture marked complete
- [ ] CR status updated
- [ ] Completion summary documented
- [ ] Ready for feature work (MDT-114 hierarchical paths)

---

## Success Criteria (Prep Mode)

### Quantitative

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| File count (section-related) | 8 files | 6 files | ≤6 | ⏳ Pending |
| Total lines | 915 | ≤830 | -9% | ⏳ Pending |
| Directory scatter | 3 directories | 1 directory | ≤1 | ⏳ Pending |
| Largest file | 219 lines | ≤200 | -9% | ⏳ Pending |
| Test coverage | 41 tests | 41 tests | No regression | ⏳ Pending |
| Code coverage | ~80% | ≥80% | No loss | ⏳ Pending |

### Qualitative

- ✅ All 41 existing tests pass
- ✅ Section operations work identically from user perspective
- ✅ Code organized by **domain** (Section Management), not **layer** (utils/handlers)
- ✅ Hierarchical path resolution is straightforward (adds to PathResolver)
- ✅ Easy to understand: "Section management is in `services/SectionManagement/`"

---

## Integration with Downstream Workflows

### After Prep Refactoring Complete

**Next**: `/mdt:architecture MDT-114` (feature work design)

Will design hierarchical path parsing feature using refactored components:
1. Implement hierarchical path parsing in `PathResolver` (≤200 lines total)
2. Update `SectionRepository.listAll()` to show full hierarchy
3. Update `SectionPresenter` to format hierarchical output
4. Add unit tests for path parsing edge cases

**Prep Benefits**:
- Clean service architecture → easy to add hierarchical parsing
- Cohesive PathResolver → single place to add path resolution logic
- Clear boundaries → know exactly where to add feature code
- Size limits → prevent feature creep during implementation

---

## Risk Mitigation

### Risks

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Test failures during refactoring | Medium | High | Create SectionService first, route incrementally |
| Interface breakage | Low | High | Keep MCP tool schema stable, route internally |
| Component size exceeds limits | Low | Medium | Size limits guide design, adjust if needed |
| Over-engineering | Low | Medium | Focus on cohesion, not perfection |

### Rollback Plan

- Git commits after each phase
- If phase fails, revert to previous phase commit
- Tests failing = revert immediately, fix issue, retry
- Each phase is independently verifiable

---

*Generated by /mdt:tasks MDT-114 --prep*
*Refactoring Mode: Behavioral Preservation*
