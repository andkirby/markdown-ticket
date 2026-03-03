# Tests: MDT-094

**Source**: [architecture.md](./architecture.md)
**Updated**: 2026-03-02

## Overview

Tests for optimizing CR listing API to return metadata-only responses. Tests verify that list operations return `TicketMetadata` (no content) while detail operations return full `Ticket` with content.

## Module → Test Mapping

| Module | Test File | Tests | TDD Status |
|--------|-----------|-------|------------|
| `shared/models/Ticket.ts` | `shared/tests/models/MDT-094/TicketMetadata.test.ts` | 7 | ✅ PASS (uses `Omit<Ticket, 'content'>` placeholder) |
| `shared/services/MarkdownService.ts` | `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts` | 12 | 🔴 FAIL (method not implemented) |
| `server/controllers/ProjectController.ts` | `server/tests/integration/api.metadata.test.ts` | 11 | 🔴 FAIL (endpoint returns full Ticket[]) |
| `src/services/dataLayer.ts` | `src/services/dataLayer.metadata.test.ts` | 8 | 🔴 FAIL (method not implemented) |

## Data Mechanism Tests

| Pattern | Module | Tests |
|---------|--------|-------|
| Metadata excludes content | `TicketMetadata` | `content` field absent by definition |
| YAML-only parsing | `MarkdownService.scanTicketMetadata()` | Parses frontmatter without reading markdown body |
| Invalid YAML handling | `MarkdownService.scanTicketMetadata()` | Uses defaults (empty strings, null dates), continues |
| File system errors | `MarkdownService.scanTicketMetadata()` | Logs warning, skips file, continues with others |
| Payload size boundary | API integration | 100 tickets < 20KB response |

## External Dependency Tests

| Dependency | Real Test | Behavior When Absent |
|------------|-----------|----------------------|
| File system (fs) | `scanTicketMetadata` reads real temp files | Returns empty array, logs error |
| Express app | API tests use test-app-factory | N/A (test scaffolding) |

## Constraint Coverage

From requirements.md acceptance criteria:

| Constraint ID | Test File | Tests |
|---------------|-----------|-------|
| AC1: List returns metadata-only | `api.metadata.test.ts` | `should return tickets WITHOUT content field` |
| AC2: Response includes required fields | `api.metadata.test.ts` | `should include all required metadata fields` |
| AC3: Detail unchanged | `api.metadata.test.ts` | `should return full ticket WITH content for detail endpoint` |
| AC4: Frontend renders correctly | E2E (out of scope) | N/A |
| AC5: Lazy content fetch | E2E (out of scope) | N/A |
| AC6: Sorting works | `api.metadata.test.ts` | `should support sorting by date fields` |
| NF1: Payload >80% reduction | `api.metadata.test.ts` | `should reduce payload size by >80%` |
| NF2: Response time <200ms | `api.metadata.test.ts` | `should respond within 200ms` |
| NF3: No breaking changes | `api.metadata.test.ts` | `should maintain detail endpoint structure` |

## Architecture Invariant Tests

| Invariant | Test File | Test |
|-----------|-----------|------|
| Metadata never includes content | `TicketMetadata.test.ts` | Type definition excludes content |
| One scan path for metadata | `MarkdownService.scanTicketMetadata.test.ts` | Only method that returns TicketMetadata[] |
| Detail endpoint unchanged | `api.metadata.test.ts` | Compare with baseline structure |

## Test Details

### 1. TicketMetadata Type Tests (7 tests)

**File**: `shared/tests/models/MDT-094/TicketMetadata.test.ts`

```typescript
describe('TicketMetadata', () => {
  describe('type definition', () => {
    it('should exclude content field by definition')
    it('should include all required metadata fields')
    it('should have optional fields matching Ticket')
    it('should be assignable from Ticket (pick)')
    it('should normalize dates correctly')
  })
  describe('normalizeTicketMetadata', () => {
    it('should normalize unknown input to TicketMetadata')
    it('should handle missing required fields with defaults')
  })
})
```

