# Architecture: MDT-101

**Source**: [MDT-101](../MDT-101-create-domain-contracts-package-with-zod-schemas-a.md)
**Generated**: 2025-12-20
**Complexity Score**: 11

## 1. Executive Summary

Domain-contracts package extracts entity definitions into standalone contracts with Zod schemas as the single source of truth. Contracts provide field-level validation only, while all business logic lives in services. This separation ensures zero internal dependencies and enables consistent validation across all interfaces (CLI, MCP, UI).

**Implementation Status**:
- **Phase 1a** ✅: Create domain-contracts package (COMPLETE)
- **Phase 1b** ❌: Integrate domain-contracts into existing codebase (NOT STARTED)
- **Phase 2** 📋: Enhanced Project field validation patterns
- **Phase 3** 📋: Enhanced Ticket field validation patterns
- **Phase 4** 📋: Additional contracts (Template, Config, Counter)

**Overall Progress**: Phase 1 is ~60% complete (1a ✅ | 1b ❌)

**Key Achievement**: Centralized type definitions with runtime validation while maintaining clean separation between contracts (shapes) and services (rules).

## 2. Design Principles

| Principle | Contract Layer | Service Layer |
|-----------|----------------|---------------|
| **Purpose** | Define data shapes | Enforce business rules |
| **Validation** | Field-level only (type, format, regex, required) | Cross-field, state transitions, migrations |
| **Dependencies** | Zero internal deps (only zod) | Can depend on contracts and other services |
| **Examples** | `email.regex(/@/)` | `if (user.email && user.isEmailVerified)` |
| **Forbidden** | Business logic, cross-field checks | None (handles all logic) |

### 2.1 Validation Boundary

```mermaid
graph LR
    subgraph "API Boundary"
        A[Raw Input: unknown]
    end
    subgraph "Contract Layer"
        B[Schema.parse<br/>→ Shape validation only]
        C[Type: inferred from schema]
    end
    subgraph "Service Layer"
        D[Business Rules<br/>Cross-field validation<br/>State transitions]
    end

    A --> B
    B --> C
    C --> D
```

## 3. Domain Contracts Specification

### 3.1 Package Structure

```
domain-contracts/
├── package.json                 → { "dependencies": { "zod": "^3.x" } }
├── src/
│   ├── index.ts                → Production exports (no testing)
│   ├── {entity}/               → One per domain entity
│   │   ├── schema.ts          → Zod schemas with field validation
│   │   ├── validation.ts      → parse/safeParse wrappers only
│   │   └── index.ts           → Public exports for entity
│   └── testing/               → Separate subpath
│       ├── index.ts           → Entry point for @mdt/domain-contracts/testing
│       └── {entity}.fixtures.ts → Test builders
```

### 3.2 Configuration-to-Contract Mapping

The domain-contracts package provides schemas that validate the structure of configuration data. The TOML configuration files (.mdt-config.toml) are parsed into JSON objects which are then validated against these schemas.

**Flow**:
```
.mdt-config.toml → Parsed JSON → Contract Schema.validate() → TypeScript Type
```

**Key Points**:
- Contracts validate the SHAPE and FORMAT of configuration data
- Business rules (like "ID must match directory name") are enforced in services
- Field-level validation happens at the contract boundary
- Cross-field validation happens in the service layer

### 3.3 Required File Patterns

**schema.ts (Entity definition)**
```typescript
import { z } from 'zod';

// Project entity schema with field validation ONLY
export const ProjectSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9]{1,4}$/, '2-5 chars, starts with letter'),
  name: z.string().min(3, 'Minimum 3 characters'),
  id: z.string().min(1, 'Required'),
  ticketsPath: z.string().min(1, 'Required path'),
  description: z.string().optional(),
  repository: z.string().optional(),
  active: z.boolean().optional().default(true),
  // NO cross-field validation (e.g., id matching directory name)
});

// Document configuration schema
export const DocumentConfigSchema = z.object({
  paths: z.array(z.string()).default([]),
  excludeFolders: z.array(z.string()).default([]),
  maxDepth: z.number().int().min(1).max(10).default(3),
});

// Complete project configuration schema
export const ProjectConfigSchema = z.object({
  project: ProjectSchema,
  'project.document': DocumentConfigSchema.optional(),
});

// Input schemas (derived from entity)
export const CreateProjectInputSchema = ProjectSchema.pick({
  code: true,
  name: true,
  id: true,
  ticketsPath: true,
}).partial();

// TypeScript types (inferred)
export type Project = z.infer<typeof ProjectSchema>;
export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;
export type DocumentConfig = z.infer<typeof DocumentConfigSchema>;
export type CreateProjectInput = z.infer<typeof CreateProjectInputSchema>;
```

