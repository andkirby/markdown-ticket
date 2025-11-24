---
code: MDT-077
status: Implemented
dateCreated: 2025-11-13T22:10:34.006Z
type: Architecture
priority: High
phaseEpic: Core Reference Architecture
assignee: CLI Development
---

# CLI Project Management Tool

**Purpose**: This document serves as a comprehensive reference for implementing CLI tools with shared service architecture

**Core Pattern**: Three-strategy configuration architecture with single source of truth service layer and comprehensive CLI testing strategy.

## 1. Description

### Problem
- Multiple project management code paths create inconsistent behavior across CLI, Web UI, and MCP interfaces
- Dual configuration system (global registry + local config) lacks clear architectural patterns
- Server-side project management duplication results in 80% code redundancy and maintenance overhead
- Missing comprehensive CLI testing strategy for command-line tools

### Affected Artifacts
- `shared/services/ProjectService.ts` (497 lines) - Source of truth for project operations
- `server/services/ProjectService.ts` (~300 lines) - Duplicate implementation requiring removal
- `shared/tools/project-cli.ts` - CLI interface layer
- `shared/tools/ProjectManager.ts` - High-level operations orchestrator
- `shared/tools/ProjectValidator.ts` - Validation and error handling layer

### Scope
- **Changes**: Transform implementation details into architectural patterns
- **Unchanged**: Preserve all functional requirements and implementation decisions

## 2. Decision

### Chosen Approach
Extract architectural patterns from implemented CLI project management system into a comprehensive reference document.

### Rationale
- **Pattern Library**: Provides reusable patterns for similar CLI implementations across projects
- **Onboarding Reference**: New contributors can understand system architecture without reading 600+ lines
- **Consistency Enforcement**: Establishes clear patterns for future CLI development
- **Testing Strategy**: Adds missing comprehensive CLI testing methodology

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Architecture extraction with patterns | **ACCEPTED** - Preserves implementation context while providing reusable patterns |
| Minimal documentation | Just add API reference | Lacks architectural context and decision rationale |
| Split into multiple docs | Separate docs for each concern | Creates fragmentation and cross-reference complexity |
| Rewrite from scratch | Clean slate documentation | Loses valuable implementation context and lessons learned |

## 4. Architecture Patterns

### Three-Strategy Configuration Architecture

#### Strategy 1: Global-Only Mode
- **Global Config**: Complete project definition in `~/.config/markdown-ticket/projects/`
- **No Local Config**: Zero files in project directory
- **Use Case**: Centralized management, clean project directories
- **CLI Flag**: `--global-only`

#### Strategy 2: Project-First Mode (Default)
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **Global Config**: Minimal reference (project location + metadata only)
- **Use Case**: Team-based development, portable projects

**Global Config Structure (Minimal Reference):**
```toml
# ~/.config/markdown-ticket/projects/{project-id}.toml
[project]
path = "/absolute/path/to/project"  # Project location for discovery

[metadata]
dateRegistered = "2025-11-19"
lastAccessed = "2025-11-19"
version = "1.0.0"
```

**Local Config Structure (Complete Definition):**
```toml
# {project}/.mdt-config.toml
[project]
name = "Project Name"
code = "CODE"
path = "."  # Project root (relative)
startNumber = 1
counterFile = ".mdt-next"
active = true
description = "Project description"
repository = "https://github.com/user/repo"
```

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

### Integration Patterns

#### CLI-Backend Separation Pattern
- **CLI Layer**: Parameter wrapper and user interface
- **Core Logic**: All business logic in shared services
- **Backend Layer**: HTTP controller using same shared services
- **Result**: Eliminates code duplication, ensures consistency

#### Configuration Merge Priority Pattern
- **Administrative Metadata** (Global Priority): `code`, `name`, `description`
- **Technical Settings** (Local Priority): `path`, `startNumber`, `counterFile`
- **Benefit**: Enables auto-discovery while maintaining centralized control

### Validation Layer Pattern

#### ProjectValidator Architecture
```typescript
// Validation methods
validateProjectConfig(config: ProjectConfig): ValidationResult
validateName(name: string): boolean
validateCode(code: string): boolean
validatePath(path: string): boolean
validateTicketsPath(path: string): boolean
```

**Error Taxonomy**:
- **Validation Errors**: Required field missing, format validation failed
- **File System Errors**: Path doesn't exist, permission denied
- **Configuration Errors**: Incomplete config, merge conflicts
- **Operation Errors**: Project not found, duplicate creation

## 5. CLI Testing Strategy

