# Tests: MDT-145

**Source**: [MDT-145](../MDT-145-refine-shared-layer-into-a-stable-service-framewor.md)
**Generated**: 2026-03-25

## Overview

Unit tests for the shared service framework. These tests are **RED** until implementation exists (TDD approach). They verify:

1. Root-up project detection from nested directories
2. Case-insensitive project-code resolution
3. Atomic attr mutation with set/add/remove operations
4. Structured attr-mutation results (no bare booleans)

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `projectDetector` | `shared/utils/__tests__/projectDetector.test.ts` | 6 |
| `ProjectContextService` | `shared/services/project/__tests__/ProjectContextService.test.ts` | 11 |
| `TicketMutationService` | `shared/services/ticket/__tests__/TicketMutationService.test.ts` | 19 |

## Test Details

### Project Detector (`shared/utils/__tests__/projectDetector.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should return no-project result when no .mdt-config.toml exists | Edge-1 |
| should find .mdt-config.toml in current directory | BR-1 |
| should find .mdt-config.toml in parent directory (nested detection) | BR-1 |
| should find nearest .mdt-config.toml when multiple exist | BR-1 |
| should search up to filesystem root | Edge-1 |
| should return structured result with detection metadata | C1 |

### Project Context Service (`shared/services/project/__tests__/ProjectContextService.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should resolve project from current working directory | BR-1 |
| should return structured failure when no project detected | Edge-1 |
| should resolve project by exact identifier | BR-2 |
| should resolve project by code case-insensitively | BR-2 |
| should normalize code lookup to lowercase | BR-2 |
| should prefer exact identifier match over code lookup | BR-2 |
| should return structured failure for unknown project | Edge-2 |
| should return validation error when detected config cannot be loaded | C1, C3 |
| should prefer the deepest registered project that contains the cwd | BR-1 |
| should return ProjectLookupResult with normalized inputs | C1 |
| should include project root path in detection result | C1 |
| should return ServiceError-backed failures for lookup problems | C3 |
| should keep service result metadata outside the raw project payload | C4 |

### Ticket Mutation Service (`shared/services/ticket/__tests__/TicketMutationService.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should apply replace operation for scalar fields | BR-3 |
| should apply add operation for relation fields | BR-3 |
| should apply remove operation for relation fields | BR-3 |
| should reject add/remove for non-relation fields | C2, Edge-3 |
| should apply multiple operations atomically | BR-3 |
| should not persist on validation failure | Edge-3 |
| should return MutationResult with target ticket info | BR-4 |
| should return normalized input values in result | BR-4 |
| should return persisted file path in result | BR-4 |
| should return changed fields in result | BR-4 |
| should return structured error for missing ticket | Edge-3 |
| should return structured error for missing project | C1 |
| should return structured error for persistence failure | C1 |
| should allow add/remove on relatedTickets | C2 |
| should allow add/remove on dependsOn | C2 |
| should allow add/remove on blocks | C2 |
| should reject add/remove on status field | C2 |
| should return ServiceError-backed failures for invalid attr mutations | C3 |
| should treat shell-like user input as literal data | C5 |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `projectDetector.test.ts`, `ProjectContextService.test.ts`, `TicketMutationService.test.ts` | Consumer-neutral contracts |
| C2 | `TicketMutationService.test.ts` | Relation field add/remove validation |
| C3 | `ProjectContextService.test.ts`, `TicketMutationService.test.ts` | No CLI-specific errors |
| C4 | `ProjectContextService.test.ts` | Service types in shared/ |
| C5 | `TicketMutationService.test.ts` | Literal data handling |

## Verify

```bash
# Run all MDT-145 tests
cd shared && bun run jest --testPathPattern="projectDetector|ProjectContextService|TicketMutationService"

# Run individual test files
cd shared && bun run jest utils/__tests__/projectDetector.test.ts
cd shared && bun run jest services/project/__tests__/ProjectContextService.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketMutationService.test.ts
```

---
*Canonical test-plan projection: [tests.trace.md](./tests.trace.md)*
*Rendered by /mdt:tests via spec-trace*
