# Tasks: MDT-101

**Source**: [MDT-101](../../../docs/CRs/MDT/MDT-101.md)
**Architecture**: [architecture.md](./architecture.md)
**Tests**: [tests.md](./tests.md)

## Project Context

| Setting | Value |
|---------|-------|
| Source directory | `domain-contracts/src/` |
| Test command | `cd domain-contracts && npm test` |
| Build command | `cd domain-contracts && npm run build` |
| File extension | `.ts` |

## Size Thresholds

| Role | Default | Hard Max | Action |
|------|---------|----------|--------|
| Entity definition | 150 | 225 | Flag at 150+, STOP at 225+ |
| Enum definitions | 50 | 75 | Flag at 50+, STOP at 75+ |
| Export module | 20 | 30 | Flag at 20+, STOP at 30+ |
| Test builders | 100 | 150 | Flag at 100+, STOP at 150+ |
| Public API | 30 | 45 | Flag at 30+, STOP at 45+ |

*(Inherited from Architecture Design, overridden by CR if specified)*

## Shared Patterns (from Architecture Design)

| Pattern | Extract To | Used By |
|---------|------------|---------|
| Schema definition | `domain-contracts/src/{entity}/schema.ts` | All entities |
| Type derivation | Each schema file | All consumers |
| Test fixture builder | `domain-contracts/src/testing/{entity}.fixtures.ts` | All tests |

> Phase 1 extracts these BEFORE features.

## Architecture Structure (from CR)

```
domain-contracts/
├── package.json                 → Zero internal deps, zod only
├── src/
│   ├── index.ts                → Production API aggregate
│   ├── project/
│   │   ├── schema.ts          → ProjectSchema + Project type
│   │   └── index.ts           → Project exports
│   ├── ticket/
│   │   ├── schema.ts          → TicketSchema + CR type
│   │   └── index.ts           → Ticket exports
│   ├── types/
│   │   ├── schema.ts          → Enum schemas (CRStatus, CRType)
│   │   └── index.ts           → Enum exports
│   └── testing/
│       ├── index.ts           → Testing utilities aggregate
│       ├── project.fixtures.ts → Project test builders
│       └── ticket.fixtures.ts  → Ticket test builders
```

## STOP Conditions

- File exceeds Hard Max → STOP, subdivide
- Duplicating logic that exists in shared module → STOP, import instead
- Structure path doesn't match Architecture Design → STOP, clarify

## Requirement Coverage

*(This is a refactoring CR - requirements are the preservation tests)*

| Test File | Test Groups | Task(s) | Status |
|-----------|-------------|---------|--------|
| `types/schema.test.ts` | 4 groups | Task 1.1 | 🔴 RED |
| `project/schema.test.ts` | 6 groups | Task 2.1 | 🔴 RED |
| `ticket/schema.test.ts` | 5 groups | Task 3.1 | 🔴 RED |
| `testing/project.fixtures.test.ts` | 5 scenarios | Task 4.1 | 🔴 RED |
| `integration/consistency.test.ts` | 4 tests | Task 5.1 | 🔴 RED |

**TDD Goal**: All tests RED before implementation, GREEN after respective task completes

---

## TDD Verification

Before starting each task:
```bash
cd domain-contracts && npm test -- --testNamePattern="{task_tests}"  # Should show failures
```

After completing each task:
```bash
cd domain-contracts && npm test -- --testNamePattern="{task_tests}"  # Should pass
cd domain-contracts && npm test                           # Full suite — no regressions
```

---

## Phase 1: Shared Patterns (Schema Foundation)

> Extract schema patterns used by all entities FIRST.

**Phase goal**: All schemas and enums exist
**Phase verify**: `npm test` shows test failures specific to validation (not import errors)

### Task 1.1: Create Type Enums Schema

**Structure**: `domain-contracts/src/types/schema.ts`

**Makes GREEN**:
- `types/schema.test.ts`: All enum validation tests (4 groups)

**Limits**:
- Default: 50 lines (enum definitions)
- Hard Max: 75 lines
- If > 50: ⚠️ flag
- If > 75: ⛔ STOP

**From**: `shared/models/Types.ts`
**To**: `domain-contracts/src/types/schema.ts`

**Move**:
- `CRStatus` enum definition (10 values)
- `CRType` enum definition (5 values)
- `CRPriority` enum definition (4 values)
- `ProjectInfo` interface definition

**Exclude**:
- Template interfaces (stay in Types.ts)
- Validation helpers (go to utilities if needed)
- Configuration types (are part of Project)

**Anti-duplication**:
- This IS the enum source — other schemas will import from here
- Do not duplicate enum values in any other file

