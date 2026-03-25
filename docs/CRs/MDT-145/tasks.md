# Tasks: MDT-145

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Shared framework boundary**: New services in `shared/services/` expose consumer-neutral contracts
- **Domain-contracts**: Existing schemas remain unchanged; shared layer uses them
- **CLI adoption**: Out of scope - belongs to MDT-143
- **MCP migration**: In scope - update handlers to use new shared services

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Project detection | `shared/utils/projectDetector.ts` | N/A (new) |
| Project context resolution | `shared/services/project/ProjectContextService.ts` | N/A (new) |
| Ticket attr mutation | `shared/services/ticket/TicketMutationService.ts` | N/A (new) |
| Shared error model | `shared/services/ServiceError.ts` | N/A (new) |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1, 3, 4, 5, 6, 7 (consumer-neutral contracts) |
| C2 | Task 5, 6 (relation field add/remove validation) |
| C3 | Task 8, 10 (no CLI-specific errors/logging) |
| C4 | Task 11 (domain-contracts boundary) |
| C5 | Task 6 (literal data handling) |

## Milestones

| Milestone | BDD Scenarios (BR-X.Y) | Tasks | Checkpoint |
|-----------|------------------------|-------|------------|
| M0: Foundation | — | Task 1, 2, 3, 5, 11 | ServiceError + types compile |
| M1: Project Context | BR-1, BR-2 | Task 4, 7, 8, 10 | `detect_project_context_from_nested_directory`, `resolve_project_case_insensitively_via_shared_lookup` GREEN |
| M2: Ticket Mutation | BR-3, BR-4 | Task 6, 9 | `apply_relation_attr_operations_atomically`, `return_structured_results_for_shared_attr_writes` GREEN |

---

## Tasks

### Task 1: Create shared ServiceError type (M0)

**Milestone**: M0 — Foundation

**Structure**: `shared/services/ServiceError.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Scope**: Create typed error model for shared services
**Boundary**: Must not import CLI-specific error types

**Creates**:
- `shared/services/ServiceError.ts`

**Modifies**:
- (none)

**Must Not Touch**:
- `domain-contracts/`
- CLI error modules

**Anti-duplication**: N/A (new module)

**Duplication Guard**:
- Check if similar error types exist in shared/ before creating
- Must use discriminated union pattern for error codes

**Verify**:
```bash
cd shared && bun run jest --testPathPattern="ProjectContextService|TicketMutationService" --passWithNoTests
```

**Done when**:
- [ ] ServiceError exports typed error classes
- [ ] Error codes are consumer-neutral (no CLI-specific codes)
- [ ] Tests can import and use ServiceError

---

### Task 2: Create projectDetector utility (M0)

**Milestone**: M0 — Foundation

**Structure**: `shared/utils/projectDetector.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-detector` → `shared/utils/__tests__/projectDetector.test.ts`

**Scope**: Root-up .mdt-config.toml detection from cwd
**Boundary**: Pure utility - no side effects, no project registration

**Creates**:
- `shared/utils/projectDetector.ts`

**Modifies**:
- (none)

**Must Not Touch**:
- `shared/services/ProjectService.ts`
- MCP detection code

**Anti-duplication**: Import path utilities from `shared/utils/path-resolver.ts` if needed

**Duplication Guard**:
- Check MCP-private detection code in `mcp-server/` - do NOT copy, this replaces it
- Existing detection is depth-limited; new detector searches to root

**Verify**:
```bash
cd shared && bun run jest utils/__tests__/projectDetector.test.ts
```

**Done when**:
- [ ] `detectProjectContext()` returns structured result
- [ ] Searches parent directories to filesystem root
- [ ] Returns explicit no-project result when not found
- [ ] Tests GREEN

---

### Task 3: Extend project types with context contracts (M0)

**Milestone**: M0 — Foundation

**Structure**: `shared/services/project/types.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`

**Scope**: Add ProjectLookupResult, ProjectContextResult, detection result types
**Boundary**: Service-layer contracts only; domain shapes stay in domain-contracts

**Creates**:
- (none - extending existing file)

**Modifies**:
- `shared/services/project/types.ts`

**Must Not Touch**:
- `domain-contracts/src/project/schema.ts`

**Anti-duplication**: Use existing Project type from `shared/models/Project.ts`

**Duplication Guard**:
- Check that types are service-layer contracts, not entity schemas
- C4: Domain schemas stay in domain-contracts

**Verify**:
```bash
cd shared && bun run tsc --noEmit
```

**Done when**:
- [ ] ProjectLookupResult type exported
- [ ] ProjectContextResult type exported
- [ ] Detection result types exported
- [ ] TypeScript compiles

---

### Task 4: Create ProjectContextService (M1)

**Milestone**: M1 — Project Context (BR-1, BR-2)

**Structure**: `shared/services/project/ProjectContextService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`

**Makes GREEN (Behavior)**:
- `detect_project_context_from_nested_directory` (BR-1)
- `resolve_project_case_insensitively_via_shared_lookup` (BR-2)

**Scope**: Consumer-facing project lookup with detection + code normalization
**Boundary**: Facade over ProjectService + projectDetector; does not duplicate logic

**Creates**:
- `shared/services/project/ProjectContextService.ts`

**Modifies**:
- (none)

**Must Not Touch**:
- `shared/services/ProjectService.ts` core logic
- CLI modules

**Anti-duplication**: Use projectDetector for detection, ProjectService for lookup

**Duplication Guard**:
- Do NOT re-implement project detection - import from projectDetector
- Do NOT re-implement project registry access - use ProjectService

**Verify**:
```bash
cd shared && bun run jest services/project/__tests__/ProjectContextService.test.ts
```

**Done when**:
- [ ] `resolveContext()` returns detection result
- [ ] `lookupProject()` resolves by ID or case-insensitive code
- [ ] Structured results with normalized inputs
- [ ] Uses ServiceError for failures
- [ ] Tests GREEN

---

### Task 5: Extend ticket types with mutation contracts (M0)

**Milestone**: M0 — Foundation

**Structure**: `shared/services/ticket/types.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Scope**: Add AttrMutationRequest, MutationResult, operation types
**Boundary**: Service-layer contracts; C2 - only relation fields support add/remove

