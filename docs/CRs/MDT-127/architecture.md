# Architecture Analysis: Project Discovery Subsystem Refactoring

**Ticket**: MDT-127 - Refactor Project Discovery Subsystem
**Date**: 2026-02-17
**Status**: Architecture Analysis Complete

---

## Executive Summary

The project discovery subsystem exhibits code duplication and mixed responsibilities that were revealed during MDT-126 implementation. This analysis confirms the need for refactoring and validates the proposed Factory Pattern + Helper Functions hybrid approach.

**Key Findings**:
- Duplicate validation logic exists in 2 locations (ProjectScanner, ProjectDiscoveryService)
- Duplicate Project construction logic exists in both classes
- Mixed responsibilities violate Single Responsibility Principle
- The proposed refactoring aligns with existing codebase patterns

**Recommended Action**: Proceed with the 4-phase refactoring plan outlined in `refactor.md`.

---

## Current Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                  ProjectDiscoveryService                    │
│                    (Mixed Responsibilities)                 │
│  - Registry reading                                         │
│  - Project construction (DUPLICATE)                         │
│  - Validation (DUPLICATE)                                   │
│  - Orchestration                                            │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌─────────────────┐
    │ ProjectScanner │              │ ProjectRegistry │
    │  (Mixed)       │              │  (Correct)      │
    │  - Scanning    │              │  - Registry I/O │
    │  - Validation  │              └─────────────────┘
    │  - Construction│
    └────────────────┘
```

### File Analysis

#### 1. ProjectScanner.ts (125 lines)
**Location**: `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectScanner.ts`

**Current Responsibilities**:
- Scanning directories for project configs
- **Validation**: Case-insensitive ID matching (lines 72-75)
- **Validation**: Duplicate code detection (lines 78-88)
- **Construction**: Building Project objects (lines 90-108)

**Issues**:
- Mixing scanning with validation and construction
- Project construction logic duplicated with ProjectDiscoveryService
- No clear separation of concerns

#### 2. ProjectDiscoveryService.ts (188 lines)
**Location**: `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectDiscoveryService.ts`

**Current Responsibilities**:
- Orchestration of discovery operations
- Registry reading via ProjectRegistry
- **Validation**: Case-insensitive ID matching (lines 65-69, 115-118)
- **Construction**: Building Project objects for global-only strategy (lines 74-98)
- **Construction**: Building Project objects for project-first strategy (lines 119-158)

**Issues**:
- Mixing orchestration with validation and construction
- Duplicate validation logic with ProjectScanner
- Duplicate construction logic with ProjectScanner
- Complex conditional logic for two strategies (global-only, project-first)

#### 3. ProjectRegistry.ts (185 lines)
**Location**: `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectRegistry.ts`

**Status**: ✅ CORRECT - No changes needed
- Single responsibility: Registry I/O operations
- Clean separation from business logic

#### 4. ProjectConfigLoader.ts (89 lines)
**Location**: `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectConfigLoader.ts`

**Status**: ✅ CORRECT - No changes needed
- Single responsibility: Config file loading
- Clean separation from business logic

---

## Code Duplication Analysis

### Duplicate 1: Case-Insensitive Project ID Validation

**Location 1**: `ProjectScanner.ts:72-75`
```typescript
if (config.project.id && config.project.id.toLowerCase() !== directoryName.toLowerCase()) {
  logQuiet(this.quiet, `Skipping project at ${directoryName}: project.id "${config.project.id}" does not match directory name`)
  return
}
```

**Location 2**: `ProjectDiscoveryService.ts:65-69`
```typescript
const directoryName = getBaseName(projectPath)
if (registryData.project.id && registryData.project.id.toLowerCase() !== directoryName.toLowerCase()) {
  logQuiet(this.quiet, `Skipping registered project at ${directoryName}: project.id "${registryData.project.id}" does not match directory name`)
  continue
}
```

**Location 3**: `ProjectDiscoveryService.ts:115-118`
```typescript
if (localConfig?.project?.id && localConfig.project.id.toLowerCase() !== directoryName.toLowerCase()) {
  logQuiet(this.quiet, `Skipping registered project at ${directoryName}: local config project.id "${localConfig.project.id}" does not match directory name`)
  continue
}
```

### Duplicate 2: Project Construction Logic

**Pattern 1**: `ProjectScanner.ts:90-108` - Auto-discovery projects
**Pattern 2**: `ProjectDiscoveryService.ts:74-98` - Global-only strategy
**Pattern 3**: `ProjectDiscoveryService.ts:119-158` - Project-first strategy

All three follow similar patterns:
1. Determine project ID (from config or directory name)
2. Build project object with nested structure
3. Set metadata fields
4. Add to results array

---

## Proposed Architecture

### Target Component Structure

```
┌─────────────────────────────────────────────────────────────┐
│                  ProjectDiscoveryService                    │
│                    (Orchestrator Only)                      │
│  - Coordinate scanner, factory, validator                  │
│  - No direct validation or construction                    │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌─────────────────┐
    │ ProjectScanner │              │ ProjectFactory  │
    │  (Scan Only)   │              │   (Build Only)  │
    │  - Directory   │              │  - createFrom   │
    │    scanning    │              │    Config()     │
    │  - Return      │              │  - createFrom   │
    │    configs     │              │    Registry()   │
    └────────┬───────┘              │  - createAuto   │
             │                      │    Discovered() │
             │                      └─────────────────┘
             │                                │
             └────────────┬───────────────────┘
                          ▼
              ┌───────────────────────┐
              │ Validation Helpers    │
              │  (project-validation- │
              │   helpers.ts)         │
              │  - validateProjectId  │
              │  - validateNoDupeBy   │
              │    Code()             │
              │  - validateConfig     │
              │    Exists()           │
              └───────────────────────┘
