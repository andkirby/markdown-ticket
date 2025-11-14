---
code: MDT-077
status: Proposed
dateCreated: 2025-11-13T22:10:34.006Z
type: Feature Enhancement
priority: High
phaseEpic: CLI Tools Enhancement
assignee: CLI Development
---

# CLI Project Management Tool

## 1. Description

### Problem Statement
Users need comprehensive CLI tooling for project management operations (create, read, update, delete) that integrates with the existing shared/ architecture and provides the same functionality available in the UI.

### Current State
- Configuration CLI exists (`npm run config:*`) for global settings management
- Project management limited to UI operations
- No direct CLI access to project CRUD operations
- ProjectService provides all necessary backend functionality but lacks CLI interface
- Editing in UI requires modal interactions and form validation

### Desired State
- Complete CLI project management tool (`npm run cli:project`) with full CRUD operations
- Interactive and non-interactive modes for different use cases
- Batch operations support for multiple project management
- Consistent with existing CLI patterns and shared/ architecture

### Business Justification
- Enables automation and scripting of project management workflows
- Provides rapid project operations for power users
- Supports CI/CD pipeline integration
- Eliminates UI dependency for basic project management

## 2. Rationale

- **Automation Support**: CLI tooling enables scripted project creation/management for development workflows
- **Consistency**: Leverages existing ProjectService and configuration patterns from config-cli.ts
- **Efficiency**: Batch operations and non-interactive modes significantly faster than UI for multiple operations
- **Integration**: Provides API for external tools and CI/CD pipelines
- **Architecture**: Aligns with existing shared/ service layer and TypeScript patterns

## 3. Solution Analysis

### Evaluated Approaches

| Approach | Key Difference | Why Selected |
|----------|---------------|--------------|
| Interactive CLI prompts | User-friendly step-by-step project creation | Selected for primary create/edit workflow |
| Command-line arguments | All parameters passed as flags | Selected for automation and scripting |
| Configuration file templates | Project definitions from TOML/JSON files | Selected for batch operations |
| Direct file manipulation | Manual editing of .toml files | Rejected - bypasses validation |
| MCP-only approach | Use existing MCP tools exclusively | Rejected - requires MCP server running |

### Selected Approach
Hybrid CLI tool with three operation modes:
1. **Interactive Mode**: Step-by-step prompts with validation
2. **Argument Mode**: All parameters via command-line flags
3. **Template Mode**: Create/update from configuration templates

### Integration Architecture
- Reuse `ProjectService` from shared/services/ProjectService.ts
- Extend `ConfigManager` patterns from config-cli.ts
- Leverage `DEFAULT_PATHS` and constants from shared/utils/constants.ts
- Follow TOML serialization patterns from existing CLI tools

## 4. Implementation Specification

### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `shared/tools/project-cli.ts` | CLI Tool | Main project management interface |
| `shared/dist/tools/project-cli.js` | Compiled CLI | Production-ready command-line tool |
| `shared/tools/ProjectManager.ts` | Service Class | High-level project operations |
| `shared/tools/ProjectValidator.ts` | Validation Class | Project data validation |
| `shared/tools/TemplateManager.ts` | Service Class | Template-based operations |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `package.json` | Scripts added | Add `cli:project` npm scripts |
| `shared/services/ProjectService.ts` | Methods added | `updateProject()`, `deleteProject()` |
| `shared/utils/constants.js` | Constants added | CLI error codes and messages |
| `shared/tsconfig.json` | Configuration | Include tools directory in build |

### CLI Command Structure

```bash
npm run cli:project create [--interactive] [options]
npm run cli:project list [--format json|table|toml]
npm run cli:project get <project-id> [--format json|toml]
npm run cli:project update <project-id> [--interactive] [options]
npm run cli:project delete <project-id> [--confirm]
npm run cli:project import <template-file>
npm run cli:project export <project-id> [--format json|toml]
```

### Operation Modes

**Interactive Mode** (`--interactive` or default for create/update):
- Step-by-step prompts for all required fields
- Real-time validation and error handling
- Preview before confirmation
- Support for multi-line descriptions

**Argument Mode** (flags provided):
- All parameters via command-line flags
- Batch operation capability
- JSON output for automation
- Exit codes for scripting

**Template Mode** (`import`/`export`):
- Create projects from TOML/JSON templates
- Export existing project configurations
- Support for project templates with placeholders

### Integration Points

| From | To | Interface |
|------|----|-----------|
| CLI Tool | ProjectService | `getAllProjects()`, `registerProject()` |
| CLI Tool | ConfigManager | TOML read/write operations |
| CLI Tool | TemplateManager | Template processing |
| ProjectValidator | Project types | `validateProjectConfig()` |

### Key Patterns
- **Command Pattern**: Each operation as separate command class
- **Builder Pattern**: Interactive project creation with validation
- **Template Method**: Consistent command execution flow
- **Error Handling**: Structured error codes and user-friendly messages

## 5. Acceptance Criteria

### Functional
```
- [ ] npm run cli:project create --interactive creates project with step-by-step prompts
- [ ] npm run cli:project create --name "Test" --code "TST" --path "/path/to/test" creates project non-interactively
- [ ] npm run cli:project list displays all projects in tabular format
- [ ] npm run cli:project list --format json outputs structured data
- [ ] npm run cli:project get <project-id> shows detailed project information
- [ ] npm run cli:project update <project-id> --interactive updates project with validation
- [ ] npm run cli:project delete <project-id> --confirm removes project after confirmation
- [ ] npm run cli:project import template.toml creates project from template file
- [ ] npm run cli:project export <project-id> --format toml outputs project configuration
- [ ] All commands use shared/ ProjectService and maintain data consistency
- [ ] CLI supports both development (tsx) and production (node) execution
```

### Non-Functional
```
- [ ] Exit code 0 for successful operations, 1 for errors, 2 for validation failures
- [ ] All operations complete within 2 seconds for single project actions
- [ ] Memory usage < 50MB for all CLI operations
- [ ] TOML output matches existing project registry format exactly
- [ ] Error messages provide actionable guidance for resolution
```

### Testing
```
- Unit: Test ProjectManager.createProject() with valid/invalid data
- Unit: Test ProjectValidator.validateProjectFields() edge cases
- Integration: Test CLI tool → ProjectService → file system operations
- Manual: Create project interactively, verify in UI and file system
- Manual: Update project via CLI, confirm changes reflected in UI
```

## 6. Verification

### By Feature
- **Project Creation**: `shared/tools/project-cli.ts` exists and creates valid project configurations
- **Project Listing**: CLI lists projects matching UI project manager output
- **Project Updates**: Modifications via CLI persist and appear in UI
- **Project Deletion**: Removal updates both registry and local config files
- **Template Operations**: Import/export maintains project data integrity

### Integration Verification
- CLI operations use `ProjectService` methods without duplication
- Generated TOML files match existing project registry format
- Error handling follows existing CLI patterns from config-cli.ts
- TypeScript compilation succeeds for both development and production builds

## 7. Deployment

### Simple Deployment
- Single file addition: `shared/tools/project-cli.ts`
- Package.json script updates for CLI access
- Build process includes new tool in shared compilation

### Rollback Strategy
- Remove `cli:project` scripts from package.json
- Delete `shared/tools/project-cli.ts` if issues arise
- No impact on existing functionality or configuration

### Configuration Requirements
- No additional dependencies required
- Uses existing shared dependencies (toml, fs, path)
- Leverages existing DEFAULT_PATHS and constants

### Documentation Updates
- Update README.md with CLI project management examples
- Add to CLAUDE.md development commands section
- Include in API documentation for external tool integration