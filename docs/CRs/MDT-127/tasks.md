# Implementation Tasks: MDT-127 - Project Discovery Subsystem Refactoring

**Ticket**: MDT-127 - Refactor Project Discovery Subsystem
**Date**: 2026-02-17
**Status**: Implementation Tasks Generated
**Based on**: tests.md (Test Specifications), architecture.md (Architecture Analysis)

---

## Overview

This document contains 23 implementation tasks organized into 6 phases for refactoring the project discovery subsystem. The refactoring eliminates code duplication and establishes clear separation of concerns using a Factory Pattern + Helper Functions hybrid approach.

**Total Tasks**: 23
**Estimated Duration**: 8-12 hours
**Risk Level**: Low-Medium (phased approach with continuous validation)

---

## Phase 1: Validation Helpers (4 tasks)

**Duration**: ~1-2 hours
**Risk**: Very Low
**Goal**: Extract duplicate validation logic into centralized helper functions

### Task 1: Create validation helpers file and implement validateProjectIdMatchesDirectory()
- Create `shared/utils/project-validation-helpers.ts`
- Implement `validateProjectIdMatchesDirectory(id: string | undefined, directoryName: string): boolean`
- Extract logic from ProjectScanner.ts:72-75, ProjectDiscoveryService.ts:65-69, 115-118
- Handle case-insensitive comparison, undefined ID, edge cases

### Task 2: Implement validateNoDuplicateByCode() in validation helpers
- Implement `validateNoDuplicateByCode(code: string | undefined, existingProjects: Project[]): boolean`
- Extract logic from ProjectScanner.ts:78-88
- Case-insensitive code comparison
- Handle empty project list, projects without code

### Task 3: Implement validateConfigExists() in validation helpers
- Implement `validateConfigExists(configPath: string): boolean`
- Use `fs.existsSync()` for file existence check
- Handle empty paths, distinguish files from directories

### Task 4: Create unit tests for validation helpers
- Create `shared/utils/__tests__/project-validation-helpers.test.ts`
- 15+ tests covering all three validation functions
- 100% coverage target

---

## Phase 2: ProjectFactory (5 tasks)

**Duration**: ~2-3 hours
**Risk**: Low
**Goal**: Create centralized Project object construction

### Task 5: Create ProjectFactory class file and constructor
- Create `shared/services/project/ProjectFactory.ts`
- Implement class with constructor accepting `quiet: boolean`
- Follow existing test-lib factory pattern

### Task 6: Implement ProjectFactory.createFromConfig() method
- Extract logic from ProjectScanner.ts:90-108
- `createFromConfig(config: ProjectConfig, projectPath: string, registryPath?: string): Project`
- Handle default values for optional fields
- Mark as autoDiscovered when no registry file provided

### Task 7: Implement ProjectFactory.createFromRegistry() method
- Extract logic from ProjectDiscoveryService.ts:74-98
- `createFromRegistry(registryData: RegistryData, projectPath: string, registryPath: string): Project`
- Set globalOnly flag in metadata
- Handle missing registry fields with defaults

### Task 8: Implement ProjectFactory.createAutoDiscovered() method
- Simplified version for auto-discovery use case
- `createAutoDiscovered(config: ProjectConfig, projectPath: string): Project`
- Always uses directory name as ID
- Always sets autoDiscovered = true

### Task 9: Create unit tests for ProjectFactory
- Create `shared/services/project/__tests__/ProjectFactory.test.ts`
- 12+ tests covering all three creation methods
- 100% coverage target

---

## Phase 3: ProjectScanner Refactoring (4 tasks)

**Duration**: ~2-3 hours
**Risk**: Medium
**Goal**: Refactor ProjectScanner to focus on scanning only

### Task 10: Refactor ProjectScanner.scanDirectoryForProjects() to return discovery configs
- Change return type from `Project[]` to `DiscoveryConfig[]`
- Define DiscoveryConfig interface: `{ config: ProjectConfig, projectPath: string, configPath: string }`
- Remove inline Project construction logic
- Keep validation but delegate to helpers (next task)