**Zod Implementation**:
```typescript
// Example pattern
const CRStatusSchema = z.enum([
  'Proposed', 'Approved', 'In Progress', 'Implemented',
  'Rejected', 'On Hold', 'Superseded', 'Deprecated',
  'Duplicate', 'Partially Implemented'
]);

export type CRStatus = z.infer<typeof CRStatusSchema>;
```

**Verify**:
```bash
wc -l domain-contracts/src/types/schema.ts  # ≤ 50 (or flag ≤ 75)
cd domain-contracts && npm test types/schema.test.ts
```

**Done when**:
- [ ] File at `domain-contracts/src/types/schema.ts`
- [ ] Size ≤ 50 lines (or flagged if ≤ 75)
- [ ] All 3 enums defined with Zod
- [ ] TypeScript types exported via `z.infer`
- [ ] Tests show validation failures (not import errors)

---

### Task 1.2: Create Type Index Module

**Structure**: `domain-contracts/src/types/index.ts`

**Makes GREEN**:
- `types/schema.test.ts`: Import tests pass

**Limits**:
- Default: 20 lines (export module)
- Hard Max: 30 lines
- If > 20: ⚠️ flag
- If > 30: ⛔ STOP

**Move**:
- Exports for all enum schemas
- Exports for all derived TypeScript types

**Exclude**:
- Implementation details (stays in schema.ts)
- Testing utilities (go to testing/)

**Anti-duplication**:
- Only re-export from schema.ts
- Do not duplicate enum definitions

**Verify**:
```bash
wc -l domain-contracts/src/types/index.ts  # ≤ 20 (or flag ≤ 30)
cd domain-contracts && npm test
```

**Done when**:
- [ ] File at `domain-contracts/src/types/index.ts`
- [ ] Size ≤ 20 lines (or flagged if ≤ 30)
- [ ] All enums and types re-exported
- [ ] No implementation details

---

## Phase 2: Entity Schemas

> Entity schemas import from Phase 1, never duplicate enums.

**Phase goal**: Project and Ticket schemas exist
**Phase verify**: Entity tests show proper validation failures

### Task 2.1: Create Project Schema

**Structure**: `domain-contracts/src/project/schema.ts`

**Makes GREEN**:
- `project/schema.test.ts`: Project interface tests (6 groups)

**Limits**:
- Default: 150 lines (entity definition)
- Hard Max: 225 lines
- If > 150: ⚠️ flag
- If > 225: ⛔ STOP

**From**: `shared/models/Project.ts`
**To**: `domain-contracts/src/project/schema.ts`

**Move**:
- `Project` interface definition
- `LocalProjectConfig` interface definition
- `ProjectConfig` interface (legacy)
- All validation rules from `validateProjectConfig()`

**Exclude**:
- Helper functions (`getTicketsPath`, `isLegacyConfig`, `migrateLegacyConfig`)
- These are business logic, not schema definition
- Keep in shared/models/Project.ts or move to utilities

**Anti-duplication**:
- Import enum schemas from `../types/schema`
- Do NOT duplicate enum definitions
- Import shared utilities if needed for validation

**Zod Implementation**:
```typescript
// Example pattern
import { z } from 'zod';
import { CRStatusSchema } from '../types/schema';

const LocalProjectConfigSchema = z.object({
  project: z.object({
    name: z.string().min(1),
    code: z.string().min(1),
    // ... other fields
  }),
  document: z.object({
    paths: z.array(z.string()).optional(),
    // ... other fields
  }).optional()
});

export type LocalProjectConfig = z.infer<typeof LocalProjectConfigSchema>;
```

**Verify**:
```bash
wc -l domain-contracts/src/project/schema.ts  # ≤ 150 (or flag ≤ 225)
cd domain-contracts && npm test project/schema.test.ts
```

**Done when**:
- [ ] File at `domain-contracts/src/project/schema.ts`
- [ ] Size ≤ 150 lines (or flagged if ≤ 225)
- [ ] All Project interfaces defined with Zod
- [ ] Validation rules match `validateProjectConfig()` behavior
- [ ] Tests show validation failures

---

### Task 2.2: Create Project Index Module

**Structure**: `domain-contracts/src/project/index.ts`

**Makes GREEN**:
- `project/schema.test.ts`: Import tests pass

**Limits**:
- Default: 20 lines (export module)
- Hard Max: 30 lines
- If > 20: ⚠️ flag
- If > 30: ⛔ STOP

**Move**:
- Exports for Project schemas
- Exports for derived TypeScript types

**Exclude**:
- Implementation details
- Validation helpers

**Verify**:
```bash
wc -l domain-contracts/src/project/index.ts  # ≤ 20 (or flag ≤ 30)
cd domain-contracts && npm test
```

