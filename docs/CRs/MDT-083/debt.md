# MDT-083 Technical Debt Analysis

**CR**: MDT-083
**Date**: 2025-12-04
**Files Analyzed**: 17
**Debt Items Found**: 8 (3 High, 3 Medium, 2 Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/` |
| File extension | `.ts` |
| Max file size | Varies by role (75-300 lines) |

## Summary

The implementation of MDT-083 successfully extracted the 1122-line ProjectService monolith into smaller, focused services and utilities. However, several technical debt patterns were identified including duplicated file operations across services, missed utility usage, and some files approaching or exceeding size limits.

## Size Compliance

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `shared/services/project/ProjectConfigService.ts` | 213 | ≤300 | ⚠️ Flagged (over 200 default) |
| `shared/services/ProjectService.ts` | 150 | ≤150 | ✅ At hard max |
| `shared/services/project/ProjectRegistry.ts` | 126 | ≤300 | ✅ |
| `shared/services/project/ProjectCacheService.ts` | 125 | ≤300 | ✅ |
| `shared/services/project/types.ts` | 124 | ≤150 | ✅ |
| `shared/services/project/ProjectDiscoveryService.ts` | 121 | ≤300 | ✅ |
| `shared/services/project/ProjectScanner.ts` | 112 | ≤300 | ✅ |
| `shared/utils/config-validator.ts` | 96 | ≤110 | ⚠️ Flagged (over 75 default) |
| `shared/utils/path-resolver.ts` | 93 | ≤110 | ⚠️ Flagged (over 75 default) |
| `shared/utils/constants.ts` | 146 | ≤110 | ❌ Exceeds hard max |
| `shared/utils/file-utils.ts` | 57 | ≤110 | ✅ |
| `shared/utils/toml.ts` | 52 | ≤110 | ✅ |
| `shared/utils/logger.ts` | 26 | ≤110 | ✅ |

## High Severity

### 1. Size Violation: constants.ts exceeds utility hard limit

- **Location**: `shared/utils/constants.ts` (146 lines)
- **Evidence**: File has 146 lines, utility hard max is 110 lines
- **Impact**: Continues the pattern of large utility files that MDT-083 aimed to fix
- **Suggested Fix**: Extract theme configuration or constants into separate focused files

### 2. Duplication: Direct file operations bypass shared utilities

- **Location**:
  - `shared/services/project/ProjectRegistry.ts:67`
  - `shared/services/MarkdownService.ts:26,30,42,48`
  - `shared/services/TemplateService.ts:40,44,49`
- **Evidence**: These services use `fs.readFileSync`, `fs.existsSync`, `fs.writeFileSync` directly instead of importing from `shared/utils/file-utils.ts`
- **Impact**: Defeats the purpose of extracted utilities, creates duplicate error handling patterns
- **Suggested Fix**: Import and use `exists()`, `readFile()`, `writeFile()` from `shared/utils/file-utils.ts`

### 3. Hidden Coupling: ProjectRegistry uses internal project path format

- **Location**: `shared/services/project/ProjectRegistry.ts:65-69`
- **Evidence**: Registry constructs file paths using internal `.mdt-config.toml` naming convention
- **Impact**: Couples registry to specific file format, makes format changes difficult
- **Suggested Fix**: Use ProjectConfigService to handle path construction and file I/O

## Medium Severity

### 4. Shotgun Surgery: Adding new project operations requires editing multiple files

- **Location**: Across project services
- **Evidence**: Adding a new project operation requires updates to:
  - Service interface in `types.ts`
  - Service implementation
  - ProjectService facade delegation
  - Service constructor injection
- **Impact**: Simple changes ripple across multiple files, increasing error risk
- **Suggested Fix**: Consider using a service registry pattern or plugin architecture

### 5. Missing Abstraction: Project file format scattered across services

- **Location**: `shared/services/project/ProjectRegistry.ts`, `shared/services/project/ProjectConfigService.ts`
- **Evidence**: Multiple services hardcode `.mdt-config.toml` filename and structure
- **Impact**: Changing project file format requires updates across multiple services
- **Suggested Fix**: Create a `ProjectFileFormat` abstraction that centralizes file naming and structure

### 6. Responsibility Diffusion: Configuration validation split across utilities

- **Location**: `shared/utils/config-validator.ts` (96 lines) and `shared/services/project/ProjectConfigService.ts`
- **Evidence**: Config validation logic exists in both utility and service, unclear separation
- **Impact**: Difficult to understand where validation rules should be modified
- **Suggested Fix**: Clarify responsibilities: utility for schema validation, service for business validation

## Low Severity

### 7. Inconsistent Error Handling: Mix of thrown errors and returned values

- **Location**: Across project services
- **Evidence**: Some methods throw exceptions, others return error objects or undefined
- **Impact**: Inconsistent error handling patterns across the codebase
- **Suggested Fix**: Standardize on one error handling pattern (prefer thrown errors for truly exceptional cases)

### 8. Test Coverage Gaps: Missing tests for ProjectScanner and ProjectConfigLoader

- **Location**: `shared/services/project/__tests__/`
- **Evidence**: No test files found for `ProjectScanner.ts` and `ProjectConfigLoader.ts`
- **Impact**: Untested code may contain bugs or regressions
- **Suggested Fix**: Create unit tests following the pattern of existing service tests

## Suggested Inline Comments

**File**: `shared/services/project/ProjectRegistry.ts`
**Line**: 67
```typescript
// TECH-DEBT: Duplication - Direct file operations
// Impact: Defeats purpose of extracted file-utils, creates duplicate error handling
// Suggested: Import readFile() from shared/utils/file-utils.ts
// See: MDT-083/debt.md
```

**File**: `shared/utils/constants.ts`
**Line**: 1
```typescript
// TECH-DEBT: Size Violation - File exceeds 110-line hard max for utilities
// Impact: Continues pattern of large utility files
// Suggested: Extract theme config into separate constants/theme.ts
// See: MDT-083/debt.md
```

**File**: `shared/services/project/ProjectConfigService.ts`
**Line**: 1
```typescript
// TECH-DEBT: Size Violation - File exceeds 200-line default for features
// Impact: Service handling multiple concerns
// Suggested: Consider extracting validation logic to separate service
// See: MDT-083/debt.md
```

## Recommended Actions

### Immediate (High Severity)
1. [ ] Update all services to use `shared/utils/file-utils.ts` instead of direct fs operations
2. [ ] Extract theme constants from `constants.ts` into separate file
3. [ ] Create abstraction for project file format in ProjectConfigService

### Deferred (Medium/Low)
1. [ ] Consider service registry pattern to reduce shotgun surgery
2. [ ] Standardize error handling patterns across services
3. [ ] Create unit tests for ProjectScanner and ProjectConfigLoader
4. [ ] Clarify separation between utility-level and service-level validation

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| ProjectService.ts lines | 1122 | 150 | <300 | ✅ |
| ProjectConfigService.ts lines | — | 213 | <200 | ⚠️ |
| Utilities avg lines | — | 67 | <75 | ⚠️ |
| Total files | 1 | 9 | — | — |
| Debt items | — | 8 | 0 | ❌ |

---
*Generated: 2025-12-04*