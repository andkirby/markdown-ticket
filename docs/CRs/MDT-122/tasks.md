# Tasks: MDT-122

**Source**: MDT-122 CR specification

## Scope Boundaries

- `shared/utils/server-logger.ts`: Level-based logger (debug, info, warn, error) using `console.error()` which ESLint already allows. Must not add external dependencies.
- `server/server.ts`: Replace 29 `console.log` calls with appropriate logger levels. Must not change log message semantics.
- `server/routes/sse.ts`: Replace 3 `console.log` calls for SSE connection lifecycle events. Must not change event handling behavior.
- `server/routes/system.ts`: Replace 5 `console.log` calls for devtools debugging. Must not change API behavior.
- **No ESLint config changes**: Logger uses `console.error()` which is already allowed by `@antfu/eslint-config`.

## Dependency Graph

```
Task 1 (Create logger)
  ↓
Task 2 (Build shared)
  ↓
Task 3 (Update server.ts - 29 calls)
  ↓
Task 4 (Update routes/sse.ts - 3 calls)
  ↓
Task 5 (Update routes/system.ts - 5 calls)
  ↓
Task 6 (Verify ESLint + functionality)
```

## Tasks

### Task 1: Create Structured Logger Module

**Structure**: `shared/utils/server-logger.ts`

**Makes GREEN**:
- `npm run lint:server` - After all replacements, 37 errors resolved
- ESLint no-console rule compliance

**Scope**: Create lightweight level-based logger using `console.error()` which ESLint allows.

**Create**:
- `shared/utils/server-logger.ts`:
  ```typescript
  const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 }
  let currentLevel = LOG_LEVELS.info

  export const logger = {
    debug: (...args: unknown[]) => currentLevel <= LOG_LEVELS.debug && console.error('[DEBUG]', ...args),
    info:  (...args: unknown[]) => currentLevel <= LOG_LEVELS.info  && console.error('[INFO]', ...args),
    warn:  (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
  }

  export function setLevel(level: keyof typeof LOG_LEVELS) {
    currentLevel = LOG_LEVELS[level]
  }
  ```

**Key design decisions**:
- Uses `console.error()` for debug/info to satisfy ESLint's no-console rule
- Prefixes messages with `[DEBUG]`, `[INFO]` for visual clarity
- Supports level filtering via `setLevel()`
- Zero external dependencies

**Anti-duplication**:
- Do NOT duplicate existing `shared/utils/logger.ts` (which provides `logQuiet` for different use case)
- This is a NEW module specifically for server-side logging with levels

**Verify**:
```bash
cat shared/utils/server-logger.ts
```

**Done when**:
- [x] `shared/utils/server-logger.ts` created with export `logger` object
- [x] `logger` has debug, info, warn, error methods
- [x] `setLevel()` function exported for optional level filtering
- [x] TypeScript compiles without errors

---

### Task 2: Build Shared Module

**Structure**: Build output in `shared/dist/`

**Makes GREEN**:
- Server code can import from `shared/utils/server-logger.js`

**Scope**: Compile the new logger module so it can be imported by server code.

**Run**:
```bash
npm run build:shared
```

**Why required**:
- Server code imports from compiled `shared/dist/` (not TypeScript source)
- Must run before importing logger in server files

**Verify**:
```bash
ls -la shared/dist/utils/server-logger.js
# OR
ls -la shared/dist/utils/server-logger.d.ts
```

**Done when**:
- [x] `npm run build:shared` completes without errors (skipped - logger imported directly as TS)
- [x] `server-logger.js` and/or `.d.ts` exists in `shared/dist/utils/` (not needed - direct import works)

---

### Task 3: Migrate server.ts Logging (29 calls)

**Structure**: `server/server.ts`

**Makes GREEN**:
- 29 ESLint no-console errors resolved in `server.ts`

**Scope**: Replace all `console.log` calls with appropriate logger levels.

**Import at top of file**:
```typescript
import { logger } from '../../shared/utils/server-logger'
```

**Replacements** (line numbers from current codebase):

