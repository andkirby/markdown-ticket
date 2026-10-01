# Domain Contracts Requirements

## Package Structure

### MUST
- Be a separate package (not inside `shared/`)
- Have zero internal dependencies (only external dependencies like validation libraries)
- Be importable by any package without pulling implementation

### MUST NOT
- Contain business logic or implementation
- Depend on `shared/` or any interface package (cli, mcp, ui)

## Schemas

### MUST
- Define entity schemas using a validation library (single source of truth)
- Derive TypeScript types from schemas (library-specific inference)
- Define input schemas in the same entity module as the entity schema
- Be used by both production code and tests

### MUST NOT
- Define service interfaces (those belong closer to implementation)
- Contain hardcoded test data in production exports
- Require every entity to use exactly one file layout

### SHOULD
- Keep one canonical schema per domain concept
- Split large entities into focused files when it improves clarity
- Use `schema.ts` as a stable entrypoint or compatibility barrel when the entity module has multiple files

## Validation

### MUST
- Export validation functions that use schemas
- Provide both throwing and safe validation variants
- Be called at interface boundaries (API controllers, CLI commands, UI forms)

### MUST NOT
- Be duplicated across interfaces
- Live inside interface packages

## Test Utilities (Fixtures)

### MUST
- Live in `frontend/src/testing/` directory
- Be exported via separate subpath (e.g., `domain-contracts/testing`)
- Use schemas to generate valid test data
- Follow builder pattern for flexibility

### MUST NOT
- Be exported from main entry point (`frontend/src/index.ts`)
- Be bundled with production code

## Dependency Direction

### MUST
- `domain-contracts` imports only `zod`; zero internal dependencies
- Dependency direction preserved: `domain-contracts` → `shared` → interface layers
- Flow downward only: `contracts → business → interfaces`

### MUST NOT
- Interface layers must not redefine canonical entity fields manually
- Have circular dependencies
- Have contracts depend on implementation

## Template Contracts (added 2026-10, from Phase 4 re-scope)

### MUST
- `templates.json` is parsed with `TemplateConfigSchema.safeParse` at the `TemplateService.loadTemplates()` boundary — no `as` casts on file input
- `TemplateConfig`, `Template`, `Suggestion`, `ValidationResult` defined exactly once, in `domain-contracts/src/template/`
- TS types inferred from schemas (`z.infer`), not declared separately
- Invalid `templates.json` falls back to the existing fallback-template path (no throw past the boundary)

### MUST NOT
- No markdown content or section-presence validation in contracts — that is TemplateService business logic
- No template file I/O in contracts (filesystem stays in services)
