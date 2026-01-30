# Tasks: MDT-101 Phase 1

**Source**: [MDT-101](../MDT-101-create-domain-contracts-package-with-zod-schemas-a.md) → Phase 1
**Phase**: 1 - Core Entities
**Tests**: `phase-1/tests.md`
**Generated**: 2025-12-21
**Updated**: 2025-12-23 (added phase breakdown)

## Phase Breakdown

| Sub-phase | Tasks | Status |
|-----------|-------|--------|
| **Phase 1a**: Create domain-contracts package | Tasks 1.1 - 5.1 | ✅ COMPLETE |
| **Phase 1b**: Integrate domain-contracts into codebase | Tasks 5.2 - 5.5 | ❌ NOT STARTED |
| **Post-Implementation**: Verification | Tasks 6.1 - 6.4 | ⚠️ PARTIAL (awaiting 1b) |

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `domain-contracts/src/` |
| Test command | `npm test` (in domain-contracts/) |
| Build command | `npm run build` |
| File extension | `.ts` |
| Phase test filter | `--testPathPattern="phase-1"` |

## Size Thresholds (Phase 1)

| Module | Default | Hard Max | Action |
|--------|---------|----------|--------|
| Schema files | 150-200 | 300 | Flag at 200+, STOP at 300+ |
| Validation files | 75 | 112 | Flag at 75+, STOP at 112+ |
| Test fixtures | 100-150 | 225 | Flag at 150+, STOP at 225+ |
| Index files | 20 | 30 | Flag at 20+, STOP at 30+ |

*(From Architecture Design → Phase 1)*

## Shared Patterns (Phase 1)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Enum definitions | `types/schema.ts` | All schemas |
| Validation wrappers | `*/validation.ts` | Boundary validation |
| Test builders | `testing/*.fixtures.ts` | All test files |

> Internal phase tasks extract shared patterns BEFORE features.

## Architecture Structure (Phase 1)

