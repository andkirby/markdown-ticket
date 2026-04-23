# Tasks: MDT-094

**Source**: [architecture.md](./architecture.md) + [tests.md](./tests.md)

## Scope Boundaries

- **TicketMetadata type**: Shared model, excludes `content` field by definition
- **MarkdownService.scanTicketMetadata()**: YAML-only parsing, must NOT read markdown body
- **ProjectService.getProjectCRsMetadata()**: Orchestration layer, must NOT return `content`
- **ProjectController.getProjectCRs()**: Returns `TicketMetadata[]`, detail endpoint unchanged
- **dataLayer.fetchTicketsMetadata()**: Frontend fetch for list views, must NOT fetch full tickets

## Ownership Guardrails

| Critical Behavior | Owner Module | Merge/Refactor Task if Overlap |
|-------------------|--------------|--------------------------------|
| YAML frontmatter parsing | `shared/services/MarkdownService.ts` | N/A - single owner |
| Metadata type definition | `shared/models/Ticket.ts` | N/A - single owner |
| CR list endpoint response | `server/controllers/ProjectController.ts` | N/A - single owner |
| Frontend data fetching | `src/services/dataLayer.ts` | N/A - single owner |

## Constraint Coverage

| Constraint ID | Tasks |
|---------------|-------|
| AC1: List returns metadata-only | Task 3, Task 4 |
| AC2: Response includes required fields | Task 1, Task 3 |
| AC3: Detail unchanged | Task 4 (verifies unchanged) |
| AC6: Sorting works | Task 3 (preserves existing behavior) |
| NF1: Payload >80% reduction | Task 2, Task 3 (efficient parsing) |
| NF2: Response time <200ms | Task 2 (YAML-only, no body reading) |
| NF3: No breaking changes | All tasks (backward compatible) |

## Tasks

### Task 1: Add TicketMetadata Type

**Structure**: `shared/models/Ticket.ts`

**Makes GREEN (unit)**:
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should exclude content field by definition`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should include all required metadata fields`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should have optional fields matching Ticket`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should be assignable from Ticket (pick)`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should normalize dates correctly`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should normalize unknown input to TicketMetadata`
- `shared/tests/models/MDT-094/TicketMetadata.test.ts`: `should handle missing required fields with defaults`

**Scope**: Define `TicketMetadata` interface and `normalizeTicketMetadata()` function
**Boundary**: Type definitions only - no runtime behavior changes

**Creates**:
- `TicketMetadata` interface in `shared/models/Ticket.ts`
- `normalizeTicketMetadata()` function in `shared/models/Ticket.ts`

**Modifies**:
- `shared/models/Ticket.ts` - Add type and function exports

**Must Not Touch**:
- `server/` files
- `src/` files
- Any existing `Ticket` type fields

**Exclude**:
- Do NOT add `content` field to `TicketMetadata`
- Do NOT modify `normalizeTicket()` function

**Anti-duplication**: Import `Ticket` from `./Ticket.js` — use `Omit<Ticket, 'content'>` pattern

**Duplication Guard**:
- Check that `TicketMetadata` does not duplicate fields from `Ticket` - use Omit utility type
- Verify `normalizeTicketMetadata()` reuses helpers from `normalizeTicket()` (parseDate, normalizeArray)

**Verify**:

```bash
bun run --cwd shared test tests/models/MDT-094/TicketMetadata.test.ts
```

**Done when**:
- [ ] `TicketMetadata` interface exported from `shared/models/Ticket.ts`
- [ ] `normalizeTicketMetadata()` function exported
- [ ] Type excludes `content` field by definition
- [ ] All 7 TicketMetadata tests GREEN
- [ ] `bun run build:shared` succeeds

---

### Task 2: Add scanTicketMetadata() to MarkdownService

**Structure**: `shared/services/MarkdownService.ts`

**Makes GREEN (unit)**:
- `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts`: All 12 tests

**Scope**: Add `scanTicketMetadata()` static method for YAML-only parsing
**Boundary**: New method only - must NOT modify `parseMarkdownFile()` or `scanMarkdownFiles()`

**Creates**:
- `MarkdownService.scanTicketMetadata()` static method

**Modifies**:
- `shared/services/MarkdownService.ts` - Add new method

**Must Not Touch**:
- `parseMarkdownFile()` method
- `scanMarkdownFiles()` method
- `parseMarkdownContent()` method

**Exclude**:
- Do NOT read file content beyond YAML frontmatter
- Do NOT parse markdown body

**Anti-duplication**: Import `TicketMetadata`, `normalizeTicketMetadata` from `../models/Ticket.js`

**Duplication Guard**:
- Check if YAML parsing logic exists in `parseYamlFrontmatter()` - reuse it
- Do NOT copy YAML parsing logic - extract to shared helper if needed

**Verify**:

```bash
bun run --cwd shared test tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts
```

**Done when**:
- [ ] `scanTicketMetadata()` method exists
- [ ] Returns `TicketMetadata[]` (not `Ticket[]`)
- [ ] Reads YAML frontmatter only, skips markdown body
- [ ] Handles files without frontmatter (returns null)
- [ ] Handles invalid YAML gracefully (uses defaults)
- [ ] Handles file system errors (logs warning, continues)
- [ ] All 12 MarkdownService tests GREEN
- [ ] `bun run build:shared` succeeds

---

### Task 3: Add getProjectCRsMetadata() to ProjectService

**Skills**: architecture-patterns

**Structure**: `shared/services/ProjectService.ts`

**Makes GREEN (unit)**:
- Supports `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts` (integration)

