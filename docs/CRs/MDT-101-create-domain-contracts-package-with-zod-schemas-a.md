---
code: MDT-101
status: Implemented
dateCreated: 2025-12-19T14:39:23.333Z
type: Architecture
priority: Medium
phaseEpic: MDT-233
---

# Create domain-contracts package with Zod schemas as source of truth

> **Architecture Guide**: See [domain-contracts.md](MDT-101/domain-contracts.md) for detailed implementation patterns and examples.

## 1. Description

### Problem
- The system has multiple competing definitions of the same domain entities across `shared/`, `server/`, `mcp-server/`, and `frontend/src/`
- Type definitions are mixed with implementation concerns, making dependency boundaries unclear and causing contract drift
- Runtime validation is inconsistent, so interfaces may accept or emit shapes that differ from the intended domain model
- Tests and fixtures often mirror production types manually, which creates a second source of truth instead of validating against the real one

### Goal
Create a dedicated `domain-contracts` package that acts as the canonical source for domain schemas, inferred TypeScript types, and boundary validation functions.

### Architectural Intent
This CR is not just a package extraction. It establishes the contract architecture for the repository:

- `domain-contracts` defines canonical domain meaning
- `shared` implements business logic against validated contracts
- `server`, `mcp-server`, and `frontend/src` consume those contracts at boundaries
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
  frontend/src/
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
- [x] Migrate canonical ticket shape ownership out of `shared`, `server`, `mcp-server`, and `frontend/src`
- [x] Move worktree schemas and types from `shared/models/WorktreeTypes.ts` into contracts
- [x] Consolidate the project contract into `domain-contracts/src/project/` as the canonical source of truth
- [x] Migrate `LocalProjectConfig`, merged `Project`, registry entry, and project input/update shapes into project contracts
- [x] Remove remaining project and worktree duplicates from `shared`, `server`, `mcp-server`, and `frontend/src` — triaged 2026-10: `shared/models/*` are now pure re-export shims to `@mdt/domain-contracts` (no competing definitions remain); shim retirement and the `mcp-server/src/tools/__tests__/test-fixtures.ts` hand-rolled `Ticket`/`TicketData` interfaces transferred to MDT-099
- [x] Decide whether template metadata should become a formal contract — decided 2026-10: yes, minimal `template` contract (see Decision table; spec in architecture.md §4.5)
- [x] Create formal app config contracts for `config.toml` and `user.toml`
- [x] Keep selector preferences in `user.toml` as a separate user-config contract, not in global `config.toml`
- [x] Keep transport-only payloads such as SSE events, tree nodes, and directory listings out of domain contracts unless a separate transport-contract layer is introduced — rule documented in `domain-contracts/AGENTS.md`

## 4. Decision

| Approach | Key Difference | Why Rejected / Accepted |
|----------|---------------|-------------------------|
| **Chosen Approach** | Separate `domain-contracts` package with schema-first contracts | **ACCEPTED** - Clear ownership, runtime validation, inferred types, enforceable dependency direction |
| Option A: Test-only contracts | Contracts exist only for tests | Production and tests would still drift |
| Option B: Contracts inside `shared/` | Keep contracts next to implementation | Blurs architecture, increases coupling, weakens purity guarantees |
| Option C: Type-only centralization | Share TS interfaces but no runtime schema | No validation at boundaries, duplicate runtime assumptions remain |
| Option D: Co-located per-package contracts | Each interface maintains local schemas | Multiple sources of truth remain likely |
| **Template metadata (2026-10)** | Minimal `template` contract: `TemplateConfigSchema` validates `templates.json` at the load boundary; `Suggestion`/`ValidationResult` become contract types | **ACCEPTED** - `TemplateService.loadTemplates()` casts file input with `as TemplateConfig` (unchecked at boundary); `suggest_cr_improvements` and `TicketService` consume these shapes |
| **Scope transfer (2026-10)** | Shim retirement + test-fixture contract derivation moved to MDT-099 | **ACCEPTED** - falls under MDT-099 "consolidate shared code" theme; MDT-101 keeps only the template contract |

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
| `domain-contracts/src/testing/project.fixtures.ts` | Test factory | Builder pattern for test data (deleted 2026-10: no external consumers — see §8) |
| `domain-contracts/src/testing/index.ts` | Test exports | Testing utilities aggregate (deleted 2026-10: subpath never exported) |

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
| Tests | domain-contracts/src/testing/index.ts | Import fixtures and test utils (retired 2026-10: cross-package factories live in `shared/test-lib`) |

