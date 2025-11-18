---
code: MDT-077
status: Implemented
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
- **Discovery during implementation**: Dual configuration system with inconsistent project creation logic
- **Critical issue**: CLI and Web UI use different code paths creating incompatible project configurations
- **Configuration validation gap**: CLI creates incomplete `.mdt-config.toml` files that fail validation
- **Data priority error**: Wrong merge logic prevents local config changes from taking effect

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

| Approach | Key Difference | Status |
|----------|---------------|--------|
| Interactive CLI prompts | User-friendly step-by-step project creation | Selected for primary create/edit workflow |
| Command-line arguments | All parameters passed as flags | Selected for automation and scripting |
| Configuration file templates | Project definitions from TOML/JSON files | **Rejected - no import/export needed** |
| Direct file manipulation | Manual editing of .toml files | Rejected - bypasses validation |
| MCP-only approach | Use existing MCP tools exclusively | Rejected - requires MCP server running |

### Selected Approach
Hybrid CLI tool with two operation modes:
1. **Interactive Mode**: Step-by-step prompts with validation
2. **Argument Mode**: All parameters via command-line flags

**Scope Clarification**: Import/export functionality is **explicitly removed**. Project creation/update exists only via CLI; web UI project management is not in scope for this ticket. Export to configuration files and template-based project creation are not required.

### Integration Architecture
- Reuse `ProjectService` from shared/services/ProjectService.ts
- Extend `ConfigManager` patterns from config-cli.ts
- Leverage `DEFAULT_PATHS` and constants from shared/utils/constants.ts
- Follow TOML serialization patterns from existing CLI tools

### **Post-Implementation Discovery: Three-Strategy Architecture Required**

**Updated Analysis**: Implementation revealed that the dual configuration system (CLI vs Web UI code paths) creates incompatible project configurations. A three-strategy architecture is required:

#### **Strategy 1: Global-Only Mode** (`--global-only` flag)
- **Global Config**: Complete project definition in `~/.config/markdown-ticket/projects/`
- **No Local Config**: Zero files in project directory
- **Use Case**: Centralized management, clean project directories

#### **Strategy 2: Project-First Mode** (default)
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **Global Config**: Minimal reference (path + metadata only)
- **Use Case**: Team-based development, portable projects

#### **Strategy 3: Auto-Discovery Mode**
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **No Global Config**: System auto-discovers from search paths
- **Use Case**: Development environments, ad-hoc projects

**Implementation Note**: Original single-path approach insufficient to handle discovered configuration system complexity.
## 4. Implementation Specification
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `shared/tools/project-cli.ts` | CLI Tool | Main project management interface |
| `shared/dist/tools/project-cli.js` | Compiled CLI | Production-ready command-line tool |
| `shared/tools/ProjectManager.ts` | Service Class | High-level project operations |
| `shared/tools/ProjectValidator.ts` | Validation Class | Project data validation |
| `docs/CLI_USAGE.md` | Documentation | Comprehensive CLI usage guide with examples |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `package.json` | Scripts added | Add `project:*` npm scripts (16 total) |
| `shared/services/ProjectService.ts` | Methods added | `updateProject()`, `deleteProject()`, `getProjectByCodeOrId()`, `generateProjectId()` |
| `shared/services/ProjectService.ts` | **Critical fix required** | `createOrUpdateLocalConfig()` creates incomplete configs - missing `path`, `startNumber`, `counterFile` |
| `shared/services/ProjectService.ts:254` | **Critical fix required** | Wrong data priority logic - should be local config first, then global fallback |
| `shared/models/Project.ts:67-76` | Validation gap | `validateProjectConfig()` rejects CLI-created incomplete configurations |
| `shared/utils/constants.js` | Constants added | CLI_ERROR_CODES for proper exit codes |
| `server/services/ProjectService.ts` | Reference implementation | Complete config creation template - should be used for CLI consistency |
| `shared/tools/project-cli.ts` | Enhancement needed | Add `--global-only` flag support for three-strategy architecture |
| `shared/tools/project-cli.ts` | Enhancement required | Add `--create-project-path` and `--tickets-path` flag parsing and validation |
| `shared/tools/ProjectValidator.ts` | Method addition | Add `validateTicketsPath()` method for relative path validation |
| `shared/tools/ProjectManager.ts` | Enhancement required | Modify `createProject()` to handle new path management flags |
| `shared/services/ProjectService.ts:createOrUpdateLocalConfig()` | Enhancement required | Add `ticketsPath` parameter with auto-creation logic |
| `server/services/ProjectService.ts:createProject()` | Consistency required | Ensure backend API supports same path management parameters |

