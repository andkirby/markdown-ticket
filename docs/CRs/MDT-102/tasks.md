# Tasks: MDT-102

**Source**: [MDT-102](./MDT-102-consolidate-file-io-operations.md)
**Mode**: Refactoring (Behavioral Preservation)
**Tests**: `tests.md`
**Generated**: 2024-12-24

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `mcp-server/src`, `shared/src` |
| Test command | `npm test --workspace=mcp-server` |
| E2E Test command | `npm run test:e2e --workspace=mcp-server` |
| Build command | `npm run build:shared && npm run build:mcp` |
| File extension | `.ts` |

## Size Thresholds

| Module | Default | Hard Max | Action |
|--------|---------|----------|--------|
| `MarkdownService.ts` (new methods) | 30 | 45 | Flag at 30+, STOP at 45+ |
| `crHandlers.ts` (refactored) | 423 | 635 | Target: reduce from ~453 |
| `sectionHandlers.ts` (refactored) | 412 | 620 | Target: reduce from ~435 |

*(From Architecture Design)*

## Shared Patterns

| Pattern | Extract To | Used By |
|---------|------------|---------|
| File content reading | `MarkdownService.readFile()` | crHandlers, sectionHandlers |
| File content writing | `MarkdownService.writeFile()` | sectionHandlers |
| Error handling for file ops | `MarkdownService` (propagates) | All handlers |

> **Step 1 extracts these BEFORE refactoring handlers that use them.**

## Architecture Structure

```
shared/services/
  └── MarkdownService.ts           → Add readFile(), writeFile() methods
      ├── readFile(path)           → NEW: fs.readFile wrapper
      ├── writeFile(path, content) → NEW: fs.writeFile wrapper
      ├── parseMarkdownFile()      → EXISTING (uses fs.readFileSync)
      ├── writeMarkdownFile()      → EXISTING (uses fs.writeFileSync)
      └── ... (other methods)

mcp-server/src/tools/handlers/
  ├── crHandlers.ts                → REFACTOR: Remove fs.readFile calls
  └── sectionHandlers.ts           → REFACTOR: Remove fs.readFile/writeFile calls

mcp-server/src/tools/handlers/__tests__/
  ├── crHandlers.test.ts           → BEHAVIORAL TESTS (52 tests PASS baseline)
  └── sectionHandlers.test.ts      → BEHAVIORAL TESTS (baseline established)
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Tests fail after refactoring → STOP, behavioral preservation broken
- Adding direct fs calls to handlers → STOP, use MarkdownService instead

## Test Coverage (from tests.md)

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `crHandlers.test > fs/promises, path, glob imports` | P1-1 | Task 2.1, 2.2 | 🔴 PASS → verify removal |
| `crHandlers.test > findTicketFilePath function defined` | P1-1 | Task 3.1 | 🔴 PASS → verify removal |
| `crHandlers.test > fs.readFile in attributes mode` | P1-2 | Task 2.2 | 🔴 PASS (baseline) |
| `crHandlers.test > findTicketFilePath in metadata mode` | P1-1 | Task 3.1 | 🔴 PASS (baseline) |
| `crHandlers.test > format file path in response` | P1-6 | Task 3.1 | 🔴 PASS (baseline) |
| `crHandlers.test > throw ToolError when file not found` | P1-5 | Task 2.2, 3.1 | 🔴 PASS (baseline) |
| `sectionHandlers.test > fs/promises, path, glob imports` | P1-1 | Task 2.1, 2.2 | 🔴 PASS → verify removal |
| `sectionHandlers.test > fs.readFile to read file content` | P1-3 | Task 2.2 | 🔴 PASS (baseline) |
| `sectionHandlers.test > fs.readFile and fs.writeFile in modifySection` | P1-3, P1-4 | Task 2.2 | 🔴 PASS (baseline) |
| `sectionHandlers.test > extract YAML frontmatter using regex` | P1-6 | Task 2.2 | 🔴 PASS (baseline) |
| `sectionHandlers.test > throw ToolError when file not found` | P1-5 | Task 2.2, 3.1 | 🔴 PASS (baseline) |

**TDD Goal**: All tests GREEN before and after refactoring (behavioral preservation)

---

## TDD Verification

Before starting each task:
```bash
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Should show 52 PASS (baseline established)
```

After completing each task:
```bash
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Tests should still PASS (behavior preserved)
npm test
# Full suite — no regressions
```

---

## MDT-102 Tasks

### Task 1.1: Add `MarkdownService.readFile()` static method

**Structure**: `shared/services/MarkdownService.ts`

**Implements**: P1-2, P1-3 (enables removal of fs.readFile from handlers)

**Makes GREEN**: (enables subsequent tasks to preserve behavior)
- `crHandlers.test.ts`: `fs.readFile in attributes mode` (P1-2)
- `crHandlers.test.ts`: `throw ToolError when file not found` (P1-5)
- `sectionHandlers.test.ts`: `fs.readFile to read file content` (P1-3)
- `sectionHandlers.test.ts`: `fs.readFile in modifySection` (P1-3)

**Limits**:
- Default: 30 lines
- Hard Max: 45 lines
- If > 30: ⚠️ flag
- If > 45: ⛔ STOP

**Create**:
```typescript
/**
 * Read file content asynchronously
 * @param filePath - Absolute path to file
 * @returns File content as string
 * @throws Error with context (path, operation) if fs fails
 */
