# Project Discovery Subsystem Refactoring Plan

## Context

This refactoring addresses code duplication and architectural issues revealed while implementing MDT-126 (case-insensitive project ID comparison). The current implementation has validation logic duplicated between `ProjectScanner` and `ProjectDiscoveryService`, and both classes construct `Project` objects with similar but slightly different logic.

### Issues Identified

1. **Duplicate ID Validation Logic** - Case-insensitive directory name matching exists in both places:
   - `ProjectScanner.ts` lines 71-75
   - `ProjectDiscoveryService.ts` lines 65-69 and 115-118

2. **Duplicate Project Construction** - Both classes build `Project` objects from configs with nearly identical logic

3. **Mixed Responsibilities** - `ProjectDiscoveryService.getRegisteredProjects()` handles both registry reading AND project construction

4. **Scattered Validation** - No central place for project-related validation rules

5. **No Clear Separation of Concerns** - Business logic mixed with data access and object construction

### Current Files

| File | Lines | Role |
|------|-------|------|
| `shared/services/project/ProjectScanner.ts` | 125 | Scans for project configs |
| `shared/services/project/ProjectDiscoveryService.ts` | 188 | Orchestrates discovery |
| `shared/services/project/ProjectRegistry.ts` | 185 | Registry operations |
| `shared/services/project/ProjectConfigLoader.ts` | 89 | Config loading |

---

## Architectural Options Analysis

### Option 1: Builder Pattern (Fluent API)

Create a `ProjectBuilder` class following existing `TestProjectBuilder` pattern.

```typescript
class ProjectBuilder {
  withId(id: string): this
  withConfig(config: ProjectConfig): this
  withPath(path: string): this
  withMetadata(metadata: ProjectMetadata): this
  build(): Project
}
```

| Aspect | Details |
|---------|---------|
| Complexity | Medium |
| Risk | Low |
| Extensibility | High |
| Following Codebase Patterns | ⭐⭐⭐ TestProjectBuilder |
| Best For | Complex validation, multiple build variants |

**Pros**: Fluent API, centralized validation, easy to extend
**Cons**: Adds another class, may be overkill for simple construction

---

### Option 2: Factory Pattern (RECOMMENDED)

Create a `ProjectFactory` following existing `ProjectFactory` pattern (already in codebase).

```typescript
class ProjectFactory {
  createFromConfig(config: ProjectConfig, path: string): Project
  createFromRegistry(data: RegistryData, path: string): Project
  createAutoDiscovered(config: ProjectConfig, path: string): Project
}
```

| Aspect | Details |
|---------|---------|
| Complexity | Low-Medium |
| Risk | Low |
| Extensibility | Medium |
| Following Codebase Patterns | ⭐⭐⭐⭐⭐ ProjectFactory exists |
| Best For | Multiple creation scenarios |

**Pros**: Centralizes creation, follows existing pattern, handles multiple scenarios, easy to test
**Cons**: May become large with many creation methods

---

### Option 3: Strategy Pattern (Discovery Strategies)

Create different discovery strategies following existing `TreeBuilder` pattern.

```typescript
interface IDiscoveryStrategy {
  discover(context: DiscoveryContext): Project[]
}
```

| Aspect | Details |
|---------|---------|
| Complexity | High |
| Risk | Medium |
| Extensibility | Very High |
| Following Codebase Patterns | ⭐⭐⭐ TreeBuilder |
| Best For | Growing discovery methods |

**Pros**: Highly extensible, clean separation, runtime strategy switching
**Cons**: Most complex, may be overkill for 2 methods

---

### Option 4: Simple Extraction (Helper Functions)

Extract duplicate logic into shared helper functions.

```typescript
// shared/utils/project-helpers.ts
export function validateProjectId(id: string, dirName: string): boolean { }
export function buildProjectFromConfig(config: ProjectConfig, path: string): Project { }
```

| Aspect | Details |
|---------|---------|
| Complexity | Very Low |
| Risk | Very Low |
| Extensibility | Low |
| Following Codebase Patterns | ⭐ Helper functions exist |
| Best For | Limited time/budget |

**Pros**: Minimal changes, low risk, easy to implement
**Cons**: Doesn't fully address mixed responsibilities, helpers can become scattered

---

### Option 5: Repository Pattern

Create a `ProjectRepository` that abstracts all data access.

| Aspect | Details |
|---------|---------|
| Complexity | Medium-High |
| Risk | Medium |
| Extensibility | High |
| Following Codebase Patterns | ⭐⭐ Common pattern |
| Best For | Data source switching |

**Pros**: Clean separation, easy to swap implementations
**Cons**: Adds abstraction layer, may be overkill for file-based operations

---

## Recommended Approach

### Option 2 (Factory Pattern) + Option 4 (Simple Extraction) Hybrid

**Rationale:**
1. **Factory Pattern** fits codebase's existing patterns (ProjectFactory in test-lib)
2. **Simple Extraction** for validation logic keeps it straightforward
3. **Balanced complexity**: Solves real problems without over-engineering
4. **Future-proof**: Easy to extend if new Project types emerge

