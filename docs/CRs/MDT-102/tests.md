# Tests: MDT-102 - Consolidate File I/O Operations to Shared Services

**Mode**: Refactoring (Behavioral Preservation)
**Source**: architecture.md + Code analysis
**Generated**: 2024-12-24
**Updated**: 2024-12-24
**Status**: ✅ BASELINE ESTABLISHED (52 tests passing)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test Directory | `mcp-server/src/tools/handlers/__tests__/` |
| Test Command | `npm test --workspace=mcp-server` |
| E2E Test Command | `npm run test:e2e --workspace=mcp-server` |
| Status | ✅ 52/52 PASS (baseline locked) |

## Mode Detection

**Mode**: Refactoring (Behavioral Preservation)

Since this is a technical debt refactoring CR without a separate `requirements.md`, tests are generated from:
1. Analysis of current handler behavior in `crHandlers.ts` and `sectionHandlers.ts`
2. Architecture document `architecture.md`
3. Existing MCP e2e tests (213 tests)

These tests **lock current behavior** before refactoring to ensure the consolidation of file I/O into shared services preserves all existing functionality.

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| P1-1 | Remove duplicated `findTicketFilePath` function | `crHandlers.test.ts`, `sectionHandlers.test.ts` | 6 | ✅ PASS |
| P1-2 | Replace `fs.readFile` in `crHandlers.ts` | `crHandlers.test.ts` | 3 | ✅ PASS |
| P1-3 | Replace `fs.readFile` in `sectionHandlers.ts` | `sectionHandlers.test.ts` | 3 | ✅ PASS |
| P1-4 | Replace `fs.writeFile` in `sectionHandlers.ts` | `sectionHandlers.test.ts` | 2 | ✅ PASS |
| P1-5 | Preserve error handling for file operations | Both | 4 | ✅ PASS |
| P1-6 | Preserve MCP tool response formats | Both | 3 | ✅ PASS |

## Test Specifications

### Feature: File I/O Behavioral Preservation

**File**: `mcp-server/src/tools/handlers/__tests__/crHandlers.test.ts`
**Covers**: P1-1, P1-2, P1-5, P1-6

#### Scenario: crHandlers_current_imports (P1-1)

```gherkin
Given the crHandlers.ts file exists
When reading the file
Then it should import fs/promises
And it should import path
And it should import glob
```

**Test**: `describe('Current implementation details') > it('should have fs/promises, path, and glob imports')`

**Purpose**: Documents that fs/promises import will be removed after refactoring.

---

#### Scenario: crHandlers_findTicketFilePath_exists (P1-1)

```gherkin
Given the crHandlers.ts file
When analyzing the code
Then findTicketFilePath function should be defined
And it should use path.join for pattern construction
And it should use glob with absolute: true
```

**Test**: `describe('Current implementation details') > it('should have findTicketFilePath function defined')`

**Purpose**: Documents duplicated path resolution logic that will be removed.

---

#### Scenario: crHandlers_attributes_mode_uses_fs (P1-2)

```gherkin
Given handleGetCR with mode='attributes'
When the function is called
Then it should call findTicketFilePath
And it should call fs.readFile to get file content
And it should extract YAML frontmatter using regex
```

**Test**: `describe('File I/O in handleGetCR') > it('should use fs.readFile in attributes mode')`

**Purpose**: After refactoring, fs.readFile will be replaced with MarkdownService.readFile().

---

#### Scenario: crHandlers_metadata_mode_includes_filePath (P1-6)

```gherkin
Given handleGetCR with mode='metadata'
When the function is called
Then it should call findTicketFilePath
And it should return metadata object with filePath field
```

**Test**: `describe('File I/O in handleGetCR') > it('should use findTicketFilePath in metadata mode')`

**Purpose**: Response format must be preserved - filePath must be included in metadata.

---

#### Scenario: crHandlers_createCR_includes_filePath (P1-6)

```gherkin
Given handleCreateCR successfully creates a CR
When the response is formatted
Then it should include "**File Created:** {filePath}"
And the filePath should come from findTicketFilePath
```

**Test**: `describe('File I/O in handleCreateCR') > it('should format file path in response')`

**Purpose**: Response format must be preserved after refactoring.

---

#### Scenario: crHandlers_error_handling (P1-5)

```gherkin
Given findTicketFilePath is called
When glob returns empty array (file not found)
Then it should throw ToolError.toolExecution
And error message should contain CR code
And error message should contain CR path
```

**Test**: `describe('Error handling') > it('should throw ToolError when file not found')`

**Purpose**: Error format must be preserved after refactoring.

---

### Feature: Section Handlers File I/O Preservation

**File**: `mcp-server/src/tools/handlers/__tests__/sectionHandlers.test.ts`
**Covers**: P1-1, P1-3, P1-4, P1-5, P1-6

#### Scenario: sectionHandlers_current_imports (P1-1)

```gherkin
Given the sectionHandlers.ts file exists
When reading the file
Then it should import fs/promises
And it should import path
And it should import glob
```

**Test**: `describe('Current implementation details') > it('should have fs/promises, path, and glob imports')`

**Purpose**: Documents that fs/promises import will be removed after refactoring.

---