static async readFile(filePath: string): Promise<string> {
  try {
    const fs = await import('fs/promises');
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
  }
}
```

**Exclude**:
- Synchronous file reading (existing `parseMarkdownFile()` uses fs.readFileSync - do NOT change)
- File writing (Task 1.2)
- Path resolution logic (Task 1.3)

**Anti-duplication**:
- This IS the source method — handlers will import from here
- Do NOT copy fs.readFile logic into handlers

**Verify**:
```bash
# Check method size
grep -A 15 "static async readFile" shared/services/MarkdownService.ts | wc -l
# Should be ≤ 30 lines

# Build shared code
npm run build:shared
```

**Done when**:
- [ ] Method added to `MarkdownService.ts`
- [ ] Size ≤ 30 lines
- [ ] Builds successfully
- [ ] Exports static async `readFile(filePath: string): Promise<string>`

---

### Task 1.2: Add `MarkdownService.writeFile()` static method

**Structure**: `shared/services/MarkdownService.ts`

**Implements**: P1-4 (enables removal of fs.writeFile from handlers)

**Makes GREEN**: (enables subsequent tasks to preserve behavior)
- `sectionHandlers.test.ts`: `fs.writeFile in modifySection` (P1-4)

**Limits**:
- Default: 30 lines
- Hard Max: 45 lines
- If > 30: ⚠️ flag
- If > 45: ⛔ STOP

**Create**:
```typescript
/**
 * Write file content asynchronously
 * @param filePath - Absolute path to file
 * @param content - Content to write
 * @throws Error with context (path, operation) if fs fails
 */