**validation.ts (Wrapper functions only)**
```typescript
import {
  ProjectSchema,
  ProjectConfigSchema,
  CreateProjectInputSchema
} from './schema';

// Simple validation wrappers - NO business logic
export function validateProject(input: unknown): Project {
  return ProjectSchema.parse(input);
}

export function validateProjectConfig(input: unknown): ProjectConfig {
  return ProjectConfigSchema.parse(input);
}

export function safeValidateProject(input: unknown) {
  return ProjectSchema.safeParse(input);
}

export function validateCreateProjectInput(input: unknown): CreateProjectInput {
  return CreateProjectInputSchema.parse(input);
}
```

### 3.4 Path and Folder Validation

**What belongs in contracts (field validation)**:
```typescript
// In DocumentConfigSchema
export const DocumentConfigSchema = z.object({
  paths: z.array(z.string())
    .refine((paths) => paths.every(p => !p.includes('..')),
           { message: 'Parent directory references (..) not allowed in paths' })
    .refine((paths) => paths.every(p => !p.startsWith('/')),
           { message: 'Absolute paths not allowed, use relative paths only' })
    .min(1, 'At least one path required'),
  excludeFolders: z.array(z.string())
    .refine((folders) => folders.every(f => !f.includes('/')),
           { message: 'Exclude folders must be folder names, not paths' })
    .min(1, 'At least one folder to exclude'),
  maxDepth: z.number().int().min(1).max(10),
});
```

**What belongs in services (business rules)**:
- Check if paths actually exist on filesystem
- Validate glob patterns are properly formatted
- Check for symlink loops and security concerns
- Validate that resolved paths stay within project boundaries

Example security validation in service:
```typescript
// In shared/services/project-validation.ts
import { resolve, join } from 'path';
import { existsSync, lstatSync } from 'fs';

export function validateDocumentPaths(
  config: DocumentConfig,
  projectRoot: string
): ValidationResult {
  for (const path of config.paths) {
    // Resolve path to check for traversal attempts
    const resolvedPath = resolve(projectRoot, path);

    // Security check: ensure resolved path is within project root
    if (!resolvedPath.startsWith(resolve(projectRoot))) {
      throw new Error(`Path traversal detected: ${path}`);
    }

    // Check if path exists and is safe
    if (!existsSync(resolvedPath)) {
      throw new Error(`Path does not exist: ${path}`);
    }

    // Additional check for symlinks
    const stats = lstatSync(resolvedPath);
    if (stats.isSymbolicLink()) {
      const linkTarget = resolve(projectRoot, readlinkSync(resolvedPath));
      if (!linkTarget.startsWith(resolve(projectRoot))) {
        throw new Error(`Symlink points outside project: ${path}`);
      }
    }
  }

  return { valid: true };
}
```

### 3.5 Validation Rules (What's Allowed)

| Validation Type | Location | Example |
|-----------------|----------|---------|
| Type checking | Contract schema | `z.string()` |
| Format validation | Contract schema | `email: z.string().email()` |
| Regex patterns | Contract schema | `code: z.string().regex(/^[A-Z][A-Z0-9]{1,4}$/)` |
| Required fields | Contract schema | `name: z.string().min(3)` |
| Length constraints | Contract schema | `title: z.string().max(200)` |
| Enum values | Contract schema | `status: z.enum(['active', 'inactive'])` |
| Array validation | Contract schema | `paths: z.array(z.string()).min(1)` |
| Range validation | Contract schema | `maxDepth: z.number().min(1).max(10)` |
| **Path traversal prevention** | **Both layers** | Contract: `!p.includes('..')`, Service: `resolve()` check |
| **Absolute path prevention** | **Contract layer** | `!p.startsWith('/')` |
| **Folder name format** | **Contract layer** | `!f.includes('/')` for excludeFolders |
| **ID ↔ Directory matching** | **Service layer** | `if (project.id !== basename(projectPath))` |
| **Path existence** | **Service layer** | `if (!existsSync(fullPath))` |
| **Symlink validation** | **Service layer** | `linkTarget.startsWith(projectRoot)` |
| **Cross-field checks** | **Service layer** | `if (user.email && !user.emailVerified)` |
| **State transitions** | **Service layer** | `canTransition(status, newStatus)` |
| **Business rules** | **Service layer** | `validateBusinessRules(data)` |

