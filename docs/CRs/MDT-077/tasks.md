# Tasks: MDT-077

**Source**: [MDT-077](..//MDT-077-cli-project-management-tool.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/` |
| Test command | `npm run test:project-cli` |
| Build command | `npm run build:shared` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Orchestration | 100 | 150 | Flag at 100+, STOP at 150+ |
| Feature | 200 | 300 | Flag at 200+, STOP at 300+ |
| Utility | 75 | 110 | Flag at 75+, STOP at 110+ |

*(Inherited from Architecture Design, overridden by CR if specified)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Configuration generation | `ConfigGenerator` class | ProjectFactory, MCP helpers |
| Test project creation | `ProjectFactory` class | ProjectFactory, MCP E2E tests |
| File I/O with retry | `RetryHelper` utility | ProjectFactory, TestEnvironment |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
shared/test-lib/core/
  ├── project-factory.ts           → Test project creation (UPDATE)
  ├── test-environment.ts         → Isolated test management
  └── utils/
      └── retry-helper.ts         → File I/O retry logic

mcp-server/tests/e2e/helpers/
  ├── config/
  │   └── configuration-generator.ts  → Config generation (UPDATE)
  └── utils/
      └── file-helper.ts          → File I/O utilities

.mdt-config.toml                  → Main project config (UPDATE)
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Requirement Coverage

| Requirement | Task(s) | Status |
|-------------|---------|--------|
| R1.1 | Task 2.1 | ⬜ Pending |
| R1.2 | Task 2.1 | ⬜ Pending |
| R1.3 | Task 2.1 | ⬜ Pending |
| R2.1 | Task 2.2 | ⬜ Pending |
| R2.2 | Task 2.2 | ⬜ Pending |
| R2.3 | Task 2.2 | ⬜ Pending |
| R3.1 | Task 2.3 | ⬜ Pending |
| R3.2 | Task 2.3 | ⬜ Pending |
| R4.1 | Task 2.4 | ⬜ Pending |
| R4.2 | Task 2.4 | ⬜ Pending |
| R5.1 | Task 2.5 | ⬜ Pending |
| R5.2 | Task 2.5 | ⬜ Pending |
| R6.1 | Task 2.6 | ⬜ Pending |
| R6.2 | Task 2.6 | ⬜ Pending |
| R7.1 | Task 2.7 | ⬜ Pending |
| R7.2 | Task 2.7 | ⬜ Pending |
| R8.1 | Task 2.8 | ⬜ Pending |
| R8.2 | Task 2.8 | ⬜ Pending |
| R9.1 | Task 2.9 | ⬜ Pending |
| R9.2 | Task 2.9 | ⬜ Pending |
| R10.1 | Task 2.10 | ⬜ Pending |
| R10.2 | Task 2.10 | ⬜ Pending |

**Coverage**: 20/20 requirements have implementing tasks

## Test Coverage

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `project-creation.test > should create project with required fields` | R1.1, R8.1 | Task 2.1, 2.8 | 🔴 RED |
| `project-creation.test > should reject invalid project codes` | R8.2 | Task 2.8 | 🔴 RED |
| `project-creation.test > should reject non-existent paths` | R9.1 | Task 2.9 | 🔴 RED |
| `configuration-validation.test > should validate generated configuration schema` | R8.1 | Task 2.8 | 🔴 RED |
| `configuration-validation.test > should enforce 2-5 uppercase letter format` | R8.2 | Task 2.8 | 🔴 RED |
| `configuration-validation.test > should ensure CLI output matches configuration` | R3.1, R3.2 | Task 2.3 | 🔴 RED |

**TDD Goal**: All tests RED before implementation, GREEN after respective task completes

---

## TDD Verification

Before starting each task:
```bash
npm run test:project-cli  # Should show failures
```

After completing each task:
```bash
npm run test:project-cli  # Should pass
npm run build:shared      # Full suite — no regressions
```

---

## Phase 1: Shared Utilities

> Extract patterns used by multiple features FIRST.

**Phase goal**: All shared utilities exist
**Phase verify**: `npm run test:project-cli` passes, utilities importable

### Task 1.1: Extract ConfigGenerator pattern

**Structure**: `shared/test-lib/core/config/config-generator.ts`

**Limits**:
- Default: 150 lines (utility)
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**Implements**: R8.1

**Makes GREEN**:
- `configuration-validation.test.ts`: `should validate generated configuration schema` (R8.1)

**From**: `mcp-server/tests/e2e/helpers/config/configuration-generator.ts`
**To**: `shared/test-lib/core/config/config-generator.ts`

**Move**:
- `generateMdtConfig()` function
- `generateGlobalRegistryConfig()` function
- Configuration templates for all three strategies
- TOML serialization helpers

**Exclude**:
- MCP-specific test helpers
- E2E test utilities
- File I/O operations (use RetryHelper)

**Anti-duplication**:
- This IS the shared ConfigGenerator — other tasks will import from here
- Remove duplicate config generation from `mcp-server/tests/e2e/helpers/`
- Import `RetryHelper` from `utils/retry-helper.ts` — do NOT duplicate retry logic

**Verify**:
```bash
wc -l shared/test-lib/core/config/config-generator.ts  # ≤ 150 (or flag ≤ 225)
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] File at `shared/test-lib/core/config/config-generator.ts`
- [ ] Size ≤ 150 lines (or flagged if ≤ 225)
- [ ] All configuration generation consolidated here
- [ ] MCP server updated to import from shared location

### Task 1.2: Extract RetryHelper utility

**Structure**: `shared/test-lib/core/utils/retry-helper.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: Multiple locations with file I/O retry logic
**To**: `shared/test-lib/core/utils/retry-helper.ts`

**Move**:
- `retryWithBackoff()` function
- `withRetry()` higher-order function
- Exponential backoff implementation
- Retry configuration constants

**Exclude**:
- Test-specific logic
- Configuration validation
- Project creation business logic

**Anti-duplication**:
- This IS the shared RetryHelper — consolidate all retry patterns here
- Search for existing retry logic across files and move HERE
- Other tasks will import from here — do NOT duplicate

**Verify**:
```bash
wc -l shared/test-lib/core/utils/retry-helper.ts  # ≤ 75 (or flag ≤ 110)
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] File at `shared/test-lib/core/utils/retry-helper.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] All retry logic consolidated
- [ ] Tests pass