| Line | Original | Replacement | Level | Rationale |
|------|----------|-------------|-------|-----------|
| 165 | `console.log('🔍 Discovering projects for file watching...')` | `logger.info('🔍 Discovering projects for file watching...')` | info | Operational startup |
| 169 | `console.log(\`Found ${projects.length} projects for file watching\`)` | `logger.info(\`Found ${projects.length} projects for file watching\`)` | info | Operational startup |
| 179 | `console.log(\`Skipping inactive project: ${serverProject.project.name}\`)` | `logger.info(\`Skipping inactive project: ${serverProject.project.name}\`)` | info | Operational info |
| 195 | `console.log(\`No config found for project: ${serverProject.project.name}\`)` | `logger.warn(\`No config found for project: ${serverProject.project.name}\`)` | warn | Config issue |
| 213 | `console.log(\`✅ Will watch project ${serverProject.project.name} at: ${watchPath}\`)` | `logger.info(\`✅ Will watch project ${serverProject.project.name} at: ${watchPath}\`)` | info | Operational confirmation |
| 216 | `console.log(\`⚠️  CR directory not found for project ${serverProject.project.name}: ${fullCRPath}\`)` | `logger.warn(\`⚠️  CR directory not found for project ${serverProject.project.name}: ${fullCRPath}\`)` | warn | Missing directory |
| 225 | `console.log('⚠️  No valid project paths found, falling back to single watcher')` | `logger.warn('⚠️  No valid project paths found, falling back to single watcher')` | warn | Fallback behavior |
| 229 | `console.log(\`📡 Single file watcher initialized for: ${watchPath}\`)` | `logger.info(\`📡 Single file watcher initialized for: ${watchPath}\`)` | info | Operational confirmation |
| 233 | `console.log(\`📡 Multi-project file watchers initialized for ${projectPaths.length} directories\`)` | `logger.info(\`📡 Multi-project file watchers initialized for ${projectPaths.length} directories\`)` | info | Operational confirmation |
| 236 | `console.log(\`   📂 ${project.id}: ${project.path}\`)` | `logger.info(\`   📂 ${project.id}: ${project.path}\`)` | info | Operational info |
| 248 | `console.log(\`📡 Fallback file watcher initialized for: ${watchPath}\`)` | `logger.info(\`📡 Fallback file watcher initialized for: ${watchPath}\`)` | info | Operational confirmation |
| 306 | `console.log('Creating sample tickets...')` | `logger.info('Creating sample tickets...')` | info | Operational info |
| 318 | `console.log(\`🚀 Ticket board server running on port ${PORT}\`)` | `logger.info(\`🚀 Ticket board server running on port ${PORT}\`)` | info | Startup banner |
| 319-332 | Server banner (14 lines) | All → `logger.info(...)` | info | Startup banner |
| 343 | `console.log('Received SIGTERM, shutting down gracefully...')` | `logger.info('Received SIGTERM, shutting down gracefully...')` | info | Shutdown event |
| 349 | `console.log('Received SIGINT, shutting down gracefully...')` | `logger.info('Received SIGINT, shutting down gracefully...')` | info | Shutdown event |

**Log level mapping**:
- `info`: Normal operational messages (startup, initialization, connection events)
- `warn`: Config issues, missing directories, fallback behavior
- `debug`: (none in server.ts currently)
- `error`: Already using `console.error()` for actual errors

**Anti-duplication**:
- Do NOT change log message semantics - only the method call
- Preserve all emoji and formatting for readability

**Verify**:
```bash
npm run lint:server 2>&1 | grep "server.ts" | wc -l
# Should show 0 errors for server.ts
```

**Done when**:
- [x] Import statement added: `import { logger } from '../../shared/utils/server-logger'`
- [x] All 29 `console.log` calls replaced with `logger.info()` or `logger.warn()`
- [x] ESLint shows 0 errors for `server.ts`
- [x] File compiles without TypeScript errors

---

### Task 4: Migrate routes/sse.ts Logging (3 calls)

**Structure**: `server/routes/sse.ts`

**Makes GREEN**:
- 3 ESLint no-console errors resolved in `routes/sse.ts`

**Scope**: Replace SSE connection lifecycle logging.

**Import at top of file**:
```typescript
import { logger } from '../../shared/utils/server-logger'
```

**Replacements**:

| Line | Original | Replacement | Level | Rationale |
|------|----------|-------------|-------|-----------|
| 63 | `console.log(\`SSE client connected. Total clients: ${fileWatcher.getClientCount()}\`)` | `logger.info(\`SSE client connected. Total clients: ${fileWatcher.getClientCount()}\`)` | info | Connection lifecycle |
| 67 | `console.log('SSE client disconnected')` | `logger.info('SSE client disconnected')` | info | Connection lifecycle |
| 72 | `console.log('SSE client aborted')` | `logger.info('SSE client aborted')` | info | Connection lifecycle |

**Verify**:
```bash
npm run lint:server 2>&1 | grep "routes/sse.ts" | wc -l
# Should show 0 errors for sse.ts
```

