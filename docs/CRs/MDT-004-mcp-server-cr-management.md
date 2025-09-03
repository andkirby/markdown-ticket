- **Code**: MDT-004
- **Title/Summary**: MCP Server for Universal CR Management
- **Status**: Proposed
- **Date Created**: 2025-09-01
- **Type**: Architecture
- **Priority**: High
- **Phase/Epic**: Phase A (Foundation)

# MCP Server for Universal CR Management

## 1. Description

### Problem Statement
Currently, creating and managing Change Requests requires manual file operations and knowledge of project-specific configuration. LLMs and other tools cannot directly interact with the CR system, limiting automation and integration possibilities.

### Current State
- CRs are created manually using file operations
- Project configuration requires direct file system access
- No programmatic interface for CR management
- LLMs need detailed instructions for each CR operation
- Multi-project management requires separate tool instances

### Desired State
A Model Context Protocol (MCP) server that provides universal programmatic access to the CR management system, enabling any MCP-compatible LLM to create, read, update, and manage CRs across multiple projects seamlessly.

### Rationale
- **Universal Access**: Any MCP-compatible LLM can manage CRs without project-specific setup
- **Automation**: Enable automated CR creation from various sources (GitHub issues, commit messages, etc.)
- **Consistency**: Standardized interface ensures proper CR format and validation
- **Multi-Project Support**: Single server handles all projects with automatic discovery
- **Rich Integration**: LLMs can perform complex operations like finding related CRs and suggesting improvements

### Impact Areas
- New MCP server implementation (Node.js/TypeScript)
- Enhanced LLM integration capabilities
- Automated project discovery system
- CR template and validation engine
- Cross-project CR management workflow

## 2. Solution Analysis

### Approaches Considered

**MCP Server Approach**:
- Standards-based protocol for LLM tool integration
- Universal compatibility with MCP-capable LLMs
- Rich tool interface with complex operations
- Stateful server with project context awareness

**CLI Tool Approach**:
- Simple command-line interface
- Works with shell scripts and basic automation
- Limited to text-based interactions
- Requires separate LLM integration

**VS Code Extension Approach**:
- IDE-integrated CR management
- Rich UI for CR creation and editing
- Limited to VS Code environment
- Requires separate implementation for each IDE

**REST API Approach**:
- HTTP-based interface
- Broad compatibility with various clients
- Requires additional authentication and security layers
- More complex deployment and maintenance

### Trade-offs Analysis
| Approach | Pros | Cons |
|----------|------|------|
| MCP Server | Universal LLM access, rich operations, standardized | Newer protocol, requires MCP support |
| CLI Tool | Simple, universal shell access | Limited functionality, no rich integration |
| VS Code Extension | Rich UI, IDE integration | Platform-specific, limited scope |
| REST API | Broad compatibility, web-accessible | Security complexity, deployment overhead |

### Decision Factors
- **LLM Integration**: MCP provides the richest LLM integration capabilities
- **Standardization**: MCP is becoming the standard for LLM tool protocols
- **Future-Proofing**: MCP servers work across different LLM providers
- **Rich Operations**: Complex CR operations are possible with MCP tools
- **Development Velocity**: Faster than building custom integrations

### Chosen Approach
**MCP Server Implementation** using Node.js/TypeScript with comprehensive CR management tools and automatic project discovery.

### Rejected Alternatives
- **CLI Tool**: Too limited for complex CR operations and LLM integration
- **VS Code Extension**: Platform-specific and doesn't solve universal access
- **REST API**: Unnecessary complexity for LLM-focused use case

## 3. Implementation Specification

### Technical Requirements

**MCP Server Core**:
- Node.js/TypeScript implementation using @modelcontextprotocol/sdk
- Automatic project discovery via config file scanning
- Support for multiple concurrent projects
- Configuration validation and error handling

