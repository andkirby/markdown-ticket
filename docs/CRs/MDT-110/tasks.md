# Tasks: MDT-110

**Source**: [architecture.md](./architecture.md)
**Generated**: 2025-12-28
**Status**: Pending implementation

## Project Context

| Setting | Value |
|---------|-------|
| **Source Directory** | `shared/tools/` |
| **Build Command** | `npm run build:shared && npm run build` |
| **Test Command** | `cd shared && npm test -- --testPathPattern=MDT-110` |
| **Extension** | `.ts` |

## Size Thresholds

| Role | Default | Hard Max |
|------|---------|----------|
| **feature** | 150 | 225 |
| **complex** | 200 | 300 |
| **utility** | 100 | 150 |
| **orchestration** | 75 | 112 |

## Shared Patterns

Import from these, DO NOT copy:

| From | Import |
|------|--------|
| `shared/utils/path-browser.ts` | `isAbsolute`, `normalize` |
| `shared/tools/ProjectValidator.ts` | Base class for Node extension |

---

## Phase 1: Refactor Base Validator (Browser-Safe)

**Makes GREEN**: `MDT-110.browser.test.ts` (P1-1, P1-2, P1-3)

### Task 1.1: Create browser-safe ProjectValidator base

**Limit**: 150 lines (Hard Max: 225)
**Structure**: `shared/tools/ProjectValidator.ts`

**Changes**:
- Remove `import * as fs/os/path` at top (lines 1-3)
- Keep imports from `path-browser.ts` only
- Keep all method signatures identical
- Modify `validatePath()` to format check only:
  - Remove `isNodeEnv` detection
  - Always skip filesystem existence check
  - Return path as-is (no `path.resolve` with `process.cwd()`)
- Modify `expandTildePath()`:
  - Remove `os.homedir()` call
  - Return input unchanged (no tilde expansion)
- Keep all other methods unchanged:
  - `validateName()`
  - `validateCode()`
  - `validateDescription()`
  - `validateRepository()`
  - `isValidUrl()`
  - `generateCodeFromName()`
  - `validateTicketsPath()` (already uses path-browser)

**Result**: Browser can import without Node.js module errors

---

## Phase 2: Create Node.js Extension

**Makes GREEN**: `MDT-110.node.test.ts` (P2-1, P2-2, P2-3)

### Task 2.1: Create ProjectValidator.node.ts

**Limit**: 100 lines (Hard Max: 150)
**Structure**: `shared/tools/ProjectValidator.node.ts`

**Implementation**:
- Import base class: `import { ProjectValidator as BaseProjectValidator, ValidationResult } from './ProjectValidator.js';`
- Import Node.js modules: `import * as fs from 'fs'; import * as os from 'os'; import * as path from 'path';`
- Export class extending base: `export class ProjectValidator extends BaseProjectValidator {}`
- Override `validatePath()` with full filesystem support:
  - Call `this.expandTildePath()` first
  - Convert to absolute path using `path.resolve()`
  - If `options.mustExist`: check `fs.existsSync()` and `fs.statSync().isDirectory()`
  - Return `{ valid, normalized: absolutePath, error? }`
- Override `expandTildePath()` with `os.homedir()`:
  - Replace `~` with `os.homedir()`
  - Return expanded path
- Re-export all other methods from base (no override needed)

**Result**: Node.js consumers get full filesystem validation

---

## Phase 3: Update Package Exports

**Makes GREEN**: `MDT-110.exports.test.ts` (P3-1)

### Task 3.1: Add conditional exports to shared/package.json

**Limit**: 50 lines (Hard Max: 75)
**Structure**: `shared/package.json`

**Changes**:
- Add conditional export for `./tools/ProjectValidator`:
  ```json
  "./tools/ProjectValidator": {
    "browser": "./dist/tools/ProjectValidator.js",
    "node": "./dist/tools/ProjectValidator.node.js",
    "default": "./dist/tools/ProjectValidator.node.js"
  }
  ```
- Keep existing generic `./tools/*` export for other tools

**Result**: Bundler selects correct implementation based on environment

---

## Phase 4: Verify Build

**Makes GREEN**: Build verification (P4-1)

### Task 4.1: Run build and verify success

**Limit**: N/A (verification task)
**Steps**:
1. Run `npm run build:shared` — verify TypeScript compiles both files
2. Run `npm run build` — verify Vite builds without fs/os/path errors
3. Verify browser console has no missing module warnings
4. Run test command: `cd shared && npm test -- --testPathPattern=MDT-110`

**Expected Result**:
- ✅ Build completes without errors
- ✅ All tests pass (MDT-110.browser, MDT-110.node, MDT-110.exports)

---

## Task → Test Mapping

| Task | Test File | Requirements |
|------|-----------|--------------|
| 1.1 | `MDT-110.browser.test.ts` | P1-1, P1-2, P1-3 |
| 2.1 | `MDT-110.node.test.ts` | P2-1, P2-2, P2-3 |
| 3.1 | `MDT-110.exports.test.ts` | P3-1 |
| 4.1 | Build verification | P4-1 |

---

## Progress Tracking

- [x] Task 1.1: Create browser-safe ProjectValidator base ⚠️ 222 lines (flagged)
- [x] Task 2.1: Create ProjectValidator.node.ts
- [x] Task 3.1: Add conditional exports to package.json
- [x] Task 4.1: Verify build success

**Status**: 4/4 tasks complete
