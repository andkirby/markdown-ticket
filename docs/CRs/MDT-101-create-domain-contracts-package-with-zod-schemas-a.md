---
code: MDT-101
status: On Hold
dateCreated: 2025-12-19T14:39:23.333Z
type: Architecture
priority: Medium
---

# Create domain-contracts package with Zod schemas as source of truth

> **Architecture Guide**: See [domain-contracts.md](MDT-101/domain-contracts.md) for detailed implementation patterns and examples.

## 1. Description

### Problem
- The system has multiple competing definitions of the same domain entities across `shared/`, `server/`, `mcp-server/`, and `src/`
- Type definitions are mixed with implementation concerns, making dependency boundaries unclear and causing contract drift
- Runtime validation is inconsistent, so interfaces may accept or emit shapes that differ from the intended domain model
- Tests and fixtures often mirror production types manually, which creates a second source of truth instead of validating against the real one

### Goal
Create a dedicated `domain-contracts` package that acts as the canonical source for domain schemas, inferred TypeScript types, and boundary validation functions.

### Architectural Intent
This CR is not just a package extraction. It establishes the contract architecture for the repository:

- `domain-contracts` defines canonical domain meaning
- `shared` implements business logic against validated contracts
- `server`, `mcp-server`, and `src` consume those contracts at boundaries
- tests and fixtures derive from the same contract definitions instead of duplicating entity shapes

### Scope
- **Changes**:
  - Create `domain-contracts` as a dedicated package
  - Move domain schemas and derived types out of `shared/models`
  - Introduce boundary validation using Zod-based contract parsing
  - Define explicit separation between entity schemas, boundary/input schemas, and test fixtures
- **Unchanged**:
  - Core business workflows and UI behavior
  - Service orchestration and route/controller responsibilities
  - External API capabilities, except for stronger validation and clearer type ownership

## 2. Principles

The contract layer introduced by MDT-101 follows these principles:

### Single Source of Truth
- Each domain concept is declared once in `domain-contracts`
- Downstream packages may adapt or derive shapes, but must not redefine canonical entity fields manually

### Schema First
- Runtime schemas are primary
- TypeScript types are inferred from schemas rather than maintained separately
- Derived boundary variants should come from schema operations such as `.pick()`, `.omit()`, `.partial()`, and `.extend()`

### Boundary Validation
- Validation happens where unknown or external input enters the system
- Internal business logic should consume already-validated data instead of repeatedly re-checking the same shape

### Domain Purity
- `domain-contracts` should remain free of implementation details from the application layer
- Contracts must not depend on business logic, transport code, file system services, or UI concerns

### Explicit Model Roles
- Entity schema: canonical normalized in-memory representation
- Boundary/input schema: request/frontmatter/update representations
- Fixture/test helpers: convenience builders derived from the canonical contracts

## 3. Architecture

### Dependency Direction

```text
domain-contracts   ← canonical schemas, inferred types, validation functions
       ↑
shared             ← business logic and normalization adapters
       ↑
server / mcp-server / src  ← interface and transport boundaries
```

### Ticket Contract Architecture

The ticket domain should be organized around one canonical entity model plus explicit boundary variants:

- `ticket/entity`:
  - Canonical normalized `Ticket` schema used by the running system
- `ticket/frontmatter`:
  - YAML / boundary-facing representation for persisted or interface-level ticket data
- `ticket/input`:
  - Create/update input schemas derived from the boundary schema
- `ticket/subdocument`:
  - Ticket-owned subdocument contract

This structure avoids the common failure mode where “CR”, “Ticket”, “DTO”, and “input” all become loosely duplicated names for overlapping shapes.

### Package Structure

```text
domain-contracts/
  src/
    index.ts
    project/
      schema.ts
      validation.ts
      index.ts
    ticket/
      entity.ts
      frontmatter.ts
      input.ts
      subdocument.ts
      schema.ts        # compatibility/public barrel
      validation.ts
      index.ts
    types/
      schema.ts
      index.ts
    testing/
      *.fixtures.ts
      index.ts
```

### Migration Checklist

- [x] Create the `domain-contracts` package and root production exports
- [x] Create shared primitive contracts in `domain-contracts/src/types/`
- [x] Create ticket contracts in `domain-contracts/src/ticket/`
- [x] Split ticket contracts by role: `entity`, `frontmatter`, `input`, `subdocument`, `validation`
- [x] Migrate canonical ticket shape ownership out of `shared`, `server`, `mcp-server`, and `src`
- [x] Move worktree schemas and types from `shared/models/WorktreeTypes.ts` into contracts
- [x] Consolidate the project contract into `domain-contracts/src/project/` as the canonical source of truth
- [x] Migrate `LocalProjectConfig`, merged `Project`, registry entry, and project input/update shapes into project contracts
- [ ] Remove remaining project and worktree duplicates from `shared`, `server`, `mcp-server`, and `src`
- [ ] Decide whether template metadata should become a formal contract
- [x] Create formal app config contracts for `config.toml` and `user.toml`
- [x] Keep selector preferences in `user.toml` as a separate user-config contract, not in global `config.toml`
- [ ] Keep transport-only payloads such as SSE events, tree nodes, and directory listings out of domain contracts unless a separate transport-contract layer is introduced

