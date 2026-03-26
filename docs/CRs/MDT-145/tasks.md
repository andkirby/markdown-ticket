# Tasks: MDT-145

**Source**: canonical architecture/tests/bdd state + `tasks.trace.md` for trace cross-checking

## Scope Boundaries

- **Shared framework boundary**: shared exposes explicit project and ticket service capabilities
- **Domain-contracts**: own canonical entity/input/config shapes only
- **Service interfaces**: stay in `shared/services/*/types.ts`
- **CLI adoption**: out of scope, owned by MDT-143
- **MCP migration**: in scope where private shared logic is removed

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| Project detection | `shared/utils/projectDetector.ts` | N/A (new) |
| Project service capability surface | `shared/services/ProjectService.ts`, `shared/services/project/types.ts` | Task 4 + Task 5 |
| Ticket service capability surface | `shared/services/TicketService.ts`, `shared/services/ticket/types.ts` | Task 7 + Task 8 |
| Ticket document logic | `shared/services/ticket/TicketDocumentService.ts` | Task 6 |
| Shared error model | `shared/services/ServiceError.ts` | Task 1 |
| Domain role split for project contracts | `domain-contracts/src/project/` | Task 3 |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| C1 | Task 1, 4, 5, 6, 7, 8, 10 |
| C2 | Task 8 |
| C3 | Task 1, 9, 11 |
| C4 | Task 3, 5, 7 |
| C5 | Task 6, 8 |

## Milestones

| Milestone | BDD Scenarios | Tasks | Checkpoint |
|-----------|---------------|-------|------------|
| M0: Foundation | — | Task 1, 2, 3 | ServiceError + detector + project role split compile |
| M1: Project Services | `detect_project_context_from_nested_directory`, `resolve_project_case_insensitively_via_shared_lookup`, `list_projects_through_shared_project_service`, `update_project_attributes_through_shared_project_service` | Task 4, 5, 9, 10 | Project service contract GREEN |
| M2: Ticket Services | `list_tickets_with_supported_filters`, `apply_relation_attr_operations_atomically`, `update_ticket_document_with_h1_title_authority`, `list_ticket_subdocuments_separately_from_ticket_document`, `return_structured_results_for_shared_writes` | Task 6, 7, 8, 9, 10 | Ticket service contract GREEN |
| M3: Consumer Adoption | project/ticket shared scenarios above | Task 11 | MCP no longer keeps private copies of shared rules |

---

## Tasks

### Task 1: Create shared ServiceError type (M0)

**Structure**: `shared/services/ServiceError.ts`

**Scope**: Typed shared-neutral error model for project and ticket services  
**Boundary**: Must not import CLI-specific error types

**Makes GREEN**:
- `TEST-project-service`
- `TEST-ticket-attributes`
- `TEST-ticket-document`
- `TEST-ticket-subdocuments`

**Done when**:
- [ ] Shared service errors are typed and consumer-neutral
- [ ] Project and ticket services can return structured failures without CLI coupling

---

### Task 2: Create projectDetector utility (M0)

**Structure**: `shared/utils/projectDetector.ts`

**Scope**: Root-up `.mdt-config.toml` detection from cwd  
**Boundary**: Pure utility, no registration side effects

**Makes GREEN**:
- `TEST-project-detector`
- `detect_project_context_from_nested_directory`

**Done when**:
- [ ] Detection searches parent directories to filesystem root
- [ ] Detection returns explicit no-project result

---

### Task 3: Clarify domain contract roles (M0)

**Structure**: `domain-contracts/src/project/entity.ts`, `domain-contracts/src/project/input.ts`, `domain-contracts/src/ticket/entity.ts`, `domain-contracts/src/ticket/input.ts`, existing config/registry/worktree modules

**Scope**: Clarify canonical project role ownership while keeping the ticket canonical entity/input boundary aligned  
**Boundary**: Do not move service interfaces into `domain-contracts`

**Makes GREEN**:
- `TEST-project-service`

**Done when**:
- [ ] Project entity and project input roles are explicit in `domain-contracts`
- [ ] Ticket canonical entity/input ownership remains explicit and unchanged by service-interface work
- [ ] Existing config, registry, and worktree roles remain specialized
- [ ] Service interfaces remain in `shared`

---

### Task 4: Reshape ProjectService around project capabilities (M1)

**Structure**: `shared/services/ProjectService.ts`

**Scope**: Expose project context, lookup, list, and project attribute update capabilities under a coherent project service surface  
**Boundary**: Keep query and update capabilities explicit even if they share one `ProjectService` wording

**Makes GREEN**:
- `resolve_project_case_insensitively_via_shared_lookup`
- `list_projects_through_shared_project_service`
- `update_project_attributes_through_shared_project_service`