### Task 1.3: Extract ProjectFactory class

**Structure**: `shared/test-lib/core/project-factory.ts`

**Limits**:
- Default: 400 lines (feature)
- Hard Max: 600 lines
- If > 400: ⚠️ flag
- If > 600: ⛔ STOP

**Implements**: R7.1, R7.2

**Makes GREEN**:
- `project-creation.test.ts`: `should create project with required fields` (R7.1)

**From**: Existing project creation code
**To**: `shared/test-lib/core/project-factory.ts`

**Move**:
- `ProjectFactory` class
- `createProject()` method
- `createTestCR()` method
- Test project lifecycle management
- Temporary directory handling

**Exclude**:
- Configuration generation (use Task 1.1)
- Retry logic (import from Task 1.2)
- MCP-specific helpers

**Anti-duplication**:
- Import `ConfigGenerator` from `config/config-generator.ts` — exists from Task 1.1
- Import `RetryHelper` from `utils/retry-helper.ts` — exists from Task 1.2
- Do NOT duplicate configuration or retry logic

**Verify**:
```bash
wc -l shared/test-lib/core/project-factory.ts  # ≤ 400 (or flag ≤ 600)
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] File at `shared/test-lib/core/project-factory.ts`
- [ ] Size ≤ 400 lines (or flagged if ≤ 600)
- [ ] Uses shared imports, no duplication
- [ ] Tests pass

---

## Phase 2: Feature Implementation

> Features import from Phase 1, never duplicate.

**Phase goal**: Features implemented, all requirements covered
**Phase verify**: All tests GREEN, `npm run test:project-cli` passes

### Task 2.1: Implement project creation operations

**Structure**: `shared/tools/project-cli.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R1.1, R1.2, R1.3

**Makes GREEN**:
- `project-creation.test.ts`: All scenarios (B1.1-B1.3)

**From**: Existing CLI shell
**To**: `shared/tools/project-cli.ts`

**Move**:
- `project:create` command implementation
- Three-strategy configuration handling
- Global registry registration
- Local config file creation

**Exclude**:
- Validation logic (use ProjectValidator)
- Error handling (use shared patterns)
- Configuration generation (use ConfigGenerator)

**Anti-duplication**:
- Import `ProjectValidator` from `shared/tools/ProjectValidator.ts` — exists from Task 2.8
- Import `ConfigGenerator` from `shared/test-lib/core/config/config-generator.ts` — exists from Task 1.1
- Do NOT implement validation or config generation inline

**Verify**:
```bash
wc -l shared/tools/project-cli.ts  # ≤ 200 (or flag ≤ 300)
npm run test:project-cli -- --testPathPattern=project-creation
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] Project creation works with all strategies
- [ ] Uses shared imports, no duplication
- [ ] Size within limits

### Task 2.2: Implement configuration strategy management

**Structure**: `shared/services/ProjectService.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R2.1, R2.2, R2.3

**From**: Existing service code
**To**: `shared/services/ProjectService.ts`

**Move**:
- `discoverProjects()` method with strategy detection
- `mergeConfigurations()` method for project-first mode
- `loadGlobalOnlyConfig()` method
- `scanSearchPaths()` method for auto-discovery