## 4. Decision

| Approach | Key Difference | Why Rejected / Accepted |
|----------|---------------|-------------------------|
| **Chosen Approach** | Separate `domain-contracts` package with schema-first contracts | **ACCEPTED** - Clear ownership, runtime validation, inferred types, enforceable dependency direction |
| Option A: Test-only contracts | Contracts exist only for tests | Production and tests would still drift |
| Option B: Contracts inside `shared/` | Keep contracts next to implementation | Blurs architecture, increases coupling, weakens purity guarantees |
| Option C: Type-only centralization | Share TS interfaces but no runtime schema | No validation at boundaries, duplicate runtime assumptions remain |
| Option D: Co-located per-package contracts | Each interface maintains local schemas | Multiple sources of truth remain likely |

## 5. Artifact Specifications

### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| `domain-contracts/package.json` | Package config | Zero internal deps, only zod dependency |
| `domain-contracts/src/project/schema.ts` | Zod schema | Project entity definition with validation |
| `domain-contracts/src/project/index.ts` | Exports | Public API for project contracts |
| `domain-contracts/src/ticket/` | Domain module | Canonical ticket entity and boundary schemas |
| `domain-contracts/src/types/schema.ts` | Primitive contract schema | Shared status/type/priority definitions |
| `domain-contracts/src/index.ts` | Main exports | Production API aggregate |
| `domain-contracts/src/testing/project.fixtures.ts` | Test factory | Builder pattern for test data |
| `domain-contracts/src/testing/index.ts` | Test exports | Testing utilities aggregate |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `shared/models/Project.ts` | Types migrated | Import Project type from domain-contracts |
| `shared/models/Ticket.ts` | Types migrated | Import CR/Ticket types from domain-contracts |
| `shared/models/Types.ts` | Types migrated | Import enums from domain-contracts |
| `shared/package.json` | Dependency added | Add "@mdt/domain-contracts" dependency |
| `mcp-server/package.json` | Dependency added | Add "@mdt/domain-contracts" dependency |
| `server/package.json` | Dependency added | Add "@mdt/domain-contracts" dependency |

### Integration Points
| From | To | Interface |
|------|----|-----------|
| shared/services | domain-contracts/src/index.ts | Import Project and Ticket contracts |
| mcp-server/tools | domain-contracts/src/index.ts | Validate responses with schemas |
| server/services | domain-contracts/src/index.ts | Parse/validate incoming data |
| Tests | domain-contracts/src/testing/index.ts | Import fixtures and test utils |

### Key Patterns
- **Schema-first**: Define Zod schema, derive TypeScript type with `z.infer<typeof Schema>`
- **Validation at boundaries**: Parse/validate at API boundaries, not internal calls
- **Separate testing subpath**: Test fixtures in `src/testing/` to keep production API clean
- **Cross-interface consistency**: All interfaces validate against same schemas
- **Clean exports**: Production API from `src/index.ts`, testing utilities from `src/testing/index.ts`

## 6. Acceptance Criteria

### Functional
- [ ] `domain-contracts` package exists with proper structure
- [ ] ProjectSchema in `domain-contracts/src/project/schema.ts` with all required fields
- [ ] Project type exported as `z.infer<typeof ProjectSchema>`
- [ ] Ticket contracts distinguish entity schema from input/frontmatter schemas without duplicating field ownership
- [ ] `shared/models/Project.ts` imports Project type from domain-contracts
- [ ] `mcp-server` validates tool responses against ProjectSchema
- [ ] `server/services` validate data using domain-contracts parsers

### Non-Functional
- [ ] domain-contracts package has zero internal dependencies
- [ ] Only external dependency is `zod` for schema validation
- [ ] All domain entities use runtime validation at boundaries
- [ ] TypeScript types are derived from schemas (no duplicate type definitions)
- [ ] Dependency direction is preserved: `domain-contracts` → `shared` → interface layers
- [ ] Tests and fixtures derive from contracts rather than redefining entity fields

### Testing
- Unit: Test schema validation with valid/invalid inputs
- Integration: MCP tools return data that passes schema validation
- Cross-interface: CLI, MCP, and UI all work with same validated shapes
- Fixtures: Test builders from `domain-contracts/src/testing/` create valid data

## 7. Verification

### By CR Type
- **Architecture**: New package structure exists, imports work correctly, runtime validation active

### Artifacts Created
- `domain-contracts/` directory with proper package structure
- Zod schemas for Project entity with validation rules
- Fixtures package with test data builders
- Updated imports in shared, mcp-server, and server packages
- Cross-interface tests verifying CLI ≡ MCP ≡ UI consistency

## 8. Deployment

### Scope changes

The scope changed, see details in:
[architecture.md](MDT-101/architecture.md)
