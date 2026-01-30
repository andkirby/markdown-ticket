# Tasks: MDT-090

**Source**: [MDT-090](./MDT-090-investigate-and-refactor-mcp-server-business-logic.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `mcp-server/src/` |
| Test command | `npm test` |
| Build command | `npm run build` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration | 300 | 450 | Flag at 300+, STOP at 450+ |
| Feature | 200-300 | 450 | Flag at limit+, STOP at 450+ |
| Test | 200 | 300 | Flag at 200+, STOP at 300+ |

*(Inherited from Architecture Design)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Service Delegation | Continue using shared services | All 12 MCP tools |
| Input Validation | Schema validation utilities | create_cr, update_cr_attrs |
| Error Formatting | Standardized error response utility | All tools |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
mcp-server/src/
  ├── tools/
  │   ├── index.ts                 → MCPTools class, tool registry, orchestration only (limit: 300 lines)
  │   ├── handlers/                → Individual tool handlers (NEW)
  │   │   ├── projectHandlers.ts   → Project-related tools (limit: 200 lines)
  │   │   ├── crHandlers.ts        → CR operation tools (limit: 300 lines)
  │   │   └── sectionHandlers.ts   → Section management tools (limit: 200 lines)
  │   └── __tests__/               → Test files remain here
  └── tests/
      └── integration/              → Integration tests (NEW)
          ├── mcp-backend-consistency.test.ts
          └── service-delegation.test.ts
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

---

## Phase 1: Investigation and Documentation

> Document findings BEFORE refactoring to understand scope

**Phase goal**: Complete investigation report and identify all duplicated logic
**Phase verify**: Investigation document exists and covers all areas

### Task 1.1: Create investigation report

**Structure**: `docs/CRs/MDT-090/investigation.md`

**Limits**:
- Default: No limit (documentation)
- Hard Max: No limit (documentation)

**From**: Analysis of `mcp-server/src/tools/index.ts`
**To**: `docs/CRs/MDT-090/investigation.md`

**Document**:
- All business logic in MCP server categorized as:
  - MCP-specific (stays in MCP)
  - Already shared (identify usage)
  - Should be in shared (needs extraction)
- Custom YAML parser implementation (lines 1134-1160)
- Title extraction logic (line 524 and related)
- Any response formatting specific to MCP
- Validation rules not in shared services

**Exclude**:
- Protocol-specific JSON-RPC handling
- MCP tool definitions and schemas
- Error messages specifically for LLM consumption

**Anti-duplication**:
- Reference existing shared services instead of describing their implementation
- Link to actual shared service files

**Done when**:
- [ ] Investigation document created
- [ ] All business logic categorized
- [ ] Clear extraction plan outlined
- [ ] Review and feedback received

---

## Phase 2: Extract Handler Functions

> Group related tools into focused handler files

**Phase goal**: All handlers extracted with proper service delegation
**Phase verify**: `npm test` passes, handlers at correct paths

### Task 2.1: Extract project handlers

**Structure**: `mcp-server/src/tools/handlers/projectHandlers.ts`

**Limits**:
- Default: 200 lines
- Hard Max: 450 lines
- If > 200: ⚠️ flag
- If > 450: ⛔ STOP

**From**: `mcp-server/src/tools/index.ts`
**To**: `mcp-server/src/tools/handlers/projectHandlers.ts`

**Move**:
- `list_projects` tool implementation
- `get_project_info` tool implementation
- Related helper functions
- Type definitions specific to project tools

**Exclude**:
- ProjectService instance (will be injected)
- Shared validation logic (goes to Phase 3)
- Error formatting utilities (goes to Phase 3)

**Anti-duplication**:
- Import validation utilities from `utils/validation.ts` (Task 3.1)
- Import error formatting from `utils/error-formatter.ts` (Task 3.2)
- Use ProjectService from shared services — do NOT recreate

**Verify**:
```bash
wc -l mcp-server/src/tools/handlers/projectHandlers.ts  # ≤ 200 (or flag ≤ 450)
npm test
npm run build
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ 200 lines (or flagged if ≤ 450)
- [ ] All project tool logic extracted
- [ ] Tests pass

### Task 2.2: Extract CR handlers

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`

**Limits**:
- Default: 300 lines
- Hard Max: 450 lines
- If > 300: ⚠️ flag
- If > 450: ⛔ STOP

**From**: `mcp-server/src/tools/index.ts`
**To**: `mcp-server/src/tools/handlers/crHandlers.ts`

**Move**:
- `list_crs` tool implementation
- `get_cr` tool implementation
- `create_cr` tool implementation
- `update_cr_status` tool implementation
- `update_cr_attrs` tool implementation
- `delete_cr` tool implementation
- `suggest_cr_improvements` tool implementation

**Exclude**:
- `parseYamlFrontmatter` method (will be deleted)
- CRService instance (will be injected)
- Title extraction logic (will use TitleExtractionService)
- Custom validation (use shared)

**Anti-duplication**:
- Import MarkdownService for YAML parsing — do NOT implement parseYamlFrontmatter
- Import TitleExtractionService for title operations — do NOT implement custom logic
- Import validation utilities from Task 3.1
- Import error formatting from Task 3.2

**Verify**:
```bash
wc -l mcp-server/src/tools/handlers/crHandlers.ts  # ≤ 300 (or flag ≤ 450)
npm test
npm run build
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ 300 lines (or flagged if ≤ 450)
- [ ] No custom YAML parsing
- [ ] Uses TitleExtractionService
- [ ] Tests pass

### Task 2.3: Extract section handlers

**Structure**: `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Limits**:
- Default: 200 lines
- Hard Max: 450 lines
- If > 200: ⚠️ flag
- If > 450: ⛔ STOP

**From**: `mcp-server/src/tools/index.ts`
**To**: `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Move**:
- `manage_cr_sections` tool implementation
- Related section processing logic
- Section validation helpers

**Exclude**:
- MarkdownSectionService instance (will be injected)
- Generic validation utilities
- Error formatting

**Anti-duplication**:
- Import MarkdownSectionService from shared — do NOT duplicate
- Import validation utilities from Task 3.1
- Import error formatting from Task 3.2

**Verify**:
```bash
wc -l mcp-server/src/tools/handlers/sectionHandlers.ts  # ≤ 200 (or flag ≤ 450)
npm test
npm run build
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ 200 lines (or flagged if ≤ 450)
- [ ] Uses shared MarkdownSectionService
- [ ] Tests pass

---

## Phase 3: Extract Shared Utilities

> Extract patterns used by multiple handlers

**Phase goal**: All shared utilities exist and are importable
**Phase verify**: `npm test` passes, utilities importable

### Task 3.1: Extract input validation utilities

**Structure**: `mcp-server/src/utils/validation.ts`

**Limits**:
- Default: 75 lines
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: Individual handler files (from Phase 2)
**To**: `mcp-server/src/utils/validation.ts`

**Move**:
- Common validation patterns (e.g., project key format)
- Schema validation helpers
- Parameter sanitization

**Exclude**:
- Tool-specific validation (stays with tool)
- Business rule validation (in shared services)

**Anti-duplication**:
- This IS the shared validator — handlers will import from here
- Consolidate all similar validation here

**Verify**:
```bash
wc -l mcp-server/src/utils/validation.ts  # ≤ 75 (or flag ≤ 110)
npm test
npm run build
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] All validation logic consolidated
- [ ] Tests pass

### Task 3.2: Extract error formatting utilities

**Structure**: `mcp-server/src/utils/error-formatter.ts`

**Limits**:
- Default: 75 lines
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: Individual handler files (from Phase 2)
**To**: `mcp-server/src/utils/error-formatter.ts`

**Move**:
- Standardized error response formatting
- LLM-friendly error messages
- Error code mapping

**Exclude**:
- Protocol-specific JSON-RPC errors
- System-level errors (handle elsewhere)

**Anti-duplication**:
- This IS the shared error formatter — all handlers import from here
- No duplicated error formatting in handlers

**Verify**:
```bash
wc -l mcp-server/src/utils/error-formatter.ts  # ≤ 75 (or flag ≤ 110)
npm test
npm run build
```

**Done when**:
- [ ] File at correct path
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Consistent error formatting
- [ ] Tests pass

---

## Phase 4: Refactor Main MCPTools Class

> Update main class to use extracted handlers and services

**Phase goal**: MCPTools reduced to orchestration only (≤300 lines)
**Phase verify**: Size limit met, all tools work via delegation

### Task 4.1: Refactor MCPTools constructor and registry

**Structure**: `mcp-server/src/tools/index.ts`

**Limits**:
- Default: 300 lines
- Hard Max: 450 lines
- If > 300: ⚠️ flag
- If > 450: ⛔ STOP

**From**: Existing `mcp-server/src/tools/index.ts`
**To**: Refactored `mcp-server/src/tools/index.ts`

**Keep**:
- Tool registry (getTools method)
- Tool routing logic
- Service injection and handler initialization

**Remove**:
- All handler implementations (moved to Phase 2)
- `parseYamlFrontmatter` method
- Custom validation logic
- Error formatting utilities

**Add**:
- Constructor injection for all services
- Handler instantiation with injected services
- Import statements for handlers

**Exclude**:
- Business logic (delegates to handlers/services)

**Anti-duplication**:
- Import handlers from their respective files
- Import utilities from Phase 3
- Do NOT duplicate any logic

**Verify**:
```bash
wc -l mcp-server/src/tools/index.ts  # ≤ 300 (or flag ≤ 450)
npm test
npm run build
```

**Done when**:
- [ ] File size ≤ 300 lines (or flagged if ≤ 450)
- [ ] No business logic in main file
- [ ] All services injected via constructor
- [ ] Tests pass

---

## Phase 5: Add Comprehensive Test Coverage

> Ensure all refactored components are tested

**Phase goal**: Full test coverage with integration tests
**Phase verify**: All tests pass, coverage acceptable

### Task 5.1: Create integration tests for MCP-backend consistency

**Structure**: `mcp-server/tests/integration/mcp-backend-consistency.test.ts`

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: New test
**To**: `mcp-server/tests/integration/mcp-backend-consistency.test.ts`

**Test**:
- All 12 MCP tools produce identical results to backend endpoints
- Error handling consistency between MCP and backend
- Response format validation

**Exclude**:
- Unit tests (already in __tests__)
- Performance tests (not in scope)

**Anti-duplication**:
- Use existing test utilities from shared
- Reuse test data from backend if available

**Verify**:
```bash
npm test -- mcp-backend-consistency.test.ts
```

**Done when**:
- [ ] Test file created
- [ ] All tools tested for consistency
- [ ] Tests pass

### Task 5.2: Create integration tests for service delegation

**Structure**: `mcp-server/tests/integration/service-delegation.test.ts`

**Limits**:
- Default: 200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: New test
**To**: `mcp-server/tests/integration/service-delegation.test.ts`

**Test**:
- Verify MCP tools delegate to correct shared service methods
- Mock service calls to ensure proper delegation
- Validate no business logic in MCP layer

**Exclude**:
- End-to-end functionality (covered by Task 5.1)
- Service implementation testing (shared services responsibility)

**Anti-duplication**:
- Use jest mocks consistently
- Follow existing test patterns

**Verify**:
```bash
npm test -- service-delegation.test.ts
```

**Done when**:
- [ ] Test file created
- [ ] All delegation verified
- [ ] Tests pass

---

## Post-Implementation

### Task 6.1: Verify no duplication

**Do**: Search for duplicated patterns
```bash
# Find duplicate validation logic
grep -r "validate\|validation" mcp-server/src/ --include="*.ts" | grep -v "utils/validation" | wc -l

# Find duplicate error formatting
grep -r "formatError\|errorResponse" mcp-server/src/ --include="*.ts" | grep -v "utils/error-formatter" | wc -l

# Check for YAML parsing
grep -r "parseYaml\|yaml\.parse" mcp-server/src/ --include="*.ts" | grep -v "node_modules"
```

**Done when**:
- [ ] No duplicate validation logic
- [ ] No duplicate error formatting
- [ ] No custom YAML parsing
- [ ] All duplicated patterns extracted

### Task 6.2: Verify size compliance

**Do**: Check all files
```bash
# Check main file
wc -l mcp-server/src/tools/index.ts

# Check handlers
find mcp-server/src/tools/handlers -name "*.ts" -exec wc -l {} \;

# Check utilities
find mcp-server/src/utils -name "*.ts" -exec wc -l {} \;
```

**Done when**:
- [ ] `tools/index.ts` ≤ 300 lines (or flagged ≤ 450)
- [ ] All handlers ≤ their limits
- [ ] All utilities ≤ 75 lines
- [ ] No files exceed hard max

### Task 6.3: Verify 30% code reduction

**Do**: Check line count reduction
```bash
# Current line count
grep -c "" mcp-server/src/tools/index.ts

# Verify < 818 lines (30% reduction from 1168)
```

**Done when**:
- [ ] Main file ≤ 818 lines
- [ ] Total new files lines ≤ original
- [ ] 30% reduction achieved

### Task 6.4: Update project documentation

**Do**: Update any documentation referencing the old structure

**Done when**:
- [ ] CLAUDE.md updated if needed
- [ ] MCP server README updated if exists
- [ ] Architecture document reflects final state

### Task 6.5: Run `/mdt:tech-debt MDT-090`

**Do**: Generate tech debt report to verify no new debt introduced

**Done when**:
- [ ] Tech debt report generated
- [ ] No critical issues found
- [ ] All findings addressed