**MCP Tools to Implement**:
```typescript
// Project Management
list_projects(): Project[]
get_project_info(code: string): ProjectInfo

// CR Operations  
list_crs(project: string, filters?: CRFilters): CR[]
get_cr(project: string, crId: string): CR
create_cr(project: string, type: CRType, data: CRData): CR
update_cr_status(project: string, crId: string, status: Status): boolean
delete_cr(project: string, crId: string): boolean

// Template System
get_cr_template(type: CRType): Template
validate_cr_data(project: string, data: CRData): ValidationResult
get_next_cr_number(project: string): string

// Advanced Operations
find_related_crs(project: string, keywords: string[]): CR[]
suggest_cr_improvements(project: string, crId: string): Suggestion[]
```

**Project Discovery Engine**:
- Scan configurable paths for `.*-config.toml` files
- Parse and validate project configurations
- Cache project information for performance
- Watch for configuration changes and reload

**CR Template System**:
- Load templates based on CR type (Bug Fix, Feature Enhancement, etc.)
- Dynamic template population with project-specific data
- Validation against standardized CR format
- Support for custom template extensions

### API Changes
No changes to existing APIs - this is a new service that provides programmatic access to the file-based CR system.

### Database Changes
No database changes - continues using file-based storage with enhanced programmatic access.

### Configuration
```toml
# ~/.config/mcp-cr-server/config.toml
[server]
port = 8000
logLevel = "info"

[discovery]
scanPaths = ["~/", "~/projects", "~/work"]
excludePaths = ["node_modules", ".git", "vendor"]
maxDepth = 4
cacheTimeout = 300  # seconds

[templates]
customPath = "~/.config/mcp-cr-server/templates"
```

## 4. Acceptance Criteria

### Functional Requirements
- [ ] MCP server starts and registers with MCP-compatible LLMs
- [ ] Automatic discovery of all projects with `.*-config.toml` files
- [ ] LLMs can list all available projects through MCP interface
- [ ] CR creation works for all CR types (Bug Fix, Feature Enhancement, etc.)
- [ ] CR numbering and counter file management works correctly
- [ ] CR validation ensures proper format and required fields
- [ ] Status updates and CR lifecycle management functions properly
- [ ] Bug CR deletion works according to lifecycle rules
- [ ] Related CR discovery and suggestions work accurately
- [ ] Multi-project operations work without conflicts

### Non-Functional Requirements
- [ ] Server startup time < 2 seconds with 20+ projects
- [ ] CR operations complete in < 500ms for typical usage
- [ ] Project discovery handles up to 100 projects efficiently
- [ ] Memory usage remains stable under continuous operation
- [ ] Error handling provides clear feedback for all failure scenarios
- [ ] Configuration changes are detected and applied without restart
- [ ] Server remains responsive during large project scans

### Testing Requirements
- [ ] Unit tests for all MCP tool implementations
- [ ] Integration tests for project discovery and configuration loading
- [ ] E2E tests with actual MCP-compatible LLM clients
- [ ] Performance tests with large numbers of projects and CRs
- [ ] Error handling tests for corrupted configurations and missing files

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References

### Related Tasks
- Implement MCP server with @modelcontextprotocol/sdk
- Create project discovery and configuration management system
- Build CR template engine with validation
- Implement all MCP tools for CR operations
- Add comprehensive error handling and logging
- Create configuration management and caching system
- Develop related CR discovery algorithms
- Write comprehensive test suite
- Create deployment and configuration documentation

### Code Changes
- New MCP server package with TypeScript implementation
- Project discovery service with file system scanning
- CR template engine with dynamic population
- Configuration parser and validator
- MCP tool implementations for all CR operations
- Error handling and logging infrastructure
- Test suite with unit, integration, and E2E tests

### Documentation Updates
- MCP server installation and configuration guide
- LLM integration documentation
- Troubleshooting guide for common issues
- Update CLAUDE.md with MCP server usage instructions

### Related CRs
- MDT-001: Multi-Project CR Management Dashboard (foundation for UI)
- MDT-002: Push-Based File Watching Architecture (potential future integration)
- Future CR: CLI tool as alternative interface to MCP server