```
domain-contracts/
├── src/
│   ├── project/
│   │   ├── schema.ts          → 150-200 lines
│   │   ├── validation.ts      → 75 lines
│   │   └── index.ts           → 20 lines
│   ├── ticket/
│   │   ├── schema.ts          → 150-200 lines
│   │   ├── validation.ts      → 75 lines
│   │   └── index.ts           → 20 lines
│   ├── types/
│   │   ├── schema.ts          → 100 lines
│   │   └── index.ts           → 20 lines
│   ├── index.ts               → 30 lines
│   └── testing/
│       ├── index.ts           → 20 lines
│       ├── project.fixtures.ts → 100-150 lines
│       └── ticket.fixtures.ts  → 100-150 lines
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify
- Missing required test coverage → STOP, add tests

## Test Coverage (from phase-1/tests.md)

| Test | Requirement | Task | Status |
|------|-------------|------|--------|
| `project.test > code field validation` | P1-1 | Task 2.1 | 🔴 RED |
| `project.test > required fields validation` | P1-2 | Task 2.1 | 🔴 RED |
| `project.test > optional fields handling` | P1-3 | Task 2.1 | 🔴 RED |
| `project.test > document configuration` | P1-4 | Task 2.1 | 🔴 RED |
| `project.test > CreateProjectInput schema` | P1-5 | Task 2.1 | 🔴 RED |
| `project.test > UpdateProjectInput schema` | P1-6 | Task 2.1 | 🔴 RED |
| `project.test > validateProject function` | P1-7 | Task 2.2 | 🔴 RED |
| `project.test > safeValidateProject function` | P1-8 | Task 2.2 | 🔴 RED |
| `project.test > validateCreateProjectInput` | P1-9 | Task 2.2 | 🔴 RED |
| `project.test > validateUpdateProjectInput` | P1-10 | Task 2.2 | 🔴 RED |
| `ticket.test > code field validation` | T1-1 | Task 3.1 | 🔴 RED |
| `ticket.test > title length validation` | T1-2 | Task 3.1 | 🔴 RED |
| `ticket.test > status enum validation` | T1-3 | Task 3.1 | 🔴 RED |
| `ticket.test > type enum validation` | T1-4 | Task 3.1 | 🔴 RED |
| `ticket.test > priority enum validation` | T1-5 | Task 3.1 | 🔴 RED |
| `ticket.test > date fields validation` | T1-6 | Task 3.1 | 🔴 RED |
| `ticket.test > URL fields validation` | T1-7 | Task 3.1 | 🔴 RED |
| `ticket.test > relationship fields` | T1-8 | Task 3.1 | 🔴 RED |
| `ticket.test > CreateTicketInput schema` | T1-9 | Task 3.1 | 🔴 RED |
| `ticket.test > UpdateTicketInput schema` | T1-10 | Task 3.1 | 🔴 RED |
| `ticket.test > validateTicket function` | T1-11 | Task 3.2 | 🔴 RED |
| `ticket.test > safeValidateTicket function` | T1-12 | Task 3.2 | 🔴 RED |
| `types.test > CRStatus schema validation` | TYPES-1 | Task 1.1 | 🔴 RED |
| `types.test > CRStatus enum export` | TYPES-2 | Task 1.1 | 🔴 RED |
| `types.test > CRType schema validation` | TYPES-3 | Task 1.1 | 🔴 RED |
| `types.test > CRType enum export` | TYPES-4 | Task 1.1 | 🔴 RED |
| `types.test > CRPriority schema validation` | TYPES-5 | Task 1.1 | 🔴 RED |
| `types.test > CRPriority enum export` | TYPES-6 | Task 1.1 | 🔴 RED |
| `types.test > Schema type inference` | TYPES-7 | Task 1.1 | 🔴 RED |
| `types.test > Enum consistency` | TYPES-8 | Task 1.1 | 🔴 RED |

**TDD Goal**: All tests RED before implementation, GREEN after respective task

---

## TDD Verification

Before starting each task:
```bash
npm test  # Should show failures
```

After completing each task:
```bash
npm test -- --testPathPattern="pattern"  # Task tests should pass
npm test  # Full suite — no regressions
```

---

## Phase 1 Tasks

### Task 1.1: Create domain-contracts package structure

**Structure**: `domain-contracts/` root directory

**Implements**: Package setup and configuration

**Makes GREEN**: No direct tests (infrastructure task)

**Limits**:
- Package file: 50 lines
- No hard max for package.json

**Create**:
- `domain-contracts/package.json` with zod dependency
- `domain-contracts/tsconfig.json` with strict TypeScript settings
- `domain-contracts/jest.config.js` for test configuration
- Directory structure: `src/{project,ticket,types,testing}`

**Exclude**:
- Source code implementation (separate tasks)
- Test files (separate tasks)

**Anti-duplication**:
- Use standard npm init structure
- Follow existing project patterns for tsconfig

**Verify**:
```bash
cd domain-contracts
npm install
ls -la src/  # Should show project/, ticket/, types/, testing/ directories
```

**Done when**:
- [x] Package.json created with zod dependency
- [x] TypeScript configuration setup
- [x] Directory structure exists
- [x] npm install succeeds

---

### Task 1.2: Define shared type enums

**Structure**: `domain-contracts/src/types/schema.ts`

**Implements**: TYPES-1 through TYPES-8

**Makes GREEN**:
- `types.test.ts`: `CRStatus schema validation` (TYPES-1)
- `types.test.ts`: `CRStatus enum export` (TYPES-2)
- `types.test.ts`: `CRType schema validation` (TYPES-3)
- `types.test.ts`: `CRType enum export` (TYPES-4)
- `types.test.ts`: `CRPriority schema validation` (TYPES-5)
- `types.test.ts`: `CRPriority enum export` (TYPES-6)
- `types.test.ts`: `Schema type inference` (TYPES-7)
- `types.test.ts`: `Enum consistency` (TYPES-8)

**Limits**:
- Default: 100 lines
- Hard Max: 150 lines
- If > 100: ⚠️ flag warning
- If > 150: ⛔ STOP

**Create**:
- CRStatus enum: Proposed, Approved, "In Progress", Implemented, Rejected
- CRType enum: Architecture, "Feature Enhancement", "Bug Fix", "Technical Debt", Documentation
- CRPriority enum: Low, Medium, High, Critical
- Zod schemas for each enum
- TypeScript type exports inferred from schemas

**Exclude**:
- Business logic for status transitions
- UI-specific state management

**Anti-duplication**:
- This IS the source of truth for enums — all other modules import from here

**Verify**:
```bash
wc -l domain-contracts/src/types/schema.ts  # ≤ 100
npm test -- --testPathPattern="types"
```

**Done when**:
- [x] All 8 tests GREEN (were RED)
- [x] File at correct path
- [x] Size ≤ 100 lines (83 lines)
- [x] Exports enums and schemas
- [x] TypeScript types inferred correctly

---

### Task 1.3: Create types index exports

**Structure**: `domain-contracts/src/types/index.ts`

**Implements**: Clean public API for types

**Makes GREEN**: No direct tests (support for other tests)

**Limits**:
- Default: 20 lines
- Hard Max: 30 lines

**Create**:
- Re-export everything from schema.ts
- Clean public API for types package

**Exclude**:
- Internal implementation details
- Test-specific exports

**Anti-duplication**:
- Only re-exports, no new logic

**Verify**:
```bash
wc -l domain-contracts/src/types/index.ts  # ≤ 20
```

**Done when**:
- [x] File exists with correct exports
- [x] Size ≤ 20 lines (5 lines)
- [x] All type exports accessible

---

### Task 2.1: Implement Project schema with validation

**Structure**: `domain-contracts/src/project/schema.ts`

**Implements**: P1-1, P1-2, P1-3, P1-4, P1-5, P1-6

**Makes GREEN**:
- `project.test.ts`: `code field validation` (P1-1)
- `project.test.ts`: `required fields validation` (P1-2)
- `project.test.ts`: `optional fields handling` (P1-3)
- `project.test.ts`: `document configuration` (P1-4)
- `project.test.ts`: `CreateProjectInput schema` (P1-5)
- `project.test.ts`: `UpdateProjectInput schema` (P1-6)

**Limits**:
- Default: 150-200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag warning
- If > 300: ⛔ STOP

**Create**:
- ProjectSchema Zod schema with field validations:
  - code: `^[A-Z][A-Z0-9]{1,4}$` (2-5 chars, starts with letter)
  - name: required, min 3 chars
  - id: required, min 1 char
  - ticketsPath: required, path format
  - description: optional
  - repository: optional
  - active: optional, defaults to true
- DocumentConfigSchema nested schema
- ProjectConfigSchema combining Project + DocumentConfig
- CreateProjectInputSchema (partial, required fields only)
- UpdateProjectInputSchema (partial, key required)
- TypeScript types inferred with z.infer

**Exclude**:
- Business logic (id matches directory name)
- Path existence validation
- Cross-field validation

**Anti-duplication**:
- Import enum types from `../types/schema.ts` — do NOT redefine
- Use standard Zod patterns, no custom validation logic

**Verify**:
```bash
wc -l domain-contracts/src/project/schema.ts  # ≤ 200
npm test -- --testPathPattern="project.*schema"
```

**Done when**:
- [x] 6 test groups GREEN (were RED)
- [x] File at correct path
- [x] Size ≤ 200 lines (174 lines)
- [x] All required fields validated
- [x] Input schemas derived correctly

---

### Task 2.2: Implement Project validation functions

**Structure**: `domain-contracts/src/project/validation.ts`

**Implements**: P1-7, P1-8, P1-9, P1-10

**Makes GREEN**:
- `project.test.ts`: `validateProject function` (P1-7)
- `project.test.ts`: `safeValidateProject function` (P1-8)
- `project.test.ts`: `validateCreateProjectInput` (P1-9)
- `project.test.ts`: `validateUpdateProjectInput` (P1-10)

**Limits**:
- Default: 75 lines
- Hard Max: 112 lines
- If > 75: ⚠️ flag warning
- If > 112: ⛔ STOP

**Create**:
- validateProject(): uses ProjectSchema.parse()
- safeValidateProject(): uses ProjectSchema.safeParse()
- validateCreateProjectInput(): uses CreateProjectInputSchema.parse()
- validateUpdateProjectInput(): uses UpdateProjectInputSchema.parse()

**Exclude**:
- Business logic validation
- Custom error messages (use Zod defaults)
- Transformation logic

**Anti-duplication**:
- Import schemas from ./schema.ts — do NOT duplicate schema definitions
- Simple wrapper functions only, no additional logic

**Verify**:
```bash
wc -l domain-contracts/src/project/validation.ts  # ≤ 75
npm test -- --testPathPattern="project.*validation"
```

**Done when**:
- [x] 4 test groups GREEN (were RED)
- [x] File at correct path
- [x] Size ≤ 75 lines (91 lines - exceeds default, under hard max)
- [x] All validation functions work
- [x] No business logic present

---

### Task 2.3: Create Project index exports

**Structure**: `domain-contracts/src/project/index.ts`

**Implements**: Clean public API for project

**Makes GREEN**: No direct tests (support for import tests)

**Limits**:
- Default: 20 lines
- Hard Max: 30 lines

**Create**:
- Re-export from schema.ts and validation.ts
- Clean public API for project package

**Exclude**:
- Internal implementation details
- Test-specific exports

**Anti-duplication**:
- Only re-exports, no new logic

**Verify**:
```bash
wc -l domain-contracts/src/project/index.ts  # ≤ 20
```

**Done when**:
- [x] File exists with correct exports
- [x] Size ≤ 20 lines (9 lines)
- [x] All project exports accessible

---

### Task 3.1: Implement Ticket schema with validation

**Structure**: `domain-contracts/src/ticket/schema.ts`

**Implements**: T1-1, T1-2, T1-3, T1-4, T1-5, T1-6, T1-7, T1-8, T1-9, T1-10

**Makes GREEN**:
- `ticket.test.ts`: `code field validation` (T1-1)
- `ticket.test.ts`: `title length validation` (T1-2)
- `ticket.test.ts`: `status enum validation` (T1-3)
- `ticket.test.ts`: `type enum validation` (T1-4)
- `ticket.test.ts`: `priority enum validation` (T1-5)
- `ticket.test.ts`: `date fields validation` (T1-6)
- `ticket.test.ts`: `URL fields validation` (T1-7)
- `ticket.test.ts`: `relationship fields` (T1-8)
- `ticket.test.ts`: `CreateTicketInput schema` (T1-9)
- `ticket.test.ts`: `UpdateTicketInput schema` (T1-10)

**Limits**:
- Default: 150-200 lines
- Hard Max: 300 lines
- If > 200: ⚠️ flag warning
- If > 300: ⛔ STOP

**Create**:
- TicketSchema Zod schema with field validations:
  - code: `^[A-Z][A-Z0-9]{2,4}-\d{3,4}$` (e.g., "MDT-101")
  - title: required, max 200 chars
  - status: CRStatus enum
  - type: CRType enum
  - priority: CRPriority enum
  - phaseEpic: optional string
  - description: optional string
  - assignee: optional email format
  - implementationDate: optional ISO date
  - implementationNotes: optional string
  - dependsOn: optional array of ticket codes
  - blocks: optional array of ticket codes
  - relatedTickets: optional array of ticket codes
- CreateTicketInputSchema (partial creation fields)
- UpdateTicketInputSchema (partial, code required)
- TypeScript types inferred with z.infer

**Exclude**:
- Business logic (status transitions, circular dependency detection)
- Content validation (markdown structure)
- Relationship validation logic

**Anti-duplication**:
- Import enums from `../types/schema.ts` — do NOT redefine
- Use standard Zod patterns for email, URL, date validation
- Follow project schema patterns for consistency

**Verify**:
```bash
wc -l domain-contracts/src/ticket/schema.ts  # ≤ 200
npm test -- --testPathPattern="ticket.*schema"
```

**Done when**:
- [x] 10 test groups GREEN (were RED)
- [x] File at correct path
- [x] Size ≤ 200 lines (134 lines)
- [x] All field validations working
- [x] Enums imported correctly

---

### Task 3.2: Implement Ticket validation functions

**Structure**: `domain-contracts/src/ticket/validation.ts`

**Implements**: T1-11, T1-12

**Makes GREEN**:
- `ticket.test.ts`: `validateTicket function` (T1-11)
- `ticket.test.ts`: `safeValidateTicket function` (T1-12)

**Limits**:
- Default: 75 lines
- Hard Max: 112 lines
- If > 75: ⚠️ flag warning
- If > 112: ⛔ STOP

**Create**:
- validateTicket(): uses TicketSchema.parse()
- safeValidateTicket(): uses TicketSchema.safeParse()
- validateCreateTicketInput(): uses CreateTicketInputSchema.parse()
- validateUpdateTicketInput(): uses UpdateTicketInputSchema.parse()

**Exclude**:
- Business logic validation
- Custom error messages
- Transformation logic

**Anti-duplication**:
- Import schemas from ./schema.ts — do NOT duplicate
- Follow same pattern as project validation

**Verify**:
```bash
wc -l domain-contracts/src/ticket/validation.ts  # ≤ 75
npm test -- --testPathPattern="ticket.*validation"
```

**Done when**:
- [x] 2 test groups GREEN (were RED)
- [x] File at correct path
- [x] Size ≤ 75 lines (59 lines)
- [x] All validation functions work

---

### Task 3.3: Create Ticket index exports

**Structure**: `domain-contracts/src/ticket/index.ts`

**Implements**: Clean public API for ticket

**Makes GREEN**: No direct tests (support for import tests)

**Limits**:
- Default: 20 lines
- Hard Max: 30 lines

**Create**:
- Re-export from schema.ts and validation.ts
- Clean public API for ticket package

**Exclude**:
- Internal implementation details
- Test-specific exports

**Anti-duplication**:
- Only re-exports, no new logic

**Verify**:
```bash
wc -l domain-contracts/src/ticket/index.ts  # ≤ 20
```

**Done when**:
- [x] File exists with correct exports
- [x] Size ≤ 20 lines (5 lines)
- [x] All ticket exports accessible

---

### Task 4.1: Create Project test fixtures

**Structure**: `domain-contracts/src/testing/project.fixtures.ts`

**Implements**: Test data builders for Project

**Makes GREEN**: Supports all Project tests (via test builders)

**Limits**:
- Default: 100-150 lines
- Hard Max: 225 lines
- If > 150: ⚠️ flag warning
- If > 225: ⛔ STOP

**Create**:
- buildProject(): Creates valid Project with optional overrides
- buildProjectConfig(): Creates Project with DocumentConfig
- buildCreateProjectInput(): Creates valid creation input
- buildUpdateProjectInput(): Creates valid update input
- Edge case builders for invalid data (if needed)

**Exclude**:
- Business logic in builders
- Test execution logic

**Anti-duplication**:
- Import types from `../project/schema.ts`
- Import enums from `../types/schema.ts`
- No duplicate type definitions

**Verify**:
```bash
wc -l domain-contracts/src/testing/project.fixtures.ts  # ≤ 150
npm test -- --testPathPattern="project"  # Tests should use fixtures
```

**Done when**:
- [x] File exists with builders
- [x] Size ≤ 150 lines (160 lines - exceeds default, under hard max)
- [x] Builders create valid data
- [x] Override support working

---

### Task 4.2: Create Ticket test fixtures

**Structure**: `domain-contracts/src/testing/ticket.fixtures.ts`

**Implements**: Test data builders for Ticket

**Makes GREEN**: Supports all Ticket tests (via test builders)

**Limits**:
- Default: 100-150 lines
- Hard Max: 225 lines
- If > 150: ⚠️ flag warning
- If > 225: ⛔ STOP

**Create**:
- buildTicket(): Creates valid Ticket with optional overrides
- buildCreateTicketInput(): Creates valid creation input
- buildUpdateTicketInput(): Creates valid update input
- Relationship builders (dependsOn, blocks, relatedTickets)

**Exclude**:
- Business logic in builders
- Circular dependency detection
- Test execution logic

**Anti-duplication**:
- Import types from `../ticket/schema.ts`
- Import enums from `../types/schema.ts`
- Follow Project fixture patterns

**Verify**:
```bash
wc -l domain-contracts/src/testing/ticket.fixtures.ts  # ≤ 150
npm test -- --testPathPattern="ticket"  # Tests should use fixtures
```

**Done when**:
- [x] File exists with builders
- [x] Size ≤ 150 lines (142 lines)
- [x] Builders create valid data
- [x] All enum values testable

---

### Task 4.3: Create testing index exports

**Structure**: `domain-contracts/src/testing/index.ts`

**Implements**: Clean public API for testing utilities

**Makes GREEN**: No direct tests (support for test imports)

**Limits**:
- Default: 20 lines
- Hard Max: 30 lines

**Create**:
- Re-export all fixtures
- Clean testing API entry point

**Exclude**:
- Production code exports
- Internal test utilities

**Anti-duplication**:
- Only re-exports, no new logic

**Verify**:
```bash
wc -l domain-contracts/src/testing/index.ts  # ≤ 20
```

**Done when**:
- [x] File exists with exports
- [x] Size ≤ 20 lines (17 lines)
- [x] All fixtures accessible via @mdt/domain-contracts/testing

---

### Task 5.1: Create main index exports

**Structure**: `domain-contracts/src/index.ts`

**Implements**: Main production API entry point

**Makes GREEN**: Supports integration tests

**Limits**:
- Default: 30 lines
- Hard Max: 45 lines
- If > 30: ⚠️ flag warning
- If > 45: ⛔ STOP

**Create**:
- Aggregate exports from project, ticket, types
- Clean public API for the entire package
- Production exports only (no testing)

**Exclude**:
- Testing utilities
- Internal implementation
- Development-only exports

**Anti-duplication**:
- Only re-exports, no new logic
- Don't duplicate from sub-modules

**Verify**:
```bash
wc -l domain-contracts/src/index.ts  # ≤ 30
npm test  # Full test suite should work
```

**Done when**:
- [x] File exists with all production exports
- [x] Size ≤ 30 lines (12 lines)
- [x] Clean import: `import { Project, Ticket } from '@mdt/domain-contracts'`
- [x] No testing exports in main index

---

## Phase 1 Integration Tasks

**Note**: Phase 1 is incomplete without integration. According to Section 8 (Migration Strategy) in architecture.md, Phase 1 includes both:
1. ✅ Create domain-contracts package (COMPLETE)
2. ❌ Integrate domain-contracts into existing codebase (REQUIRED)

### Task 5.2: Update shared/models to import from domain-contracts

**Structure**: `shared/models/Project.ts`, `shared/models/Ticket.ts`, `shared/models/Types.ts`

**Implements**: Consumer migration to domain-contracts

**Makes GREEN**: No direct tests (maintains functionality)

**Limits**:
- Each file: ≤ 20 lines (becomes import-only)
- Hard Max: 30 lines per file

**From**: `shared/models/*.ts` (current type definitions)
**To**: Import from `@mdt/domain-contracts`

**Move/Update**:
- `shared/models/Project.ts`: Import Project type from domain-contracts
- `shared/models/Ticket.ts`: Import CR/Ticket types from domain-contracts
- `shared/models/Types.ts`: Import enums from domain-contracts
- Remove duplicate type definitions

**Exclude**:
- Keep any shared-specific types not in domain-contracts
- Keep any business logic mixed with types (should be separated)

**Anti-duplication**:
- Import types from domain-contracts — do NOT duplicate definitions
- Update all imports to use the new location

**Verify**:
```bash
# Check files are now import-only
wc -l shared/models/Project.ts  # Should be ≤ 20
wc -l shared/models/Ticket.ts   # Should be ≤ 20
wc -l shared/models/Types.ts    # Should be ≤ 20

# Check imports work
npm run build:shared  # Should succeed
```

**Done when**:
- [ ] All three files updated to import from domain-contracts
- [ ] No duplicate type definitions
- [ ] TypeScript compilation succeeds
- [ ] Size limits met

---

### Task 5.3: Update package.json dependencies

**Structure**: `shared/package.json`, `mcp-server/package.json`, `server/package.json`

**Implements**: Dependency configuration for domain-contracts

**Makes GREEN**: No direct tests (enables imports)

**Limits**:
- Only dependency additions, no other changes

**Update**:
- `shared/package.json`: Add `"@mdt/domain-contracts": "file:../domain-contracts"`
- `mcp-server/package.json`: Add `"@mdt/domain-contracts": "file:../domain-contracts"`
- `server/package.json`: Add `"@mdt/domain-contracts": "file:../domain-contracts"`

**Exclude**:
- Removing existing dependencies
- Changing versions of other packages

**Anti-duplication**:
- Use relative path reference during development
- Ensure consistent path across all packages

**Verify**:
```bash
# Install dependencies
cd shared && npm install
cd ../mcp-server && npm install
cd ../server && npm install

# Test imports work
npm run build:shared  # Should succeed
npm run build  # Full build should succeed
```

**Done when**:
- [ ] All three package.json files updated
- [ ] npm install succeeds in each package
- [ ] Imports resolve correctly
- [ ] Full build succeeds

---

### Task 5.4: Add boundary validation in MCP server

**Structure**: `mcp-server/src/tools/` (various tool files)

**Implements**: Runtime validation at MCP boundaries

**Makes GREEN**: Improves data integrity

**Limits**:
- Add validation calls, don't change logic
- ≤ 10 lines added per tool file

**From**: Direct usage of input parameters
**To**: Validate inputs using domain-contracts

**Add**:
- Import validation functions from domain-contracts
- Call validateXxx() at entry points of tools
- Handle validation errors appropriately

**Exclude**:
- Changing business logic
- Adding validation inside service calls (only at boundaries)

**Anti-duplication**:
- Use domain-contracts validation — don't implement custom validation
- Follow consistent error handling pattern

**Verify**:
```bash
# Build MCP server
cd mcp-server
npm run build

# Test validation works
npm test  # MCP tests should still pass
```

**Done when**:
- [ ] Tool inputs validated at boundaries
- [ ] Validation errors handled gracefully
- [ ] Existing functionality preserved
- [ ] Build succeeds

---

### Task 5.5: Add boundary validation in backend services

**Structure**: `server/services/` (service files that handle API requests)

**Implements**: Runtime validation at API boundaries

**Makes GREEN**: Improves API data integrity

**Limits**:
- Add validation at API entry points only
- ≤ 15 lines added per service file

**From**: Direct usage of request body/parameters
**To**: Validate inputs using domain-contracts

**Add**:
- Import validation functions from domain-contracts
- Call validateXxx() in controller methods or service entry points
- Return proper error responses for validation failures

**Exclude**:
- Internal service-to-service calls (already typed)
- Database operations validation
- Business logic validation

**Anti-duplication**:
- Use domain-contracts validation — don't duplicate validation logic
- Follow existing error response patterns

**Verify**:
```bash
# Build and test server
cd server
npm run build
npm test  # Server tests should still pass
```

**Done when**:
- [ ] API inputs validated at boundaries
- [ ] Proper error responses for invalid data
- [ ] No breaking changes to API contracts
- [ ] All tests pass

---

## Post-Implementation (Phase 1)

### Task 6.1: Verify no duplication

```bash
# Check for duplicate enum definitions
grep -r "enum CRStatus" domain-contracts/src/ | wc -l  # Should be 1
grep -r "enum CRType" domain-contracts/src/ | wc -l    # Should be 1
grep -r "enum CRPriority" domain-contracts/src/ | wc -l # Should be 1

# Check for duplicate schema patterns
grep -r "ProjectSchema.*=" domain-contracts/src/ | wc -l  # Should be 1
```

**Done when**: [x] Each enum/schema exists in ONE location only

### Task 6.2: Verify size compliance

```bash
# Check all source files
find domain-contracts/src -name "*.ts" -exec wc -l {} \; | awk '$1 > 300 {print $1 " lines: " $2}'
```

**Done when**: [x] No files exceed hard max limits

### Task 6.3: Run Phase 1 tests

```bash
cd domain-contracts
npm test
```

**Expected**: All 71 tests GREEN

**Done when**: [x] All phase tests GREEN (84 tests GREEN)
[x] No test regressions
[x] TypeScript compilation succeeds

### Task 6.4: Verify package exports

```bash
cd domain-contracts
npm pack --dry-run  # Shows what will be published

# Test imports
node -e "
const pkg = require('./package.json');
console.log('Main entry:', pkg.main);
console.log('Types entry:', pkg.types);
console.log('Exports:', pkg.exports);
"
```

**Done when**: [x] Package exports configured correctly
[x] Production/testing separation maintained
[x] Import paths work as expected
