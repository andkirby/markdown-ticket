# Tasks: MDT-121

**Source**: architecture.md + bdd.md

## Scope Boundaries

- `projectDetector.ts`: Parent directory search for `.mdt-config.toml` only. Must not know about MCP tools or handlers.
- `keyNormalizer.ts`: Key format validation, normalization, uppercase conversion only. Must not know about project detection or file system.
- `ProjectHandlers.resolveProject()`: Project resolution (explicit → default → error) only. Must not parse `.mdt-config.toml` directly.
- `MCPCRServer`: Detecting default project at startup via `projectDetector`. Must not implement directory walking logic.
- `MCPTools`: Routing with default project context. Must not store server state.

## Constraint Coverage

| Constraint ID | Tasks | Notes |
|---------------|-------|-------|
| C1: Performance (< 50ms) | Task 1, Task 2 | Startup detection must be fast |
| C2: Reliability (startup never fails) | Task 1, Task 5 | Detection failure = multi-project mode, not error |
| C3: Backward Compatibility | Task 3, Task 6, Task 7 | All existing calls with explicit project work |

## Tasks

### Task 0: Walking Skeleton - End-to-End Path

**Structure**: `mcp-server/src/`

**Makes GREEN**:
- `single-project-mode.spec.ts`: `detect project from cwd`
- `optional-project-param.spec.ts`: `omits project when default exists`

**Scope**: Create minimal end-to-end path from server startup through tool call with default project detection.

**Boundary**: Do not implement edge cases, search depth configuration, or key normalization yet.

**Create/Move**:
- `mcp-server/src/types/server.ts`: Server state interface with `defaultProject?`
- `mcp-server/src/tools/utils/projectDetector.ts`: Basic `detectDefaultProject(cwd)` (cwd only, no parent search)
- `mcp-server/src/tools/handlers/projectHandlers.ts`: Add `resolveProject(argsProject?: string)` method
- `mcp-server/src/index.ts`: Call `detectDefaultProject()` at startup, store result, pass to MCPTools
- `mcp-server/src/tools/index.ts`: Accept `defaultProject?` in constructor, pass to handlers

**Exclude**:
- Parent directory search (depth > 0)
- Search depth configuration
- Key normalization
- Tool schema changes

**Anti-duplication**:
- Import `Project` from `@mdt/shared/models/Project.js` — do not redefine
- Import `ProjectService` from `@mdt/shared/services/ProjectService.js` — do not duplicate validation logic

**Verify**:
```bash
cd mcp-server && npm run build && npm run test:e2e -- --testNamePattern="detect project from cwd"
```

**Done when**:
- [ ] Server logs "Single-project mode: MDT" when started from project directory
- [ ] Server logs "Multi-project mode" when started from /tmp
- [ ] Tool call without project parameter succeeds when default exists
- [ ] Tool call without project parameter fails with clear error when no default

---

### Task 1: Parent Directory Search with Configuration

**Structure**: `mcp-server/src/tools/utils/projectDetector.ts`, `mcp-server/src/config/index.ts`

**Makes GREEN**:
- `single-project-mode.spec.ts`: `detect project from parent directory`
- `single-project-mode.spec.ts`: `uses closest config when multiple exist`
- `single-project-mode.spec.ts`: `respects search depth zero`
- `single-project-mode.spec.ts`: `uses default search depth when not configured`

**Scope**: Implement configurable parent directory search for `.mdt-config.toml`.

**Boundary**: Must not modify MCP tools or handlers. Only search logic.

**Create/Move**:
- `mcp-server/src/tools/utils/projectDetector.ts`: Add `searchDepth` parameter, implement parent directory walking
- `mcp-server/src/config/index.ts`: Add `discovery.mdtConfigSearchDepth` config option (default: 3)
- `mcp-server/src/index.ts`: Read `mdtConfigSearchDepth` from config, pass to `detectDefaultProject()`

**Exclude**:
- Changes to tool schemas
- Changes to handler logic
- HTTP transport session handling

**Anti-duplication**:
- Use existing `ConfigService` patterns for loading config — do not add new config loading mechanism
- Use Node.js `path.dirname()` for directory walking — do not implement custom path logic

**Verify**:
```bash
cd mcp-server && npm run test:e2e -- --testNamePattern="parent directory|search depth"
```