**Done when**:
- [ ] File at `domain-contracts/src/project/index.ts`
- [ ] Size ≤ 20 lines (or flagged if ≤ 30)
- [ ] All Project types exported
- [ ] No implementation details

---

### Task 3.1: Create Ticket Schema

**Structure**: `domain-contracts/src/ticket/schema.ts`

**Makes GREEN**:
- `ticket/schema.test.ts`: Ticket interface tests (5 groups)

**Limits**:
- Default: 200 lines (entity definition - larger than Project)
- Hard Max: 300 lines
- If > 200: ⚠️ flag
- If > 300: ⛔ STOP

**From**: `shared/models/Ticket.ts`
**To**: `domain-contracts/src/ticket/schema.ts`

**Move**:
- `Ticket` interface definition
- `TicketData` interface definition
- `TicketUpdateAttrs` interface definition
- `TicketFilters` interface definition
- Array field normalization logic (convert comma-separated strings)

**Exclude**:
- `normalizeTicket()` function (business logic)
- `arrayToString()` helper (utility function)
- `TICKET_UPDATE_ALLOWED_ATTRS` constant (validation logic)

**Anti-duplication**:
- Import enum schemas from `../types/schema`
- Import any shared field types
- Do NOT duplicate definitions

**Zod Implementation**:
```typescript
// Example pattern for array normalization
const TicketArrayFieldSchema = z.array(z.string()).transform(
  // Convert comma-separated strings to arrays
  (val) => Array.isArray(val) ? val : val.split(',').filter(Boolean)
);

const TicketSchema = z.object({
  code: z.string(),
  title: z.string(),
  status: CRStatusSchema,
  type: CRTypeSchema,
  relatedTickets: TicketArrayFieldSchema.optional().default([]),
  // ... other fields
});
```

**Verify**:
```bash
wc -l domain-contracts/src/ticket/schema.ts  # ≤ 200 (or flag ≤ 300)
cd domain-contracts && npm test ticket/schema.test.ts
```

**Done when**:
- [ ] File at `domain-contracts/src/ticket/schema.ts`
- [ ] Size ≤ 200 lines (or flagged if ≤ 300)
- [ ] All Ticket interfaces defined with Zod
- [ ] Array field normalization implemented
- [ ] Tests show validation failures

---

### Task 3.2: Create Ticket Index Module

**Structure**: `domain-contracts/src/ticket/index.ts`

**Makes GREEN**:
- `ticket/schema.test.ts`: Import tests pass

**Limits**:
- Default: 20 lines (export module)
- Hard Max: 30 lines
- If > 20: ⚠️ flag
- If > 30: ⛔ STOP

**Move**:
- Exports for Ticket schemas
- Exports for derived TypeScript types

**Exclude**:
- Implementation details
- Normalization helpers

**Verify**:
```bash
wc -l domain-contracts/src/ticket/index.ts  # ≤ 20 (or flag ≤ 30)
cd domain-contracts && npm test
```

**Done when**:
- [ ] File at `domain-contracts/src/ticket/index.ts`
- [ ] Size ≤ 20 lines (or flagged if ≤ 30)
- [ ] All Ticket types exported
- [ ] No implementation details

---

## Phase 3: Test Fixtures

> Test fixtures use production schemas to generate valid test data.

**Phase goal**: All fixture builders work with schemas
**Phase verify**: Fixture tests pass

### Task 4.1: Create Project Test Fixtures

**Structure**: `domain-contracts/src/testing/project.fixtures.ts`

**Makes GREEN**:
- `testing/project.fixtures.test.ts`: All fixture tests (5 scenarios)

**Limits**:
- Default: 100 lines (test builders)
- Hard Max: 150 lines
- If > 100: ⚠️ flag
- If > 150: ⛔ STOP

**Move**:
- `ProjectFixture` class implementation
- `minimal()` method
- `complete()` method
- `custom(overrides)` method
- `array(count)` method

**Exclude**:
- Random data generators (use simple patterns)
- Complex business logic fixtures

**Anti-duplication**:
- Import Project schema from `../project/schema`
- Use schema validation in fixtures
- Do NOT duplicate field definitions

**Verify**:
```bash
wc -l domain-contracts/src/testing/project.fixtures.ts  # ≤ 100 (or flag ≤ 150)
cd domain-contracts && npm test testing/project.fixtures.test.ts
```

**Done when**:
- [ ] File at `domain-contracts/src/testing/project.fixtures.ts`
- [ ] Size ≤ 100 lines (or flagged if ≤ 150)
- [ ] All fixture methods implemented
- [ ] Fixtures create schema-valid data