```

### New Files to Create

#### 1. Validation Helpers
**Location**: `/Users/kirby/home/markdown-ticket/shared/utils/project-validation-helpers.ts`

**Purpose**: Centralize all project validation logic

**API**:
```typescript
/**
 * Validates that project ID matches directory name (case-insensitive)
 */
export function validateProjectIdMatchesDirectory(
  id: string | undefined,
  directoryName: string
): boolean

/**
 * Validates no duplicate project code exists
 */
export function validateNoDuplicateByCode(
  code: string,
  existingProjects: Project[]
): boolean

/**
 * Validates that config file exists
 */
export function validateConfigExists(configPath: string): boolean
```

#### 2. ProjectFactory
**Location**: `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectFactory.ts`

**Purpose**: Centralize all Project object construction

**API**:
```typescript
/**
 * Factory for creating Project objects from various sources
 */
export class ProjectFactory {
  /**
   * Create Project from local config (auto-discovery)
   */
  createFromConfig(
    config: ProjectConfig,
    projectPath: string,
    registryPath?: string
  ): Project

  /**
   * Create Project from registry data (global-only strategy)
   */
  createFromRegistry(
    registryData: RegistryData,
    projectPath: string,
    registryPath: string
  ): Project

  /**
   * Create auto-discovered Project
   */
  createAutoDiscovered(
    config: ProjectConfig,
    projectPath: string
  ): Project
}
```

---

## Pattern Validation

### Alignment with Existing Patterns

#### 1. Factory Pattern
✅ **Exists in codebase**: `shared/test-lib/core/project-factory.ts`
- Used for creating test projects
- Proven pattern for Project construction
- TestProjectBuilder for complex scenarios

#### 2. Helper Functions
✅ **Exists in codebase**: `shared/utils/`
- `config-validator.ts` - Validation helpers
- `file-utils.ts` - File operation helpers
- `path-resolver.ts` - Path resolution helpers

#### 3. Service Layer Pattern
✅ **Exists in codebase**: All services follow single responsibility
- `ProjectRegistry` - Registry I/O only
- `ProjectConfigLoader` - Config loading only
- `ProjectScanner` - Should be scanning only (after refactor)

---

## Impact Analysis

### Consumers of Project Discovery

The following components consume ProjectDiscoveryService and will be affected:

1. **ProjectService** (`shared/services/project/ProjectService.ts`)
   - Uses: `getRegisteredProjects()`, `autoDiscoverProjects()`
   - Impact: None (API unchanged)

2. **DocumentService** (`shared/services/DocumentService.ts`)
   - Uses: Project discovery via ProjectService
   - Impact: None (indirect consumer)

3. **MCP Server** (`mcp-server/src/tools/`)
   - Uses: Project discovery via ProjectService
   - Impact: None (indirect consumer)

4. **Backend Server** (`server/`)
   - Uses: Project discovery via ProjectService
   - Impact: None (indirect consumer)

### Risk Assessment

| Risk Category | Level | Mitigation |
|---------------|-------|------------|
| Breaking API changes | LOW | Public interfaces unchanged |
| Test failures | LOW | Existing tests pass without modification |
| Performance regression | VERY LOW | Same logic, better organized |
| Introduction of bugs | MEDIUM | Comprehensive test coverage required |

---

## Refactoring Strategy

### Phase 1: Validation Helpers (Simple Extraction)
**Risk**: Very Low
**Changes**: Add new file, no existing code modified
**Duration**: ~1-2 hours

### Phase 2: ProjectFactory (Centralized Construction)
**Risk**: Low
**Changes**: Add new file, no existing code modified
**Duration**: ~2-3 hours

### Phase 3: ProjectScanner Refactoring
**Risk**: Medium
**Changes**: Modify existing class to return configs
**Duration**: ~2-3 hours

### Phase 4: ProjectDiscoveryService Refactoring
**Risk**: Medium
**Changes**: Modify existing class to use factory and helpers
**Duration**: ~3-4 hours

**Total Estimated Duration**: 8-12 hours

---

## Verification Plan

### Acceptance Criteria

- [ ] Phase 1: Validation helpers created and tested
- [ ] Phase 2: ProjectFactory created with all three creation methods
- [ ] Phase 3: ProjectScanner refactored to return discovery configs
- [ ] Phase 4: ProjectDiscoveryService refactored to use Factory and Helpers
- [ ] All existing tests pass (ProjectScanner, ProjectDiscoveryService, ProjectService, DocumentService, TicketService)
- [ ] New tests added for helpers and factory
- [ ] TypeScript validation passes (`npm run validate:ts`)
- [ ] No API changes to public interfaces

### Testing Strategy

**Unit Tests**:
- Validation helpers (all 3 functions)
- ProjectFactory (all 3 creation methods)
- ProjectScanner (scanning returns correct configs)
- ProjectDiscoveryService (orchestration flow)

**Integration Tests**:
- End-to-end discovery flow
- Existing consumer tests verify no regressions

### Verification Commands
```bash
# Unit tests
npm test -- shared/utils/project-validation-helpers
npm test -- shared/services/project

