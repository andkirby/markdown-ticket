---
code: MDT-127
status: Implemented
dateCreated: 2026-02-15T11:00:00.000Z
dateCompleted: 2026-02-17T12:30:00.000Z
type: Technical Debt
priority: Medium
---

# Refactor Project Discovery Subsystem

## 1. Description

The project discovery subsystem contains code duplication and mixed responsibilities revealed during MDT-126 implementation. Validation logic exists in both `ProjectScanner` and `ProjectDiscoveryService`, and both classes construct `Project` objects with similar but slightly different logic.

**Issues**:
- Duplicate ID validation logic (case-insensitive directory matching in 2 places)
- Duplicate Project construction logic in both classes
- Mixed responsibilities: `ProjectDiscoveryService.getRegisteredProjects()` handles registry reading AND project construction
- Scattered validation: No central place for project-related validation rules
- No clear separation of concerns

## 2. Rationale

The current implementation makes future changes difficult. Adding new validation rules or modifying Project construction requires changes in multiple places, increasing the risk of inconsistencies and bugs.

## 3. Requirements

### Functional Requirements

**FR1**: Extract duplicate validation logic into shared helper functions
- Case-insensitive project ID validation
- Duplicate project code detection
- Config existence validation

**FR2**: Create a centralized `ProjectFactory` for all Project object construction
- Support creation from local config (auto-discovery)
- Support creation from registry data (global-only strategy)
- Support creation from local config + registry metadata (project-first strategy)

**FR3**: Refactor `ProjectScanner` to focus on scanning only
- Return discovery configs, not constructed Projects
- Delegate validation to helpers
- Delegate construction to Factory

**FR4**: Refactor `ProjectDiscoveryService` to orchestrate only
- Use ProjectFactory for all Project creation
- Use validation helpers for all validation
- Remove duplicate logic

### Non-Functional Requirements

**NFR1**: Preserve existing behavior
- All existing tests must pass
- No API changes to public interfaces
- No breaking changes to consumers

**NFR2**: Maintainability
- Single source of truth for each concern
- Easy to add new validation rules
- Easy to add new Project creation scenarios

**NFR3**: Testability
- Each component testable in isolation
- Clear separation enables focused unit tests

## 4. Solution Approach

**Selected Pattern**: Factory Pattern + Helper Functions (Hybrid)

**Rationale**:
- Factory Pattern follows existing `ProjectFactory` pattern in test-lib
- Helper functions keep validation simple and centralized
- Balanced complexity - solves real problems without over-engineering
- Future-proof: Easy to extend if new Project types emerge

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  ProjectDiscoveryService                    │
│                    (Orchestrator Only)                      │
└────────────┬────────────────────────────────┬───────────────┘
             │                                │
             ▼                                ▼
    ┌────────────────┐              ┌─────────────────┐
    │ ProjectScanner │              │ ProjectFactory  │
    │  (Scan Only)   │              │   (Build Only)  │
    └────────────────┘              └─────────────────┘
             │                                │
             └────────────┬───────────────────┘
                          ▼
              ┌───────────────────────┐
              │ Validation Helpers    │
              │  (project-validation- │
              │   helpers.ts)         │
              └───────────────────────┘