#### Special Case: ID Validation

The rule that "ID must match directory name" is business logic because:
- It requires external information (the directory path)
- It's a cross-field check between the configuration and filesystem
- It's project-specific business rule, not data format validation

**Implementation**:
```typescript
// Contract validates format only
id: z.string().min(1, 'Required'),

// Service validates business rule
if (project.id !== basename(projectPath)) {
  throw new Error(`Project ID "${project.id}" must match directory name "${basename(projectPath)}"`);
}
```

## 4. Implementation Phases

### 4.1 Phase 1a: Create Domain Contracts Package ✅ COMPLETE

**Status**: ✅ All deliverables complete, 90+ tests passing

**Scope**: Create standalone package with core entity schemas and validation

**Completion Checklist**:
- [x] `domain-contracts/package.json` with zod dependency
- [x] `domain-contracts/src/project/schema.ts` - Project entity with field validation
- [x] `domain-contracts/src/project/validation.ts` - Validation wrapper functions
- [x] `domain-contracts/src/project/index.ts` - Public exports
- [x] `domain-contracts/src/ticket/schema.ts` - Ticket/CR entity with field validation
- [x] `domain-contracts/src/ticket/validation.ts` - Validation wrapper functions
- [x] `domain-contracts/src/ticket/index.ts` - Public exports
- [x] `domain-contracts/src/types/schema.ts` - Shared enums (CRStatus, CRType, CRPriority)
- [x] `domain-contracts/src/types/index.ts` - Public exports
- [x] `domain-contracts/src/index.ts` - Main package entry point
- [x] `domain-contracts/src/testing/project.fixtures.ts` - Test builders
- [x] `domain-contracts/src/testing/ticket.fixtures.ts` - Test builders
- [x] `domain-contracts/src/testing/index.ts` - Testing subpath exports
- [x] All tests passing (90+ tests GREEN)
- [x] Size limits met (all files within limits)

**Test Results**:
```
Test Suites: 6 passed, 6 total
Tests:       90 passed, 90 total
```

---

### 4.2 Phase 1b: Integrate Domain Contracts into Codebase ❌ NOT STARTED

**Status**: ❌ Blocking Phase 1 completion

**Scope**: Migrate existing codebase to use domain-contracts as single source of truth

**Completion Checklist**:

**Dependencies:**
- [ ] `shared/package.json` - Add `"@mdt/domain-contracts": "file:../domain-contracts"`
- [ ] `mcp-server/package.json` - Add `"@mdt/domain-contracts": "file:../domain-contracts"`
- [ ] `server/package.json` - Add `"@mdt/domain-contracts": "file:../domain-contracts"`

**Type Migration:**
- [ ] `shared/models/Types.ts` - Re-export CRStatus, CRType, CRPriority from domain-contracts
- [ ] `shared/models/Project.ts` - Re-export Project type from domain-contracts
- [ ] `shared/models/Ticket.ts` - Re-export CR/Ticket types from domain-contracts
- [ ] Remove duplicate type definitions from shared/models

**Import Statement Updates:**
- [ ] Update imports in `mcp-server/src/tools/handlers/crHandlers.ts`
- [ ] Update imports in `mcp-server/src/tools/handlers/projectHandlers.ts`
- [ ] Update imports in `mcp-server/src/services/crService.ts`
- [ ] Update imports in `server/services/` (all service files)
- [ ] Update imports in `server/controllers/` (all controller files)

**Boundary Validation:**
- [ ] Add `validateTicket()` call in `mcp-server` CR creation handler
- [ ] Add `validateProject()` call in `mcp-server` project handlers
- [ ] Add validation in `server` API entry points
- [ ] Handle ZodError responses appropriately

**Bug Fixes:**
- [ ] Fix CR code format consistency (domain-contracts regex vs MCP validation)
- [ ] Ensure `TEST-001`, `API-123` formats are valid
- [ ] Fix failing MCP E2E tests (update_cr_status-fast.spec.ts, etc.)

**Verification:**
- [ ] Run `npm run build:shared` - must succeed
- [ ] Run `cd mcp-server && npm run build` - must succeed
- [ ] Run `cd server && npm run build` - must succeed
- [ ] Run `cd mcp-server && npm test` - E2E tests must pass
- [ ] Run `cd domain-contracts && npm test` - contract tests must still pass

**Estimated Effort**: 4-6 hours

**Phase 1 Complete When**: All items in Phase 1b checked ✅

---

### 4.3 Phase 2: Enhanced Project Validation 📋 PLANNED

**Status**: 📋 Blocked by Phase 1b completion

