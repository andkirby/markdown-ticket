# MDT-092 Technical Debt Analysis

**CR**: MDT-092
**Date**: 2025-12-16
**Files Analyzed**: 11
**Debt Items Found**: 6 (3 High, 2 Medium, 1 Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `shared/test-lib` |
| File extension | `.ts` |
| Max file size | 300 lines |

## Summary

The MDT-092 implementation successfully delivers an isolated test environment framework with static ports. However, several technical debt items were identified, most notably the ProjectFactory file exceeding the size limit by 66% (499 lines vs 300 lines limit), and significant duplication between test and production code paths.

## Size Compliance

| File | Lines | Target | Status |
|------|-------|--------|--------|
| `shared/test-lib/core/project-factory.ts` | 499 | <300 | ❌ |
| `shared/test-lib/ticket/file-ticket-creator.ts` | 326 | <300 | ❌ |
| `shared/test-lib/utils/retry-helper.ts` | 214 | <300 | ✅ |
| `shared/test-lib/core/test-server.ts` | 209 | <300 | ✅ |
| `shared/test-lib/types.ts` | 189 | <300 | ✅ |
| `shared/test-lib/core/test-environment.ts` | 163 | <300 | ✅ |
| `shared/test-lib/index.ts` | 156 | <300 | ✅ |
| `shared/test-lib/utils/process-helper.ts` | 146 | <300 | ✅ |
| `shared/test-lib/ticket/ticket-creator.ts` | 85 | <300 | ✅ |
| `shared/test-lib/config/ports.ts` | 85 | <300 | ✅ |
| `shared/test-lib/utils/temp-dir.ts` | 68 | <300 | ✅ |

## High Severity

### 1. Size Violation: ProjectFactory exceeds limit by 66%

- **Location**: `shared/test-lib/core/project-factory.ts` (499 lines)
- **Evidence**: File contains 499 lines, exceeding the 300-line limit from acceptance criteria
- **Impact**: File is difficult to navigate and maintain; violates architectural constraint
- **Suggested Fix**: Extract CR creation logic into separate modules, split validation helpers

### 2. Size Violation: FileTicketCreator exceeds limit by 8.7%

- **Location**: `shared/test-lib/ticket/file-ticket-creator.ts` (326 lines)
- **Evidence**: File contains 326 lines, exceeding the 300-line limit
- **Impact**: File is growing large with retry logic and file operations mixed together
- **Suggested Fix**: Extract retry logic into dedicated service, separate validation logic

### 3. Duplication: Retry logic duplicated across files

- **Location**: `file-ticket-creator.ts` (lines 25-33, 43-48, 83-89), `project-factory.ts` (multiple locations)
- **Evidence**: RetryHelper instantiated and configured similarly in multiple places
- **Impact**: Changing retry behavior requires updates in multiple files
- **Suggested Fix**: Create a singleton RetryService or extract retry configuration to a shared constant

## Medium Severity

### 4. Missing Abstraction: Test data structures lack unified interface

- **Location**: `project-factory.ts` (lines 15-29, 56-66), `types.ts`
- **Evidence**: SimpleCR, TestCRData, and TicketData interfaces represent similar concepts with overlapping fields
- **Impact**: Type conversion and mapping code scattered throughout; inconsistent data handling
- **Suggested Fix**: Create a unified TestTicket interface that extends/implements common base

### 5. Hidden Coupling: Direct file system operations in business logic

- **Location**: `file-ticket-creator.ts` (lines 37-63, 81-91), `project-factory.ts`
- **Evidence**: Business logic directly calling fs operations without abstraction layer
- **Impact**: Difficult to test file operations in isolation; coupling to Node.js fs API
- **Suggested Fix**: Create a FileSystemService interface with implementations for test/production

## Low Severity

### 6. Responsibility Diffusion: Error handling scattered across classes

- **Location**: Multiple files have custom error classes and handling
- **Evidence**: `ProjectFactoryError` in project-factory.ts, generic errors elsewhere
- **Impact**: Inconsistent error reporting and handling patterns
- **Suggested Fix**: Create common error hierarchy for test-lib operations

## Suggested Inline Comments

**File**: `shared/test-lib/core/project-factory.ts`
**Line**: 1
```typescript
// TECH-DEBT: Size Violation - File exceeds 300-line limit (499 lines)
// Impact: Difficult to navigate and maintain
// Suggested: Extract CR creation logic and validation helpers
// See: MDT-092/debt.md
```

**File**: `shared/test-lib/ticket/file-ticket-creator.ts`
**Line**: 25
```typescript
// TECH-DEBT: Duplication - Retry configuration duplicated
// Impact: Changing retry behavior requires multiple file updates
// Suggested: Create shared RetryService or configuration constant
// See: MDT-092/debt.md
```

**File**: `shared/test-lib/core/project-factory.ts`
**Line**: 15
```typescript
// TECH-DEBT: Missing Abstraction - Multiple similar ticket data structures
// Impact: Type conversion and mapping scattered throughout
// Suggested: Create unified TestTicket interface
// See: MDT-092/debt.md
```

## Recommended Actions

### Immediate (High Severity)
1. [ ] Split ProjectFactory into smaller modules (CR creation, validation, project setup)
2. [ ] Extract retry logic from FileTicketCreator into reusable service
3. [ ] Reduce FileTicketCreator size by extracting validation and retry logic

### Deferred (Medium/Low)
1. [ ] Create unified ticket data model interfaces
2. [ ] Introduce FileSystemService abstraction layer
3. [ ] Design common error hierarchy for test-lib

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| shared/test-lib/core/project-factory.ts lines | 499 | 300 | <300 | ❌ |
| shared/test-lib/ticket/file-ticket-creator.ts lines | 326 | 300 | <300 | ❌ |
| Total files | 11 | 11 | — | — |
| Debt items | — | 6 | 0 | ❌ |

---
*Generated: 2025-12-16*