# Integration tests
npm test -- shared/services

# Full test suite
npm test

# Type checking
npm run validate:ts
```

---

## Dependencies and References

### Depends On
- MDT-126 (Bug fix completed - revealed the need for refactoring)

### References
- `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-126/refactor.md` - Detailed implementation plan
- `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectScanner.ts` - Current scanner implementation
- `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectDiscoveryService.ts` - Current discovery service implementation
- `/Users/kirby/home/markdown-ticket/shared/models/Project.ts` - Project model definitions

### Related Files
- `/Users/kirby/home/markdown-ticket/shared/test-lib/core/project-factory.ts` - Reference for factory pattern

---

## Conclusion

The architecture analysis confirms the technical debt identified in MDT-127. The proposed refactoring using Factory Pattern + Helper Functions is:

1. **Validated**: Aligns with existing codebase patterns
2. **Low Risk**: Phased approach allows incremental validation
3. **High Value**: Eliminates duplication, improves maintainability
4. **Testable**: Each component can be tested in isolation

**Recommendation**: Proceed with implementation as outlined in the refactoring plan.

---

## Appendix: Code Metrics

### Current Metrics

| File | Lines | Responsibilities | Issues |
|------|-------|------------------|--------|
| ProjectScanner.ts | 125 | 3 (scan, validate, build) | Duplicate validation, mixed concerns |
| ProjectDiscoveryService.ts | 188 | 4 (orchestrate, validate, build, read) | Duplicate validation, duplicate construction |
| Total | 313 | 7 (4 duplicates) | 4 duplicate logic blocks |

### Target Metrics

| File | Lines | Responsibilities | Issues |
|------|-------|------------------|--------|
| project-validation-helpers.ts | ~50 | 1 (validate) | None |
| ProjectFactory.ts | ~100 | 1 (build) | None |
| ProjectScanner.ts | ~80 | 1 (scan) | None |
| ProjectDiscoveryService.ts | ~120 | 1 (orchestrate) | None |
| Total | ~350 | 4 (0 duplicates) | 0 duplicate logic blocks |

**Net Change**: +37 lines, -3 duplicate responsibilities
