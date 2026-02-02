# CLAUDE.md - Shared Package

Guidance for Claude Code working with the `@mdt/shared` workspace package.

## Architecture

**See**: `ARCHITECTURE.md` for package structure, models, services, and organization.

## Development Commands

- `npm run build` - Build the package (required before using in other workspaces)
- `npm run test` - Run Jest tests
- `npm run test:watch` - Watch mode
- `npm run lint` - ESLint

**Note**: Root `npm run dev:full` auto-builds shared code.

## Testing

### Isolated Test Environment (test-lib)

**Critical**: For integration tests, CLI tests, or any tests that need file system isolation, use the `test-lib` package.

```typescript
import { TestEnvironment, ProjectFactory } from '@mdt/shared/test-lib'
```

**Documentation**:
- **Quick Start**: `test-lib/write-tests-guide.md` - 3 progressive usage levels
- **Full API**: `test-lib/README.md` - Complete API reference

**When to use test-lib**:
- CLI integration tests (configuration validation, project creation)
- Full-stack tests requiring isolated ports
- Tests that create temporary files/projects
- MCP server E2E tests

**When NOT to use test-lib**:
- Pure unit tests with no file system I/O
- Simple model validation tests
- Tests that don't need isolation

```typescript
// ✅ Good: Use test-lib for CLI/integration tests
import { TestEnvironment } from '@mdt/shared/test-lib'

// ✅ Good: Simple unit tests don't need test-lib
import { validateCode } from './ProjectValidator'
```

### Existing Test Patterns

See these files for examples:
- `tools/__tests__/project-management/configuration-validation.test.ts` - CLI tests with TestEnvironment
- `tools/__tests__/project-management/project-creation.test.ts` - Project creation tests
- `tests/models/MDT-101/Project.behavior.test.ts` - Pure unit tests (no TestEnvironment)

## Conventions

- **Import path**: Use `@mdt/shared/` prefix for imports within the monorepo
- **Type exports**: Export types alongside values for TypeScript convenience
- **Validation**: Use `ProjectValidator` for all project configuration validation
- **Error handling**: Throw specific error classes (e.g., `ProjectValidationError`)

```typescript
// ✅ Correct
import { ProjectFactory, TestEnvironment } from '@mdt/shared/test-lib'
import { validateCode } from '@mdt/shared/models/ProjectValidator'

// ❌ Avoid
import { ProjectFactory } from '../../../test-lib/index'
```
