---
code: MDT-020
title: Configuration Management Improvements and Add Project UI
status: Implemented
dateCreated: 2025-09-06T18:00:18.457Z
type: Feature Enhancement
priority: Medium
phaseEpic: Configuration & UX
---

# Configuration Management Improvements and Add Project UI

## 1. Description

### Problem Statement
Currently configuration management is fragmented across different locations:
- **MCP Server**: `~/.mcp-server.toml`
- **Web Application**: `~/.config/markdown-ticket/projects/*`

This creates inconsistency and confusion. Additionally, there's no user-friendly way to add new projects - users must manually create configuration files.

**Status Check**: MCP server config IS in use by:
- `mcp-server/src/config/index.ts` (reads `~/.mcp-server.toml`)
- `docs/MCP_SERVER_GUIDE.md` (documents the path)

### Current State
- MCP configuration scattered in `~/.mcp-server.toml`
- Project configs in `~/.config/markdown-ticket/projects/*`
- No UI for project creation - manual file editing required
- Inconsistent configuration management approach

### Desired State
- Unified configuration under `~/.config/markdown-ticket/`
- MCP config moved to `~/.config/markdown-ticket/mcp-server.toml`
- User-friendly "Add Project" UI with form validation
- Hamburger menu for easy access to project management
- Automated project config file creation

### Rationale
Currently configuration is scattered across different locations (~/.mcp-server.toml vs ~/.config/markdown-ticket/projects/*). Need unified configuration management and user-friendly project creation interface.

### Impact Areas
- Configuration Management
- User Interface
- MCP Integration
- Project Management

## 2. Solution Analysis

### 2.1 Configuration Consolidation
**Move MCP configuration** from `~/.mcp-server.toml` to `~/.config/markdown-ticket/mcp-server.toml`

**Update affected components:**
- `mcp-server/src/config/index.ts` - update config path resolution
- `docs/MCP_SERVER_GUIDE.md` - update documentation
- `README.md` - update setup instructions

### 2.2 Add Project UI Components
**Hamburger menu** in top-right corner with "Add Project" option

**Project creation form** with fields:
- Project name (required)
- Project code (auto-generated from name)
- Project path (directory picker/input, required)
- Description (optional)
- Repository URL (optional)

**Form validation:**
- Project path must exist and contain markdown files
- Auto-detect if `.mdt-config.toml` exists in path
- Prevent duplicate project codes

### 2.3 Backend API Requirements
```
POST /api/projects/create
- Validates project data
- Creates project config file in ~/.config/markdown-ticket/projects/
- Returns created project info

GET /api/system/directories
- Lists available directories for project path selection
```

## 3. Implementation Specification
## 3. Implementation Plan

### Phase 1: Configuration Consolidation
1. Update MCP server config path resolution in `mcp-server/src/config/index.ts`
2. Update documentation (`README.md`, `MCP_SERVER_GUIDE.md`)
3. Add migration notes for existing users

### Phase 2: Add Project UI
1. Create hamburger menu component in top-right corner
2. Implement AddProjectModal with form validation
3. Add backend API endpoints for project creation
4. Add directory picker functionality
5. Integrate with existing project discovery system

## 4. Acceptance Criteria

### Configuration Consolidation
- [ ] MCP server reads from `~/.config/markdown-ticket/mcp-server.toml`
- [ ] Documentation updated with new paths
- [ ] Migration guide provided for existing users

### Add Project UI
- [ ] Hamburger menu appears in top-right corner
- [ ] "Add Project" menu item opens project creation modal
- [ ] Project form validates all required fields
- [ ] Directory picker allows browsing for project paths
- [ ] Form creates proper project config file in `~/.config/markdown-ticket/projects/`
- [ ] Project list refreshes after successful creation
- [ ] Error handling for invalid paths or duplicate projects

## 5. Implementation Notes

### Breaking Changes
**MCP Configuration**: Existing users will need to move their config file from `~/.mcp-server.toml` to `~/.config/markdown-ticket/mcp-server.toml`

**Migration Strategy**: Provide clear migration instructions and consider auto-migration script.

### Technical Details
**MCP Config Path Update:**
```typescript
// OLD path resolution
const configPaths = [
  path.join(os.homedir(), '.mcp-server.toml')
]

// NEW path resolution
const configPaths = [
  path.join(os.homedir(), '.config', 'markdown-ticket', 'mcp-server.toml')
]
```

**React Components Needed:**
- HamburgerMenu (dropdown menu)
- AddProjectModal (form modal)
- ProjectForm (form with validation)
- DirectoryPicker (directory selection)

## 6. References

- Current MCP config: `mcp-server/src/config/index.ts`
- MCP documentation: `docs/MCP_SERVER_GUIDE.md`
- Project discovery: `server/projectDiscovery.js`
