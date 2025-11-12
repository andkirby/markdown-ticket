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

### Problem Statement
The markdown-ticket system lacks a standardized way to configure project discovery paths and link settings across different deployment environments (development, Docker, production). Currently configuration is hardcoded or requires manual file editing.

### Current State
- Global configuration mixed with dashboard settings in `shared/services/ProjectService.ts`
- Discovery paths hardcoded as empty arrays or manual file edits required
- No unified CLI tool for managing configuration
- Dashboard configuration included but unused

### Desired State
- Clean configuration interface focused only on discovery and link settings
- CLI tool for managing configuration via npm script
- Support for different environments through simple commands
- Consistent TOML configuration format

### Impact Areas
- Shared configuration system (`shared/services/ProjectService.ts`)
- Docker deployment configurations
- Development environment setup
- MCP server and backend service initialization

## 2. Decision Rationale

### Why necessary
- Removes unused dashboard configuration that adds complexity
- Provides developer-friendly CLI for configuration management
- Enables automated configuration in CI/CD and Docker environments
- Standardizes configuration approach across all deployment scenarios

### What it accomplishes
- Simplified configuration model focused on discovery and links
- Consistent configuration management through CLI commands
- Better separation of concerns by removing dashboard-specific settings
- Improved developer experience for project setup

### Project alignment
Aligns with the goal of making markdown-ticket more maintainable and easier to configure across different environments.

## 3. Solution Analysis

#### Approach A: CLI Tool with TOML Management (Chosen)
**Description**: Implement a TypeScript CLI tool in `shared/tools/config-cli.ts` that reads/writes TOML configuration files.

**Pros**:
- Type-safe configuration management
- Leverages existing TOML library dependency
- Consistent with project's TypeScript stack
- Can handle nested configuration with dot notation
- Supports multiple operations (get, set, show, init)

**Cons**:
- Requires building TypeScript before use
- Additional code to maintain

#### Approach B: Environment Variable Override
**Description**: Override configuration through environment variables that supersede TOML file values.

**Pros**:
- No additional tooling required
- Works well with Docker containers
- Simple configuration injection

**Cons**:
- Less discoverable for developers
- Limited runtime configuration changes
- More complex fallback logic in ProjectService
- Environment variable proliferation

#### Approach C: JSON Schema-based Configuration
**Description**: Replace TOML with JSON schema validation and JSON configuration files.

**Pros**:
- Better validation support
- More standard format
- Easier schema evolution

**Cons**:
- Requires breaking change from TOML
- More verbose configuration format
- Losing TOML's comment support

### Decision Factors
- Developer experience and discoverability
- Integration with existing TOML-based configuration
- Support for different deployment environments
- Maintenance overhead and code complexity
- Backward compatibility requirements

### Justification
Approach A is chosen because it maintains the existing TOML configuration while providing a developer-friendly interface. The CLI tool integrates naturally with npm scripts and can handle the complex dot notation for nested configuration access. It provides the best balance of functionality, maintainability, and developer experience.

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
- [ ] CLI tool parses dot notation keys correctly (e.g., `discovery.searchPaths`)
- [ ] CLI tool sets boolean values for link configuration
- [ ] CLI tool handles array values with comma separation
- [ ] Configuration tool creates config directory if missing
- [ ] CLI tool preserves existing configuration when updating specific keys
- [ ] Root npm script `npm run config` executes CLI tool correctly

### Non-Functional
- Reliability: CLI handles missing config directory gracefully
- Maintainability: Configuration changes respect GlobalConfig interface
- Security: CLI validates input values against expected types
- Performance: Configuration operations complete within 100ms

### Testing
- Unit: CLI parser handles dot notation with valid/invalid keys
- Unit: TOML serialization maintains proper formatting and comments
- Integration: Configuration changes reflected in ProjectService after restart
- Manual: Developer can set discovery paths and verify auto-discovery works

### Additional Implementation Details

**Enhanced CLI Feedback:**
- ✅ Configuration commands now display the exact file path that was modified
- ✅ Visual indicators (✅, ℹ️) for clear status communication
- ✅ Structured output showing file, key, and value information
- ✅ Consistent behavior on empty files (creates full config with defaults + update)

**Example CLI Output:**
```
✅ Configuration updated successfully
   File: /Users/kirby/.config/markdown-ticket/config.toml
   Key: discovery.searchPaths = /Users/kirby/home
```

### Production Compatibility Fix

**Production Environment Support:**
- ✅ CLI commands now use compiled JavaScript instead of tsx
- ✅ Works with `npm ci --omit=dev` (no devDependencies required)
- ✅ Compatible with Docker, Kubernetes, and production deployments
- ✅ Added separate development scripts for faster iteration using tsx

**Production Commands (compiled JS):**
```bash
npm run config:init          # Creates default config file
npm run config:set key value # Updates configuration values
npm run config:show          # Displays current configuration
npm run config:get key       # Gets specific configuration value
```

**Development Commands (tsx for faster iteration):**
```bash
npm run config:init:dev          # Development version with tsx
npm run config:set:dev key value # Development version with tsx
npm run config:show:dev          # Development version with tsx
npm run config:get:dev key       # Development version with tsx
```

**Technical Implementation:**
- Production scripts use: `node shared/dist/tools/config-cli.js`
- Development scripts use: `tsx shared/tools/config-cli.ts`
- Compiled JavaScript file: 18KB, fully standalone
- Type-safe compilation with runtime error handling

### Advanced Configuration Management Features

**Centralized Environment Variable Support:**
- ✅ CONFIG_DIR environment variable support in shared/utils/constants.ts
- ✅ Automatic directory creation with recursive mkdir
- ✅ Robust fallback logic for permission issues (4-level fallback chain)
- ✅ Write test verification before using configuration directory
- ✅ Clear console warnings for fallback scenarios

**Fallback Logic Priority:**
1. CONFIG_DIR environment variable (if provided and writable)
2. Default ~/.config/markdown-ticket (fallback if CONFIG_DIR fails)
3. Temp directory /tmp/markdown-ticket (if default fails)
4. Current directory ./mdt-config (ultimate fallback)

**Eliminated Hardcoded Paths:**
- ✅ All .config/markdown-ticket paths replaced with DEFAULT_PATHS constants
- ✅ Server/services/ProjectService.ts uses centralized constants
- ✅ Server/fileWatcherService.ts uses centralized constants
- ✅ MCP server components use centralized constants
- ✅ Removed scattered CONFIG_PATH environment variable checks

**Production-Ready Architecture:**
```bash
# Custom config directory (auto-created)
CONFIG_DIR=/app/config npm run config:init

# Production with robust fallbacks
docker run -e CONFIG_DIR=/docker-data/config my-app
# Falls back gracefully if directory not writable
```
## 6. Success Metrics

**Qualitative improvements**:
- Reduced configuration setup time for new developers
- Fewer manual file edits required for project configuration
- Consistent configuration approach across environments
- Better error messages for configuration issues

## 7. Deployment Strategy

**Simple deployment**:
1. Update GlobalConfig interface and remove dashboard defaults
2. Implement CLI tool in shared package
3. Add root npm script for CLI access
4. Update existing config files during next build cycle
5. No service restarts required for existing configurations

**Rollback plan**: Revert to previous GlobalConfig interface and default values. Existing configurations remain functional due to backward compatibility in TOML parsing.