**Creates**:
- (none - extending existing file)

**Modifies**:
- `shared/services/ticket/types.ts`

**Must Not Touch**:
- `domain-contracts/src/ticket/input.ts`

**Anti-duplication**: Use CR type from domain-contracts

**Duplication Guard**:
- Types define service contracts, not entity schemas
- C2: Add AttrOpType enum with 'replace', 'add', 'remove'

**Verify**:
```bash
cd shared && bun run tsc --noEmit
```

**Done when**:
- [ ] AttrMutationRequest type with operations array
- [ ] MutationResult type with structured fields
- [ ] AttrOpType enum (replace/add/remove)
- [ ] TypeScript compiles

---

### Task 6: Create TicketMutationService (M2)

**Milestone**: M2 — Ticket Mutation (BR-3, BR-4)

**Structure**: `shared/services/ticket/TicketMutationService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Makes GREEN (Behavior)**:
- `apply_relation_attr_operations_atomically` (BR-3)
- `return_structured_results_for_shared_attr_writes` (BR-4)

**Scope**: Consumer-facing ticket attr mutation with atomic operations
**Boundary**: Facade over TicketService; validates C2 (relation fields only for add/remove)

**Creates**:
- `shared/services/ticket/TicketMutationService.ts`

**Modifies**:
- (none)

**Must Not Touch**:
- `shared/services/TicketService.ts` core logic
- CLI modules

**Anti-duplication**: Use TicketService for persistence

**Duplication Guard**:
- Do NOT re-implement ticket persistence - use TicketService
- Validation logic for C2 belongs here, not in consumers

**Verify**:
```bash
cd shared && bun run jest services/ticket/__tests__/TicketMutationService.test.ts
```

**Done when**:
- [x] `mutateAttrs()` accepts operation array
- [x] Validates add/remove only for relation fields (C2)
- [x] Applies operations atomically
- [x] Returns structured MutationResult (BR-4)
- [x] Uses ServiceError for failures
- [x] Tests GREEN

---

### Task 7: Update shared/index.ts exports (M1)

**Milestone**: M1 — Project Context

**Structure**: `shared/index.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Scope**: Re-export new shared framework surface
**Boundary**: Public API for CLI, MCP, server consumers

**Creates**:
- (none)

**Modifies**:
- `shared/index.ts`

**Must Not Touch**:
- (none)

**Anti-duplication**: N/A

**Duplication Guard**:
- Check existing exports before adding
- Avoid exporting internal implementation details

**Verify**:
```bash
cd shared && bun run tsc --noEmit && bun run build
```

**Done when**:
- [ ] ServiceError exported
- [ ] ProjectContextService exported
- [ ] TicketMutationService exported
- [ ] Service types exported
- [ ] Build succeeds

---

### Task 8: Remove console logging from shared services (M1)

**Milestone**: M1 — Project Context

