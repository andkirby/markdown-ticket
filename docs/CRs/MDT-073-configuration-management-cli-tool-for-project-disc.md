---
code: MDT-073
status: Implemented
dateCreated: 2025-11-11T20:18:21.594Z
type: Architecture
priority: Medium
assignee: Backend Team
---

# Configuration Management CLI Tool for Project Discovery

## 1. Description
### Problem
- Configuration scattered across multiple files without unified management interface
- Hardcoded discovery paths in `shared/services/ProjectService.ts` requiring manual file edits
- Dashboard configuration mixed with core configuration adding unused complexity
- No standardized CLI tool for managing configuration across deployment environments

### Affected Artifacts
- `shared/services/ProjectService.ts` (contains hardcoded paths and mixed dashboard settings)
- `shared/utils/constants.ts` (needs centralized path management)
- `server/services/ProjectService.ts` (uses hardcoded configuration paths)
- `mcp-server/src/config/config.ts` (requires centralized configuration constants)
- Root `package.json` (needs CLI script integration)

### Scope
**Changes**:
- Create TypeScript CLI tool for configuration management
- Remove dashboard configuration from GlobalConfig interface
- Centralize configuration paths with environment variable support
- Add npm scripts for configuration operations

**Unchanged**:
- Existing TOML configuration file format and location
- Core project discovery and management functionality
- MCP server tool implementations
## 2. Decision Rationale
### Chosen Approach
Implement TypeScript CLI tool with centralized configuration management and environment variable support.

### Rationale
- Provides type-safe configuration management with existing TOML library dependency
- Eliminates hardcoded paths through centralized constants with fallback logic
- Enables automated configuration in CI/CD and Docker environments
- Maintains backward compatibility while improving developer experience
- Supports production deployments with compiled JavaScript and development iteration with tsx

## 3. Artifact Specifications
### New Artifacts

| Artifact | Type | Purpose |
|----------|------|---------|
| `shared/tools/config-cli.ts` | CLI Tool | Configuration management with dot notation |
| `shared/utils/constants.ts` | Constants | Centralized configuration paths with fallback logic |
| `shared/dist/tools/config-cli.js` | Compiled CLI | Production deployment without TypeScript dependencies |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `shared/services/ProjectService.ts` | Method updated | Remove dashboard section, use centralized constants |
| `server/services/ProjectService.ts` | Import change | Use centralized configuration paths |
| `mcp-server/src/config/config.ts` | Import change | Use centralized configuration paths |
| `package.json` | Script added | Add config CLI commands |

### Integration Points

| From | To | Interface |
|------|----|-----------|
| CLI Tool | TOML Configuration | Read/write operations with validation |
| Constants | All Services | DEFAULT_PATHS with fallback logic |
| Environment | CLI Tool | CONFIG_DIR variable support |

### Key Patterns
- Configuration management: CLI tool with TypeScript compilation for production
- Fallback pattern: 4-level directory fallback chain with graceful degradation
- Environment pattern: CONFIG_DIR support with automatic directory creation
## 4. Implementation Specification

### Components

#### Configuration CLI Tool (`shared/tools/config-cli.ts`)
- Command parser for operations: get, set, show, init
- Dot notation parser for nested keys (e.g., `discovery.searchPaths`)
- TOML file reading and writing with error handling
- Array value parsing with comma separation
- Configuration validation against GlobalConfig interface

#### Updated Configuration Interface
- Remove dashboard section from GlobalConfig interface
- Add links section with boolean configuration flags
- Update default values in getGlobalConfig() method
- Maintain backward compatibility with existing config files

#### Integration Points
- Root package.json script for npm integration
- ProjectService unchanged behavior for existing users
- CLI tool built as part of shared package compilation
- Configuration file location unchanged (`~/.config/markdown-ticket/config.toml`)

### Technology Choices
- TypeScript for type safety and integration
- Existing `toml` library for parsing/serialization
- Node.js CLI patterns for argument parsing
- Error handling with user-friendly messages

## 5. Acceptance Criteria
### Functional
- [x] CLI tool parses dot notation keys correctly (e.g., `discovery.searchPaths`)
- [x] CLI tool sets boolean values for link configuration
- [x] CLI tool handles array values with comma separation
- [x] Configuration tool creates config directory if missing
- [x] CLI tool preserves existing configuration when updating specific keys
- [x] Root npm script executes CLI tool correctly
- [x] CONFIG_DIR environment variable changes configuration directory
- [x] Fallback logic works when primary directory not writable

### Non-Functional
- [x] Configuration operations complete within 100ms
- [x] CLI handles missing config directory gracefully
- [x] Production deployment works with compiled JavaScript (17.995KB standalone)
- [x] TypeScript compilation succeeds without errors
- [x] TOML serialization maintains proper formatting and comments

### Testing
- [x] Unit: CLI parser handles valid/invalid dot notation keys
- [x] Unit: TOML read/write operations preserve data integrity
- [x] Integration: Configuration changes reflected in ProjectService after restart
- [x] Integration: Environment variable overrides default paths correctly
- [x] Manual: Developer can set discovery paths and verify auto-discovery works
## 6. Success Metrics
### Functional Verification
- ✅ Configuration CLI tool exists and executes all operations (get, set, show, init)
- ✅ Centralized constants in `shared/utils/constants.ts` used across all services
- ✅ Dashboard configuration removed from GlobalConfig interface
- ✅ CONFIG_DIR environment variable support functional

### Production Readiness
- ✅ Compiled CLI tool works without TypeScript dependencies (17.995KB)
- ✅ Docker deployment with custom configuration directories functional
- ✅ 4-level fallback chain works in permission-restricted environments
## 7. Deployment Strategy
## Production (compiled JavaScript)
```
npm run config:init
npm run config:set key value
npm run config:show
npm run config:get key
```
## Development (TypeScript with tsx for faster iteration)
```
npm run config:init:dev
npm run config:set:dev key value
npm run config:show:dev
npm run config:get:dev key
```