**Exclude**:
- Validation logic (delegate to ProjectValidator)
- Caching logic (separate concern)
- File I/O retry (use RetryHelper)

**Anti-duplication**:
- Import `ProjectValidator` from `shared/tools/ProjectValidator.ts` — exists from Task 2.8
- Import `RetryHelper` from `shared/test-lib/core/utils/retry-helper.ts` — exists from Task 1.2
- Do NOT duplicate validation or retry logic

**Verify**:
```bash
wc -l shared/services/ProjectService.ts  # ≤ 200 (or flag ≤ 300)
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] All three strategies work correctly
- [ ] Project discovery returns consistent results
- [ ] Uses shared imports
- [ ] Tests pass

### Task 2.3: Ensure project information consistency

**Structure**: `shared/services/ProjectService.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R3.1, R3.2

**Makes GREEN**:
- `configuration-validation.test.ts`: `should ensure CLI output matches configuration` (R3.1, R3.2)

**From**: Existing service code
**To**: `shared/services/ProjectService.ts`

**Move**:
- `validateProjectMetadata()` method
- Cross-interface consistency checks
- Project code normalization logic
- Cache invalidation on changes

**Exclude**:
- Validation rules (delegate to ProjectValidator)
- Cache storage (separate module)

**Anti-duplication**:
- Import `ProjectValidator` from `shared/tools/ProjectValidator.ts` — exists from Task 2.8
- Do NOT duplicate validation rules

**Verify**:
```bash
npm run test:project-cli -- --testPathPattern=configuration-validation
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] CLI, API, MCP return identical data
- [ ] All fields validated before return
- [ ] Tests pass

### Task 2.4: Implement document discovery management

**Structure**: `shared/services/DocumentService.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R4.1, R4.2

**From**: Existing document service
**To**: `shared/services/DocumentService.ts`

**Move**:
- Automatic tickets path exclusion
- Exclude folder matching logic
- Max depth scanning implementation
- Path filtering algorithms

**Exclude**:
- Configuration parsing (use shared services)
- File system operations (use Node.js fs)

**Anti-duplication**:
- Import configuration from `shared/services/ProjectService.ts` — exists
- Do NOT duplicate configuration access logic

**Verify**:
```bash
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Tickets path automatically excluded
- [ ] Exclude folders work at any depth
- [ ] Max depth respected
- [ ] Tests pass

### Task 2.5: Implement caching and performance

**Structure**: `shared/services/CacheService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R5.1, R5.2

**From**: Existing caching logic
**To**: `shared/services/CacheService.ts`

**Move**:
- TTL cache implementation (30-second default)
- Cache invalidation on file changes
- Concurrent request handling
- Performance metrics collection

**Exclude**:
- Cache storage backend (use in-memory for now)
- File system watching (use chokidar)

**Anti-duplication**:
- This IS the shared CacheService — other services import from here
- Do not duplicate caching logic across services

**Verify**:
```bash
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Cache reduces listing time by 85%
- [ ] Cache invalidates on changes
- [ ] Concurrent requests share updates
- [ ] Tests pass

### Task 2.6: Implement CLI operations with proper error handling

**Structure**: `shared/tools/project-cli.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R6.1, R6.2

**Makes GREEN**:
- `project-creation.test.ts`: Error scenarios (B1.2, B1.3)

**From**: Existing CLI code
**To**: `shared/tools/project-cli.ts`

**Move**:
- Argument validation logic
- Error code mapping (0, 1, 2, 3, 6)
- JSON output formatting
- Progress feedback for long operations

**Exclude**:
- Validation rules (delegate to ProjectValidator)
- Error messages (use shared error handler)

**Anti-duplication**:
- Import `ProjectValidator` from `shared/tools/ProjectValidator.ts` — exists from Task 2.8
- Import error codes from shared constants
- Do NOT duplicate validation or error logic

**Verify**:
```bash
npm run test:project-cli -- --testPathPattern=project-creation
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] Proper exit codes returned
- [ ] JSON output works correctly
- [ ] Tests pass

### Task 2.7: Implement project discovery and registration

**Structure**: `shared/services/DiscoveryService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R7.1, R7.2

**From**: Existing discovery logic
**To**: `shared/services/DiscoveryService.ts`

**Move**:
- Search path scanning implementation
- Automatic registration logic
- Project validation on discovery
- Stale project cleanup

**Exclude**:
- Configuration merging (use ProjectService)
- File system watching (separate concern)

**Anti-duplication**:
- Import `ProjectService` for configuration operations
- Import `ProjectValidator` for validation
- Do NOT duplicate configuration or validation logic