---

## Phase 4: Public API

> Aggregate all exports for clean consumer imports.

**Phase goal**: Single import point for all consumers
**Phase verify**: External packages can import all types

### Task 5.1: Create Main Index Module

**Structure**: `domain-contracts/src/index.ts`

**Makes GREEN**:
- `integration/consistency.test.ts`: Cross-interface tests (4 tests)

**Limits**:
- Default: 30 lines (public API)
- Hard Max: 45 lines
- If > 30: ⚠️ flag
- If > 45: ⛔ STOP

**Move**:
- Re-export all entity schemas
- Re-export all types
- Re-export all enum schemas

**Exclude**:
- Implementation details
- Testing utilities (separate export path)
- Internal modules

**Anti-duplication**:
- Only re-export from entity index files
- Do not duplicate any exports

**Verify**:
```bash
wc -l domain-contracts/src/index.ts  # ≤ 30 (or flag ≤ 45)
cd domain-contracts && npm test
```

**Done when**:
- [ ] File at `domain-contracts/src/index.ts`
- [ ] Size ≤ 30 lines (or flagged if ≤ 45)
- [ ] All public exports aggregated
- [ ] Clean import surface for consumers

---

### Task 5.2: Create Testing Index Module

**Structure**: `domain-contracts/src/testing/index.ts`

**Makes GREEN**:
- `integration/consistency.test.ts`: Test import tests

**Limits**:
- Default: 20 lines (export module)
- Hard Max: 30 lines
- If > 20: ⚠️ flag
- If > 30: ⛔ STOP

**Move**:
- Re-export all test fixtures
- Re-export test utilities

**Exclude**:
- Production schemas
- Internal helpers

**Verify**:
```bash
wc -l domain-contracts/src/testing/index.ts  # ≤ 20 (or flag ≤ 30)
cd domain-contracts && npm test
```

**Done when**:
- [ ] File at `domain-contracts/src/testing/index.ts`
- [ ] Size ≤ 20 lines (or flagged if ≤ 30)
- [ ] All testing utilities exported
- [ ] Separate from production API

---

## Phase 5: Integration

> Update consuming packages to use new domain contracts.

**Phase goal**: All consumers import from domain-contracts
**Phase verify**: Full system works with new schemas

### Task 6.1: Update Shared Models

**Structure**: `shared/models/*.ts`

**Limits**:
- Only import statements
- No new logic

**Move**:
- Update `shared/models/Project.ts` to import from domain-contracts
- Update `shared/models/Ticket.ts` to import from domain-contracts
- Update `shared/models/Types.ts` to import from domain-contracts

**Exclude**:
- Keep all business logic functions
- Keep all helper functions
- Keep validation logic (can be updated to use schemas later)

**Anti-duplication**:
- Import types, do not redefine
- Remove duplicate type definitions

**Verify**:
```bash
# From shared directory
npm test
npm run build
```

**Done when**:
- [ ] All model files import from domain-contracts
- [ ] No duplicate type definitions
- [ ] Tests pass
- [ ] Build succeeds

---

### Task 6.2: Update Package Dependencies

**Structure**: `package.json` files

**Move**:
- Add `"@mdt/domain-contracts"` to shared/package.json
- Add `"@mdt/domain-contracts"` to mcp-server/package.json
- Add `"@mdt/domain-contracts"` to server/package.json

**Exclude**:
- No other dependencies

**Verify**:
```bash
# From each package directory
npm install
npm test
```

**Done when**:
- [ ] All packages have dependency
- [ ] npm install succeeds
- [ ] Tests pass in all packages

---

## Post-Implementation

### Task 7.1: Verify All Tests GREEN

**Do**: Run full test suite
```bash
cd domain-contracts && npm test  # Should be all GREEN
```

**Done when**: [ ] All 111 tests pass

### Task 7.2: Verify Size Compliance

**Do**: Check all files
```bash
find domain-contracts/src -name "*.ts" -exec wc -l {} \; | sort -rn
```

**Done when**: [ ] No files exceed hard max limits

### Task 7.3: Verify Zero Internal Dependencies

**Do**: Check package.json only has zod
```bash
cat domain-contracts/package.json | grep -A5 '"dependencies"'
```

**Done when**: [ ] Only zod listed in dependencies

### Task 7.4: Update Documentation

**Do**: Update CLAUDE.md with new domain-contracts package

**Done when**: [ ] Documentation reflects new structure

### Task 7.5: Verify Runtime Validation

**Do**: Check that schemas validate at boundaries
```bash
# This should be verified by integration tests
cd domain-contracts && npm test integration/consistency.test.ts
```

**Done when**: [ ] Cross-interface tests pass