**Done when**:
- [ ] Project detected from 3 levels up (default depth)
- [ ] Closest config used when multiple exist
- [ ] Search depth 0 only checks current directory
- [ ] Performance: detection completes in < 50ms (C1)

---

### Task 2: Key Normalization Utility

**Structure**: `mcp-server/src/tools/utils/keyNormalizer.ts`

**Makes GREEN**:
- `numeric-key-shorthand.spec.ts`: `resolves numeric key with default project`
- `numeric-key-shorthand.spec.ts`: `uppercases full format key`
- `numeric-key-shorthand.spec.ts`: `uppercases lowercase key`
- `numeric-key-shorthand.spec.ts`: `errors on invalid key format`

**Scope**: Implement key format validation and normalization logic.

**Boundary**: Pure function — no file system access, no project detection.

**Create/Move**:
- `mcp-server/src/tools/utils/keyNormalizer.ts`: Create `normalizeKey(key: string, defaultProject?: string): string`

**Exclude**:
- Project detection logic
- File system operations
- Tool handler integration

**Anti-duplication**:
- Use existing `validateProjectKey()` from `../../utils/validation.js` for format validation — do not duplicate regex patterns

**Verify**:
```bash
cd mcp-server && npm run test -- --testPathPattern="keyNormalizer"
```

**Done when**:
- [ ] `5` + default `MDT` → `MDT-5` (leading zeros stripped)
- [ ] `005` + default `MDT` → `MDT-5`
- [ ] `abc-12` → `ABC-12` (uppercase)
- [ ] `MDT-5` → `MDT-5` (preserved)
- [ ] Invalid format throws error with clear message

---

### Task 3: Tool Schema Changes

**Structure**: `mcp-server/src/tools/config/allTools.ts`

**Makes GREEN**:
- `optional-project-param.spec.ts`: All scenarios
- `backward-compatibility.spec.ts`: All scenarios

**Scope**: Make `project` parameter optional in all CR/section tool schemas.

**Boundary**: Only schema changes — no handler logic modifications.

**Create/Move**:
- Modify `mcp-server/src/tools/config/allTools.ts`: Remove `project` from `required` arrays for all CR/section tools
- Update `project` parameter description to mention auto-detection

**Exclude**:
- Handler implementation changes
- Validation logic changes
- New tool additions

**Anti-duplication**:
- Tool names from `TOOL_NAMES` constant — do not hardcode strings

**Verify**:
```bash
cd mcp-server && npm run build
# Schema validation should pass
```

**Done when**:
- [ ] `project` removed from required arrays for: list_crs, get_cr, create_cr, update_cr_status, update_cr_attrs, delete_cr, manage_cr_sections, suggest_cr_improvements
- [ ] Tool descriptions mention auto-detection capability
- [ ] Existing calls with explicit `project` still work (C3)

---

### Task 4: Integrate Key Normalization in CR Handlers

**Structure**: `mcp-server/src/tools/handlers/crHandlers.ts`

**Makes GREEN**:
- `numeric-key-shorthand.spec.ts`: All scenarios
- `backward-compatibility.spec.ts`: `explicit project always works`

**Scope**: Apply key normalization in all CR tool handlers before processing.

**Boundary**: Only CR handlers — do not modify project handlers or section handlers.

**Create/Move**:
- Import `normalizeKey` from `../utils/keyNormalizer.js`
- Apply normalization in `handleGetCR`, `handleUpdateCRStatus`, `handleUpdateCRAttrs`, `handleDeleteCR`, `handleSuggestCRImprovements`

**Exclude**:
- Section handlers (manage_cr_sections uses full key format)
- Project handlers
- Tool schema changes

**Anti-duplication**:
- Import `normalizeKey` from `keyNormalizer.ts` — do not copy normalization logic

**Verify**:
```bash
cd mcp-server && npm run test:e2e -- --testNamePattern="numeric key"
```

**Done when**:
- [ ] `get_cr(key=5)` returns `MDT-5` with default project
- [ ] `get_cr(key=5, project="SUML")` returns `SUML-5`
- [ ] `get_cr(key="abc-12")` returns `ABC-12`
- [ ] Invalid key format returns clear error

---

### Task 5: Integrate resolveProject in All Tool Routes