### CLI Command Structure

```bash
npm run project:create -- \
  --name "Project Name" \
  --code "CODE" \
  --path "/path/to/project" \
  [--description "Description"] \
  [--create-project-path] \
  [--tickets-path "docs/CRs"]
npm run project:list [--format json|table]
npm run project:get <project-code> [--format json]
npm run project:update <project-code> --interactive
npm run project:delete <project-code> [--confirm]
npm run project:enable <project-code>
npm run project:disable <project-code>
```
**Note**: Use `--` separator to pass arguments to CLI tool (e.g., `npm run project:create -- --name "Test"`)

#### **New CLI Flags (Post-Implementation Specification)**

- **--create-project-path**: Enable automatic creation of project directory if it doesn't exist
- **--tickets-path**: Specify custom tickets directory path (relative to project root, default: "docs/CRs")

### **Post-Implementation Key Patterns Discovery**

#### **Configuration Priority Patterns**
1. **Administrative Metadata (Global Priority)**: `code`, `name`, `description` managed centrally
2. **Technical Settings (Local Priority)**: `path`, `startNumber`, `counterFile` managed per-project
3. **Validation Template**: All configurations must include required fields regardless of creation method
4. **Consistency Enforcement**: Single source of truth templates across CLI and Web UI

#### **Project Strategy Patterns**
1. **Global-Only Strategy**: Centralized control, minimal project footprint
2. **Project-First Strategy**: Team autonomy, portable configurations
3. **Auto-Discovery Strategy**: Development flexibility, zero configuration overhead
4. **Migration Support**: Seamless transitions between strategies

## 8. Post-Implementation Session (2025-11-16)

### Artifact Discoveries
- **ProjectValidator.ts**: Created centralized validation class with static methods for name, code, path, repository validation
- **Disable functionality**: Added `disableProject()` method to `ProjectManager.ts` for non-destructive project hiding
- **Enhanced ProjectService**: Extended with `getProjectByCodeOrId()`, `generateProjectId()` helpers

### Specification Corrections
- npm script naming: `project:*` prefix (12 scripts) instead of `cli:project:*`
- Code field persistence: Fixed registry TOML save/load operations
- Tilde expansion: Added `~/` path support in `ProjectValidator.validatePath()`
- Auto-generation: `generateCodeFromName()` helper for project code suggestions

### Integration Updates
- Auto-discovered projects: Extended `deleteProject()` to handle both project types
- Exit codes: 0/1/2/3/6 for automation support
- Validation layer: ProjectValidator integration between CLI and ProjectService


## 9. Post-Implementation Session (2025-11-17)

### UX Enhancements
- **Multi-choice prompts**: Color-coded options (red deletion, orange disable, green cancel)
- **File existence checking**: Real-time verification before deletion display
- **Warning message clarity**: "delete project profile" vs "delete all data"

### Visual Improvements  
- **ANSI color coding**: Red warnings, orange alternatives, green success
- **Strikethrough formatting**: Missing files show ~~path~~ in deletion list
- **Dynamic success feedback**: Only show actually deleted files with ~~path~~ ✅

### Compatibility Fixes
- **Unicode character**: Fixed ✓ → ✅ for better terminal rendering
- **Character encoding**: Resolved display issues across terminal environments

### Integration Updates
- **File system verification**: `fs.existsSync()` for real-time file checking
- **Visual feedback system**: Consistent ANSI escape codes throughout CLI
- **Disable workflow**: Integrated directly into delete confirmation flow

### Operation Modes

**Interactive Mode** (`--interactive` or default for create/update):
- Step-by-step prompts with real-time validation
- Auto-generates project codes from names
- Tilde-path expansion support (`~/` paths)
- Preview before confirmation

**Argument Mode** (flags provided):
- All parameters via command-line flags
- JSON output for automation
- Exit codes for scripting (0/1/2/3/6)

### Integration Points