---

## Refactoring Strategy

### Phase 1: Create Validation Helpers (Simple Extraction)

**New file:** `shared/utils/project-validation-helpers.ts`

```typescript
/**
 * Validates that project ID matches directory name (case-insensitive)
 * Returns true if valid, false otherwise
 */
export function validateProjectIdMatchesDirectory(
  id: string | undefined,
  directoryName: string
): boolean {
  if (!id) return true
  return id.toLowerCase() === directoryName.toLowerCase()
}

/**
 * Validates no duplicate project code exists
 */
export function validateNoDuplicateByCode(
  code: string,
  existingProjects: Project[]
): boolean {
  return !existingProjects.some(p => p.project.code === code && !p.project.id)
}

/**
 * Validates that config file exists
 */
export function validateConfigExists(configPath: string): boolean {
  return fileExists(configPath)
}
```

**Benefits:**
- Minimal changes, low risk
- Solves immediate duplication problem
- Easy to implement incrementally
- Follows existing helper function pattern

---

### Phase 2: Create ProjectFactory

**New file:** `shared/services/project/ProjectFactory.ts`

```typescript
/**
 * Factory for creating Project objects from various sources.
 * Centralizes all Project construction logic.
 */
export class ProjectFactory {
  /**
   * Create Project from local config only
   */
  createFromConfig(
    config: ProjectConfig,
    projectPath: string,
    registryPath?: string
  ): Project {
    // Implementation
  }

  /**
   * Create Project from registry data
   */
  createFromRegistry(
    registryData: RegistryData,
    projectPath: string,
    registryPath: string
  ): Project {
    // Implementation
  }

  /**
   * Create auto-discovered Project
   */
  createAutoDiscovered(
    config: ProjectConfig,
    projectPath: string
  ): Project {
    // Implementation
  }
}
```

**Benefits:**
- Single source of truth for Project construction
- Follows existing ProjectFactory pattern in codebase
- Easy to test independently
- Clear separation: Factory creates, Scanner scans, Service orchestrates

---

### Phase 3: Refactor ProjectScanner

**Modified:** `shared/services/project/ProjectScanner.ts`

**Changes:**
- Return `DiscoveredProjectConfig[]` instead of `Project[]`
- Remove Project construction logic (lines 90-108)
- Use validation helpers from Phase 1
- Focus on scanning only (no validation beyond path existence)

---

### Phase 4: Refactor ProjectDiscoveryService

**Modified:** `shared/services/project/ProjectDiscoveryService.ts`

**Changes:**
- Use ProjectFactory for all Project creation
- Use validation helpers from Phase 1
- Remove duplicate validation logic (lines 65-69, 115-118)
- Remove duplicate construction logic (lines 74-98, 119-158)
- Delegate to Scanner, Factory, and Validator

---

## Directory Structure

```
shared/services/project/
├── ProjectFactory.ts            # NEW - Centralized Project construction
├── ProjectScanner.ts            # MODIFY - Pure scanning only
├── ProjectDiscoveryService.ts   # MODIFY - Orchestrator only
├── ProjectRegistry.ts           # UNCHANGED - Already correct
└── ProjectConfigLoader.ts        # UNCHANGED - Already correct

shared/utils/
└── project-validation-helpers.ts # NEW - Shared validation logic
```

---

## Testing Strategy

### Unit Tests
1. **Validation helpers tests** - Test all validation functions
2. **ProjectFactory tests** - Test all three creation methods
3. **ProjectScanner tests** - Test scanning returns correct config paths
4. **ProjectDiscoveryService tests** - Test orchestration flow

### Integration Tests
5. **End-to-end discovery** - Test full flow from scan to Project[]
6. **Existing tests** - Verify no regressions in `ProjectService`, `DocumentService`, `TicketService`

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

## Benefits

1. **Single Responsibility** - Each component has one clear purpose
2. **DRY Principle** - No duplicate validation or construction logic
3. **Testability** - Each component can be tested in isolation
4. **Maintainability** - Changes to validation or construction happen in one place
5. **Extensibility** - Easy to add new validation rules or build strategies
6. **Follows Existing Patterns** - Uses proven factory and helper patterns from codebase

---

## Rollback Strategy

If issues arise:
1. Each phase can be reverted independently
2. New components are additive (no existing code deleted until cleanup)
3. Git commits should be granular per phase
4. Tests catch regressions before they reach production

---

## Status

**Implementation Ticket**: [MDT-127](docs/CRs/MDT-127-project-discovery-refactoring.md) - Refactor Project Discovery Subsystem

- [ ] Phase 1: Create validation helpers
- [ ] Phase 2: Create ProjectFactory
- [ ] Phase 3: Refactor ProjectScanner
- [ ] Phase 4: Refactor ProjectDiscoveryService
- [ ] Full test coverage
- [ ] Documentation updated
