# Tests: MDT-110

**Mode**: Bug Fix (Refactoring)
**Source**: [architecture.md](./architecture.md)
**Generated**: 2025-12-28
**Status**: 🔴 RED (implementation pending)

## Test Configuration

| Setting | Value |
|---------|-------|
| Framework | Jest |
| Test Directory | `shared/tools/__tests__/` |
| Test Command | `cd shared && npm test -- --testPathPattern=MDT-110` |
| Build Command | `npm run build:shared && npm run build` |

## Problem Statement

Frontend build fails because `ProjectValidator.ts` imports Node.js modules (`fs`, `os`, `path`) that cannot be bundled for browser execution. The fix uses conditional exports to provide browser-safe and Node.js-specific implementations while maintaining a single import path.

## Test Strategy

### Refactoring Mode: Behavioral Preservation

This is a **refactoring CR** — tests must verify:
1. **Browser validation** works correctly without Node.js modules
2. **Node.js validation** retains full filesystem capabilities
3. **Single import path** works in both environments
4. **Build completes** without errors

## Requirement → Test Mapping

| Req ID | Description | Test File | Scenarios | Status |
|--------|-------------|-----------|-----------|--------|
| P1-1 | Browser-safe base validator | `MDT-110.browser.test.ts` | 8 | 🔴 RED |
| P1-2 | validatePath() format-only in browser | `MDT-110.browser.test.ts` | 3 | 🔴 RED |
| P1-3 | expandTildePath() no-op in browser | `MDT-110.browser.test.ts` | 2 | 🔴 RED |
| P2-1 | Node.js extension with filesystem | `MDT-110.node.test.ts` | 6 | 🔴 RED |
| P2-2 | validatePath() with mustExist in Node | `MDT-110.node.test.ts` | 4 | 🔴 RED |
| P2-3 | expandTildePath() with os.homedir() | `MDT-110.node.test.ts` | 2 | 🔴 RED |
| P3-1 | Conditional exports configuration | `MDT-110.exports.test.ts` | 3 | 🔴 RED |
| P4-1 | Frontend build succeeds | Build verification | 1 | 🔴 RED |

## Test Specifications

### Feature: Browser-Safe Validation (Phase 1)

**File**: `shared/tools/__tests__/MDT-110.browser.test.ts`
**Covers**: P1-1, P1-2, P1-3

#### Scenario: browser_validateName (P1-1)

```gherkin
Given a browser environment (no Node.js modules available)
When validating project name "My Test Project"
Then should return valid with normalized "My Test Project"
And should reject empty names
And should reject names over 100 characters
```

#### Scenario: browser_validateCode (P1-1)

```gherkin
Given a browser environment
When validating project code "MDT1"
Then should return valid with normalized "MDT1"
And should reject lowercase "mdt1"
And should reject codes with invalid patterns
```

#### Scenario: browser_validatePath_format_only (P1-2)

```gherkin
Given a browser environment
When validating absolute path "/Users/test/project"
Then should return valid without checking filesystem existence
When validating relative path "docs/tickets"
Then should return valid with path as-is
When mustExist option is provided
Then should ignore it (browser can't check filesystem)
```

#### Scenario: browser_expandTildePath_no_op (P1-3)

```gherkin
Given a browser environment (no os.homedir available)
When expanding path "~/documents"
Then should return "~/documents" unchanged (tilde not expanded)
```

---

### Feature: Node.js Extension (Phase 2)

**File**: `shared/tools/__tests__/MDT-110.node.test.ts`
**Covers**: P2-1, P2-2, P2-3

#### Scenario: node_validatePath_with_filesystem (P2-1, P2-2)

```gherkin
Given a Node.js environment with filesystem access
When validating existing path "/tmp" with mustExist: true
Then should return valid with absolute path
When validating non-existent path with mustExist: true
Then should return invalid with "does not exist" error
When validating file path (not directory) with mustExist: true
Then should return invalid with "not a directory" error
When validating without mustExist option
Then should return valid without checking filesystem
```

#### Scenario: node_expandTildePath_with_homedir (P2-3)

```gherkin
Given a Node.js environment
When expanding path "~/documents"
Then should replace "~" with os.homedir()
And should return absolute path
```