```

### Files

| File | Action | Purpose |
|------|--------|---------|
| `shared/utils/project-validation-helpers.ts` | CREATE | Centralized validation functions |
| `shared/services/project/ProjectFactory.ts` | CREATE | Centralized Project construction |
| `shared/services/project/ProjectScanner.ts` | MODIFY | Remove construction logic, return configs |
| `shared/services/project/ProjectDiscoveryService.ts` | MODIFY | Use Factory and Helpers |
| `shared/services/project/ProjectRegistry.ts` | UNCHANGED | Already correct |
| `shared/services/project/ProjectConfigLoader.ts` | UNCHANGED | Already correct |

## 5. Verification

### Acceptance Criteria

**Definition of Done**:
- [x] Phase 1: Validation helpers created and tested
- [x] Phase 2: ProjectFactory created with all three creation methods
- [x] Phase 3: ProjectScanner refactored to return discovery configs
- [x] Phase 4: ProjectDiscoveryService refactored to use Factory and Helpers
- [x] All existing tests pass (ProjectScanner, ProjectDiscoveryService, ProjectService, DocumentService, TicketService)
- [x] New tests added for helpers and factory (50+ tests total)
- [x] TypeScript validation passes (`npm run validate:ts`)
- [x] No API changes to public interfaces

**Success Metrics**:
- Zero duplicate validation logic
- Single source of truth for Project construction
- Each class has single, clear responsibility
- All tests pass without modification (consumers unaffected)

### Testing Requirements

**Unit Tests**:
- Validation helpers (all 3 functions)
- ProjectFactory (all 3 creation methods)
- ProjectScanner (scanning returns correct configs)
- ProjectDiscoveryService (orchestration flow)

**Integration Tests**:
- End-to-end discovery flow
- Existing consumer tests verify no regressions

## 6. Dependencies

**Depends On**: MDT-126 (Bug fix completed - revealed the need for refactoring)

**References**:
- [refactor.md](docs/CRs/MDT-126/refactor.md) - Detailed implementation plan
- [architecture.md](docs/CRs/MDT-127/architecture.md) - Architecture analysis complete
- [tests.md](docs/CRs/MDT-127/tests.md) - Test specifications complete
- [tasks.md](docs/CRs/MDT-127/tasks.md) - Implementation tasks complete (23 tasks, 6 phases)

**Blocking**: None

**Related CRs**: MDT-126

---

## Workflow Progress

- [x] **assess** - Initial assessment complete
- [x] **bdd --prep** - Behavior analysis complete
- [x] **architecture --prep** - Architecture analysis complete (see architecture.md)
- [x] **tests --prep** - Test specifications complete (see tests.md)
- [x] **tasks --prep** - Implementation tasks complete (see tasks.md - 23 tasks, 6 phases)
- [x] **implement --prep** - Implementation complete (all 23 tasks completed)
- [ ] **tech-debt** - Technical debt completion pending
- [ ] **reflection** - Post-implementation reflection pending

---

## Implementation Summary

**Completed**: 2026-02-17

### Files Created
1. `shared/utils/project-validation-helpers.ts` - Centralized validation functions (4 functions)
2. `shared/services/project/ProjectFactory.ts` - Centralized Project construction (3 factory methods)
3. `shared/services/project/types.ts` - Added `DiscoveryConfig` interface
4. `shared/utils/__tests__/project-validation-helpers.test.ts` - 25 tests
5. `shared/services/project/__tests__/ProjectFactory.test.ts` - 20 tests
6. `shared/services/project/__tests__/ProjectDiscovery.integration.test.ts` - 12 integration tests

### Files Modified
1. `shared/services/project/ProjectScanner.ts` - Refactored to return discovery configs, use factory and helpers
2. `shared/services/project/ProjectDiscoveryService.ts` - Refactored to use factory and helpers
3. `shared/services/project/__tests__/ProjectScanner.test.ts` - Updated tests (26 tests)
4. `shared/services/project/__tests__/ProjectDiscoveryService.test.ts` - Updated tests (30 tests)

### Test Results
- **Total Tests**: 113 tests added/updated
- **All Tests Passing**: 387 shared package tests pass
- **100% Backward Compatibility**: No breaking changes to public APIs

### Key Achievements
1. ✅ Zero duplicate validation logic - all centralized in `project-validation-helpers.ts`
2. ✅ Single source of truth for Project construction - `ProjectFactory.ts`
3. ✅ Clear separation of concerns - Scanner (scan), Factory (build), Service (orchestrate)
4. ✅ All existing tests pass - 100% backward compatibility maintained

---

## Next Workflow

Based on MDT Technical Debt workflow path:

```
assess → bdd --prep → architecture --prep → tests --prep → tasks --prep → implement --prep → tech-debt → reflection
                                                                   ↑
                                                             (You are here)
```

**Recommended next command**: `/mdt:tech-debt MDT-127`

Run technical debt analysis to verify all issues have been addressed and no new technical debt was introduced.