| From | To | Interface |
|------|----|-----------|
| CLI Tool | ProjectService | `getAllProjects()`, `registerProject()`, `updateProject()`, `deleteProject()`, `getProjectByCodeOrId()` |
| CLI Tool | ProjectValidator | `validateProjectConfig()`, `validateName()`, `validateCode()`, `validatePath()` |
| CLI Tool | ConfigManager | TOML read/write operations |
| ProjectManager | ProjectService | Delegates with validation layer |
## 5. Acceptance Criteria
### Functional

- [ ] npm run project:create --interactive creates project with step-by-step prompts
- [ ] npm run project:create --name "Test" --code "TST" --path "/path/to/test" creates project non-interactively
- [ ] npm run project:list displays all projects in tabular format
- [ ] npm run project:list --format json outputs structured data
- [ ] npm run project:get <project-code> shows detailed project information
- [ ] npm run project:update <project-code> --interactive updates project with validation
- [ ] npm run project:delete <project-code> --confirm removes project after confirmation
- [ ] Delete operation offers disable alternative (orange background) for safer non-destructive option
- [ ] Delete confirmation requires project code (not yes/no) for better security
- [ ] All commands use shared/ ProjectService and maintain data consistency
- [ ] CLI supports both development (tsx) and production (node) execution
- [ ] Supports tilde expansion in project paths (~/home/user)
- [ ] Auto-generates project codes from project names
- [ ] Handles both registered and auto-discovered project operations

### **Post-Implementation Critical Requirements (Added 2025-11-18)**

- [ ] CLI project creation must produce complete `.mdt-config.toml` files with all required fields (`path`, `startNumber`, `counterFile`)
- [ ] CLI and Web UI must use identical configuration templates to ensure consistency
- [ ] Data priority must follow hybrid pattern: administrative metadata (global priority), technical settings (local priority)
- [ ] CLI must support `--global-only` flag for centralized project management strategy
- [ ] Configuration validation must accept all properly formed project configurations regardless of creation method
- [ ] API must return correct project names and codes for all projects, regardless of creation method

### **CLI Path Management Requirements (Added 2025-11-18)**

- [ ] System shall NOT create project paths automatically by default
- [ ] CLI shall show user-friendly error message when project path doesn't exist
- [ ] `--create-project-path` flag shall enable automatic project directory creation when explicitly requested
- [ ] `--tickets-path` flag shall accept only relative paths from project root
- [ ] `--tickets-path` shall default to "docs/CRs" when not specified
- [ ] System shall auto-create tickets directory when valid relative path provided
- [ ] CLI shall be a parameter wrapper calling core functionality in `shared/services/ProjectService.ts`
- [ ] Backend API shall use same core logic as CLI to ensure consistency


### Non-Functional
```
- [ ] Exit code 0 for success, 1 for errors, 2 for validation, 3 for not found, 6 for cancelled
- [ ] All operations complete within 2 seconds for single project actions
- [ ] Memory usage < 50MB for all CLI operations
- [ ] Error messages provide actionable guidance for resolution
```

### Completed Implementation (2025-11-18)
```
- [x] npm run project:disable <project-code> direct disable command
- [x] npm run project:enable <project-code> direct enable command
```
## 6. Verification

### By Feature
- **Project Creation**: `shared/tools/project-cli.ts` exists and creates valid project configurations
- **Project Listing**: CLI lists projects matching UI project manager output
- **Project Updates**: Modifications via CLI persist and appear in UI
- **Project Deletion**: Removal updates both registry and local config files
- **CLI Operations**: All CRUD commands use shared/ `ProjectService` without duplication

### Integration Verification
- CLI operations use `ProjectService` methods without duplication
- Generated project configurations match existing project registry format
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
- Created docs/CLI_USAGE.md with comprehensive usage guide and examples

## 10. Post-Implementation Session (2025-11-18)

### Future Implementation Completed
- **Enable command**: `npm run project:enable <project-code>` fully implemented with status validation and error handling
- **Disable command**: `npm run project:disable <project-code>` fully implemented with duplicate operation checking
- **Package.json scripts**: Added 4 new scripts (enable/disable + dev variants) bringing total to 16 project:* scripts

### Integration Enhancements
- **Direct command access**: Enable/disable now available as standalone commands, not just via delete workflow
- **Registered project validation**: Enhanced error handling distinguishes registered vs auto-discovered projects
- **Status consistency**: Commands check current project state to prevent redundant operations
- **CLI pattern compliance**: Follows established error handling and success messaging patterns