#### Scenario: node_all_other_methods_unchanged (P2-1)

```gherkin
Given a Node.js environment
When calling validateName(), validateCode(), validateRepository(), etc.
Then should behave identically to browser version
```

---

### Feature: Conditional Exports (Phase 3)

**File**: `shared/tools/__tests__/MDT-110.exports.test.ts`
**Covers**: P3-1

#### Scenario: exports_browser_condition (P3-1)

```gherkin
Given package.json with conditional exports
When bundler resolves ProjectValidator in browser context
Then should select "./dist/tools/ProjectValidator.js"
```

#### Scenario: exports_node_condition (P3-1)

```gherkin
Given package.json with conditional exports
When Node.js module requires ProjectValidator
Then should select "./dist/tools/ProjectValidator.node.js"
```

#### Scenario: imports_unchanged (P3-1)

```gherkin
Given frontend code imports ProjectValidator
When import path is "@mdt/shared/tools/ProjectValidator"
Then should work without modification in both environments
```

---

## Edge Cases

| Scenario | Expected Behavior | Test | Req |
|----------|-------------------|------|-----|
| Empty project code | ValidationError | browser.test.ts | P1-1 |
| Invalid path format | ValidationError (browser) | browser.test.ts | P1-2 |
| Non-existent path with mustExist | ValidationError (Node) | node.test.ts | P2-2 |
| Tilde in Windows path | Expand correctly (Node) | node.test.ts | P2-3 |
| Build attempts to bundle fs | Should use browser version | exports.test.ts | P3-1 |

## Generated Test Files

| File | Scenarios | Lines | Status |
|------|-----------|-------|--------|
| `shared/tools/__tests__/MDT-110.browser.test.ts` | 13 | ~300 | 🔴 RED |
| `shared/tools/__tests__/MDT-110.node.test.ts` | 12 | ~280 | 🔴 RED |
| `shared/tools/__tests__/MDT-110.exports.test.ts` | 3 | ~100 | 🔴 RED |

## Verification

Run MDT-110 tests (should all fail before implementation):
```bash
cd shared && npm test -- --testPathPattern=MDT-110
```

Expected: **~28 failed, 0 passed**

Verify build fails before fix:
```bash
npm run build
```
Expected: `[plugin vite:resolve] Module "fs" has been externalized for browser compatibility`

## Coverage Checklist

- [x] Browser validation behavior covered
- [x] Node.js filesystem behavior covered
- [x] Conditional exports configuration covered
- [x] Edge cases documented
- [x] Build verification specified
- [ ] Tests are RED (verified manually)
- [ ] No Node.js modules imported in browser version

## Behavioral Contract (Preservation)

### Current Behavior (must preserve)

| Method | Current Behavior | Browser | Node.js |
|--------|------------------|---------|---------|
| `validateName()` | Trim, check empty, max 100 chars | Same | Same |
| `validateCode()` | Regex `^[A-Z][A-Z0-9]{1,4}$` | Same | Same |
| `validatePath()` | Format + filesystem check | Format only | Format + filesystem |
| `validateDescription()` | Trim, max 500 chars | Same | Same |
| `validateRepository()` | URL validation or empty | Same | Same |
| `expandTildePath()` | Replace `~` with `os.homedir()` | No-op | Replace with homedir |
| `isValidUrl()` | URL constructor check | Same | Same |
| `generateCodeFromName()` | First letters or first 3 chars | Same | Same |
| `validateTicketsPath()` | Relative path validation | Same | Same |

---

## For Implementation

Each task in `/mdt:tasks` should reference which tests it will make GREEN:

| Task | Makes GREEN |
|------|-------------|
| Task 1.1 (Refactor base validator) | `MDT-110.browser.test.ts` (P1-1, P1-2, P1-3) |
| Task 2.1 (Create Node.js extension) | `MDT-110.node.test.ts` (P2-1, P2-2, P2-3) |
| Task 3.1 (Update package exports) | `MDT-110.exports.test.ts` (P3-1) |
| Task 4.1 (Verify build) | Build verification (P4-1) |

After each task: `cd shared && npm test -- --testPathPattern=MDT-110` should show fewer failures.