**Structure**: `mcp-server/src/tools/index.ts`, `mcp-server/src/tools/handlers/sectionHandlers.ts`

**Makes GREEN**:
- `optional-project-param.spec.ts`: All scenarios
- `backward-compatibility.spec.ts`: All scenarios

**Scope**: Replace all `validateProject()` calls with `resolveProject()` to support optional project parameter.

**Boundary**: Only project resolution — do not modify validation logic or project service.

**Create/Move**:
- `mcp-server/src/tools/handlers/projectHandlers.ts`: Rename `validateProject()` to `resolveProject()`, add default fallback logic
- `mcp-server/src/tools/index.ts`: Replace all `validateProject(args.project)` with `resolveProject(args.project)`
- `mcp-server/src/tools/handlers/sectionHandlers.ts`: Update to use `resolveProject()` pattern

**Exclude**:
- Tool schema changes (already done in Task 3)
- Key normalization (already done in Task 4)
- New validation rules

**Anti-duplication**:
- Import `Project` from `@mdt/shared/models/Project.js` — do not redefine
- Import `ToolError` from `../../utils/toolError.js` — do not duplicate error handling

**Verify**:
```bash
cd mcp-server && npm run test:e2e -- --testNamePattern="optional project|backward compatibility"
```

**Done when**:
- [ ] Explicit project overrides default (BR-2.1, C3)
- [ ] Missing project with default succeeds (BR-2.2)
- [ ] Missing project without default fails with clear error (BR-2.3, C2)
- [ ] All existing tests with explicit project pass (C3)

---

### Task 6: Unit Tests for Edge Cases

**Structure**: `mcp-server/tests/unit/`

**Makes GREEN**:
- Coverage for C1 (Performance), C2 (Reliability)

**Scope**: Add unit tests for edge cases not covered by E2E tests.

**Boundary**: Only new tests — do not modify production code.

**Create/Move**:
- `mcp-server/tests/unit/tools/utils/projectDetector.test.ts`: Test file system edge cases, performance
- `mcp-server/tests/unit/tools/utils/keyNormalizer.test.ts`: Test all input formats

**Exclude**:
- Integration tests (covered by E2E)
- Handler logic tests (covered by E2E)

**Anti-duplication**:
- Use existing test patterns from `__tests__/` directories

**Verify**:
```bash
cd mcp-server && npm run test -- --testPathPattern="projectDetector|keyNormalizer"
```

**Done when**:
- [ ] Performance test confirms detection < 50ms (C1)
- [ ] Startup failure test confirms server never fails to start (C2)
- [ ] All key format edge cases covered

---

### Task 7: Documentation and Smoke Test

**Structure**: Documentation files, manual testing

**Makes GREEN**: N/A (manual verification)

**Scope**: Update documentation and perform manual smoke test.

**Boundary**: Documentation only — no code changes.

**Create/Move**:
- Update `mcp-server/README.md`: Document single-project mode, key shorthand
- Update tool descriptions in `allTools.ts` (if not done in Task 3)

**Exclude**:
- Code changes
- Test modifications

**Anti-duplication**:
- Reference existing documentation patterns

**Verify**:
```bash
# Manual smoke test
cd mcp-server && npm run build
# From project directory:
echo '{"key": "5"}' | npm run dev
# Should return MDT-5 without project parameter
```

**Done when**:
- [ ] README documents single-project mode
- [ ] Tool descriptions mention auto-detection
- [ ] Manual smoke test passes: `get_cr(key=5)` works from project directory
- [ ] Manual smoke test passes: `get_cr(key=5, project="SUML")` works from any directory

---

## Post-Implementation

- [ ] No duplication (grep for `validateProject` — should only find `resolveProject`)
- [ ] Scope boundaries respected (no file system access in keyNormalizer, no MCP logic in projectDetector)
- [ ] All tests GREEN
- [ ] Smoke test passes (feature works with real execution)
- [ ] Fallback paths match requirements:
  - [ ] No config → multi-project mode (C2)
  - [ ] Explicit project overrides default (C3)
  - [ ] Numeric key without default fails early (C2)

## Post-Verify Fixes

- (To be added by `/mdt:verify-complete` if issues found)

---

*Generated by /mdt:tasks*