## 11. Post-Implementation Session (2025-11-18) - CLI Argument Parsing Fix

### Specification Corrections
- **npm script argument passing**: Fixed CLI argument parsing requiring `--` separator for npm script execution
- **Command usage examples**: Updated all examples to use proper `npm run project:create -- --name "Project"` format
- **Error handling enhancement**: Improved argument parsing with clearer error messages and usage instructions

### Artifact Discoveries
- **docs/CLI_USAGE.md**: Created comprehensive CLI usage documentation with detailed examples and troubleshooting
- **Enhanced argument parsing**: Updated `shared/tools/project-cli.ts` with robust flag and positional argument handling

### Integration Updates
- **npm compatibility**: Fixed npm script configuration to properly pass arguments to CLI tool
- **User experience**: Added clear usage instructions and error messages for incorrect argument formats
- **Development workflow**: Maintained compatibility with both production (node) and development (tsx) execution modes

## 12. Post-Implementation Session (2025-11-18) - Project Creation Architecture Discovery

### Critical Architectural Issues Discovered

#### **Multiple Project Creation Code Paths**
- **CLI Path**: `shared/tools/project-cli.ts` → `ProjectManager.ts` → `shared/services/ProjectService.createOrUpdateLocalConfig()`
- **Web UI Path**: `/api/projects/create` → `ProjectController` → `server/services/ProjectService.ts`
- **Impact**: CLI creates incomplete `.mdt-config.toml` files missing required fields (`path`, `startNumber`, `counterFile`)
- **Evidence**: `transcription-library` project shows as "Unknown Project" with empty code field in API responses

#### **Configuration Validation Gap**
- **Artifact**: `shared/models/Project.ts:67-76` (validateProjectConfig function)
- **Issue**: Requires `path`, `startNumber`, `counterFile` as mandatory fields but CLI doesn't create them
- **Result**: CLI-created projects fail validation, return `null` from `getProjectConfig()`
- **Affected Files**: All projects created via CLI after implementation

#### **Data Priority Logic Error**
- **Artifact**: `shared/services/ProjectService.ts:254` (getRegisteredProjects method)
- **Wrong Priority**: `projectData.project?.code || localConfig?.project?.code || ''`
- **Impact**: Local config changes ignored when global registry exists, preventing auto-discovery flexibility

### Proposed Three-Strategy Architecture

#### **Strategy 1: Global-Only Mode** (`--global-only` flag)
- **Global Config**: Complete project definition in `~/.config/markdown-ticket/projects/`
- **No Local Config**: Zero files in project directory
- **Use Case**: Centralized management, clean project directories

#### **Strategy 2: Project-First Mode** (default)
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **Global Config**: Minimal reference (path + metadata only)
- **Use Case**: Team-based development, portable projects

#### **Strategy 3: Auto-Discovery Mode**
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **No Global Config**: System auto-discovers from search paths
- **Use Case**: Development environments, ad-hoc projects

### Specification Corrections

#### **CLI Project Creation Logic Fix Required**
- **Current Method**: `createOrUpdateLocalConfig()` creates incomplete configs
- **Missing Fields**: `path`, `startNumber`, `counterFile` in CLI-generated local configs
- **Template Inconsistency**: CLI uses different defaults than Web UI method

#### **Merge Priority Strategy**
- **Global Priority**: `code`, `name`, `description` (administrative metadata)
- **Local Priority**: `path`, `startNumber`, `counterFile` (technical settings)
- **Benefit**: Enables auto-discovery while maintaining centralized control

### Integration Points Affected

| From | To | Interface | Issue |
|------|----|-----------|-------|
| CLI | shared/ProjectService | `createOrUpdateLocalConfig()` | Incomplete config creation |
| API | server/ProjectService | `createProject()` | Complete config creation |
| ProjectService | validateProjectConfig | Validation layer | Rejects CLI configs |
| getRegisteredProjects | getProjectConfig | Config merging | Wrong priority order |

### Artifacts Requiring Updates

#### **Critical Fixes Needed**
- `shared/services/ProjectService.ts:createOrUpdateLocalConfig()` - Add missing required fields
- `shared/services/ProjectService.ts:254` - Fix data priority logic
- `shared/tools/project-cli.ts` - Add `--global-only` flag support
- `server/services/ProjectService.ts` - Web UI reference implementation for CLI