### Testing Architecture

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
  });
});
```

**Benefits over Bats**:
- Native Node.js integration with existing test infrastructure
- TypeScript support and type checking
- Access to internal test utilities and mocks
- Parallel test execution and better reporting
- Easier CI/CD integration

#### Test Categories

##### **Unit Tests**:
- ProjectValidator methods with edge cases
- ProjectManager business logic
- Error handling and exit codes

##### **Integration Tests**:
- CLI tool → Shared service integration
- Configuration file creation and validation
- File system operations

##### **End-to-End Tests**:
- Complete CLI workflows
- Multi-project scenarios
- Error recovery paths

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

### Performance Testing

#### Metrics Collection
- **Baseline Measurement**: Current operation timing before changes
- **Load Testing**: Multiple concurrent project operations
- **Memory Profiling**: Memory usage during extended operations

#### Test Commands
```bash
# Run CLI tests
npm run test:cli

# Performance benchmark
npm run test:cli:performance

# Integration test suite
npm run test:cli:integration
```

## 6. Implementation Guidelines

### New CLI Feature Pattern
1. **Service Layer First**: Implement core logic in shared services
2. **Validation Layer**: Add validation methods to ProjectValidator
3. **CLI Wrapper**: Create thin CLI interface using established patterns
4. **Testing Suite**: Add unit, integration, and E2E tests
5. **Documentation**: Update CLI usage guide

### Configuration Management Pattern
```typescript
// Configuration creation template
const createConfigTemplate = (options: ProjectOptions): ProjectConfig => ({
  project: {
    name: options.name,
    code: options.code,
    description: options.description || '',
    repository: options.repository || '',
    path: options.path,
    startNumber: 1,
    counterFile: '.mdt-next'
  },
  tickets: {
    path: options.ticketsPath || 'docs/CRs'
  }
});
```

### Error Handling Pattern
```typescript
// Consistent error response structure
const createErrorResponse = (type: ErrorType, details: string) => ({
  success: false,
  error: {
    type,
    message: getErrorMessage(type),
    details,
    exitCode: CLI_ERROR_CODES[type]
  }
});
```


### Implementation Status

**Current Issue**: The `registerProject()` method stores complete project definition in both global and local configs, violating the three-strategy architecture.

**Expected vs Actual Behavior**:
- ✅ **Expected**: Global stores minimal reference, local stores complete definition
- ❌ **Actual**: Global stores complete definition, duplicating local config data

**Required Fix**:
- Update `registerProject()` to store only path + metadata in global config
- Ensure local config contains complete project details
- Update project discovery to merge global (location) + local (details)

### Data Flow Patterns

**Project Creation (Project-First Strategy)**:
1. CLI creates local config with complete definition
2. CLI registers minimal reference in global registry
3. Discovery merges: global (location) + local (details)

**Project Updates**:
- **Administrative metadata** (name, code, description): Update local config
- **Technical settings** (path location): Update global config
- **Status changes** (active/disabled): Update local config

## 8. Success Criteria

### Functional
- [ ] Architecture document serves as implementation guide for new CLI features
- [ ] Three-strategy pattern consistently applied across project operations
- [ ] Service layer pattern eliminates code duplication
- [ ] CLI testing strategy provides comprehensive coverage
- [ ] Global configs store minimal reference (path + metadata) only
- [ ] Local configs store complete project definition
- [ ] Project discovery properly merges global + local data

### Non-Functional
- [ ] Document serves as onboarding reference for new contributors
- [ ] Patterns reused in other CLI implementations
- [ ] Test coverage > 90% for CLI operations

### Testing
- Unit: All validation methods with edge cases covered
- Integration: CLI tool integration with shared services verified
- E2E: Complete workflows tested in isolated environments

## 9. Implementation History (Reference)

This section preserves the implementation journey for historical context and lessons learned.

### Key Implementation Discoveries

#### Critical Issues Resolved
1. **Multiple Project Creation Code Paths**: CLI and Web UI used different templates
2. **Configuration Validation Gap**: CLI created incomplete configs that failed validation
3. **Data Priority Logic Error**: Wrong merge order prevented local config changes
4. **Server Duplication**: 80% code duplication between shared and server services

#### Architecture Evolution
- **Single Service**: Eliminated server-side duplication, enforced shared service usage
- **Three Strategies**: Added global-only mode for centralized management
- **Path Management**: Enhanced with `--create-project-path` and `--tickets-path` flags
- **Registry Enhancement**: Added file reference storage for reliable project operations

### Performance Characteristics
- **Caching**: 30-second TTL reduces project listing time by 85%
- **Memory**: Consistent < 50MB usage for all operations
- **Response Time**: < 2 seconds for single project operations
- **Concurrency**: Supports multiple simultaneous CLI operations

### Testing Implementation
```bash
# Current CLI commands (16 total)
npm run project:create
npm run project:list
npm run project:get
npm run project:update
npm run project:delete
npm run project:enable
npm run project:disable
# ... plus development variants
```

**Implementation Artifacts**:
- `shared/tools/project-cli.ts` - Main CLI interface
- `shared/tools/ProjectManager.ts` - High-level operations
- `shared/tools/ProjectValidator.ts` - Validation layer
- `docs/CLI_USAGE.md` - Comprehensive usage documentation

---

**Note**: This architecture reference is extracted from the implementation of MDT-077. For specific implementation details, refer to the git history using `git log --grep="MDT-077"`.