**Done when**:
- [ ] Project list is a visible capability
- [ ] Project attribute updates are a visible capability
- [ ] Project lookup/context semantics remain explicit and typed

---

### Task 5: Extend project service types with service contracts (M1)

**Structure**: `shared/services/project/types.ts`

**Scope**: Add project request contracts, shared read/write result families, and any service interfaces  
**Boundary**: Types belong in `shared`, not `domain-contracts`

**Makes GREEN**:
- `TEST-project-service`

**Done when**:
- [ ] Project request contracts and shared result families are explicit
- [ ] Shared project service interfaces stay outside `domain-contracts`

---

### Task 6: Create TicketDocumentService (M2)

**Structure**: `shared/services/ticket/TicketDocumentService.ts`

**Scope**: Own markdown-aware ticket document updates, including title/H1 rules  
**Boundary**: Title belongs to ticket entity, but title authority belongs to document flow

**Makes GREEN**:
- `update_ticket_document_with_h1_title_authority`
- `TEST-ticket-document`

**Done when**:
- [ ] Document update capability is separate from attr updates
- [ ] H1 remains the authoritative stored title source
- [ ] Structured document-update results replace booleans

---

### Task 7: Reshape TicketService around ticket capabilities (M2)

**Structure**: `shared/services/TicketService.ts`

**Scope**: Expose ticket list, ticket attr updates, ticket document updates, and ticket subdocument listing under a coherent ticket service surface  
**Boundary**: Do not blur query, attr, document, and subdocument capabilities back together

**Makes GREEN**:
- `list_tickets_with_supported_filters`
- `list_ticket_subdocuments_separately_from_ticket_document`
- `return_structured_results_for_shared_writes`

**Done when**:
- [ ] Ticket list capability is explicit
- [ ] Ticket subdocument listing capability is explicit
- [ ] Ticket document updates are delegated through document-focused logic

---

### Task 8: Extend ticket service types and attr semantics (M2)

**Structure**: `shared/services/ticket/types.ts`

**Scope**: Add ticket request contracts, shared read/write result families, and preserve relation add/remove semantics for attr updates  
**Boundary**: Title/content are not mutable via attr-update contracts

**Makes GREEN**:
- `apply_relation_attr_operations_atomically`
- `TEST-ticket-attributes`
- `TEST-ticket-query`
- `TEST-ticket-subdocuments`

**Done when**:
- [ ] Ticket attr-update contracts reject title/content
- [ ] Relation add/remove semantics are explicit
- [ ] Ticket request contracts and shared result families are explicit

---

### Task 9: Remove direct console logging from shared normal paths (M1/M2)

**Structure**: shared project/ticket services and backends

**Scope**: Keep terminal output under consumer control  
**Boundary**: Preserve diagnostics via typed results/errors or injected logging

**Makes GREEN**:
- `TEST-project-service`
- `TEST-ticket-attributes`
- `TEST-ticket-document`
- `TEST-ticket-subdocuments`

**Done when**:
- [ ] Normal success and validation paths do not rely on direct console output
- [ ] Shared consumers receive typed failures/results

---

### Task 10: Update shared exports and contract entrypoints (M1/M2)

**Structure**: `shared/index.ts`

**Scope**: Re-export the stable project/ticket service framework surface  
**Boundary**: Export service contracts, not backend internals by default

**Makes GREEN**:
- `TEST-project-service`
- `TEST-ticket-query`
- `TEST-ticket-attributes`
- `TEST-ticket-document`
- `TEST-ticket-subdocuments`

**Done when**:
- [ ] Project and ticket service surfaces are exported clearly
- [ ] Service contract types and shared result families are exported from shared entrypoints

---

### Task 11: Migrate MCP-private shared logic to the reshaped service framework (M3)

**Structure**: `mcp-server/src/`

**Scope**: Remove private copies of project detection and ticket capability logic  
**Boundary**: CLI command adoption remains out of scope

**Makes GREEN**:
- project/ticket shared BDD scenarios through MCP adoption

**Done when**:
- [ ] MCP uses shared project service capabilities
- [ ] MCP uses shared ticket service capabilities
- [ ] MCP no longer owns private copies of shared rules

---

## Post-Implementation

- [ ] No private consumer copies of shared project/ticket rules remain in scope
- [ ] Service capability boundaries are visible in code, not only implied in docs
- [ ] `domain-contracts` owns canonical entity/input/config shapes only
- [ ] Shared service interfaces and request/result contracts stay in `shared`
- [ ] All shared tests are GREEN

---
*Canonical task ownership and GREEN links: [tasks.trace.md](./tasks.trace.md)*
*Rendered by /mdt:tasks via spec-trace*