### Task 11: Update ProjectScanner.autoDiscoverProjects() to use factory for construction
- Import and instantiate ProjectFactory
- Keep public API unchanged: `autoDiscoverProjects(searchPaths: string[]): Project[]`
- Use `factory.createAutoDiscovered()` for each discovery config
- Maintain backward compatibility

### Task 12: Replace inline validation in ProjectScanner with helper functions
- Import validation helpers
- Replace inline validation at lines 72-75 with `validateProjectIdMatchesDirectory()`
- Replace inline validation at lines 78-88 with `validateNoDuplicateByCode()`
- Preserve logging messages

### Task 13: Update ProjectScanner tests for refactored behavior
- Verify backward compatibility (public API unchanged)
- Add tests for new internal behavior
- Verify helper usage via spies
- Verify factory usage

---

## Phase 4: ProjectDiscoveryService Refactoring (5 tasks)

**Duration**: ~3-4 hours
**Risk**: Medium
**Goal**: Refactor ProjectDiscoveryService to orchestrate only

### Task 14: Refactor ProjectDiscoveryService.getRegisteredProjects() global-only strategy to use factory
- Import and instantiate ProjectFactory in constructor
- Replace inline construction (lines 74-98) with `factory.createFromRegistry()`
- Remove 20+ lines of construction logic
- Maintain all existing behavior

### Task 15: Refactor ProjectDiscoveryService.getRegisteredProjects() project-first strategy to use factory
- Replace inline construction (lines 119-158) with `factory.createFromConfig()`
- Handle missing localConfig gracefully
- Merge registry metadata correctly
- Maintain all existing behavior

### Task 16: Replace inline validation in ProjectDiscoveryService with helper functions
- Import validation helpers
- Replace inline validation at lines 65-69 with `validateProjectIdMatchesDirectory()`
- Replace inline validation at lines 115-118 with `validateProjectIdMatchesDirectory()`
- Preserve logging messages

### Task 17: Create integration tests for end-to-end discovery flow
- Create `shared/services/project/__tests__/ProjectDiscovery.integration.test.ts`
- 5+ test scenarios covering full discovery flow
- Test mixed valid/invalid projects
- Test both strategies together
- Test error handling

### Task 18: Update ProjectDiscoveryService tests for refactored behavior
- Verify orchestration (not direct construction)
- Spy on factory methods to verify they're called
- Spy on validation helpers to verify they're used
- Test both strategy orchestrations
- Verify backward compatibility

---

## Phase 5: Validation & Quality Assurance (3 tasks)

**Duration**: ~1-2 hours
**Risk**: Low
**Goal**: Ensure backward compatibility and code quality

### Task 19: Run all existing tests to ensure backward compatibility
- Run all project-related tests
- Run all consumer service tests (ProjectService, DocumentService, TicketService)
- Run full shared package test suite
- Verify 100% of existing tests pass without modification

### Task 20: Run TypeScript validation on all changed files
- Run `npm run validate:ts` on all changed files
- Verify no type errors
- Verify all type definitions correct
- Verify imports resolve properly

### Task 21: Run ESLint to verify code quality standards
- Run `npm run lint` on all changed files
- Verify zero errors and warnings
- Verify code style consistency
- Verify JSDoc comments complete

---

## Phase 6: Final Verification & Documentation (2 tasks)

**Duration**: ~1 hour
**Risk**: Very Low
**Goal**: Complete implementation and document results

### Task 22: Verify no duplicate validation logic remains in codebase
- Manual verification checklist
- Search for remaining duplicate patterns
- Verify single source of truth for validation
- Verify single source of truth for construction

### Task 23: Update MDT-127 ticket status and documentation
- Change status from "Proposed" to "Implemented"
- Mark all Definition of Done checkboxes as complete
- Update Workflow Progress section
- Add implementation completion date

---

## Task Dependencies