**Scope**: Add `getProjectCRsMetadata()` method that orchestrates metadata scanning
**Boundary**: New method only - existing `getProjectCRs()` remains unchanged for now

**Creates**:
- `ProjectService.getProjectCRsMetadata()` method

**Modifies**:
- `shared/services/ProjectService.ts` - Add new method

**Must Not Touch**:
- `getProjectCRs()` method (will be modified in Task 4)
- `WorktreeService` integration

**Exclude**:
- Do NOT return `content` field
- Do NOT call `MarkdownService.scanMarkdownFiles()` - use `scanTicketMetadata()`

**Anti-duplication**: Import `TicketMetadata` from `../models/Ticket.js`, use `MarkdownService.scanTicketMetadata()`

**Duplication Guard**:
- Check existing `getProjectCRs()` for worktree resolution logic - reuse pattern
- Do NOT duplicate worktree resolution - extract to shared helper if needed

**Verify**:

```bash
bun run --cwd shared test tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts
bun run build:shared
```

**Done when**:
- [ ] `getProjectCRsMetadata()` method exists
- [ ] Returns `Promise<TicketMetadata[]>`
- [ ] Handles worktree resolution (same pattern as `getProjectCRs()`)
- [ ] Does NOT include `content` in response
- [ ] `bun run build:shared` succeeds

---

### Task 4: Modify ProjectController to Return Metadata

**Skills**: architecture-patterns

**Structure**: `server/controllers/ProjectController.ts`

**Makes GREEN (unit)**:
- `server/tests/integration/api.metadata.test.ts`: All 11 tests

**Scope**: Modify `getProjectCRs()` to return `TicketMetadata[]` instead of `Ticket[]`
**Boundary**: List endpoint only - detail endpoint (`getCR()`) must remain unchanged

**Creates**:
- None (modification only)

**Modifies**:
- `server/controllers/ProjectController.ts` - `getProjectCRs()` method
- `server/services/TicketService.ts` - Add `getCRsMetadata()` method (if needed for orchestration)

**Must Not Touch**:
- `getCR()` method - detail endpoint must return full `Ticket` with content
- `createCR()`, `patchCR()`, `updateCR()`, `deleteCR()` methods
- Response structure for non-list endpoints

**Exclude**:
- Do NOT modify detail endpoint response structure
- Do NOT remove any fields from `TicketMetadata` that exist in current list response

**Anti-duplication**: Use `ProjectService.getProjectCRsMetadata()` from shared

**Duplication Guard**:
- Check if `TicketService` has metadata method - if not, add it
- Verify controller delegates to service layer, does not implement business logic

**Verify**:

```bash
bun run --cwd server test tests/integration/api.metadata.test.ts
```

**Done when**:
- [ ] `GET /api/projects/:projectId/crs` returns `TicketMetadata[]`
- [ ] Response does NOT include `content` field
- [ ] Response includes all required fields: code, title, status, type, priority, dates
- [ ] `GET /api/projects/:projectId/crs/:crId` still returns full `Ticket` with content (unchanged)
- [ ] All 11 API metadata tests GREEN
- [ ] Existing `api.test.ts` tests still pass

---

### Task 5: Add fetchTicketsMetadata() to DataLayer

**Structure**: `src/services/dataLayer.ts`

**Makes GREEN (unit)**:
- `src/services/dataLayer.metadata.test.ts`: All 8 tests

**Scope**: Add `fetchTicketsMetadata()` method for frontend list views
**Boundary**: New method only - `fetchTickets()` remains for backward compatibility

**Creates**:
- `DataLayer.fetchTicketsMetadata()` method
- `ApiTicketMetadataItem` interface (if needed)

**Modifies**:
- `src/services/dataLayer.ts` - Add new method and types

**Must Not Touch**:
- `fetchTickets()` method - some views may still need full tickets
- `fetchTicket()` method - detail view needs full content
- `normalizeTicket()` method

**Exclude**:
- Do NOT call `fetchTickets()` internally - use dedicated metadata endpoint
- Do NOT fetch full ticket objects

**Anti-duplication**: Import `TicketMetadata` type from `@mdt/shared/models/Ticket`

**Duplication Guard**:
- Check `normalizeTicket()` for date/array parsing helpers - extract and reuse
- Do NOT duplicate normalization logic

**Verify**:

```bash
bun test src/services/dataLayer.metadata.test.ts
```

**Done when**:
- [ ] `fetchTicketsMetadata()` method exists
- [ ] Returns `Promise<TicketMetadata[]>`
- [ ] Normalizes API response correctly
- [ ] Handles network errors with retry option
- [ ] Does NOT include `content` in returned objects
- [ ] All 8 dataLayer metadata tests GREEN

---

## Architecture Coverage

| Layer | Arch Files | In Tasks | Gap | Status |
|-------|-----------|----------|-----|--------|
| shared/models/ | 1 | 1 | 0 | ✅ |
| shared/services/ | 2 | 2 | 0 | ✅ |
| server/controllers/ | 1 | 1 | 0 | ✅ |
| src/services/ | 1 | 1 | 0 | ✅ |

All architecture files covered by tasks.

## Post-Implementation

- [ ] No duplication (grep check for duplicate normalization logic)
- [ ] Scope boundaries respected (detail endpoint unchanged)
- [ ] All unit tests GREEN
- [ ] TypeScript validation passes: `./scripts/validate-changed-ts.sh`
- [ ] Smoke test: List view loads without content, detail view shows content
- [ ] Payload size reduced by >80% (verify with browser dev tools)

## Post-Verify Fixes

(Added only if `/mdt:verify-complete` finds CRITICAL/HIGH issues)
