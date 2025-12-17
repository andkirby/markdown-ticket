# MDT-077 Implementation Details Extracted from Main Ticket

This document contains implementation details, architectural patterns, and technical specifications extracted from the main MDT-077 ticket to maintain a requirements-only focus in the primary ticket.

## Architecture Patterns

### Three-Strategy Configuration Architecture

#### Strategy 1: Global-Only Mode
- **Global Config**: Complete project definition in `~/.config/markdown-ticket/projects/{project-id}.toml`
- **No Local Config**: Zero files in project directory
- **Use Case**: Centralized management, clean project directories
- **CLI Flag**: `--global-only`

#### Strategy 2: Project-First Mode (Default)
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **Global Config**: Minimal reference (project location + metadata only)
- **Use Case**: Team-based development, portable projects

#### Strategy 3: Auto-Discovery Mode
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **No Global Config**: System auto-discovers from search paths
- **Use Case**: Development environments, ad-hoc projects

### Service Layer Architecture

#### Single Source of Truth Pattern
```
CLI/Web UI/MCP → shared/services/ProjectService.ts ← Implementation
               ↓
         shared/tools/ProjectValidator.ts ← Validation
               ↓
         shared/models/Project.ts ← Types
```

**Core Principles**:
- All project CRUD operations MUST use shared services
- Server package SHALL NOT duplicate business logic
- HTTP controllers SHALL be thin wrappers
- Feature parity guaranteed by shared service usage

#### Caching Strategy Pattern
- **TTL Cache**: 30-second time-to-live for project listings
- **Cache Invalidation**: On file system changes or CRUD operations
- **Performance Target**: < 2 seconds for single project operations

### CLI API Design Patterns

#### Command Structure Pattern
```bash
npm run <category>:<action> -- <flags>
# Examples:
npm run project:create -- --name "Project" --code "PRJ"
npm run project:list -- --format json
```

#### Argument Parsing Pattern
- **Separator Required**: Use `--` to pass arguments to CLI tool
- **Flag Categories**: Required (`--name`, `--code`), Optional (`--description`), Behavioral (`--global-only`)
- **Validation Layer**: ProjectValidator validates all inputs before processing

#### Error Handling Pattern
```typescript
// Exit codes: 0=success, 1=error, 2=validation, 3=not_found, 6=cancelled
process.exit(CLI_ERROR_CODES[errorType]);
```

### Implementation Status

**Completed Changes**:
- ✅ Global registry supports both minimal reference and complete configuration based on strategy
- ✅ Project-First mode: Global registry stores minimal reference (`path`, `active`, `dateRegistered`)
- ✅ Global-Only mode: Global registry stores complete project configuration[ui_improvement.txt](..%2F..%2F..%2F..%2F..%2Fui_improvement.txt)
- ✅ Local config contains complete project definition without legacy fields
- ✅ Removed deprecated fields: `startNumber`, `counterFile`, `lastAccessed`, `version`
- ✅ Ticket numbering now handled by file system scanning, not counter files

### Base CLI Commands (16 total)
```bash
npm run project:create
npm run project:list
npm run project:get
npm run project:update
npm run project:delete
npm run project:enable
npm run project:disable
```

### Implementation Artifacts
- `shared/tools/project-cli.ts` - Main CLI interface
- `shared/tools/ProjectManager.ts` - High-level operations
- `shared/tools/ProjectValidator.ts` - Validation layer
- `docs/CLI_USAGE.md` - Comprehensive usage documentation

### Testing Strategy Details

#### Node.js Native Testing Approach
**Framework**: Jest + Node.js child_process for CLI testing

**Pattern**:
```typescript
// tests/cli/project-cli.test.ts
describe('CLI Project Management', () => {
  test('create project with flags', async () => {
    const result = await execPromise(
      'npm run project:create -- --name "Test" --code "TST" --path "/tmp/test"'
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('Project created successfully');
    // check created files
  });
});
```

**Benefits over Bats**:
- Native Node.js integration with existing test infrastructure
- TypeScript support and type checking
- Access to internal test utilities and mocks
- Parallel test execution and better reporting
- Easier CI/CD integration

#### Test Data Management
```typescript
// Test fixtures pattern
const TEST_PROJECTS = {
  valid: { name: 'Test Project', code: 'TST', path: '/tmp/test' },
  invalid: { name: '', code: '123', path: '/nonexistent' }
};

// Cleanup utilities
afterEach(async () => {
  await cleanupTestProjects();
  await resetConfiguration();
});
```

### Configuration System Updates (2025-12-14)
- [x] `lastAccessed` field removed from global registry configuration
- [x] `startNumber` and `counterFile` fields removed from local configuration
- [x] Ticket numbering handled by file system scanning, not counter files
- [x] CONFIG_SPECIFICATION.md updated to reflect simplified configuration schema
- [x] Global registry supports both minimal reference and complete configuration
- [x] Local config excludes legacy counter management fields

### Performance Characteristics
- **Caching**: 30-second TTL reduces project listing time by 85%

### Critical Implementation Constraint

**No Backward Compatibility**:
- The implementation SHALL NOT support legacy configuration formats
- No migration utilities or compatibility layers will be provided
- All configurations must follow the new specification from CONFIG_SPECIFICATION.md
- Legacy fields (`startNumber`, `counterFile`, `lastAccessed`) are permanently removed
- Any configuration using legacy formats will be rejected with clear error messages