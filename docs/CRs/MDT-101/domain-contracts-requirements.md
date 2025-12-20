# Domain Contracts Requirements

## Package Structure

### MUST
- Be a separate package (not inside `shared/`)
- Have zero internal dependencies (only external like `zod`)
- Be importable by any package without pulling implementation

### MUST NOT
- Contain business logic or implementation
- Depend on `shared/` or any interface package (cli, mcp, ui)

## Schemas

### MUST
- Define entity schemas using Zod (single source of truth)
- Derive TypeScript types from schemas (`z.infer<>`)
- Define input schemas in same file as entity schema
- Be used by both production code and tests

### MUST NOT
- Define service interfaces (those belong closer to implementation)
- Contain hardcoded test data in production exports

## Validation

### MUST
- Export validation functions that use schemas
- Provide both throwing (`parse`) and safe (`safeParse`) variants
- Be called at interface boundaries (CLI, MCP, UI)

### MUST NOT
- Be duplicated across interfaces
- Live inside interface packages

## Test Utilities (Fixtures)

### MUST
- Live in `src/testing/` directory
- Be exported via subpath `@mdt/domain-contracts/testing`
- Use schemas to generate valid test data
- Follow builder pattern for flexibility

### MUST NOT
- Be exported from main entry point (`src/index.ts`)
- Be bundled with production code

## Dependency Direction

### MUST
- Flow downward only: `contracts → shared → interfaces`

### MUST NOT
- Have circular dependencies
- Have contracts depend on implementation
