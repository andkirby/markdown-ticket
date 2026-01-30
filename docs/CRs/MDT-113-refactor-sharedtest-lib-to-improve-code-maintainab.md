---
code: MDT-113
status: Implemented
dateCreated: 2025-12-31T01:58:27.418Z
type: Technical Debt
priority: Medium
phaseEpic: Code Quality
---

# Refactor shared/test-lib to improve code maintainability and reduce complexity

## 1. Description

### Requirements Scope
`preservation` — Behavior lock tests for refactoring

### Problem
- Test utilities in shared/test-lib/ have high cyclomatic and cognitive complexity
- test-server.ts: CC=39, CoC=64 (RED)
- test-environment.ts: CC=18, CoC=31 (RED)
- project-factory.ts: CC=22, CoC=42 (RED)
- file-ticket-creator.ts: CC=33, CoC=54 (RED)
- Low maintainability index across multiple files (16-35 on 0-100 scale)

### Affected Areas
- Test framework: shared/test-lib/ directory
- Test infrastructure: core/, ticket/, utils/ subdirectories
- Test suites: __tests__/ directory

### Scope
- **Changes**: Refactor internal implementation of test utilities
- **Unchanged**: Public API surface, test behavior

## 2. Desired Outcome

### Success Conditions
- All existing tests pass without modification
- Code complexity metrics improve to YELLOW or GREEN zone
- Maintainability index increases
- No breaking changes to public API

### Constraints
- Must preserve all existing test behavior
- Cannot change public API of TestEnvironment, TestServer, ProjectFactory
- Must maintain backward compatibility with existing test files
- Refactoring must not affect test execution results

### Non-Goals
- Not adding new test framework features
- Not changing test file formats or conventions
- Not modifying external dependencies

## 3. Open Questions

| Area | Question | Constraints |
|------|----------|-------------|
| Design | What refactoring patterns best reduce complexity? | Must preserve behavior, maintain API compatibility |
| Validation | How to verify behavior preservation? | All existing tests must pass without modification |
| Metrics | What are target complexity thresholds? | YELLOW: CC<25, CoC<35; GREEN: CC<15, CoC<20 |

### Known Constraints
- Preserve all existing test behavior (behavior lock)
- Maintain public API compatibility
- Improve code metrics to YELLOW/GREEN zones
- No changes to external interfaces or contracts

### Decisions Deferred
- Refactoring approach (determined by `/mdt:architecture`)
- Specific class/method extraction strategy (determined by `/mdt:architecture`)
- Task breakdown (determined by `/mdt:tasks`)

## Architecture Design
> **Extracted**: Complex architecture — see [architecture.md](./MDT-113/architecture.md)
> **Extracted**: Complex architecture — see [MDT-113-1/architecture.md](MDT-113/.sub/1/architecture.md)

**Summary**:
- Pattern: Extraction Decomposition
- Components: 9 (4 refactored, 4 new, 1 existing)
- Key constraint: All public APIs preserved, test behavior locked

**New Components**:
- `core/process-lifecycle-manager.ts` (150 lines) — Process start/stop/health orchestration
- `core/event-listener-registry.ts` (100 lines) — Event listener tracking & cleanup
- `core/server-config-factory.ts` (120 lines) — Server config generation
- `ticket/test-project-builder.ts` (150 lines) — Project structure creation
- `ticket/test-ticket-builder.ts` (150 lines) — Test ticket + counter management

**Extension Rule**: To add server type, add case to `ServerConfigFactory` (limit 120 lines) and update `TestServer.start()` type union (limit 150 lines).
## 4. Acceptance Criteria
## 5. Verification
### How to Verify Success
- **Automated verification**: Run `npm test` in shared/test-lib/
- **Behavior verification**: All existing tests pass unchanged
- **Metrics verification**: Run `scripts/metrics/run.sh shared/test-lib/` shows YELLOW/GREEN
- **Integration verification**: Integration tests pass with refactored code

### Baseline Metrics

| File | MI | CC | CoC | Status |
|------|----|----|-----|--------|
| types.ts | 35.03 | 1 | 0 | YELLOW |
| test-environment.ts | 32.14 | 18 | 31 | RED |
| test-server.ts | 20.26 | 39 | 64 | RED |
| retry-helper.ts | 30.32 | 15 | 25 | YELLOW |
| project-factory.ts | 16.82 | 22 | 42 | RED |
| ticket-creator.ts | 40.77 | 12 | 12 | YELLOW |
| file-ticket-creator.ts | 22.77 | 33 | 54 | RED |
| process-helper.ts | 33.09 | 15 | 24 | YELLOW |

### Target Metrics
- **Minimum**: All files in YELLOW zone (CC < 25, CoC < 35)
- **Ideal**: Core files in GREEN zone (CC < 15, CoC < 20)

> **Tasks document**: [tasks.md](./tasks.md)

**Total Tasks**: 12 (3 phases + verification)

**Green-Test Strategy**:
- Baseline: All tests GREEN before starting
- Extract one component at a time
- After each task: Verify tests still GREEN
- If tests turn RED → revert and fix

**Execution Order**:
1. Phase 1: Extract shared components (EventListenerRegistry, ProcessLifecycleManager, ServerConfigFactory)
2. Phase 2: Refactor core classes (TestEnvironment, TestServer, ProjectFactory)
3. Phase 3: Refactor ticket classes (FileTicketCreator, TestTicketBuilder, TestProjectBuilder)
4. Phase 4: Final verification (metrics, full test suite)

**Next**: `/mdt:implement MDT-113`
