# Tasks: MDT-113 - Refactor shared/test-lib

**Source**: [MDT-113](./MDT-113-refactor-sharedtest-lib-to-improve-code-maintainab.md)
**Architecture**: [architecture.md](./architecture.md)
**Generated**: 2025-12-31

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/test-lib/` |
| Test command | `cd shared/test-lib && npm test` |
| Build command | `npm run build:shared` |
| File extension | `.ts` |
| Metrics check | `scripts/metrics/run.sh shared/test-lib/` |

## Green-Test Preservation Strategy

**Principle**: Existing tests stay GREEN throughout refactoring. If tests turn RED, behavior was broken.

### TDD Workflow (Refactoring Mode)

1. **Baseline**: Run all tests → confirm GREEN
   ```bash
   cd shared/test-lib && npm test
   scripts/metrics/run.sh shared/test-lib/  # Record baseline metrics
   ```

2. **Extract Component**: Create new file with extracted logic
   - Public API unchanged in original file
   - Original class delegates to new component
   - Run tests → confirm still GREEN

3. **Verify Metrics**: Check file sizes against limits
   ```bash
   wc -l shared/test-lib/core/{new-file}.ts  # Must be ≤ limit
   ```

4. **Next Component**: Only proceed after tests GREEN

### Test Coverage Map

| Test Suite | File | Tests | Coverage |
|------------|------|-------|----------|
| File Creation | `file-creation.test.ts` | 22 assertions | TestEnvironment, ProjectFactory |
| Integration | `integration.test.ts` | 3 assertions | TestServer, backend discovery |

**Total**: 130 test assertions protecting behavior

## Size Thresholds

| Module | Default | Hard Max | Action |
|--------|---------|----------|--------|
| `core/test-environment.ts` | 100 | 150 | Flag at 100+, STOP at 150+ |
| `core/test-server.ts` | 150 | 225 | Flag at 150+, STOP at 225+ |
| `core/project-factory.ts` | 200 | 300 | Flag at 200+, STOP at 300+ |
| `core/process-lifecycle-manager.ts` | 150 | 225 | Flag at 150+, STOP at 225+ |
| `core/event-listener-registry.ts` | 100 | 150 | Flag at 100+, STOP at 150+ |
| `core/server-config-factory.ts` | 120 | 180 | Flag at 120+, STOP at 180+ |
| `ticket/test-project-builder.ts` | 150 | 225 | Flag at 150+, STOP at 225+ |
| `ticket/test-ticket-builder.ts` | 150 | 225 | Flag at 150+, STOP at 225+ |
| `ticket/file-ticket-creator.ts` | 200 | 300 | Flag at 200+, STOP at 300+ |

*(From Architecture Design)*

## STOP Conditions

- **Tests turn RED** → STOP, behavior broken, revert and fix
- **File exceeds Hard Max** → STOP, subdivide further
- **Duplicating logic** → STOP, import from shared module instead
- **Public API changed** → STOP, restore original interface

## Execution Order

```
Phase 1: Extract Shared Components (no consumers yet)
  Task 1: EventListenerRegistry
  Task 2: ProcessLifecycleManager
  Task 3: ServerConfigFactory

Phase 2: Refactor Core Classes (using extracted components)
  Task 4: TestEnvironment → use EventListenerRegistry
  Task 5: TestServer → use all extracted components
  Task 6: ProjectFactory → extract builders

Phase 3: Refactor Ticket Classes
  Task 7: FileTicketCreator → simplify retry logic
  Task 8: TestTicketBuilder → extracted from ProjectFactory
  Task 9: TestProjectBuilder → extracted from ProjectFactory

Phase 4: Final Verification
  Task 10: Metrics verification
  Task 11: Full test suite
