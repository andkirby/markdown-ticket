---
code: MDT-028
title: MCP configuration changes
status: Implemented
dateCreated: 2025-09-08T12:56:51.581Z
type: Feature Enhancement
priority: Medium
dependsOn: MDT-006
---




# MCP configuration changes

## 1. Description
### Problem Statement
The MCP server needs enhanced configuration management to support dual project discovery approaches: global registry and legacy scanPaths. Current configuration is hardcoded and lacks flexibility for different deployment scenarios.

### Current State
- MCP server uses hardcoded configuration values
- Single project discovery method via scanPaths
- No centralized configuration file support
- Limited environment variable support

### Desired State
- Flexible configuration system with `config.toml` support
- Dual project discovery: global registry + legacy scanPaths
- Shared configuration types between frontend, backend, and MCP
- Environment variable overrides for deployment flexibility

### Rationale
Enable flexible MCP deployment scenarios while maintaining backward compatibility. The dual discovery approach supports both new centralized project management and existing direct scanning workflows.

**Note**: Original `activeMcp` flag requirement is postponed as out of scope.
## 2. Solution Analysis
### Implemented Approach: Dual Discovery Configuration

**Configuration Structure**:
- `ServerConfig` interface in `shared/models/Config.ts`
- `DEFAULT_PATHS` constants in `shared/utils/constants.ts`
- Optional `config.toml` file support with environment variable overrides

**Dual Project Discovery**:
1. **Global Registry**: `~/.config/markdown-ticket/projects/*.toml` (new approach)
2. **Legacy ScanPaths**: Direct scanning for `*-config.toml` files (backward compatibility)

**Configuration Sources** (precedence order):
1. `config.toml` file (optional)
2. Environment variables (`MCP_LOG_LEVEL`, `MCP_CACHE_TIMEOUT`)
3. Hardcoded defaults

**Benefits**:
- Backward compatibility with existing scanPaths
- Centralized project management via registry
- Flexible deployment configuration
- Shared types eliminate duplication
## 3. Implementation Specification
### Key Files Modified

**Shared Configuration**:
- `shared/models/Config.ts` - `ServerConfig` interface
- `shared/utils/constants.ts` - `DEFAULT_PATHS` constants

**MCP Server**:
- `mcp-server/src/config/index.ts` - Configuration loading with TOML support
- `mcp-server/src/services/projectDiscovery.ts` - Dual discovery implementation
- `mcp-server/tsconfig.json` - Shared module imports

### Configuration Example
```toml
[server]
logLevel = "info"

[discovery]
scanPaths = ["/path/to/projects", "~/work"]
cacheTimeout = 300

[templates]
customPath = "~/.config/markdown-ticket/templates"
```

### Environment Variables
- `MCP_LOG_LEVEL` - Override log level
- `MCP_CACHE_TIMEOUT` - Override cache timeout
## 4. Acceptance Criteria
- [x] `ServerConfig` interface implemented in shared module
- [x] `DEFAULT_PATHS` constants centralized
- [x] MCP server loads configuration from optional `config.toml`
- [x] Environment variables override configuration values
- [x] Dual project discovery (registry + scanPaths) working
- [x] Backward compatibility with existing scanPaths maintained
- [x] Configuration validation with error reporting
- [x] TypeScript compilation with shared module imports
## 5. Implementation Notes
**Completed**: Configuration system implemented with dual discovery approach.

**Key Design Decisions**:
- Shared configuration types eliminate duplication between systems
- Optional `config.toml` maintains simplicity for basic deployments
- Environment variables enable container/deployment flexibility
- Dual discovery supports both new registry and legacy workflows

**Out of Scope**: 
- `activeMcp` flag postponed - not implemented in current design
- Per-project MCP activation deferred to future enhancement
## 6. References
### Dependencies
- **MDT-006**: Create Shared Core Architecture to Eliminate Code Duplication (must be completed first)