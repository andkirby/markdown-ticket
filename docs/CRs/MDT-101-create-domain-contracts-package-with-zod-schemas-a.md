---
code: MDT-101
status: In Progress
dateCreated: 2025-12-19T14:39:23.333Z
type: Architecture
priority: Medium
---

# Create domain-contracts package with Zod schemas as source of truth

> **Architecture Guide**: See [domain-contracts.md](MDT-101/domain-contracts.md) for detailed implementation patterns and examples.

## 1. Description

### Problem
- Current system lacks single source of truth for domain entities across CLI, MCP, and UI interfaces
- Shared types in shared/ mix implementation with contracts, creating heavy dependencies
- No runtime validation ensures data consistency across interfaces
- Tests cannot validate against canonical schemas, leading to potential drift

### Affected Artifacts
- `shared/models/Project.ts` - Contains Project type that should move to contracts
- `shared/models/Ticket.ts` - Contains CR/Ticket types that should move to contracts
- `shared/models/Types.ts` - Contains status and type enums that should move to contracts
- `shared/services/` - Services that import and use domain types
- `mcp-server/src/tools/` - MCP tools that return domain data
- `server/services/` - Backend services that handle domain operations

### Scope
- **Changes**: Create new domain-contracts package, migrate types from shared/models
- **Unchanged**: Implementation logic in services, UI components, MCP handlers

## Architecture Design
> **Extracted**: Validation architecture details moved to [architecture.md](./architecture.md#phase-11-enhanced-project-validation)

**Summary**:
- Pattern: Layered Validation with Zod
- Components: 4 modules (schema, validation, migration, index)
- Key constraint: Schema validation at boundaries, custom rules for business logic

**Extension Rule**: To add Project validation, create rule in `validation.ts` (limit 100 lines) using Zod refine/superRefine.

## 3. Alternatives Considered

> **Extracted**: Complex architecture — see [architecture.md](./architecture.md)

**Summary**:
- Pattern: Schema-First Domain Contracts
- Components: 6 (Project, Ticket, Types schemas + 3 consumer packages)
- Key constraint: Each schema file ≤150 lines, runtime validation at boundaries

**Extension Rule**: To add entity, create schema file (limit 150 lines) with Zod schema and export inferred type.

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Separate package with Zod schemas | **ACCEPTED** - Clean separation, runtime validation, zero internal deps |
| Option A: Test-only contracts | Contracts only used by tests | Production types and test contracts could drift apart |
| Option B: Contracts in shared/ | Embed contracts in shared/ package | shared/ becomes grab-bag, heavier dependencies, harder to enforce purity |
| Option C: Co-located tests | Tests near code with shared fixtures | Requires discipline, no enforcement of contract usage |

## 4. Artifact Specifications

### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| `domain-contracts/package.json` | Package config | Zero internal deps, only zod dependency |
| `domain-contracts/src/project/schema.ts` | Zod schema | Project entity definition with validation |
| `domain-contracts/src/project/index.ts` | Exports | Public API for project contracts |
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
| shared/services | domain-contracts/src/index.ts | Import Project, CR types |
| mcp-server/tools | domain-contracts/src/index.ts | Validate responses with schemas |
| server/services | domain-contracts/src/index.ts | Parse/validate incoming data |
| Tests | domain-contracts/src/testing/index.ts | Import fixtures and test utils |
### Key Patterns
- **Schema-first**: Define Zod schema, derive TypeScript type with `z.infer<typeof Schema>`
- **Validation at boundaries**: Parse/validate at API boundaries, not internal calls
- **Separate testing subpath**: Test fixtures in `src/testing/` to keep production API clean
- **Cross-interface consistency**: All interfaces validate against same schemas
- **Clean exports**: Production API from `src/index.ts`, testing utilities from `src/testing/index.ts`
## 5. Acceptance Criteria
### Functional
- [ ] `domain-contracts` package exists with proper structure
- [ ] ProjectSchema in `domain-contracts/src/project/schema.ts` with all required fields
- [ ] Project type exported as `z.infer<typeof ProjectSchema>`
- [ ] `shared/models/Project.ts` imports Project type from domain-contracts
- [ ] `mcp-server` validates tool responses against ProjectSchema
- [ ] `server/services` validate data using domain-contracts parsers

### Non-Functional
- [ ] domain-contracts package has zero internal dependencies
- [ ] Only external dependency is `zod` for schema validation
- [ ] All domain entities use runtime validation at boundaries
- [ ] TypeScript types are derived from schemas (no duplicate type definitions)

### Testing
- Unit: Test schema validation with valid/invalid inputs
- Integration: MCP tools return data that passes schema validation
- Cross-interface: CLI, MCP, and UI all work with same validated shapes
- Fixtures: Test builders from `domain-contracts/src/testing/` create valid data
## 6. Verification

### By CR Type
- **Architecture**: New package structure exists, imports work correctly, runtime validation active

### Artifacts Created
- `domain-contracts/` directory with proper package structure
- Zod schemas for Project entity with validation rules
- Fixtures package with test data builders
- Updated imports in shared, mcp-server, and server packages
- Cross-interface tests verifying CLI ≡ MCP ≡ UI consistency
## 7. Deployment

### Scope changes

The scope changed, see details in:
[architecture.md](MDT-101/architecture.md)
