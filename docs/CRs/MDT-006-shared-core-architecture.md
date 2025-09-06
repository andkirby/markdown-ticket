---
code: MDT-006
title: Create Shared Core Architecture to Eliminate Code Duplication
status: Proposed
dateCreated: 2025-09-04T00:00:00.000Z
type: Architecture
priority: Medium
phaseEpic: Phase A (Foundation)
lastModified: 2025-09-04T12:34:56.618Z
---

# Create Shared Core Architecture to Eliminate Code Duplication

## 1. Description

### Problem Statement
The system currently has significant code duplication between the main web application (`server/`) and the MCP server (`mcp-server/`). Both systems implement similar functionality for:
- Project discovery and configuration parsing
- Markdown file parsing with YAML frontmatter
- File operations for ticket/CR management
- Data model handling

This duplication creates maintenance burden, consistency risks, and violates DRY principles.

### Current State
- **Main App (`server/`)**: Express.js backend with project discovery, markdown parsing, and REST API
- **MCP Server (`mcp-server/`)**: TypeScript-based MCP tools with separate but similar project discovery and parsing logic
- **Duplication**: `projectDiscovery.js` vs `projectDiscovery.ts`, markdown parsing logic, file operations
- **Inconsistency Risk**: Changes must be manually synchronized between systems

### Desired State
A shared core module that provides:
- Unified project discovery and configuration management
- Consistent markdown parsing and frontmatter handling
- Common data models and business logic
- Single source of truth for file operations
- Facade pattern for different interfaces (HTTP REST, MCP protocol)

### Rationale
- **Maintainability**: Fix bugs and add features in one place
- **Consistency**: Ensure both systems handle data identically
- **Extensibility**: Easy to add new interfaces (GraphQL, gRPC, etc.)
- **Testing**: Test business logic independently of interface layers
- **Code Quality**: Eliminate duplication and improve organization

### Impact Areas
- Main web application backend
- MCP server implementation
- Build and deployment processes
- Testing strategy
- Future interface development

## 2. Solution Analysis

### Approaches Considered

#### Option 1: Shared NPM Package
- **Pros**: Clean separation, versioning, independent deployment
- **Cons**: Additional complexity, package management overhead
- **Use Case**: If core will be used by external projects

#### Option 2: Local Shared Module
- **Pros**: Simple, no external dependencies, easy development
- **Cons**: Tightly coupled to this project
- **Use Case**: Core only used within this project

#### Option 3: Monorepo with Workspaces
- **Pros**: Professional structure, good tooling support
- **Cons**: Significant restructuring required
- **Use Case**: Large-scale projects with multiple packages

### Trade-offs Analysis
- **Complexity vs Benefits**: Local shared module offers best balance
- **Migration Risk**: Incremental refactoring reduces risk
- **Development Experience**: Shared module maintains current workflow

### Decision Factors
1. **Scope**: Core will only be used within this project
2. **Simplicity**: Avoid over-engineering for current needs
3. **Migration**: Minimize disruption to existing systems
4. **Team Size**: Single developer, complex packaging unnecessary

### Chosen Approach
**Local Shared Module** - Create `core/` directory with shared business logic, imported by both facade systems.

### Rejected Alternatives
- **NPM Package**: Overkill for single-project use
- **Monorepo**: Too much restructuring for current benefits

## 3. Implementation Specification

### Core Module Structure
```
core/
├── index.js                 # Main exports
├── models/
│   ├── ticket.js           # Unified ticket/CR data model
│   └── project.js          # Project configuration model
├── services/
│   ├── projectDiscovery.js # Unified project scanning
│   ├── fileService.js      # File operations (read/write/delete)
│   └── configService.js    # Configuration management
├── parsers/
│   ├── markdownParser.js   # YAML frontmatter + content parsing
│   └── configParser.js     # TOML configuration parsing
└── utils/
    ├── fileUtils.js        # Common file utilities
    └── validation.js       # Data validation helpers
```

### Facade Layer Changes

#### Main App (`server/`)
- Import core modules instead of implementing logic
- Keep HTTP-specific middleware and routing
- Transform core responses to REST API format
- Maintain existing endpoints and contracts

#### MCP Server (`mcp-server/`)
- Replace duplicated services with core imports
- Keep MCP protocol-specific tool definitions
- Transform core responses to MCP tool format
- Maintain existing tool interfaces

### API Changes
- **No breaking changes** to external APIs
- Internal refactoring only
- Both facades maintain current interfaces

### Configuration
- Core uses existing `.mdt-config.toml` format
- No changes to project configuration structure
- Both systems continue using same config files

## 4. Acceptance Criteria

- [ ] Core module provides unified project discovery
- [ ] Core module handles markdown parsing consistently
- [ ] Core module manages file operations reliably
- [ ] Main web app uses core without breaking existing functionality
- [ ] MCP server uses core without breaking existing tools
- [ ] All existing tests pass after refactoring
- [ ] No duplication of business logic between systems
- [ ] Both systems can be developed and tested independently
- [ ] Performance is maintained or improved
- [ ] Code coverage maintained or improved
- [ ] Documentation updated to reflect new architecture

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References

### Related CRs
- MDT-003: UI sync bug (revealed parsing inconsistencies)
- MDT-004: MCP server implementation (created duplication)

### Code Areas Affected
- `server/projectDiscovery.js` → `core/services/projectDiscovery.js`
- `server/server.js` (parsing logic) → `core/parsers/markdownParser.js`
- `mcp-server/src/services/projectDiscovery.ts` → use `core/services/projectDiscovery.js`
- `mcp-server/src/services/crService.ts` (parsing logic) → use `core/parsers/markdownParser.js`

### Documentation
- Architecture documentation update needed
- Developer onboarding guide update
- API documentation (internal core APIs)