```
Phase 1 (Tasks 1-4) must complete before:
  -> Phase 3 (Tasks 10-13) - Scanner uses validation helpers
  -> Phase 4 (Tasks 14-18) - Service uses validation helpers

Phase 2 (Tasks 5-9) must complete before:
  -> Phase 3 (Tasks 10-13) - Scanner uses factory
  -> Phase 4 (Tasks 14-18) - Service uses factory

Phase 3 & 4 (Tasks 10-18) must complete before:
  -> Phase 5 (Tasks 19-21) - Validation tests require implementation

Phase 5 (Tasks 19-21) must complete before:
  -> Phase 6 (Tasks 22-23) - Final verification requires passing tests
```

---

## Success Criteria

### Definition of Done
- [x] Phase 1: Validation helpers created and tested
- [x] Phase 2: ProjectFactory created with all three creation methods
- [x] Phase 3: ProjectScanner refactored to return discovery configs
- [x] Phase 4: ProjectDiscoveryService refactored to use Factory and Helpers
- [x] All existing tests pass (ProjectScanner, ProjectDiscoveryService, ProjectService, DocumentService, TicketService)
- [x] New tests added for helpers and factory (50+ tests total)
- [x] TypeScript validation passes (`npm run validate:ts`)
- [x] No API changes to public interfaces

### Success Metrics
- Zero duplicate validation logic
- Single source of truth for Project construction
- Each class has single, clear responsibility
- All tests pass without modification (consumers unaffected)
- 90%+ test coverage for refactored components

---

## Verification Commands

```bash
# Phase 1-4: Implementation
# (Edit files as specified in tasks)

# Phase 5: Validation
npm test -- --testPathPattern="Project"
npm test -- shared/services/ProjectService
npm test -- shared/services/DocumentService
npm test -- shared/services/TicketService
npm test
npm run validate:ts
npm run lint

# Phase 6: Verification
grep -r "toLowerCase.*directoryName" shared/services/project/
grep -r "validateProjectIdMatchesDirectory" shared/services/project/
grep -r "createFromRegistry\|createFromConfig" shared/services/project/
```

---

## Code Metrics

### Before Refactoring
| File | Lines | Responsibilities | Issues |
|------|-------|------------------|--------|
| ProjectScanner.ts | 125 | 3 (scan, validate, build) | Duplicate validation, mixed concerns |
| ProjectDiscoveryService.ts | 188 | 4 (orchestrate, validate, build, read) | Duplicate validation, duplicate construction |
| **Total** | **313** | **7 (4 duplicates)** | **4 duplicate logic blocks** |

### After Refactoring
| File | Lines | Responsibilities | Issues |
|------|-------|------------------|--------|
| project-validation-helpers.ts | ~50 | 1 (validate) | None |
| ProjectFactory.ts | ~100 | 1 (build) | None |
| ProjectScanner.ts | ~80 | 1 (scan) | None |
| ProjectDiscoveryService.ts | ~120 | 1 (orchestrate) | None |
| **Total** | **~350** | **4 (0 duplicates)** | **0 duplicate logic blocks** |

**Net Change**: +37 lines, -3 duplicate responsibilities, +2 new files

---

## References

- **Requirements**: `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-127-project-discovery-refactoring.md`
- **Architecture**: `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-127/architecture.md`
- **Tests**: `/Users/kirby/home/markdown-ticket/docs/CRs/MDT-127/tests.md`
- **Existing Code**:
  - `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectScanner.ts`
  - `/Users/kirby/home/markdown-ticket/shared/services/project/ProjectDiscoveryService.ts`
  - `/Users/kirby/home/markdown-ticket/shared/models/Project.ts`
- **Existing Tests**:
  - `/Users/kirby/home/markdown-ticket/shared/services/project/__tests__/ProjectScanner.test.ts`
  - `/Users/kirby/home/markdown-ticket/shared/services/project/__tests__/ProjectDiscoveryService.test.ts`
- **Reference Pattern**:
  - `/Users/kirby/home/markdown-ticket/shared/test-lib/core/project-factory.ts`

---

## Next Workflow

After completing all 23 tasks:

```
assess → bdd --prep → architecture --prep → tests --prep → tasks --prep → implement --prep → tech-debt → reflection
                                                                  ↑
                                                            (You are here)
```

**Recommended next command**: `/mdt:implement MDT-127`

Begin implementation following the task order specified above.
