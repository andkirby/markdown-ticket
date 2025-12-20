# Project Entity Behavioral Validation - MDT-101

## Status: RED - Tests Document Current Behavior

The test file `domain-contracts/src/project/schema.test.ts` has been created to document the EXACT current behavior from `shared/models/Project.ts` that must be preserved when migrating to Zod schemas.

## What the Tests Document

### 1. LocalProjectConfig Interface Shape
- Required fields: `project.name`, `project.code`, `project.startNumber`, `project.counterFile`, `project.active`
- Optional fields: `project.id`, `project.path`, `project.description`, `project.repository`, `project.ticketsPath`
- Document section with optional `paths`, `excludeFolders`, `maxDepth`

### 2. Project Interface (Unified Model)
- Required: `id`, `project.name`, `project.path`, `project.configFile`, `project.active`, `project.description`, `metadata`
- Optional strategy flags: `metadata.globalOnly`, `autoDiscovered`, `configPath`, `registryFile`
- Optional sections: `tickets`, `document`

### 3. ProjectConfig Legacy Interface
- Same shape as LocalProjectConfig but with `project.active` being optional
- Maintained for backward compatibility

### 4. Function Behaviors
- `getTicketsPath()`: Priority order - `project.ticketsPath` → `project.path` → `defaultPath`
- `isLegacyConfig()`: Returns true when `project.path` exists but `project.ticketsPath` doesn't
- `migrateLegacyConfig()`: Moves legacy `project.path` to `project.ticketsPath`, sets `project.path` to "."
- `validateProjectConfig()`: Comprehensive validation with flexible type handling

## Next Steps

1. The tests are RED because `./schema.ts` doesn't exist yet
2. When implementing Zod schemas in `schema.ts`, ensure they match these exact behaviors
3. Run tests to verify they pass (GREEN)
4. The behaviors are now locked and protected by tests

## Test Categories

The tests cover:
- ✅ Interface shapes and field requirements
- ✅ Optional vs required field distinctions
- ✅ Function return values and edge cases
- ✅ Legacy format detection and migration
- ✅ Validation rules and type coercion
- ✅ Default values and fallback behaviors

All documented behaviors MUST be preserved to maintain backward compatibility.