#### **Configuration Templates**
- CLI method should use same template as Web UI with explicit defaults
- Template should include: `path = "docs/CRs"`, `startNumber = 1`, `counterFile = ".mdt-next"`

### Performance Impact
- **Current**: Incomplete configs cause validation failures and API errors
- **After Fix**: Consistent project creation across all methods
- **Measurement**: Projects should display correct names and codes in API responses

### Migration Strategy
- Fix existing incomplete `.mdt-config.toml` files with missing required fields
- Add validation to prevent future incomplete config creation
- Provide migration script for existing CLI-created projects

## 13. Post-Implementation Session (2025-11-18) - CLI Path Management & Architecture Specification

### Specification Corrections: CLI Path Management Requirements

#### **Project Path Validation Behavior**
- **Artifact Reference**: `shared/tools/project-cli.ts` (CLI argument parsing and validation)
- **Current Issue**: System auto-creates project paths (undesired behavior)
- **Required Implementation**: System shall NOT create project paths automatically, show user-friendly error if path doesn't exist
- **Impact**: Prevents users from accidentally using wrong paths, adds explicit control over directory creation

#### **--create-project-path Flag Addition**
- **Artifact Reference**: `shared/tools/ProjectManager.ts` (project creation logic)
- **Current Issue**: No flag for controlling project path auto-creation
- **Required Implementation**: Add `--create-project-path` boolean flag to enable project path auto-creation when explicitly requested
- **Impact**: Provides explicit control over directory creation behavior while preventing accidental path creation

#### **--tickets-path Flag with Validation**
- **Artifact Reference**: `shared/tools/ProjectValidator.ts` (path validation logic)
- **Current Issue**: Fixed tickets path "docs/CRs" with no customization
- **Required Implementation**: Add `--tickets-path` flag accepting relative paths only, default "docs/CRs", with auto-creation
- **Impact**: Allows flexible ticket directory configuration while maintaining consistency and preventing absolute path confusion

#### **CLI-Backend Separation of Concerns**
- **Artifact Reference**: `shared/tools/project-cli.ts` (CLI wrapper), `shared/services/ProjectService.ts` (core functionality)
- **Architectural Requirement**: CLI shall be a parameter wrapper that calls core functionality in shared services
- **Implementation Pattern**: Both CLI and backend API use same core logic from `ProjectService.ts`
- **Impact**: Eliminates code duplication, ensures consistency between CLI and API, maintains single source of truth

#### **Enhanced Path Validation Logic**
- **Artifact Reference**: `shared/services/ProjectService.ts:createOrUpdateLocalConfig()` (template creation)
- **Current Issue**: No distinction between project path validation and tickets path validation
- **Required Implementation**: Separate validation logic - project path must exist unless `--create-project-path`, tickets path auto-created if valid relative path
- **Impact**: Prevents configuration errors and provides clear user feedback for different path types

### Integration Updates

| From | To | Interface | Enhancement |
|------|----|-----------|-------------|
| CLI | ProjectValidator | `validateProjectPath()` | Add existence check with error unless `--create-project-path` |
| CLI | ProjectValidator | `validateTicketsPath()` | New method for relative path validation |
| CLI | ProjectService | `createOrUpdateLocalConfig()` | Add `ticketsPath` parameter with auto-creation |
| CLI | ProjectManager | `createProject()` | Enhanced parameter handling with new flags |

### Artifacts Requiring Updates

#### **CLI Command Structure Enhancement**
```bash
npm run project:create -- \
  --name "Project Name" \
  --code "CODE" \
  --path "/path/to/project" \
  [--description "Description"] \
  [--create-project-path] \
  [--tickets-path "docs/CRs"]
```

#### **Modified Components**
- `shared/tools/project-cli.ts` - Add new flag parsing and validation calls
- `shared/tools/ProjectValidator.ts` - Add `validateTicketsPath()` method
- `shared/tools/ProjectManager.ts` - Enhance `createProject()` with new parameters
- `shared/services/ProjectService.ts:createOrUpdateLocalConfig()` - Add `ticketsPath` parameter
- `server/services/ProjectService.ts:createProject()` - Ensure backend API supports same parameters