### Key Patterns
- **Schema-first**: Define Zod schema, derive TypeScript type with `z.infer<typeof Schema>`
- **Validation at boundaries**: Parse/validate at API boundaries, not internal calls
- **Separate testing subpath**: Test fixtures in `frontend/src/testing/` to keep production API clean
- **Cross-interface consistency**: All interfaces validate against same schemas
- **Clean exports**: Production API from `frontend/src/index.ts`, testing utilities from `frontend/src/testing/index.ts`

## 6. Acceptance Criteria

### Functional
- [x] `domain-contracts` package exists with proper structure
- [x] ProjectSchema in `domain-contracts/src/project/schema.ts` with all required fields
- [x] Project type exported as `z.infer<typeof ProjectSchema>`
- [x] Ticket contracts distinguish entity schema from input/frontmatter schemas without duplicating field ownership
- [x] `shared/models/Project.ts` imports Project type from domain-contracts
- `mcp-server` validates tool responses against ProjectSchema — not landed as stated (2026-10 audit): input is validated via shared services; response-side schema validation absent. Candidate follow-up; not blocking package goals
- `server/services` validate data using domain-contracts parsers — not landed as stated (2026-10 audit): server consumes validated types via `@mdt/shared`; direct parser usage absent. Candidate follow-up

### Non-Functional
- [x] domain-contracts package has zero internal dependencies (no `@mdt/*` in dependencies)
- Only external dependency is `zod` for schema validation — runtime imports are zod-only, but the `dependencies` block also carries tooling (eslint, glob, swagger-jsdoc); cleanup candidate for MDT-099
- [x] All domain entities use runtime validation at boundaries (config, frontmatter, templates.json; transport payloads excluded by documented rule)
- [x] TypeScript types are derived from schemas (no duplicate type definitions)
- [x] Dependency direction is preserved: `domain-contracts` → `shared` → interface layers (build proves)
- Tests and fixtures derive from contracts rather than redefining entity fields — partial: `mcp-server/src/tools/__tests__/test-fixtures.ts` still hand-rolls `Ticket` (transferred to MDT-099)

### Testing
- Unit: Test schema validation with valid/invalid inputs
- Integration: MCP tools return data that passes schema validation
- Cross-interface: CLI, MCP, and UI all work with same validated shapes
- Fixtures: Test builders from `domain-contracts/src/testing/` create valid data — retired 2026-10 (subpath never wired, zero external consumers; `buildTicket` inlined into `ticket/__tests__/level.test.ts`)

## 7. Verification

### By CR Type
- **Architecture**: New package structure exists, imports work correctly, runtime validation active

### Executed Evidence (2026-10-01)
- `bun run --cwd domain-contracts test`: 220 passed (template suite: 15/15); 2 pre-existing suites fail under jest (`bun:test` imports — identical on clean tree)
- `bun run --cwd shared build` + `jest`: 1005 passed, 3 failed (test-lib integration — identical on clean tree, proven via stash compare)
- `bun run --cwd mcp-server jest`: 159/159 passed
- `bun run --cwd server jest`: 775 passed, 2 failed (runtimeConfig, openapi — identical on clean tree) + flaky worktree-sse (flakes on clean tree)
- `bun run validate:ts`: 3 files passed; eslint clean on all changed files
- Independent teammate review (zai/glm-5.3:max): 7/7 claims PASS, verdict APPROVE

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

2026-10 post-close: `domain-contracts/src/testing/` deleted — the public fixtures subpath was never wired into package.json `exports` and had zero external consumers (cross-package test factories live in `shared/test-lib`). The one used builder, `buildTicket`, was inlined into `ticket/__tests__/level.test.ts`. Verified: 207 tests pass, same 2 pre-existing suite failures as baseline.
