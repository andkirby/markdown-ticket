# Tasks: MDT-083

**Source**: [MDT-083](../../../docs/CRs/MDT-083-extract-projectservice-into-focused-services.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/` |
| Test command | `cd mcp-server && npm test` and `cd server && npm test` |
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
| Quiet logging | `shared/utils/logger.ts` | All services |
| TOML serialization | `shared/utils/toml.ts` | ConfigService |
| Config validation | `shared/utils/config-validator.ts` | ConfigService |
| File existence checks | `shared/utils/file-utils.ts` | Discovery, Config, Cache services |
| Path resolution | `shared/utils/path-resolver.ts` | Discovery, Config services |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
shared/services/
  ├── ProjectService.ts           → Facade/coordinator only (≤150 lines)
  └── project/                    → Project-specific services
      ├── ProjectDiscoveryService.ts  → Scanning and registry (≤300 lines)
      ├── ProjectConfigService.ts     → Config loading/validation (≤300 lines)
      └── ProjectCacheService.ts      → Caching operations (≤300 lines)

shared/utils/                      → Shared utilities (extract first)
  ├── logger.ts                   → Quiet logging (≤110 lines)
  ├── toml.ts                     → TOML serialization (≤110 lines)
  ├── config-validator.ts         → Config validation (≤110 lines)
  ├── file-utils.ts               → File operations (≤110 lines)
  └── path-resolver.ts            → Path utilities (≤110 lines)
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

---

## Phase 1: Shared Utilities

> Extract patterns used by multiple features FIRST.

**Phase goal**: All shared utilities exist
**Phase verify**: `npm run build:shared` passes, utilities importable

### Task 1.1: Extract quiet logging utility

**Structure**: `shared/utils/logger.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/utils/logger.ts`

**Move**:
- `log()` private method (lines 82-86)
- Related quiet mode logic
- Export as `logQuiet()` or similar

**Exclude**:
- Error message content (stays with caller)
- Condition checks (caller responsibility)

**Anti-duplication**:
- This IS the shared logger — all services will import from here
- Do not duplicate logging logic in any service file

**Verify**:
```bash
wc -l shared/utils/logger.ts  # ≤ 75 (or flag ≤ 110)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/utils/logger.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Export: `export function logQuiet(message: string, ...args: any[]): void`
- [ ] Tests pass

### Task 1.2: Extract TOML serialization utility

**Structure**: `shared/utils/toml.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/utils/toml.ts`

**Move**:
- `objectToToml()` private method (lines 702-738)
- TOML parsing logic (uses external toml package)
- Export as `parse()` and `stringify()`

**Exclude**:
- File writing logic (caller responsibility)
- Path resolution (Task 1.5)

**Anti-duplication**:
- This IS the shared TOML utility — ConfigService will import from here
- Do not duplicate TOML serialization in any service file

**Verify**:
```bash
wc -l shared/utils/toml.ts  # ≤ 75 (or flag ≤ 110)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/utils/toml.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Exports: `parse()`, `stringify()`
- [ ] Tests pass

### Task 1.3: Extract config validation utility

**Structure**: `shared/utils/config-validator.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/utils/config-validator.ts`

**Move**:
- `validateConfig()` private method (lines 173-224)
- `migrateConfig()` private method (lines 145-168)
- Config validation logic

**Exclude**:
- File I/O operations (use file-utils)
- Default config generation (stays in ConfigService)

**Anti-duplication**:
- This IS the shared config validator — ConfigService will import from here
- Do not duplicate validation logic in any service file

**Verify**:
```bash
wc -l shared/utils/config-validator.ts  # ≤ 75 (or flag ≤ 110)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/utils/config-validator.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Exports: `validateGlobalConfig()`, `migrateGlobalConfig()`
- [ ] Tests pass

### Task 1.4: Extract file operations utility

**Structure**: `shared/utils/file-utils.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/utils/file-utils.ts`

**Move**:
- File existence checks (fs.existsSync calls)
- File reading operations (fs.readFileSync)
- File writing operations (fs.writeFileSync)
- Directory creation operations

**Exclude**:
- File content parsing (use appropriate utils)
- Path resolution (Task 1.5)

**Anti-duplication**:
- This IS the shared file utility — all services will import from here
- Do not duplicate file operations in any service file

**Verify**:
```bash
wc -l shared/utils/file-utils.ts  # ≤ 75 (or flag ≤ 110)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/utils/file-utils.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Exports: `exists()`, `readFile()`, `writeFile()`, `ensureDir()`
- [ ] Tests pass

### Task 1.5: Extract path resolution utility

**Structure**: `shared/utils/path-resolver.ts`

**Limits**:
- Default: 75 lines (utility)
- Hard Max: 110 lines
- If > 75: ⚠️ flag
- If > 110: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/utils/path-resolver.ts`

**Move**:
- Path joining operations (path.join calls)
- Path resolution operations (path.resolve)
- Relative/absolute path conversions
- Path validation logic

**Exclude**:
- File existence checks (use file-utils)
- URL operations (different concern)

**Anti-duplication**:
- This IS the shared path utility — Discovery and Config services will import from here
- Do not duplicate path logic in any service file

**Verify**:
```bash
wc -l shared/utils/path-resolver.ts  # ≤ 75 (or flag ≤ 110)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/utils/path-resolver.ts`
- [ ] Size ≤ 75 lines (or flagged if ≤ 110)
- [ ] Exports: `joinPath()`, `resolvePath()`, `getRelativePath()`
- [ ] Tests pass

---

## Phase 2: Service Extraction

> Features import from Phase 1, never duplicate.

**Phase goal**: Services extracted, source reduced
**Phase verify**: Source files ≤ limits, `npm run build:shared` passes

### Task 2.1: Create service interfaces

**Structure**: `shared/services/project/types.ts`

**Limits**:
- Default: 100 lines (shared base)
- Hard Max: 150 lines
- If > 100: ⚠️ flag
- If > 150: ⛔ STOP

**From**: New file
**To**: `shared/services/project/types.ts`

**Move**:
- Define `IProjectDiscoveryService` interface
- Define `IProjectConfigService` interface
- Define `IProjectCacheService` interface
- Common types used across services

**Exclude**:
- Implementation logic (goes in service files)
- External types (import from models)

**Anti-duplication**:
- All services will implement these interfaces
- Do not duplicate type definitions

**Verify**:
```bash
wc -l shared/services/project/types.ts  # ≤ 100 (or flag ≤ 150)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/services/project/types.ts`
- [ ] Size ≤ 100 lines (or flagged if ≤ 150)
- [ ] All interfaces defined with proper methods
- [ ] Tests pass

### Task 2.2: Extract ProjectDiscoveryService

**Structure**: `shared/services/project/ProjectDiscoveryService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/services/project/ProjectDiscoveryService.ts`

**Move**:
- `getRegisteredProjects()` method (lines 233-314)
- `autoDiscoverProjects()` method (lines 358-378)
- `scanDirectoryForProjects()` method (lines 383-442)
- `registerProject()` method (lines 449-480)
- Project scanning and registry logic

**Exclude**:
- Config loading (ConfigService responsibility)
- Caching (CacheService responsibility)
- Global config (stays in facade)

**Anti-duplication**:
- Import `logQuiet` from `shared/utils/logger` — exists from Task 1.1
- Import `exists`, `readFile` from `shared/utils/file-utils` — exists from Task 1.4
- Import `joinPath`, `resolvePath` from `shared/utils/path-resolver` — exists from Task 1.5
- Import `parse` from `shared/utils/toml` — exists from Task 1.2
- Do NOT implement these utilities in this file

**Verify**:
```bash
wc -l shared/services/project/ProjectDiscoveryService.ts  # ≤ 200 (or flag ≤ 300)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/services/project/ProjectDiscoveryService.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] Implements `IProjectDiscoveryService`
- [ ] No duplicated utilities — all imported
- [ ] Tests pass

### Task 2.3: Extract ProjectConfigService

**Structure**: `shared/services/project/ProjectConfigService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/services/project/ProjectConfigService.ts`

**Move**:
- `getProjectConfig()` method (lines 320-353)
- `createOrUpdateLocalConfig()` method (lines 515-599)
- `updateProject()` method (lines 744-807)
- `migrateLegacyConfigWithCleanup()` method (lines 486-509)
- Configuration loading and management logic

**Exclude**:
- Project discovery (DiscoveryService responsibility)
- Global config management (stays in facade)
- Registry operations (DiscoveryService responsibility)

**Anti-duplication**:
- Import `logQuiet` from `shared/utils/logger` — exists from Task 1.1
- Import `readFile`, `writeFile` from `shared/utils/file-utils` — exists from Task 1.4
- Import `parse`, `stringify` from `shared/utils/toml` — exists from Task 1.2
- Import `validateProjectConfig` from `shared/utils/config-validator` — exists from Task 1.3
- Do NOT implement these utilities in this file

**Verify**:
```bash
wc -l shared/services/project/ProjectConfigService.ts  # ≤ 200 (or flag ≤ 300)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/services/project/ProjectConfigService.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] Implements `IProjectConfigService`
- [ ] No duplicated utilities — all imported
- [ ] Tests pass

### Task 2.4: Extract ProjectCacheService

**Structure**: `shared/services/project/ProjectCacheService.ts`

**Limits**:
- Default: 200 lines (feature)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `shared/services/ProjectService.ts`
**To**: `shared/services/project/ProjectCacheService.ts`

**Move**:
- Cache interface definition (lines 47-51)
- `getAllProjects()` cache logic (lines 605-659)
- `clearCache()` method (lines 665-668)
- TTL management logic
- Caching operations only

**Exclude**:
- Project fetching (orchestration logic)
- Cache invalidation triggers (facade responsibility)
- Cache persistence (if needed)

**Anti-duplication**:
- Import `logQuiet` from `shared/utils/logger` — exists from Task 1.1
- Do NOT duplicate logging logic

**Verify**:
```bash
wc -l shared/services/project/ProjectCacheService.ts  # ≤ 200 (or flag ≤ 300)
npm run build:shared
```

**Done when**:
- [ ] File at `shared/services/project/ProjectCacheService.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] Implements `IProjectCacheService`
- [ ] No duplicated utilities — all imported
- [ ] Tests pass

### Task 2.5: Refactor ProjectService as facade

**Structure**: `shared/services/ProjectService.ts`

**Limits**:
- Default: 100 lines (orchestration)
- Hard Max: 150 lines
- If > 100: ⚠️ flag
- If > 150: ⛔ STOP

**From**: `shared/services/ProjectService.ts` (existing)
**To**: `shared/services/ProjectService.ts` (refactored)

**Move**:
- Keep only orchestration logic
- Dependency injection constructor
- Public API methods that delegate to services
- Global config management

**Exclude**:
- All moved logic (now in services)
- File operations (use file-utils)
- TOML operations (use toml utils)

**Anti-duplication**:
- Import all three services
- Import all utilities from Phase 1
- Do NOT duplicate any logic

**Verify**:
```bash
wc -l shared/services/ProjectService.ts  # ≤ 100 (or flag ≤ 150)
npm run build:shared
```

**Done when**:
- [ ] Refactored facade ≤ 100 lines (or flagged if ≤ 150)
- [ ] All logic delegated to services
- [ ] No duplicated code
- [ ] Tests pass

---

## Phase 3: Integration and Cleanup

**Phase goal**: System fully integrated, all references updated
**Phase verify**: All tests pass, no broken imports

### Task 3.1: Update imports in affected files

**Structure**: Multiple files
**Limits**: N/A (import updates)

**From**: Various files
**To**: Various files

**Move**:
- Update `shared/models/Project.ts` imports
- Update `shared/tools/ProjectManager.ts` imports
- Update `server/routes/projects.js` to import from shared
- Delete `server/services/ProjectService.ts`

**Exclude**:
- MCP server (uses shared directly)

**Anti-duplication**:
- Ensure all imports point to correct shared locations
- Do not create duplicate import paths

**Verify**:
```bash
npm run build:shared
cd server && npm test
```

**Done when**:
- [ ] All imports updated
- [ ] Server wrapper deleted
- [ ] Build passes
- [ ] Tests pass

### Task 3.2: Create unit tests for utilities

**Structure**: `shared/utils/__tests__/*.test.ts`

**Limits**: 75 lines each (utility test)
**Hard Max**: 110 lines each

**Move**:
- `logger.test.ts` - Test quiet logging
- `toml.test.ts` - Test parse/stringify
- `config-validator.test.ts` - Test validation
- `file-utils.test.ts` - Test file ops
- `path-resolver.test.ts` - Test path ops

**Exclude**:
- Integration tests (separate concern)

**Anti-duplication**:
- Use Jest patterns consistent with existing tests
- Do not duplicate test setup

**Verify**:
```bash
cd mcp-server && npm test
```

**Done when**:
- [ ] All utility tests created
- [ ] Each ≤ 75 lines
- [ ] Tests pass

### Task 3.3: Create unit tests for services

**Structure**: `shared/services/project/__tests__/*.test.ts`

**Limits**: 75 lines each (service test)
**Hard Max**: 110 lines each

**Move**:
- `ProjectDiscoveryService.test.ts`
- `ProjectConfigService.test.ts`
- `ProjectCacheService.test.ts`

**Exclude**:
- Facade tests (integration level)

**Anti-duplication**:
- Mock utilities properly
- Do not duplicate test scenarios

**Verify**:
```bash
cd mcp-server && npm test
```

**Done when**:
- [ ] All service tests created
- [ ] Each ≤ 75 lines
- [ ] Tests pass

---

## Post-Implementation

### Task 4.1: Verify no duplication

**Do**: Search for duplicated patterns
```bash
# Check for logging duplication
grep -r "console.error\|console.log" shared/services/ | grep -v "__tests__" | wc -l

# Check for TOML duplication
grep -r "toml.parse\|toml.stringify" shared/services/ | grep -v "__tests__" | wc -l

# Check for file operation duplication
grep -r "fs\.readFileSync\|fs\.writeFileSync" shared/services/ | grep -v "__tests__" | wc -l
```

**Done when**:
- [ ] Each pattern exists in ONE utility location only
- [ ] All services import from utilities

### Task 4.2: Verify size compliance

**Do**: Check all files
```bash
# Check utility sizes
find shared/utils -name "*.ts" -not -path "*/__tests__/*" -exec wc -l {} \; | awk '$1 > 110'

# Check service sizes
find shared/services/project -name "*.ts" -not -path "*/__tests__/*" -exec wc -l {} \; | awk '$1 > 300'

# Check facade size
wc -l shared/services/ProjectService.ts | awk '$1 > 150'
```

**Done when**:
- [ ] No utility files exceed 110 lines
- [ ] No service files exceed 300 lines
- [ ] Facade does not exceed 150 lines

### Task 4.3: Update project documentation

**Do**: Update CLAUDE.md if needed
- Remove references to old ProjectService structure
- Add new service documentation

### Task 4.4: Run `/mdt-tech-debt MDT-083`

**Do**: Check for any new technical debt introduced