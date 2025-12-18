# Project Configuration Interface Refactor

## Problem

Current TypeScript interfaces have confusing and incorrect naming that doesn't match the TOML structure:

- `LocalProjectConfig.project.name` requires accessing `project.project.name` pattern
- Interface has unnecessary nesting that doesn't exist in the actual TOML
- `Project` interface also has nested `project` property creating same anti-pattern
- Metadata section adds unnecessary complexity and is being removed

## Current State

```typescript
// BAD - Creates project.project anti-pattern
interface LocalProjectConfig {
  project: {
    name: string;
    code: string;
    // ...
  };
  document: {
    paths: string[];
    // ...
  };
}

// Usage is ugly: config.project.project.name
```

## Target State

```typescript
// GOOD - Direct mapping to TOML
interface LocalProjectConfig {
  name: string;        // Direct access to [project] name
  code: string;        // Direct access to [project] code
  id: string;
  ticketsPath?: string;
  description?: string;
  repository?: string;
  active: boolean;

  document: {          // Maps to [project.document]
    paths?: string[];
    excludeFolders?: string[];
    maxDepth?: number;
  };
}

// Usage is clean: config.name
```

## Implementation Tasks

1. **Refactor LocalProjectConfig**:
   - Flatten `project` properties to top level
   - Keep `document` nested (matches TOML `[project.document]`)
   - Remove all metadata-related properties

2. **Refactor Project interface**:
   - Rename nested `project` property to avoid `project.project` pattern
   - Remove `metadata` section entirely
   - Keep only essential fields for API responses

3. **Update Code**:
   - Replace all `project.project.*` with direct property access
   - Update configuration validation functions
   - Update ProjectService and related services
   - Remove all metadata handling code

## Files to Modify

- `shared/models/Project.ts` - Main interface definitions
- `shared/services/ProjectService.ts` - Service implementations
- Any files using `project.project` pattern
- Configuration validation logic

## Acceptance Criteria

- [ ] `LocalProjectConfig.name` directly accesses project name
- [ ] `LocalProjectConfig.document.paths` correctly maps to `[project.document]` in TOML
- [ ] All `project.project.*` patterns eliminated from codebase
- [ ] No metadata-related code exists
- [ ] All TypeScript compilation errors resolved