**Scope**: Add enhanced field-level validation patterns to Project schema

**Completion Checklist**:
- [ ] Add project code format validation: `^[A-Z][A-Z0-9]{1,4}$` (2-5 chars, starts with letter)
- [ ] Add path format validation (relative vs absolute detection)
- [ ] Add email format validation for assignee (when provided)
- [ ] Add date format validation (ISO 8601)
- [ ] Add string length constraints
- [ ] Update `domain-contracts/src/project/schema.ts` with enhanced rules
- [ ] Update `domain-contracts/src/project/validation.ts` with new input schemas
- [ ] Update test fixtures for edge cases
- [ ] Write tests for new validation rules
- [ ] Update documentation

**Size Limits**:
- Schema file: 225 lines (expanded from 174)
- Validation file: 112 lines (expanded from 91)
- Test fixtures: 225 lines (expanded from 160)

**Business Logic in Services** (separate from contracts):
- Cross-field validation (e.g., path consistency rules)
- Legacy format migration logic
- Complex business rules

---

### 4.4 Phase 3: Enhanced Ticket Validation 📋 PLANNED

**Status**: 📋 Blocked by Phase 2 completion

**Scope**: Add enhanced field-level validation patterns to Ticket schema

**Completion Checklist**:
- [ ] Add ticket code format validation: `^[A-Z][A-Z0-9]{2,4}-\d{3,4}$` (e.g., "MDT-101")
- [ ] Add title length constraints (max 200 characters)
- [ ] Add date format validation and ordering
- [ ] Add URL format validation for links
- [ ] Add markdown structure validation (frontmatter presence)
- [ ] Update `domain-contracts/src/ticket/schema.ts` with enhanced rules
- [ ] Update `domain-contracts/src/ticket/validation.ts` with new input schemas
- [ ] Update test fixtures for ticket edge cases
- [ ] Write tests for new validation rules
- [ ] Update documentation

**Size Limits**:
- Schema file: 300 lines (expanded from 135)
- Validation file: 112 lines (expanded from 59)
- Test fixtures: 225 lines (expanded from 142)

**Business Logic in Services** (separate from contracts):
- Status transition validation
- Circular dependency detection
- Content section validation
- Relationship integrity checks

---

### 4.5 Phase 4: Additional Contracts 📋 CONSIDERING

**Status**: 📋 Blocked by Phase 3 completion

**Scope**: Template, Configuration, Counter, and Validation contracts

**Completion Checklist**:
- [ ] Design Template entity schema
- [ ] Design TemplateSection schema
- [ ] Design Config schemas (StatusConfig, AttributeConfig, ServerConfig)
- [ ] Design Counter schemas (CounterConfig, CounterResponse, CounterError)
- [ ] Design Validation result types (no logic)
- [ ] Implement Template contract
- [ ] Implement Config contracts
- [ ] Implement Counter contracts
- [ ] Write tests for all new contracts
- [ ] Update documentation

**Implementation Pattern**: Same as Phase 1 - schema + validation wrappers + fixtures

---

### 4.6 What Will NOT Be Implemented

**Business logic that belongs in services**:
- ❌ Cross-field validation (e.g., "path must match ticketsPath")
- ❌ Status transition rules (e.g., "Rejected → In Progress not allowed")
- ❌ Migration logic (e.g., "convert legacy format")
- ❌ Relationship validation (e.g., "circular dependency detection")
- ❌ Content parsing (e.g., "markdown section validation")

These are implemented in `shared/services` using the contracts.

## 5. Decision Guide

### 5.1 Where Does Logic Go?

| Question | Answer | Location |
|----------|--------|----------|
| Is it a field format check? | Yes | Contract schema |
| Does it check one field only? | Yes | Contract schema |
| Does it check if ID matches directory name? | No (needs filesystem) | Service layer |
| Does it validate path existence? | No (needs filesystem) | Service layer |
| Does it compare multiple fields? | Yes | Service layer |
| Is it a state transition rule? | Yes | Service layer |
| Does it involve data migration? | Yes | Service layer |
| Is it a business rule? | Yes | Service layer |

### 5.2 Examples

| Logic | Contract Layer | Service Layer |
|-------|----------------|--------------|
| `code` format: `WEB-123` | ✅ `regex(/^[A-Z][A-Z0-9]{1,4}$/)` | ❌ |
| `name` minimum length: 3 | ✅ `min(3)` | ❌ |
| `id` matches directory | ❌ | ✅ `if (id !== basename(path))` |
| `ticketsPath` exists | ❌ | ✅ `if (!existsSync(ticketsPath))` |
| Project uniqueness | ❌ | ✅ Check across all projects |

