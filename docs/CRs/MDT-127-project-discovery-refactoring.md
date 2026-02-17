---
code: MDT-127
status: Proposed
dateCreated: 2026-02-15T11:00:00.000Z
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
- [ ] Phase 1: Validation helpers created and tested
- [ ] Phase 2: ProjectFactory created with all three creation methods
- [ ] Phase 3: ProjectScanner refactored to return discovery configs
- [ ] Phase 4: ProjectDiscoveryService refactored to use Factory and Helpers
- [ ] All existing tests pass (ProjectScanner, ProjectDiscoveryService, ProjectService, DocumentService, TicketService)
- [ ] New tests added for helpers and factory
- [ ] TypeScript validation passes (`npm run validate:ts`)
- [ ] No API changes to public interfaces

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

**Blocking**: None

**Related CRs**: MDT-126

---

## Next Workflow

Based on MDT Technical Debt workflow path:

```
assess → bdd --prep → architecture --prep → tests --prep → tasks --prep → implement --prep → tech-debt → reflection
```

**Recommended next command**: `/mdt:assess MDT-127`

Evaluate current code quality to establish baseline before refactoring.
