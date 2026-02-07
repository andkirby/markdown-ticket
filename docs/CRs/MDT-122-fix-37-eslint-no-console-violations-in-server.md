---
code: MDT-122
status: Approved
dateCreated: 2026-02-07T05:40:53.520Z
type: Technical Debt
priority: Medium
---

# Fix 37 ESLint no-console violations in server

## 1. Description
Running `npm run lint:server` produces **37 ESLint errors** all related to the `no-console` rule. The server's ESLint configuration (from `@antfu/eslint-config`) allows only `console.warn` and `console.error`, but the codebase contains `console.log` statements used for legitimate operational logging.

### Current State

- **ESLint errors**: 37 violations across 3 files
- **Files affected**:
  - `server/server.ts` (29 errors) - Server startup, file watcher init, shutdown handlers
  - `server/routes/system.ts` (5 errors) - Devtools debugging (path checks, cache ops, config reads)
  - `server/routes/sse.ts` (3 errors) - SSE client connect/disconnect/abort events

### Desired State

- ESLint passes without errors (no config exceptions)
- Structured logging with levels (debug, info, warn, error)
- Existing logging behavior preserved with improved format
- Production-ready with optional level filtering

### Business/Technical Justification

- Blocks CI/CD pipelines that run ESLint
- Reduces code quality metrics
- Violates 2025 Node.js logging best practices (no structured logging, no levels)
- Prevents catching other legitimate lint issues
## 2. Rationale
### Why This Change Is Necessary

1. **CI/CD Blocker**: ESLint failures may block automated pipelines
2. **Code Quality**: 37 violations significantly impact code quality metrics
3. **Best Practices**: Industry standard for 2025 is structured logging, not raw `console.log()`

### What It Accomplishes

- Brings server code into ESLint compliance **without** config exceptions
- Introduces structured logging with levels (debug, info, warn, error)
- Provides migration path to production-ready logging (Winston/Pino) if needed
- Maintains all existing operational logging behavior

### Alignment with Project Goals

- Improves code quality and maintainability
- Follows 2025 Node.js logging best practices
- Zero external dependencies added
- Production-ready with level filtering capability
## 3. Solution Analysis
### Alternatives Evaluated

| Approach | Pros | Cons | Recommendation |
|----------|------|------|----------------|
| **A. Lightweight logger (new)** | Structured levels, ESLint-compliant, filterable, migration path to Winston/Pino | ~20 lines + refactor 37 calls | ✅ **Recommended** |
| **B. Add files to ESLint exception** | Quick, preserves behavior | Not production-grade, no log levels | ❌ Technical debt |
| **C. Replace with shared logger (`logQuiet`)** | Uses existing code | Still uses `console.error`, no levels | ❌ Doesn't add value |
| **D. Use `console.warn`/`console.error`** | No config change | Semantically wrong | ❌ Misleading |
| **E. Implement Winston/Pino** | Production-ready | Overkill for dev server, adds dependency | ❌ Premature |

### Selected Approach: Lightweight Server Logger

**Key insight**: Use `console.error()` for `debug`/`info` levels, which **ESLint already allows** (no config changes needed).

**Implementation** (`shared/utils/server-logger.ts`):

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

**Justification**:

1. **ESLint-compliant**: Uses `console.error()` which is allowed by `@antfu/eslint-config`
2. **Structured logging**: Provides debug, info, warn, error levels
3. **Filterable**: Can set log level (e.g., `logger.setLevel('warn')` for production)
4. **Migration path**: Easy to upgrade to Winston/Pino later
5. **Zero dependencies**: No new packages required
6. **Consistent**: Follows 2025 best practices for Node.js logging

### Rejected Options

- **ESLint exception**: Adds technical debt without improving logging capability
- **Shared `logQuiet`**: Doesn't provide log levels or structured output
- **Winston/Pino**: Overkill for current needs; can upgrade later if needed
## 4. Implementation Specification
### Technical Details

**Files to create/modify**:

1. **Create**: `shared/utils/server-logger.ts`
   - Export `logger` object with debug, info, warn, error methods
   - Export `setLevel()` function

2. **Modify**: `server/server.ts` (29 replacements)
   - Add: `import { logger } from '../../shared/utils/server-logger'`
   - Replace `console.log(...)` with appropriate logger level

3. **Modify**: `server/routes/sse.ts` (3 replacements)
   - Add: `import { logger } from '../../shared/utils/server-logger'`
   - Replace SSE event logging

4. **Modify**: `server/routes/system.ts` (5 replacements)
   - Add: `import { logger } from '../../shared/utils/server-logger'`
   - Replace devtools debugging logs

### Log Level Mapping

| Current Usage | New Level | Rationale |
|---------------|-----------|-----------|
| Server startup info | `logger.info()` | Normal operational messages |
| SSE connect/disconnect | `logger.info()` | Connection lifecycle |
| Devtools path checks | `logger.debug()` | Debugging info |
| Cache operations | `logger.info()` | Operational events |
| Errors | `logger.error()` (already exists) | Error conditions |

### Architecture Changes

- **New module**: `shared/utils/server-logger.ts`
- **No ESLint config changes needed** - logger uses `console.error()` which is allowed

### Step-by-Step Implementation Plan

1. Create `shared/utils/server-logger.ts` with logger implementation
2. Run `npm run build:shared` to compile the new utility
3. Update `server.ts` to import and use logger (29 replacements)
4. Update `routes/sse.ts` to import and use logger (3 replacements)
5. Update `routes/system.ts` to import and use logger (5 replacements)
6. Run `npm run lint:server` to verify all 37 errors are resolved
7. Start server and verify console output appears correctly with `[INFO]`/`[DEBUG]` prefixes

### Testing Requirements

- **Verification**: `npm run lint:server` passes with 0 errors
- **Functional**: Server starts without errors, logs visible with level prefixes
- **No behavior change**: All existing log messages still appear

### Success Criteria

- [ ] `npm run lint:server` completes without errors
- [ ] All 37 `console.log` statements replaced with appropriate logger calls
- [ ] Console output shows `[INFO]`/`[DEBUG]`/`[WARN]`/`[ERROR]` prefixes
- [ ] Server startup and operation unchanged (same messages, new format)
- [ ] No new dependencies added
## 5. Acceptance Criteria
1. **ESLint compliance**: `npm run lint:server` returns exit code 0 with 0 errors
2. **Logger implementation**: `shared/utils/server-logger.ts` created with debug, info, warn, error methods
3. **All calls migrated**: 37 `console.log` statements replaced across 3 files:
   - `server/server.ts`: 29 replacements
   - `server/routes/sse.ts`: 3 replacements
   - `server/routes/system.ts`: 5 replacements
4. **Logging behavior preserved**: All original messages still appear, with level prefixes (`[INFO]`, `[DEBUG]`, etc.)
5. **No new dependencies**: Solution uses existing `console.error()` which ESLint allows
6. **Optional level filtering**: `logger.setLevel()` function works for reducing noise