#### Scenario: sectionHandlers_listSections_reads_file (P1-3)

```gherkin
Given handleListSections is called
When the handler executes
Then it should call findTicketFilePath
And it should call fs.readFile to get file content
And it should extract YAML frontmatter using regex
```

**Test**: `describe('File I/O in handleListSections') > it('should use fs.readFile to read file content')`

**Purpose**: After refactoring, fs.readFile will be replaced with MarkdownService.readFile().

---

#### Scenario: sectionHandlers_getSection_reads_file (P1-3)

```gherkin
Given handleGetSection is called
When the handler executes
Then it should call findTicketFilePath
And it should call fs.readFile to get file content
```

**Test**: `describe('File I/O in handleGetSection') > it('should use fs.readFile to read file content')`

**Purpose**: After refactoring, fs.readFile will be replaced with MarkdownService.readFile().

---

#### Scenario: sectionHandlers_modifySection_reads_and_writes (P1-3, P1-4)

```gherkin
Given handleModifySection is called
When the handler executes
Then it should call fs.readFile to read current content
And it should process the section modification
And it should call fs.writeFile to write updated content
And it should update lastModified timestamp in YAML
```

**Test**: `describe('File I/O in handleModifySection')` - multiple tests

**Purpose**: After refactoring, fs operations will use MarkdownService methods.

---

#### Scenario: sectionHandlers_yaml_extraction (P1-6)

```gherkin
Given any section handler that reads file content
When the file is read
Then YAML frontmatter should be extracted using regex
And pattern should be: /^---\n([\s\S]*?)\n---\n([\s\S]*)$/
```

**Test**: `describe('File I/O in handleListSections') > it('should extract YAML frontmatter using regex')`

**Purpose**: YAML extraction logic must be preserved.

---

#### Scenario: sectionHandlers_error_handling (P1-5)

```gherkin
Given findTicketFilePath is called
When glob returns empty array (file not found)
Then it should throw ToolError.toolExecution
And error message should contain CR code and path
```

**Test**: `describe('Error handling') > it('should throw ToolError when file not found')`

**Purpose**: Error format must be preserved after refactoring.

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| File not found | ToolError with CR code and path | `crHandlers.test.ts` | P1-5 |
| Invalid YAML format | "Invalid CR file format" error | `sectionHandlers.test.ts` | P1-5 |
| Empty files list from glob | ToolError.toolExecution | Both | P1-5 |
| Multiple section matches | Error with hierarchical paths | `sectionHandlers.test.ts` | P1-6 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `mcp-server/src/tools/handlers/__tests__/crHandlers.test.ts` | 30 | ~450 | ✅ PASS |
| `mcp-server/src/tools/handlers/__tests__/sectionHandlers.test.ts` | 22 | ~500 | ✅ PASS |

## Verification

Run all tests (currently passing - baseline established):

```bash
# Run handler behavioral preservation tests
cd mcp-server && npm test -- src/tools/handlers/__tests__/

# Run all MCP server unit tests
cd mcp-server && npm test

# Run MCP server e2e tests (213 Jest tests)
npm run test:e2e --workspace=mcp-server
```

Expected: **0 failed** (behavioral tests should PASS initially - they document current state)

After refactoring: All tests should still **PASS** (behavior preserved)

## Coverage Checklist

- [x] All file I/O operations documented
- [x] Error scenarios covered
- [x] Response formats documented
- [x] Duplicated functions identified
- [x] Behavioral contracts defined
- [ ] Implementation complete (awaiting /mdt:tasks)

---

## For Implementation

Each task in `/mdt:tasks` should reference which tests verify the refactoring:

| Task | Preserves Behavior |
|------|-------------------|
| Add `MarkdownService.readFile()` method | Enables removing fs.readFile calls |
| Add `MarkdownService.writeFile()` method | Enables removing fs.writeFile calls |
| Make `TicketService.getCRPath()` public | Enables removing findTicketFilePath |
| Refactor `crHandlers.ts` | Passes all crHandlers.test.ts tests |
| Refactor `sectionHandlers.ts` | Passes all sectionHandlers.test.ts tests |
| Remove fs imports | Verify imports no longer present |

After implementation: `grep -r "fs\.readFile\|fs\.writeFile" mcp-server/src/tools/handlers/` should return no results.

---

## Pre-Refactoring Baseline

### File Sizes

| File | Lines (Baseline) |
|------|------------------|
| `crHandlers.ts` | ~453 |
| `sectionHandlers.ts` | ~435 |
| **Total** | **~888** |

### File I/O Operations Count

| File | fs.readFile | fs.writeFile | Total |
|------|-------------|--------------|-------|
| `crHandlers.ts` | 1 | 0 | 1 |
| `sectionHandlers.ts` | 3 | 1 | 4 |
| **Total** | **4** | **1** | **5** |

### Duplicated Functions

| Function | Location 1 | Location 2 |
|----------|------------|------------|
| `findTicketFilePath` | `crHandlers.ts:32` | `sectionHandlers.ts:22` |

After refactoring, the goal is:
- **Reduce lines** by removing duplicated code and simplifying calls
- **Eliminate** all direct fs operations from handlers
- **Consolidate** path resolution into shared services