static async writeFile(filePath: string, content: string): Promise<void> {
  try {
    const fs = await import('fs/promises');
    await fs.writeFile(filePath, content, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to write file ${filePath}: ${(error as Error).message}`);
  }
}
```

**Exclude**:
- Synchronous file writing (existing `writeMarkdownFile()` uses fs.writeFileSync - do NOT change)
- File reading (Task 1.1)
- Directory creation logic (out of scope)

**Anti-duplication**:
- This IS the source method — handlers will import from here
- Do NOT copy fs.writeFile logic into handlers

**Verify**:
```bash
# Check method size
grep -A 15 "static async writeFile" shared/services/MarkdownService.ts | wc -l
# Should be ≤ 30 lines

# Build shared code
npm run build:shared
```

**Done when**:
- [ ] Method added to `MarkdownService.ts`
- [ ] Size ≤ 30 lines
- [ ] Builds successfully
- [ ] Exports static async `writeFile(filePath: string, content: string): Promise<void>`

---

### Task 1.3: Make `TicketService.getCRPath()` public

**Structure**: `shared/services/TicketService.ts`

**Implements**: P1-1 (enables removal of duplicated findTicketFilePath from handlers)

**Makes GREEN**: (enables subsequent tasks to preserve behavior)
- `crHandlers.test.ts`: `findTicketFilePath function defined` (P1-1)
- `crHandlers.test.ts`: `findTicketFilePath in metadata mode` (P1-1)
- `crHandlers.test.ts`: `format file path in response` (P1-6)
- `sectionHandlers.test.ts`: `findTicketFilePath calls` (P1-1)

**Limits**:
- No size limit (visibility change only)
- No code logic changes

**Modify**:
- Change `getCRPath()` from `private` to `public`
- Ensure method signature remains unchanged

**Exclude**:
- Do NOT modify method logic
- Do NOT change parameters or return type
- Do NOT add new methods

**Anti-duplication**:
- This method replaces duplicated `findTicketFilePath` functions in handlers
- Handlers will call `TicketService.getCRPath()` instead of local implementation

**Verify**:
```bash
# Verify method is public
grep -A 5 "getCRPath" shared/services/TicketService.ts | grep "public"
# Should find "public static getCRPath"

# Build shared code
npm run build:shared
```

**Done when**:
- [ ] Method is `public` (no longer private)
- [ ] Method signature unchanged
- [ ] Builds successfully

---

### Task 2.1: Remove `findTicketFilePath` from handlers

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`, `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Implements**: P1-1

**Makes GREEN**:
- `crHandlers.test.ts`: `should have findTicketFilePath function defined` (P1-1) — verify removal
- `crHandlers.test.ts`: `fs/promises, path, glob imports` (P1-1) — verify import removal
- `sectionHandlers.test.ts`: `should have findTicketFilePath function defined` (P1-1) — verify removal
- `sectionHandlers.test.ts`: `fs/promises, path, glob imports` (P1-1) — verify import removal

**Limits**:
- Target: Reduce crHandlers.ts from ~453 to ≤423 lines
- Target: Reduce sectionHandlers.ts from ~435 to ≤412 lines
- Hard Max: 635 lines (crHandlers), 620 lines (sectionHandlers)

**From**: `crHandlers.ts:32`, `sectionHandlers.ts:22`
**To**: Use `TicketService.getCRPath()` (Task 1.3)

**Remove**:
- `findTicketFilePath` function from both handler files
- `import('glob')` statements (no longer needed)
- Any unused `import('path')` helper functions

**Replace**:
```typescript
// Before:
const filePath = await findTicketFilePath(projectKey, crKey, this.projectsPath);

// After:
const filePath = TicketService.getCRPath(project, crKey);
```

**Exclude**:
- Do NOT remove `import('path')` if still used for other purposes
- Do NOT modify `getCR` or other handler methods yet (Task 2.2)

**Anti-duplication**:
- Import `getCRPath` from `@mdt/shared/services/TicketService`
- Do NOT copy path resolution logic into handlers

**Verify**:
```bash
# Verify findTicketFilePath is removed
grep -r "findTicketFilePath" mcp-server/src/tools/handlers/
# Expected: No results

# Verify glob import is removed (if no longer used)
grep "import.*glob" mcp-server/src/tools/handlers/
# Expected: No results (or only in files that still use glob)

# Run tests
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Expected: All tests PASS
```

**Done when**:
- [ ] `findTicketFilePath` function removed from both handlers
- [ ] Unused `glob` imports removed
- [ ] All tests still PASS (behavior preserved)
- [ ] Handler size within limits

---

### Task 2.2: Replace `fs.readFile` with `MarkdownService.readFile()`

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`, `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Implements**: P1-2, P1-3

**Makes GREEN**:
- `crHandlers.test.ts`: `fs.readFile in attributes mode` (P1-2)
- `crHandlers.test.ts`: `throw ToolError when file not found` (P1-5)
- `sectionHandlers.test.ts`: `fs.readFile to read file content` (P1-3)
- `sectionHandlers.test.ts`: `fs.readFile in modifySection` (P1-3)
- `sectionHandlers.test.ts`: `extract YAML frontmatter using regex` (P1-6)

**Limits**:
- Target: Reduce handler file sizes through delegation
- Hard Max: 635 lines (crHandlers), 620 lines (sectionHandlers)

**From**: `crHandlers.ts:102`, `sectionHandlers.ts:103,170,232`
**To**: Use `MarkdownService.readFile()` (Task 1.1)

**Replace**:
```typescript
// Before:
const fs = await import('fs/promises');
const fileContent = await fs.readFile(filePath, 'utf-8');

// After:
const fileContent = await MarkdownService.readFile(filePath);
```

**Note**: Use static method `MarkdownService.readFile()`, NOT `this.markdownService.readFile()`. The handlers have `markdownService` as a type reference only, not an actual instance. MarkdownService uses static methods (see `parseMarkdownFile`, `writeMarkdownFile`).

**Locations to update**:
- `crHandlers.ts`: `handleGetCR` method (attributes mode)
- `sectionHandlers.ts`: `handleListSections` method
- `sectionHandlers.ts`: `handleGetSection` method
- `sectionHandlers.ts`: `handleModifySection` method

**Exclude**:
- Do NOT modify `fs.writeFile` yet (Task 2.3)
- Do NOT remove fs imports if still needed for writeFile

**Anti-duplication**:
- Import `readFile` from `@mdt/shared/services/MarkdownService`
- Do NOT copy file reading logic into handlers

**Verify**:
```bash
# Verify fs.readFile is replaced (but fs.writeFile may still exist)
grep -r "fs\.readFile" mcp-server/src/tools/handlers/
# Expected: No results

# Run tests
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Expected: All tests PASS
```

**Done when**:
- [ ] All `fs.readFile` calls replaced with `MarkdownService.readFile()`
- [ ] All tests still PASS (behavior preserved)
- [ ] Error handling preserved (ToolError thrown for file not found)

---

### Task 2.3: Replace `fs.writeFile` with `MarkdownService.writeFile()`

**Structure**: `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Implements**: P1-4

**Makes GREEN**:
- `sectionHandlers.test.ts`: `fs.writeFile in modifySection` (P1-4)
- `sectionHandlers.test.ts`: `update lastModified timestamp in YAML` (P1-6)

**Limits**:
- Target: Reduce sectionHandlers.ts from ~435 to ≤412 lines
- Hard Max: 620 lines

**From**: `sectionHandlers.ts:376`
**To**: Use `MarkdownService.writeFile()` (Task 1.2)

**Replace**:
```typescript
// Before:
const fs = await import('fs/promises');
await fs.writeFile(filePath, updatedContent, 'utf-8');

// After:
await MarkdownService.writeFile(filePath, updatedContent);
```

**Exclude**:
- Do NOT modify fs.readFile calls (already done in Task 2.2)

**Anti-duplication**:
- Import `writeFile` from `@mdt/shared/services/MarkdownService`
- Do NOT copy file writing logic into handlers

**Verify**:
```bash
# Verify fs.writeFile is replaced
grep -r "fs\.writeFile" mcp-server/src/tools/handlers/
# Expected: No results

# Run tests
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Expected: All tests PASS
```

**Done when**:
- [ ] All `fs.writeFile` calls replaced with `MarkdownService.writeFile()`
- [ ] All tests still PASS (behavior preserved)

---

### Task 2.4: Remove unused `fs/promises` imports

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`, `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Implements**: P1-1, P1-2, P1-3, P1-4 (cleanup)

**Makes GREEN**:
- `crHandlers.test.ts`: `should have fs/promises, path, and glob imports` (P1-1) — verify removal
- `sectionHandlers.test.ts`: `should have fs/promises, path, and glob imports` (P1-1) — verify removal

**Limits**:
- No size limit (import removal only)

**Remove**:
- `import('fs/promises')` statements from both handler files (no longer needed after Tasks 2.2 and 2.3)

**Exclude**:
- Do NOT remove imports that are still used
- Do NOT remove `import('path')` if still used for other purposes

**Anti-duplication**:
- Verify no fs operations remain before removing imports

**Verify**:
```bash
# Verify NO fs operations remain
grep -r "fs\.readFile\|fs\.writeFile" mcp-server/src/tools/handlers/
# Expected: No results

# Verify fs/promises import removed (if no longer used)
grep "import.*fs/promises" mcp-server/src/tools/handlers/
# Expected: No results (or only in files that still use fs)

# Run tests
cd mcp-server && npm test -- src/tools/handlers/__tests__/
# Expected: All tests PASS
```

**Done when**:
- [ ] Unused `fs/promises` imports removed
- [ ] No direct fs operations remain in handlers
- [ ] All tests still PASS

---

## Post-Implementation

### Task 3.1: Verify no duplicated file I/O logic

```bash
# Verify no findTicketFilePath functions remain
grep -r "findTicketFilePath" mcp-server/src/tools/handlers/
# Expected: No results

# Verify no direct fs operations
grep -r "fs\.readFile\|fs\.writeFile" mcp-server/src/tools/handlers/
# Expected: No results

# Verify shared service methods exist and are being used
grep -q "readFile\|writeFile" shared/services/MarkdownService.ts
# Expected: Found

grep -q "MarkdownService\.readFile\|MarkdownService\.writeFile" mcp-server/src/tools/handlers/*.ts
# Expected: Found

# Verify getCRPath is being used
grep -q "TicketService\.getCRPath" mcp-server/src/tools/handlers/*.ts
# Expected: Found
```

**Done when**:
- [ ] No `findTicketFilePath` functions in handlers
- [ ] No direct `fs.readFile` or `fs.writeFile` in handlers
- [ ] Handlers use `MarkdownService.readFile()` and `writeFile()`
- [ ] Handlers use `TicketService.getCRPath()`

### Task 3.2: Verify size compliance

```bash
# Check handler file sizes
wc -l mcp-server/src/tools/handlers/crHandlers.ts
# Expected: ≤ 423 lines

wc -l mcp-server/src/tools/handlers/sectionHandlers.ts
# Expected: ≤ 412 lines

# Check new MarkdownService methods size
grep -A 15 "static async readFile" shared/services/MarkdownService.ts | wc -l
# Expected: ≤ 30 lines

grep -A 15 "static async writeFile" shared/services/MarkdownService.ts | wc -l
# Expected: ≤ 30 lines
```

**Done when**:
- [ ] All files within size limits
- [ ] No files exceed hard max

### Task 3.3: Run handler behavioral tests

```bash
cd mcp-server && npm test -- src/tools/handlers/__tests__/
```

**Done when**:
- [ ] All 52 behavioral tests PASS (behavior preserved)

### Task 3.4: Run MCP server e2e tests

```bash
npm run test:e2e --workspace=mcp-server
```

**Done when**:
- [ ] All 213 e2e tests PASS
- [ ] No regressions in MCP tool behavior

### Task 3.5: Build and verify

```bash
# Build all workspaces
npm run build:all
```

**Done when**:
- [ ] All workspaces build successfully
- [ ] No TypeScript errors

---

## Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 10 |
| Tests to make GREEN | 52 behavioral + 213 e2e |
| Target size reduction | ~45 lines (crHandlers) + ~23 lines (sectionHandlers) |
| New shared methods | 2 (MarkdownService.readFile, writeFile) |

**Output**: `docs/CRs/MDT-102/tasks.md`
**Tests**: `docs/CRs/MDT-102/tests.md`

**Next**: `/mdt:implement MDT-102`

**Key Points**:
1. Tests are already PASS (baseline established) — verify they still pass after each task
2. This is behavioral preservation refactoring — no interface changes
3. Size thresholds guide when to subdivide work
4. Extension rule: Add file I/O to MarkdownService, never to handlers
5. **Important**: Use `MarkdownService.readFile()` (static method), NOT `this.markdownService.readFile()`. The architecture.md shows `this.markdownService.readFile()` but MarkdownService uses static methods and handlers have `markdownService` as a type reference only, not an instance.