### 5.2 Adding New Entity Checklist

**For Contracts**:
- [ ] Create `src/{entity}/schema.ts` with field validation only
- [ ] Create `src/{entity}/validation.ts` with parse/safeParse wrappers
- [ ] Create `src/{entity}/index.ts` exporting schema, type, validation
- [ ] Add to `src/index.ts`
- [ ] Create `src/testing/{entity}.fixtures.ts`
- [ ] Add to `src/testing/index.ts`

**For Services** (Separate repository):
- [ ] Implement business rules in `shared/services/{entity}.ts`
- [ ] Add cross-field validation
- [ ] Add state transition logic
- [ ] Add migration support if needed

## 6. Testing Strategy

### 6.1 Contract Tests (domain-contracts package)
```typescript
// Test field validation only
describe('ProjectSchema', () => {
  it('should reject invalid key format', () => {
    expect(() => ProjectSchema.parse({ key: 'invalid' }))
      .toThrow('2-5 uppercase letters');
  });

  it('should accept valid project', () => {
    expect(() => ProjectSchema.parse(validProject))
      .not.toThrow();
  });
});
```

### 6.2 Service Tests (shared package)
```typescript
// Test business rules
describe('projectService', () => {
  it('should validate cross-field rules', () => {
    expect(() => projectService.create({ active: false, path: undefined }))
      .toThrow('Inactive project must have path');
  });
});
```

### 6.3 Integration Tests
```typescript
// Test contract + service interaction
describe('Project Creation Flow', () => {
  it('should validate shape then business rules', async () => {
    // 1. Contract validates shape
    const validated = validateProject(input);

    // 2. Service validates business rules
    const result = await projectService.create(validated);

    expect(result).toBeDefined();
  });
});
```

## 7. Error Handling Pattern

### 7.1 Contract Errors (ZodError)
```typescript
{
  "issues": [
    {
      "code": "invalid_string",
      "path": ["key"],
      "message": "2-5 uppercase letters"
    }
  ],
  "name": "ZodError"
}
```

### 7.2 Service Errors (Custom)
```typescript
{
  "type": "BusinessRuleViolation",
  "field": "path",
  "message": "Inactive project must specify path",
  "code": "MISSING_PATH_FOR_INACTIVE"
}
```

## 8. Migration Strategy (Phase 1b)

**Note**: This migration is part of **Phase 1b** - see Section 4.2 for the complete checklist.

### 8.1 From Current Implementation
| Component | From | To | Validation |
|-----------|------|----|------------|
| Project type | `shared/models/Project.ts` | `domain-contracts/src/project/schema.ts` | Shape preserved |
| Business rules | Mixed in models | `shared/services/project.ts` | Rules preserved |
| Type imports | Direct from shared | From domain-contracts | TypeScript enforced |

### 8.2 Consumer Migration
```typescript
// Before
import type { Project } from '../shared/models';
import { validate } from '../shared/validation';

// After
import type { Project, validateProject } from '@mdt/domain-contracts';
import { projectService } from '@mdt/shared/services';

// Usage
const validated = validateProject(input);  // Shape validation
const result = projectService.create(validated);  // Business logic
```

## 9. Size Limits

| Module Type | Role | Limit | Hard Max |
|-------------|------|-------|----------|
| Entity Schema | Field validation only | 150-200 | 300 |
| Validation File | parse/safeParse wrappers | 75 | 112 |
| Index File | Exports only | 20 | 30 |
| Test Fixtures | Builders for testing | 100-150 | 225 |
| Public API | Aggregated exports | 30 | 45 |

## 10. References

- **Requirements**: [domain-contracts-requirements.md](./domain-contracts-requirements.md)
- **Specification**: [domain-contracts.md](./domain-contracts.md)
- **Testing Guide**: [domain-contracts-testing-guide.md](./domain-contracts-testing-guide.md)
- **Phase 1 Tasks**: [phase-1/tasks.md](./phase-1/tasks.md) - Detailed task breakdown with TDD
- **Phase 1 Tests**: [phase-1/tests.md](./phase-1/tests.md) - Test specifications and coverage
- **Compliance Report**: [compliance-report.md](./compliance-report.md) - Architecture compliance status
- **Usage Guide**: [usage-guide.md](./usage-guide.md) - How to use domain-contracts

---

*Generated by /mdt:architecture*
*Last Updated: 2025-12-23 (Phase restructure for clarity)*