### 2. MarkdownService.scanTicketMetadata Tests (12 tests)

**File**: `shared/tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts`

```typescript
describe('MarkdownService.scanTicketMetadata', () => {
  describe('YAML parsing', () => {
    it('should extract metadata from valid YAML frontmatter')
    it('should skip markdown body entirely')
    it('should handle files without frontmatter')
    it('should use defaults for invalid YAML')
  })

  describe('error handling', () => {
    it('should log warning and skip unreadable files')
    it('should return empty array for non-existent directory')
    it('should continue processing after file error')
  })

  describe('performance', () => {
    it('should not read file content beyond frontmatter')
    it('should process multiple files efficiently')
  })

  describe('data format handling', () => {
    it('should handle relationship fields as arrays')
    it('should handle empty relationship fields')
    it('should handle ISO date strings')
  })
})
```

### 3. API Metadata Tests (11 tests)

**File**: `server/tests/integration/api.metadata.test.ts`

```typescript
describe('GET /api/projects/:projectId/crs (Metadata)', () => {
  describe('response structure', () => {
    it('should return array of TicketMetadata WITHOUT content field')
    it('should include all required metadata fields')
    it('should include relationship arrays')
    it('should support sorting by dateCreated')
  })

  describe('detail endpoint unchanged', () => {
    it('should return full ticket WITH content for detail endpoint')
    it('should include all Ticket fields in detail response')
  })

  describe('performance', () => {
    it('should reduce payload size by >80% for list endpoint')
    it('should respond within 200ms for list endpoint')
  })

  describe('edge cases', () => {
    it('should return empty array for project with no CRs')
    it('should return 404 for non-existent project')
    it('should handle CR with minimal metadata')
  })
})
```

### 4. DataLayer Metadata Tests (8 tests)

**File**: `src/services/dataLayer.metadata.test.ts`

```typescript
describe('DataLayer.fetchTicketsMetadata', () => {
  it('should fetch metadata from list endpoint')
  it('should normalize TicketMetadata response')
  it('should NOT fetch full tickets')
  it('should handle network errors with retry option')
  it('should return empty array for empty project')
  it('should handle 404 project not found')

  describe('type safety', () => {
    it('should return TicketMetadata[] not Ticket[]')
    it('should be usable in list views without content')
  })
})
```

## Verify

```bash
# Run shared workspace tests
bun run --cwd shared test tests/models/MDT-094/TicketMetadata.test.ts
bun run --cwd shared test tests/services/MDT-094/MarkdownService.scanTicketMetadata.test.ts

# Run server workspace tests
bun run --cwd server test tests/integration/api.metadata.test.ts

# Run frontend tests (from root)
bun test src/services/dataLayer.metadata.test.ts

# Run all MDT-094 tests with coverage
bun run --cwd shared test --coverage --testPathPattern="MDT-094"
bun run --cwd server test --coverage --testPathPattern="MDT-094"
```

## TDD Status

| Test File | Status | Reason |
|-----------|--------|--------|
| `TicketMetadata.test.ts` | ✅ PASS | Uses `Omit<Ticket, 'content'>` as placeholder type |
| `MarkdownService.scanTicketMetadata.test.ts` | 🔴 RED | `scanTicketMetadata()` method not yet implemented |
| `api.metadata.test.ts` | 🔴 RED | API still returns full `Ticket[]` with content |
| `dataLayer.metadata.test.ts` | 🔴 RED | `fetchTicketsMetadata()` method not yet implemented |

## Checklist

- [x] Architecture exists
- [x] Mode detected: feature (RED tests)
- [x] All modules have interface tests
- [x] Every runtime source file in architecture.md Structure section has corresponding test
- [x] Data mechanisms extracted and tested
- [x] External dependencies tested with real integration
- [x] Constraint IDs from requirements covered
- [x] Test files written to project test directory
- [x] tests.md written to CR folder
- [x] Verification command recorded