**Structure**: `shared/services/ProjectService.ts`, `shared/services/TicketService.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Scope**: Remove direct console output from normal paths (C3)
**Boundary**: Keep logging injectable or remove; don't break error handling

**Creates**:
- (none)

**Modifies**:
- `shared/services/ProjectService.ts`
- `shared/services/TicketService.ts`

**Must Not Touch**:
- Test files
- CLI modules

**Anti-duplication**: N/A

**Duplication Guard**:
- Check each console.log/console.error before removing
- Consider if logging is needed for debugging - make injectable if so

**Verify**:
```bash
cd shared && bun run jest services/project/__tests__/ProjectContextService.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketMutationService.test.ts
```

**Done when**:
- [ ] No console.log in normal success paths
- [ ] No console.log in expected validation-failure paths
- [ ] Shared tests prove consumers receive typed failures/results without relying on console output
- [ ] Existing tests still pass

---

### Task 9: Migrate MCP to use new shared services (M2)

**Milestone**: M2 — Ticket Mutation

**Structure**: `mcp-server/src/`

**Makes GREEN (Behavior)**:
- `detect_project_context_from_nested_directory` (BR-1)
- `apply_relation_attr_operations_atomically` (BR-3)

**Scope**: Update MCP handlers to use ProjectContextService and TicketMutationService
**Boundary**: MCP uses shared framework; remove MCP-private detection

**Creates**:
- (none)

**Modifies**:
- `mcp-server/src/index.ts`
- `mcp-server/src/tools/handlers/projectHandlers.ts`
- `mcp-server/src/services/crService.ts`
- `mcp-server/src/tools/handlers/crHandlers.ts`

**Must Not Touch**:
- CLI modules (MDT-143 territory)
- Shared service implementations

**Anti-duplication**: Import ProjectContextService from shared, don't re-implement

**Duplication Guard**:
- Remove MCP-private project detection code
- Use shared detector via ProjectContextService

**Verify**:
```bash
cd mcp-server && bun run build && bun run jest --passWithNoTests
```

**Done when**:
- [ ] MCP uses ProjectContextService for project resolution
- [ ] MCP uses TicketMutationService for writes
- [ ] MCP-private detection code removed
- [ ] MCP tests pass
- [ ] MCP server starts successfully

---

### Task 10: Remove CLI error dependencies from ProjectManager (M1)

**Milestone**: M1 — Project Context

**Structure**: `shared/tools/ProjectManager.ts`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`

**Scope**: Replace CLI-specific error imports with ServiceError (C3)
**Boundary**: Keep ProjectManager focused on project bootstrap/update orchestration; allow the minimal constructor/signature cleanup needed to remove CLI-coupled error handling

**Creates**:
- (none)

**Modifies**:
- `shared/tools/ProjectManager.ts`

**Must Not Touch**:
- CLI modules
- Project lookup ownership (belongs to ProjectContextService)

**Anti-duplication**: Use ServiceError from Task 1

**Duplication Guard**:
- Check all error imports - replace CLI-specific with ServiceError
- Preserve error semantics, just change types

**Verify**:
```bash
cd shared && bun run jest --testPathPattern="ProjectManager" --passWithNoTests
```

**Done when**:
- [ ] No CLI-specific error imports
- [ ] Uses ServiceError for validation failures
- [ ] Any structural change stays limited to removing CLI-coupled error handling, not broadening ProjectManager ownership
- [ ] Existing tests still pass

---

### Task 11: Verify domain-contracts compatibility (M0)

**Milestone**: M0 — Foundation

**Structure**: `domain-contracts/src/`

**Makes GREEN (Automated Tests)**:
- `TEST-project-context` → `shared/services/project/__tests__/ProjectContextService.test.ts`
- `TEST-ticket-mutation` → `shared/services/ticket/__tests__/TicketMutationService.test.ts`

**Scope**: Verify the ownership boundary between domain-contracts and shared service-layer contracts (C4)
**Boundary**: No modifications to domain-contracts; verification only

**Creates**:
- (none)

**Modifies**:
- (verification only)

**Must Not Touch**:
- `domain-contracts/` schemas

**Anti-duplication**: N/A

**Duplication Guard**:
- Persisted entity and input schema ownership stays in domain-contracts
- Service-layer request/result contracts stay in shared/services/*/types.ts

**Verify**:
```bash
cd shared && bun run tsc --noEmit
```

**Done when**:
- [ ] No new service-layer request/result contracts are added to domain-contracts
- [ ] Shared service contracts live in `shared/services/*/types.ts`
- [ ] Persisted entity schema ownership remains in domain-contracts
- [ ] TypeScript compiles

---

## Post-Implementation

- [ ] No duplication (grep check for re-implemented detection/mutation logic)
- [ ] Scope boundaries respected
- [ ] All unit tests GREEN
- [ ] All BDD scenarios GREEN
- [ ] Smoke test: MCP server starts with new services
- [ ] Fallback: No-project detection returns structured result

---

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| shared/services/ | 6 | 6 | 0 | ✅ |
| shared/utils/ | 1 | 1 | 0 | ✅ |
| shared/tools/ | 1 | 1 | 0 | ✅ |
| shared/index.ts | 1 | 1 | 0 | ✅ |
| domain-contracts/ | 2 | 2 | 0 | ✅ |
| mcp-server/ | 4 | 4 | 0 | ✅ |

---
*Canonical task ownership and GREEN links: [tasks.trace.md](./tasks.trace.md)*
*Rendered by /mdt:tasks via spec-trace*