```

---

## Phase 1: Extract Shared Components

### Task 1: Create EventListenerRegistry

**Structure**: `shared/test-lib/core/event-listener-registry.ts`

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines

**Create**:
- `EventListenerRegistry` class with methods:
  - `register(serverType, stdout, stderr, exit)` - Store listener references
  - `cleanup(serverType)` - Remove all listeners for a server
  - `clear()` - Remove all tracked listeners

**Exclude**:
- Process lifecycle logic (Task 2)
- Health check logic (stays in TestServer)

**From**: `test-server.ts` lines 26-29, 56-79, 199-223
**To**: `event-listener-registry.ts`

**Verify**:
```bash
wc -l shared/test-lib/core/event-listener-registry.ts  # ≤ 100
cd shared/test-lib && npm test  # Should be GREEN
```

**Done when**:
- [ ] File created at `core/event-listener-registry.ts`
- [ ] Size ≤ 100 lines
- [ ] All tests still GREEN (22 assertions pass)
- [ ] Exports EventListenerRegistry class

---

### Task 2: Create ProcessLifecycleManager

**Structure**: `shared/test-lib/core/process-lifecycle-manager.ts`

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines

**Create**:
- `ProcessLifecycleManager` class with methods:
  - `start(serverType, projectRoot, config)` - Spawn process with health check
  - `stop(serverType)` - Graceful shutdown with tree-kill
  - `isReady(serverType)` - Health check verification
  - `waitForHealthCheck()` - Exponential backoff retry
  - `performHealthCheck()` - HTTP health check

**From**: `test-server.ts` lines 36-92, 225-319
**To**: `process-lifecycle-manager.ts`

**Exclude**:
- Event listener management (uses EventListenerRegistry from Task 1)
- Server config generation (Task 3)

**Dependencies**:
- Use `tree-kill` (existing)
- Use `RetryHelper` from `utils/retry-helper.ts` (do not duplicate)

**Verify**:
```bash
wc -l shared/test-lib/core/process-lifecycle-manager.ts  # ≤ 150
cd shared/test-lib && npm test  # Should be GREEN
```

**Done when**:
- [ ] File created at `core/process-lifecycle-manager.ts`
- [ ] Size ≤ 150 lines
- [ ] All tests still GREEN
- [ ] Uses RetryHelper (no duplicate retry logic)
- [ ] Uses tree-kill for process tree termination

---

### Task 3: Create ServerConfigFactory

**Structure**: `shared/test-lib/core/server-config-factory.ts`

**Limits**:
- Default: 120 lines
- Hard Max: 180 lines

**Create**:
- `ServerConfigFactory` class with methods:
  - `createConfig(serverType, projectRoot, ports)` - Generate ServerConfig
  - Private switch statement for frontend/backend/mcp
  - Respects CONFIG_DIR env variable for test isolation

**From**: `test-server.ts` lines 253-293
**To**: `server-config-factory.ts`

**Exclude**:
- Process spawning logic (ProcessLifecycleManager)
- Health check execution (ProcessLifecycleManager)

**Verify**:
```bash
wc -l shared/test-lib/core/server-config-factory.ts  # ≤ 120
cd shared/test-lib && npm test  # Should be GREEN
```

**Done when**:
- [ ] File created at `core/server-config-factory.ts`
- [ ] Size ≤ 120 lines
- [ ] All tests still GREEN
- [ ] Handles all 3 server types (frontend, backend, mcp)

---

## Phase 2: Refactor Core Classes

### Task 4: Refactor TestEnvironment

**Structure**: `shared/test-lib/core/test-environment.ts`

**Limits**:
- Default: 100 lines (was 178, target -44%)
- Hard Max: 150 lines

**Refactor**:
- Import and use `EventListenerRegistry` (from Task 1)
- Replace `_exitHandlers` Array with EventListenerRegistry
- Move listener registration logic to registry
- Keep public methods: `setup()`, `cleanup()`, `getTempDirectory()`, etc.

**From**: `test-environment.ts` (178 lines)
**To**: `test-environment.ts` (100 lines)

**Exclude**:
- Process spawning (not TestEnvironment's concern)
- Project creation (not TestEnvironment's concern)

**Anti-duplication**:
- Import `EventListenerRegistry` from `core/event-listener-registry.ts`
- Do NOT duplicate listener tracking logic

**Verify**:
```bash
wc -l shared/test-lib/core/test-environment.ts  # ≤ 100
cd shared/test-lib && npm test -- file-creation.test.ts  # Targeted tests
```

**Done when**:
- [ ] Size reduced to ~100 lines (-44%)
- [ ] Uses EventListenerRegistry
- [ ] All file-creation tests GREEN (15 assertions)
- [ ] Public API unchanged

---

### Task 5: Refactor TestServer

**Structure**: `shared/test-lib/core/test-server.ts`

**Limits**:
- Default: 150 lines (was 382, target -61%)
- Hard Max: 225 lines

**Refactor**:
- Use `ProcessLifecycleManager` (from Task 2) for process lifecycle
- Use `EventListenerRegistry` (from Task 1) for listener cleanup
- Use `ServerConfigFactory` (from Task 3) for config generation
- Keep public API: `start()`, `stop()`, `stopAll()`, `isReady()`, `getUrl()`, `getConfig()`

**From**: `test-server.ts` (382 lines)
**To**: `test-server.ts` (150 lines)

**Exclude**:
- Process lifecycle implementation (delegated to ProcessLifecycleManager)
- Event listener tracking (delegated to EventListenerRegistry)
- Config generation (delegated to ServerConfigFactory)

**Anti-duplication**:
- Import from `process-lifecycle-manager.ts`
- Import from `event-listener-registry.ts`
- Import from `server-config-factory.ts`
- Do NOT copy logic from these files

**Verify**:
```bash
wc -l shared/test-lib/core/test-server.ts  # ≤ 150
cd shared/test-lib && npm test -- integration.test.ts  # Targeted tests
```

**Done when**:
- [ ] Size reduced to ~150 lines (-61%)
- [ ] Uses all 3 extracted components
- [ ] All integration tests GREEN (3 assertions)
- [ ] Public API unchanged
- [ ] Health checks still work
- [ ] Process cleanup still works

---

### Task 6: Extract TestTicketBuilder from ProjectFactory

**Structure**: `shared/test-lib/ticket/test-ticket-builder.ts`

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines

**Create**:
- `TestTicketBuilder` class with methods:
  - `createTicket(projectCode, ticketData)` - Create test ticket with counter
  - Private: `getNextNumber()` - Read from `.mdt-next`
  - Private: `updateNextNumber()` - Write to `.mdt-next`
  - Private: `generateTicketCode()` - Format code with padding
  - Private: `createSlug()` - URL-safe title slug

**From**: `project-factory.ts` lines 364-477, 597-606
**To**: `test-ticket-builder.ts`

**Exclude**:
- Project directory creation (Task 9)
- TemplateService instantiation (stays in FileTicketCreator)
- Full CRService usage (simplified for tests)

**Dependencies**:
- Use `RetryHelper` from `utils/retry-helper.ts`
- Use `MarkdownService` from `../../services/MarkdownService.js`

**Verify**:
```bash
wc -l shared/test-lib/ticket/test-ticket-builder.ts  # ≤ 150
cd shared/test-lib && npm test -- file-creation.test.ts
```

**Done when**:
- [ ] File created at `ticket/test-ticket-builder.ts`
- [ ] Size ≤ 150 lines
- [ ] File-creation tests for CR creation GREEN
- [ ] Counter management works (.mdt-next read/write)

---

### Task 7: Extract TestProjectBuilder from ProjectFactory

**Structure**: `shared/test-lib/ticket/test-project-builder.ts`

**Limits**:
- Default: 150 lines
- Hard Max: 225 lines

**Create**:
- `TestProjectBuilder` class with methods:
  - `createProject(projectCode, config)` - Create project structure
  - Private: `createProjectStructure()` - Directory creation
  - Private: `createProjectFiles()` - Config files
  - Use `ProjectRegistry` and `ProjectConfigService` (shared services)

**From**: `project-factory.ts` lines 159-263
**To**: `test-project-builder.ts`

**Exclude**:
- CR/ticket creation (delegated to TestTicketBuilder)
- Test scenario generation (stays in ProjectFactory)

**Anti-duplication**:
- Import `ProjectRegistry` from `../../services/project/ProjectRegistry.js`
- Import `ProjectConfigService` from `../../services/project/ProjectConfigService.js`
- Do NOT duplicate project registration logic

**Verify**:
```bash
wc -l shared/test-lib/ticket/test-project-builder.ts  # ≤ 150
cd shared/test-lib && npm test -- file-creation.test.ts
```

**Done when**:
- [ ] File created at `ticket/test-project-builder.ts`
- [ ] Size ≤ 150 lines
- [ ] Project creation tests GREEN
- [ ] Uses shared services (no duplication)

---

### Task 8: Refactor ProjectFactory

**Structure**: `shared/test-lib/core/project-factory.ts`

**Limits**:
- Default: 200 lines (was 607, target -67%)
- Hard Max: 300 lines

**Refactor**:
- Use `TestProjectBuilder` (from Task 7) for project structure
- Use `TestTicketBuilder` (from Task 6) for ticket creation
- Keep orchestrator methods: `createProject()`, `createTestCR()`, `createMultipleCRs()`, `createTestScenario()`
- Remove ~400 lines of implementation (delegated to builders)

**From**: `project-factory.ts` (607 lines)
**To**: `project-factory.ts` (200 lines)

**Exclude**:
- Project structure implementation (TestProjectBuilder)
- Ticket creation implementation (TestTicketBuilder)

**Anti-duplication**:
- Import `TestProjectBuilder` from `../ticket/test-project-builder.js`
- Import `TestTicketBuilder` from `../ticket/test-ticket-builder.js`
- Do NOT duplicate builder logic

**Verify**:
```bash
wc -l shared/test-lib/core/project-factory.ts  # ≤ 200
cd shared/test-lib && npm test -- file-creation.test.ts
```

**Done when**:
- [ ] Size reduced to ~200 lines (-67%)
- [ ] All file-creation tests GREEN (22 assertions)
- [ ] Uses both builders
- [ ] Public API unchanged

---

## Phase 3: Refactor Ticket Classes

### Task 9: Refactor FileTicketCreator

**Structure**: `shared/test-lib/ticket/file-ticket-creator.ts`

**Limits**:
- Default: 200 lines (was 326, target -39%)
- Hard Max: 300 lines

**Refactor**:
- Simplify retry logic: remove individual `withRetry` calls (8x)
- Use `RetryHelper` instance directly (already have it)
- Remove duplicate retry wrapper patterns
- Keep public methods: `createTicket()`, `readTicket()`, `updateTicket()`, `ticketExists()`

**From**: `file-ticket-creator.ts` (326 lines)
**To**: `file-ticket-creator.ts` (200 lines)

**Exclude**:
- Counter management (not FileTicketCreator's concern - that's TestTicketBuilder)
- Test-specific content generation (uses TemplateService)

**Simplify**:
- Consolidate retry options into constructor
- Use `withRetry` helper directly without repeating options
- Remove `this.retryHelper.execute()` calls, use `withRetry()` function

**Verify**:
```bash
wc -l shared/test-lib/ticket/file-ticket-creator.ts  # ≤ 200
cd shared/test-lib && npm test -- integration.test.ts
```

**Done when**:
- [ ] Size reduced to ~200 lines (-39%)
- [ ] All integration tests GREEN
- [ ] Retry logic consolidated
- [ ] No duplicated retry patterns

---

### Task 10: Verify Integration Test Discovery

**Verify**: Integration tests still discover test-lib created projects/CRs

**Test**: `integration.test.ts`
- `backend server discovers test-lib created project`
- `backend server discovers test-lib created CRs`
- `CR file has correct filename with title slug`

**Run**:
```bash
cd shared/test-lib && npm test -- integration.test.ts
```

**Done when**:
- [ ] All 3 integration tests GREEN
- [ ] Backend discovers test projects
- [ ] Ticket numbering works
- [ ] Title slug generation works

---

## Phase 4: Final Verification

### Task 11: Metrics Verification

**Verify**: All files meet YELLOW zone targets

**Run metrics**:
```bash
scripts/metrics/run.sh shared/test-lib/
```

**Target**:
- Cyclomatic Complexity (CC) < 25 for all files
- Cognitive Complexity (CoC) < 35 for all files
- Maintainability Index (MI) > 30 for all files

**Baseline vs Target**:

| File | Baseline MI | Baseline CC | Baseline CoC | Target |
|------|-------------|-------------|-------------|--------|
| test-environment.ts | 32.14 | 18 | 31 | CC<25, CoC<35 |
| test-server.ts | 20.26 | 39 | 64 | CC<25, CoC<35 |
| project-factory.ts | 16.82 | 22 | 42 | CC<25, CoC<35 |
| file-ticket-creator.ts | 22.77 | 33 | 54 | CC<25, CoC<35 |

**Done when**:
- [ ] All files in YELLOW zone (CC<25, CoC<35)
- [ ] Total line count reduced by ~20%
- [ ] No RED zones remain

---

### Task 12: Full Test Suite

**Verify**: All tests pass with no regressions

**Run**:
```bash
cd shared/test-lib && npm test
```

**Expected**:
- 130 test assertions pass
- No failures, no skips
- All file-creation tests pass
- All integration tests pass

**Done when**:
- [ ] All 130 assertions GREEN
- [ ] No test modifications needed
- [ ] Exit code 0

---

## Post-Implementation Verification

### Check 1: No Duplicated Logic

```bash
# Check for duplicated retry patterns
grep -r "withRetry\|retryHelper" shared/test-lib/ --include="*.ts" | grep -v "retry-helper.ts" | grep -v "index.ts"
```

**Expected**: Each file imports from `utils/retry-helper.ts`, no inline retry implementations

**Done when**: [ ] No duplicate retry logic found

---

### Check 2: File Size Compliance

```bash
# Verify all files within limits
cd shared/test-lib

for file in core/*.ts ticket/*.ts; do
  lines=$(wc -l < "$file")
  echo "$file: $lines lines"
done
```

**Done when**: [ ] All files within their limits

---

### Check 3: Public API Unchanged

**Verify**: No breaking changes to public interfaces

```bash
# Check exports in index.ts
cat shared/test-lib/index.ts | grep -E "TestEnvironment|TestServer|ProjectFactory|FileTicketCreator"
```

**Expected**: All original exports present

**Done when**: [ ] All public classes exported

---

## Rollback Strategy

If any task breaks tests:

1. **Revert file**: `git checkout -- <file>`
2. **Confirm GREEN**: `npm test` should pass again
3. **Analyze**: What behavior changed?
4. **Retry**: Adjust extraction, try again

**Golden Rule**: Tests must stay GREEN. If RED, revert and fix.
