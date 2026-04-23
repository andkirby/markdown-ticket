# MDT-093 Technical Debt Analysis

**CR**: MDT-093
**Date**: 2026-03-07
**Files Analyzed**: 18
**Debt Items Found**: 7 (5 High, 2 Medium, 0 Low)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `src/`, `server/`, `shared/` |
| File extension | `.ts` |

## Summary

MDT-093 introduces sub-document navigation with hierarchical tabs. The implementation demonstrates good separation of concerns with custom hooks for navigation, content loading, and realtime updates. However, several technical debt patterns emerge: duplicated normalization logic between shared and frontend, spec violation in the default subdocument order, missing field handling in normalization, and type inconsistencies between shared and frontend type definitions.

## High Severity

### 1. Duplication: normalizeTicket duplicated across shared and frontend

- **Location**: `shared/models/Ticket.ts:85-122`, `src/services/dataLayer.ts:318-376`
- **Evidence**: Both files contain nearly identical `normalizeTicket()` functions with the same helper functions (`parseDate`, `normalizeArray`). The shared version is authoritative (line 85), but the frontend duplicates the logic (line 318).
- **Impact**: Adding new ticket fields requires updating two normalization functions. When `subdocuments` field was added, only the frontend version included it (dataLayer.ts:370), but the shared `normalizeTicket()` omitted it, causing subdocument metadata loss when using shared normalization.
- **Suggested Fix**: Export `normalizeTicket` from `@mdt/shared/models/Ticket` and import it in dataLayer. Remove the duplicated implementation. Ensure shared version handles all fields including `subdocuments`.

### 2. Spec Violation: DEFAULT_SUBDOCUMENT_ORDER doesn't match requirements

- **Location**: `shared/models/SubDocument.ts:22-30`
- **Evidence**: Requirements specify: `requirements`, `domain`, `architecture`, `poc`, `tests`, `tasks`, `debt` (requirements.md:18). Implementation has: `requirements`, `architecture`, `bdd`, `tests`, `tasks`, `design`, `notes`.
- **Impact**: Subdocuments named `domain`, `poc`, or `debt` won't appear in the expected order. Users relying on documented behavior will see incorrect tab ordering.
- **Suggested Fix**: Update `DEFAULT_SUBDOCUMENT_ORDER` to match requirements exactly: `['requirements', 'domain', 'architecture', 'poc', 'tests', 'tasks', 'debt']`

### 3. Missing Abstraction: normalizeTicket doesn't handle subdocuments field

- **Location**: `shared/models/Ticket.ts:85-122`
- **Evidence**: The `normalizeTicket()` function ends at line 122 without processing the `subdocuments` field. Line 44 declares `subdocuments?: import('./SubDocument.js').SubDocument[]`, but lines 85-122 never normalize it.
- **Impact**: When API responses with subdocument data are normalized through the shared `normalizeTicket()`, the `subdocuments` array is lost, breaking sub-document navigation.
- **Suggested Fix**: Add after line 119:

  ```typescript
  // MDT-093: Preserve subdocuments if present
  if (Array.isArray(ticket.subdocuments)) {
    normalizedTicket.subdocuments = ticket.subdocuments as SubDocument[]
  }
  ```

### 4. Hidden Coupling: Dynamic import creates type incompatibility

- **Location**: `shared/models/Ticket.ts:44`
- **Evidence**: Uses `import('./SubDocument.js').SubDocument[]` (dynamic import) while `src/types/ticket.ts:27` uses `import('@mdt/shared/models/SubDocument').SubDocument[]` (static import).
- **Impact**: Type checker may treat these as incompatible types. When shared `Ticket` is used in frontend, the `subdocuments` field type may not match the frontend expectation, causing type errors or requiring type assertions.
- **Suggested Fix**: Change to static import at top of file: `import type { SubDocument } from './SubDocument.js'` and use `subdocuments?: SubDocument[]`

### 5. Shotgun Surgery: Adding subdocument feature required editing 12+ files

- **Location**: Backend: `server/services/TicketService.ts`, `server/controllers/ProjectController.ts`, `server/routes/projects.ts`. Frontend: `src/components/TicketViewer.tsx`, `src/components/TicketViewer/*`, `src/services/dataLayer.ts`, `src/types/ticket.ts`. Shared: `shared/models/Ticket.ts`, `shared/models/SubDocument.ts`.
- **Evidence**: MDT-093 touched backend controllers, routes, services, shared models, frontend types, services, and multiple components. Adding new subdocument metadata fields requires coordinated changes across 4+ boundaries.
- **Impact**: Future enhancements to subdocument metadata (e.g., adding `lastModified`, `size`) will require backend API changes, shared type updates, frontend type updates, dataLayer changes, and component updates—high coordination cost.
- **Suggested Fix**: Consider introducing a SubDocumentService that encapsulates discovery, ordering, and metadata. This would provide a single extension point for subdocument-related operations.

