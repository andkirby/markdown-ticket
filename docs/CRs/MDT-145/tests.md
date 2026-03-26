# Tests: MDT-145

**Source**: [MDT-145](../MDT-145-refine-shared-layer-into-a-stable-service-framewor.md)
**Generated**: 2026-03-26

## Overview

Unit tests for the shared service framework. These tests are **RED** until implementation exists for the full reshaped contract. They verify:

1. Root-up project detection from nested directories
2. Case-insensitive project-code resolution
3. Project list and project update capability separation
4. Ticket list filtering capability
5. Ticket attribute update capability with relation add/remove semantics
6. Ticket document update capability with H1 title authority
7. Ticket subdocument listing capability
8. Structured shared write results through a common write-result family instead of bare booleans

## Module → Test Mapping

| Module | Test File | Tests |
|--------|-----------|-------|
| `projectDetector` | `shared/utils/__tests__/projectDetector.test.ts` | 6 |
| `ProjectService` | `shared/services/project/__tests__/ProjectService.test.ts` | 14 |
| `TicketService` query | `shared/services/ticket/__tests__/TicketService.query.test.ts` | 8 |
| `TicketService` attrs | `shared/services/ticket/__tests__/TicketService.attributes.test.ts` | 16 |
| `TicketDocumentService` | `shared/services/ticket/__tests__/TicketDocumentService.test.ts` | 10 |
| `TicketService` subdocuments | `shared/services/ticket/__tests__/TicketService.subdocuments.test.ts` | 6 |

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

### Project Service (`shared/services/project/__tests__/ProjectService.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should resolve project from current working directory | BR-1 |
| should return structured failure when no project detected | Edge-1 |
| should resolve project by exact identifier | BR-2 |
| should resolve project by code case-insensitively | BR-2 |
| should normalize code lookup to lowercase | BR-2 |
| should prefer exact identifier match over code lookup | BR-2 |
| should return structured failure for unknown project | Edge-2 |
| should list active projects through the shared project query capability | BR-3 |
| should keep project list query separate from project update operations | BR-3 |
| should update project attributes through a structured write capability | BR-4 |
| should return project update results through the shared write-result family instead of a bare boolean | BR-9 |
| should return ServiceError-backed failures for project lookup/update problems | C3 |
| should keep service result metadata outside the raw project payload | C1, C4 |
| should keep service interfaces in shared types, not domain-contracts | C4 |

### Ticket Service Query (`shared/services/ticket/__tests__/TicketService.query.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should list tickets through the shared ticket query capability | BR-5 |
| should filter tickets by status | BR-5 |
| should filter tickets by type | BR-5 |
| should filter tickets by priority | BR-5 |
| should filter tickets by date range | BR-5 |
| should keep ticket list query separate from ticket update capabilities | BR-5 |
| should return consumer-neutral ticket query results | C1 |
| should treat filter input as literal data | C5 |

### Ticket Service Attributes (`shared/services/ticket/__tests__/TicketService.attributes.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should apply replace operation for scalar attr fields | BR-6 |
| should apply add operation for relation fields | BR-6 |
| should apply remove operation for relation fields | BR-6 |
| should reject add/remove for non-relation fields | C2, Edge-3 |
| should reject title updates through attribute flow | BR-6, C2 |
| should reject content updates through attribute flow | BR-6, C2 |
| should apply multiple attr operations atomically | BR-6 |
| should not persist on attr validation failure | Edge-3 |
| should return attr-update results through the shared write-result family with target ticket info | BR-9 |
| should return normalized input values in attr-update results | BR-9 |
| should return persisted file path in attr-update results | BR-9 |
| should return changed fields in attr-update results | BR-9 |
| should return structured error for missing ticket | Edge-3 |
| should return structured error for missing project | Edge-2 |
| should return ServiceError-backed failures for invalid attr mutations | C3 |
| should treat shell-like user input as literal data | C5 |

### Ticket Document Service (`shared/services/ticket/__tests__/TicketDocumentService.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should update ticket document content through a dedicated document capability | BR-7 |
| should keep title as part of the ticket entity | BR-7 |
| should derive title from H1 when content includes an H1 | BR-7 |
| should generate an H1 when updating title without an H1 in content | BR-7 |
| should reject document updates through attr-update paths | BR-6, BR-7 |
| should return document-update results through the shared write-result family instead of a bare boolean | BR-9 |
| should include changed fields and persisted path in document-update results | BR-9 |
| should return ServiceError-backed failures for document update problems | C3 |
| should keep title/H1 logic in document flow rather than attr flow | BR-7 |
| should treat markdown content as literal document data | C5 |

### Ticket Service Subdocuments (`shared/services/ticket/__tests__/TicketService.subdocuments.test.ts`)

| Test Name | Covers |
|-----------|--------|
| should list ticket subdocuments through a dedicated capability | BR-8 |
| should return subdocument metadata without loading the full ticket document body | BR-8 |
| should preserve namespace-aware subdocument grouping | BR-8 |
| should keep subdocument listing separate from ticket attr/document updates | BR-8 |
| should return consumer-neutral subdocument list results | C1 |
| should return ServiceError-backed failures for missing ticket subdocument context | C3 |

## Constraint Coverage

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| C1 | `projectDetector.test.ts`, `ProjectService.test.ts`, `TicketService.query.test.ts`, `TicketService.subdocuments.test.ts` | Consumer-neutral contracts |
| C2 | `TicketService.attributes.test.ts` | Relation add/remove and attr-boundary validation |
| C3 | `ProjectService.test.ts`, `TicketService.attributes.test.ts`, `TicketDocumentService.test.ts`, `TicketService.subdocuments.test.ts` | No CLI-specific errors |
| C4 | `ProjectService.test.ts` | Canonical data in domain-contracts, service interfaces in shared |
| C5 | `TicketService.query.test.ts`, `TicketService.attributes.test.ts`, `TicketDocumentService.test.ts` | Literal data handling |

## Verify

```bash
# Run all MDT-145 tests
cd shared && bun run jest --testPathPattern="projectDetector|ProjectService|TicketService|TicketDocumentService"

# Run focused suites
cd shared && bun run jest utils/__tests__/projectDetector.test.ts
cd shared && bun run jest services/project/__tests__/ProjectService.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketService.query.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketService.attributes.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketDocumentService.test.ts
cd shared && bun run jest services/ticket/__tests__/TicketService.subdocuments.test.ts
```

---
*Canonical test-plan projection: [tests.trace.md](./tests.trace.md)*
*Rendered by /mdt:tests via spec-trace*