**Done when**:
- [x] Import statement added: `import { logger } from '../../shared/utils/server-logger'`
- [x] All 3 `console.log` calls replaced with `logger.info()`
- [x] ESLint shows 0 errors for `routes/sse.ts`
- [x] File compiles without TypeScript errors

---

### Task 5: Migrate routes/system.ts Logging (5 calls)

**Structure**: `server/routes/system.ts`

**Makes GREEN**:
- 5 ESLint no-console errors resolved in `routes/system.ts`

**Scope**: Replace devtools debugging logs.

**Import at top of file**:
```typescript
import { logger } from '../../shared/utils/server-logger'
```

**Replacements**:

| Line | Original | Replacement | Level | Rationale |
|------|----------|-------------|-------|-----------|
| 274 | `console.log(\`🔍 Enhanced path check for "${inputPath}": expanded="${expandedPath}", exists=${result.exists}, inDiscovery=${result.isInDiscovery}\`)` | `logger.debug(\`🔍 Enhanced path check for "${inputPath}": expanded="${expandedPath}", exists=${result.exists}, inDiscovery=${result.isInDiscovery}\`)` | debug | Detailed debugging |
| 309 | `console.log('🗑️  Clearing file operation cache')` | `logger.info('🗑️  Clearing file operation cache')` | info | Cache operation |
| 351 | `console.log(\`Reading config from: ${configPath}\`)` | `logger.debug(\`Reading config from: ${configPath}\`)` | debug | Config operation |
| 419 | `console.log(\`Reading global config from: ${configPath}\`)` | `logger.debug(\`Reading global config from: ${configPath}\`)` | debug | Config operation |
| 493 | `console.log('🔄 Config cache cleared')` | `logger.info('🔄 Config cache cleared')` | info | Cache operation |

**Log level mapping**:
- `debug`: Path checks, config reads (detailed debugging info)
- `info`: Cache operations (operational events)

**Verify**:
```bash
npm run lint:server 2>&1 | grep "routes/system.ts" | wc -l
# Should show 0 errors for system.ts
```

**Done when**:
- [x] Import statement added: `import { logger } from '../../shared/utils/server-logger'`
- [x] All 5 `console.log` calls replaced with `logger.debug()` or `logger.info()`
- [x] ESLint shows 0 errors for `routes/system.ts`
- [x] File compiles without TypeScript errors

---

### Task 6: Verification and Testing

**Structure**: Full server lint check + functional verification

**Makes GREEN**:
- All 37 ESLint no-console errors resolved
- Server functionality unchanged (logs still appear)

**Scope**: Verify ESLint compliance and confirm logging behavior preserved.

**ESLint verification**:
```bash
npm run lint:server
```
Expected: Exit code 0, 0 errors

**Functional verification**:
```bash
# Start server and check console output
npm run dev:server
```
Expected:
- Server starts without errors
- Console shows `[INFO]` and `[DEBUG]` prefixes on log messages
- All original log messages still appear (just with level prefixes)

**Spot checks** (look for these in server startup output):
- `[INFO] 🔍 Discovering projects for file watching...`
- `[INFO] 📡 Multi-project file watchers initialized...`
- `[INFO] 🚀 Ticket board server running on port...`

**Optional level filtering test**:
```typescript
// In server.ts, temporarily add to test level filtering:
import { setLevel } from '../../shared/utils/server-logger'
setLevel('warn')  // Should suppress debug/info, only show warn/error
```

**Verify log count matches**:
```bash
# Count logger calls in each file (should equal original console.log count)
grep -c "logger\." server/server.ts       # Expect 29
grep -c "logger\." server/routes/sse.ts   # Expect 3
grep -c "logger\." server/routes/system.ts # Expect 5
```

**Done when**:
- [x] `npm run lint:server` passes with exit code 0, 0 errors
- [x] Server starts without errors (`npm run dev:server`)
- [x] Console output shows `[INFO]`/`[DEBUG]`/`[WARN]`/`[ERROR]` prefixes
- [x] All original log messages still appear (37 total across 3 files)
- [x] No changes to server behavior or API responses

---

## Summary

| Task | File(s) | Changes | Blocks |
|------|---------|---------|--------|
| 1 | `shared/utils/server-logger.ts` | Create new logger module | 2 |
| 2 | N/A (build) | Compile shared code | 3 |
| 3 | `server/server.ts` | 29 replacements | 4, 5, 6 |
| 4 | `server/routes/sse.ts` | 3 replacements | 6 |
| 5 | `server/routes/system.ts` | 5 replacements | 6 |
| 6 | All | Verification | - |

**Total**: 37 `console.log` → `logger.*` replacements