## Medium Severity

### 6. Responsibility Diffusion: Subdocument discovery logic split across services

- **Location**: `server/services/TicketService.ts:122-204` (discovery), `shared/models/SubDocument.ts:22-30` (ordering), frontend hooks (navigation state)
- **Evidence**: Discovery happens in TicketService, ordering is defined in SubDocument model, navigation state management is in frontend hooks. Adding a new ordering source (e.g., project config `ticketSubdocuments` mentioned in requirements.md:119) would require changes in multiple places.
- **Impact**: Implementing the `.mdt-config.toml` `project.ticketSubdocuments` configuration (requirements.md:119) currently requires modifying the backend discovery logic. The configuration reading doesn't exist yet.
- **Suggested Fix**: Create a SubDocumentOrdering service that consolidates ordering logic: reads default order, project config override, and provides `getOrderedSubdocuments()` method.

### 7. Missing Abstraction: SubDocument lacks metadata fields for richer UI

- **Location**: `shared/models/SubDocument.ts:8-15`
- **Evidence**: SubDocument only has `name`, `kind`, `children`. Future UI enhancements like showing file size, last modified date, or author would require adding these fields and updating the entire discovery pipeline.
- **Impact**: If UI needs to display "Last modified: 2 hours ago" on subdocument tabs, the backend discovery (`TicketService.ts:157-181`) must be updated to collect `stat` data, the type must be extended, and frontend components must be modified.
- **Suggested Fix**: Add optional metadata fields to SubDocument interface when needed: `size?: number`, `lastModified?: Date`, `dateCreated?: Date`. Update discovery to populate these fields from `fs.stat`.

## Suggested Inline Comments

**File**: `shared/models/Ticket.ts`
**Line**: 119

```typescript
// TECH-DEBT: Missing Abstraction - normalizeTicket doesn't handle subdocuments
// Impact: Subdocument metadata lost when normalizing API responses through shared layer
// Suggested: Add subdocuments field normalization after worktree fields
// See: MDT-093/debt.md item #3
```

**File**: `shared/models/SubDocument.ts`
**Line**: 22

```typescript
// TECH-DEBT: Spec Violation - DEFAULT_SUBDOCUMENT_ORDER doesn't match requirements
// Impact: 'domain', 'poc', 'debt' subdocuments appear in wrong order
// Suggested: Update to ['requirements', 'domain', 'architecture', 'poc', 'tests', 'tasks', 'debt']
// See: MDT-093/debt.md item #2
```

**File**: `shared/models/Ticket.ts`
**Line**: 44

```typescript
// TECH-DEBT: Hidden Coupling - Dynamic import creates type incompatibility
// Impact: Type mismatch between shared and frontend subdocuments field
// Suggested: Use static import: import type { SubDocument } from './SubDocument.js'
// See: MDT-093/debt.md item #4
```

**File**: `src/services/dataLayer.ts`
**Line**: 318

```typescript
// TECH-DEBT: Duplication - normalizeTicket duplicated from shared/models/Ticket.ts
// Impact: Adding ticket fields requires updating two locations
// Suggested: Import and reuse normalizeTicket from @mdt/shared/models/Ticket
// See: MDT-093/debt.md item #1
```

## Recommended Actions

### Immediate (High Severity)
1. [ ] Fix `DEFAULT_SUBDOCUMENT_ORDER` to match requirements (add `domain`, `poc`, `debt`; remove `bdd`, `design`, `notes`)
2. [ ] Add subdocuments field handling to shared `normalizeTicket()`
3. [ ] Change `Ticket.ts` to use static import for SubDocument type
4. [ ] Export and reuse shared `normalizeTicket()` in dataLayer, remove duplicate

### Deferred (Medium/Low)
1. [ ] Create SubDocumentService to consolidate discovery and ordering logic
2. [ ] Add optional metadata fields to SubDocument when UI requirements emerge
3. [ ] Implement `.mdt-config.toml` `project.ticketSubdocuments` configuration reading

## Metrics

| Metric | Before | After | Target | Status |
|--------|--------|-------|--------|--------|
| Total files | 18 | 18 | — | — |
| Debt items | — | 7 | 0 | ❌ |
| High severity | — | 5 | 0 | ❌ |
| Medium severity | — | 2 | 0 | ❌ |
| Low severity | — | 0 | 0 | ✅ |

---
*Generated: 2026-03-07*