**Verify**:
```bash
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Projects auto-discovered in search paths
- [ ] Invalid projects filtered out
- [ ] Stale references cleaned up
- [ ] Tests pass

### Task 2.8: Implement comprehensive configuration validation

**Structure**: `shared/tools/ProjectValidator.ts` (update)

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R8.1, R8.2

**Makes GREEN**:
- `configuration-validation.test.ts`: All validation scenarios (B2.1-B2.3)

**From**: Existing validation code
**To**: `shared/tools/ProjectValidator.ts`

**Move**:
- `validateProjectConfig()` method
- Field presence validation
- Type checking for all fields
- Project code format validation (2-5 uppercase letters)
- Path existence verification

**Exclude**:
- Error message formatting (use shared)
- Retry logic (use RetryHelper)

**Anti-duplication**:
- This IS the shared ProjectValidator — other tasks import from here
- Do NOT duplicate validation rules

**Verify**:
```bash
wc -l shared/tools/ProjectValidator.ts  # ≤ 200 (or flag ≤ 300)
npm run test:project-cli -- --testPathPattern=configuration-validation
npm run build:shared
```

**Done when**:
- [ ] Tests RED before task, GREEN after
- [ ] All required fields validated
- [ ] Project codes properly formatted
- [ ] Clear error messages provided
- [ ] Tests pass

### Task 2.9: Implement error handling and recovery

**Structure**: `shared/utils/ErrorHandler.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R9.1, R9.2

**From**: Existing error handling
**To**: `shared/utils/ErrorHandler.ts`

**Move**:
- File system error handling
- Conflict detection and reporting
- Transaction-style rollback implementation
- Exponential backoff retry logic

**Exclude**:
- Business logic (keep in services)
- User interface concerns

**Anti-duplication**:
- This IS the shared ErrorHandler — all error handling imports from here
- Import `RetryHelper` for retry logic
- Do NOT duplicate error handling patterns

**Verify**:
```bash
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] File system errors handled gracefully
- [ ] Conflicts detected and reported
- [ ] Rollback works on partial failures
- [ ] Tests pass

### Task 2.10: Implement multi-interface synchronization

**Structure**: `shared/services/SyncService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**Implements**: R10.1, R10.2

**From**: Existing SSE/sync logic
**To**: `shared/services/SyncService.ts`

**Move**:
- Real-time update broadcasting
- Conflict resolution with timestamps
- Update queuing for disconnected clients
- SSE event management

**Exclude**:
- SSE transport layer (use existing)
- Cache invalidation (use CacheService)

**Anti-duplication**:
- Import `CacheService` for cache operations
- Do NOT duplicate caching or SSE logic

**Verify**:
```bash
npm run test:project-cli
npm run build:shared
```

**Done when**:
- [ ] Changes broadcast to all clients
- [ ] Conflicts resolved by timestamp
- [ ] Updates queued for disconnected clients
- [ ] Tests pass

---

## Post-Implementation

### Task N.1: Verify no duplication

**Do**: Search for duplicated patterns
```bash
# Find duplicated configuration generation
grep -r "generateMdtConfig\|generateGlobalRegistryConfig" shared/ | cut -d: -f1 | sort | uniq -c | sort -rn

# Find duplicated validation logic
grep -r "validateProject\|validateConfig" shared/ | cut -d: -f1 | sort | uniq -c | sort -rn

# Find duplicated retry logic
grep -r "retry\|backoff" shared/ | cut -d: -f1 | sort | uniq -c | sort -rn
```

**Done when**:
- [ ] Each pattern exists in ONE location only
- [ ] All duplications eliminated

### Task N.2: Verify size compliance

**Do**: Check all files
```bash
find shared/ -name "*.ts" -exec wc -l {} \; | awk '$1 > 600'
```

**Done when**:
- [ ] No files exceed hard max limits
- [ ] Flagged files documented with rationale

### Task N.3: Update project documentation

**Do**: Update CLAUDE.md with:
- New shared utilities locations
- Updated CLI commands reference
- Testing strategy documentation

**Done when**:
- [ ] CLAUDE.md reflects new architecture
- [ ] All new paths documented

### Task N.4: Run `/mdt:tech-debt MDT-077`

**Do**: Generate technical debt report for completed implementation

**Done when**:
- [ ] Tech debt report generated
- [ ] No critical debt items

### Task N.5: Final verification

**Do**: Complete verification checklist
```bash
# Run all tests
npm run test:project-cli

# Verify build
npm run build:shared

# Check all requirements implemented
grep -E "R[0-9]+\.[0-9]+" docs/CRs/MDT-077/tasks.md | wc -l  # Should be 20
```

**Done when**:
- [ ] All tests GREEN
- [ ] Build succeeds
- [ ] All 20 requirements covered
- [ ] Size thresholds met
