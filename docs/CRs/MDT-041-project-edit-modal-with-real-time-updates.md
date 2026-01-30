---
code: MDT-041
title: Project Edit Modal with Real-time Updates
status: Implemented
dateCreated: 2025-09-10T22:30:24.211Z
type: Feature Enhancement
priority: Medium
description: Implement functionality to edit existing projects through the UI with immediate reflection of changes. Users can modify project name, description, CRs path, and repository URL through a modal interface. Additionally, add pencil icon to Documents view for configuring document paths with preselected checkboxes.
rationale: Users need the ability to modify project metadata and document configuration without manually editing configuration files. The UI should immediately reflect changes after saving to provide seamless user experience.
assignee: Development Team
implementationDate: 2025-09-11T00:05:11.083Z
implementationNotes: Status changed to Implemented on 9/11/2025
---

# Project Edit Modal with Enhanced Configuration Management

## 1. Description

### Problem Statement
**Reference**: MDT-020 established project creation UI functionality. Current implementation lacks configuration management flexibility and advanced project management features available in CLI tools.

**Current UI Limitations**:
- Project creation/editing only supports Project-First strategy (local + global config)
- No option for Global-Only projects (global config only, clean project directories)
- Missing custom tickets path configuration (fixed "docs/CRs")
- No user control over project directory creation behavior
- Project path validation lacks tilde (`~`) expansion support
- Inconsistent feature set compared to CLI project management (MDT-077)

**CLI vs UI Gap Analysis** (Based on MDT-077):
1. **Configuration Strategy Options**: CLI supports three strategies (Global-Only, Project-First, Auto-Discovery), UI only supports Project-First
2. **Project Path Control**: CLI has `--create-project-path` flag for explicit directory creation control, UI auto-creates paths
3. **Custom Tickets Path**: CLI supports `--tickets-path` flag, UI has fixed "docs/CRs" path
4. **Path Expansion**: CLI supports tilde expansion (`~/` paths), UI lacks this capability
5. **Project Code Management**: Both auto-generate codes, but UI correctly makes code read-only in edit forms

### Affected Artifacts
- `src/components/AddProjectModal.tsx` - Project creation form (needs strategy options)
- `src/components/EditProjectModal.tsx` - Project editing form (needs to be created)
- `server/services/ProjectService.ts` - Backend project management (needs strategy support)
- `shared/services/ProjectService.ts` - Shared project logic (reference implementation)
- `src/components/ProjectManager.tsx` - Project list management (needs strategy indicators)

### Scope
**Changes**:
- Add project configuration strategy selection to creation/editing UI
- Implement Global-Only project support in UI
- Add custom tickets path configuration option
- Add project directory creation control option
- Implement tilde expansion in path validation
- Create project editing modal with proper field controls

**Unchanged**: Core project data structures, existing project configurations

## 2. Solution Analysis

### Three-Strategy Configuration Architecture (Based on MDT-077)

#### **Strategy 1: Global-Only Mode**
- **Global Config**: Complete project definition in `~/.config/markdown-ticket/projects/`
- **No Local Config**: Zero files in project directory
- **UI Requirements**: Add "Global-Only" checkbox in project creation/editing forms
- **Use Case**: Centralized management, clean project directories

#### **Strategy 2: Project-First Mode** (Default Current Behavior)
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **Global Config**: Minimal reference (path + metadata only)
- **UI Requirements**: Default behavior, maintain existing functionality
- **Use Case**: Team-based development, portable projects

#### **Strategy 3: Auto-Discovery Mode**
- **Local Config**: Complete definition in `project/.mdt-config.toml`
- **No Global Config**: System auto-discovers from search paths
- **UI Requirements**: "Skip global registration" option in creation form
- **Use Case**: Development environments, ad-hoc projects

### Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|---------------|--------------|
| **Chosen Approach** | Implement three-strategy UI with advanced path management | **ACCEPTED** - Aligns with CLI functionality, provides user flexibility |
| Minimal Edit Only | Add basic edit modal without strategy options | Insufficient - doesn't address CLI vs UI gaps |
| Backend-Only Changes | Handle strategies in backend, keep UI simple | UI needs to expose strategy options to users |
| Separate Tools | Maintain different functionality for CLI vs UI | Creates inconsistency, poor user experience |

### Technical Approach
- Add configuration strategy selection UI components (radio buttons or dropdown)
- Implement conditional form fields based on strategy selection
- Add tilde expansion support in path validation (shared with CLI)
- Add project directory creation control checkbox
- Add custom tickets path configuration field
- Create comprehensive edit modal with proper field controls (code and path read-only)

## 3. Implementation Specification
### New Artifacts
| Artifact | Type | Purpose |
|----------|------|---------|
| Project edit modal | React Component | Project editing functionality |
| Enhanced project creation form | React Component | Configuration strategy selection |
| Project update API endpoints | Backend API | Project modification support |
| Directory validation service | Backend Service | Path existence checking with security |

### Modified Artifacts
| Artifact | Change Type | Purpose |
|----------|-------------|---------|
| AddProjectModal | Enhancement | Strategy selection and path management |
| ProjectService | Enhancement | Multi-strategy project support |
| ProjectManager | Enhancement | Edit functionality and strategy indicators |
| Project API routes | Enhancement | Update endpoints and validation |

### Required API Endpoints
```
PUT /api/projects/:id - Update project configuration
POST /api/filesystem/exists - Validate directory existence
```

### Core Requirements
- Support three configuration strategies (Global-Only, Project-First, Auto-Discovery)
- Project editing with immutable fields (code, path, strategy)
- Real-time path validation with security controls
- Cross-browser folder selection capability
- CLI vs UI configuration parity

### Security Requirements
- Path traversal protection for file system access
- Input validation and sanitization
- Allowed paths whitelist for directory operations
## 4. Acceptance Criteria
### Functional - Project Creation
- [ ] Users can create projects with three configuration strategies (Global-Only, Project-First, Auto-Discovery)
- [ ] Form supports project path validation with tilde expansion
- [ ] Users can control automatic directory creation
- [ ] Users can specify custom tickets paths
- [ ] Configuration files created correctly for each strategy
- [ ] Form validation provides clear error messages

### Functional - Project Editing
- [ ] Edit modal accessible from project management interface
- [ ] Edit form displays current project configuration
- [ ] Immutable fields (code, path, strategy) are read-only
- [ ] Editable fields update both local and global configurations
- [ ] Changes reflect immediately across the application

### Functional - CLI vs UI Parity
- [ ] UI and CLI support identical configuration strategies
- [ ] UI and CLI produce equivalent configuration files
- [ ] Path handling consistent between UI and CLI
- [ ] Projects created via either method work in both interfaces

### Non-Functional
- [ ] Performance: Project operations complete within 100ms
- [ ] Compatibility: Cross-browser support for folder selection
- [ ] Accessibility: Screen reader and keyboard navigation support
- [ ] Security: Path traversal protection for file system access
- [ ] Responsive design: Works on mobile, tablet, and desktop
- [ ] Backward compatibility: Existing projects continue to work

### Integration Testing
- [ ] Projects created with each strategy integrate correctly with CLI tools
- [ ] API endpoints handle invalid inputs appropriately
- [ ] Real-time updates propagate across connected clients
- [ ] Configuration files validate correctly when switching between tools
## 5. Implementation Notes
### Architectural Constraints
- Configuration strategy is immutable after project creation
- Project code and path are immutable to prevent breaking references
- Shared services must align between CLI and UI implementations
- Path validation requires security controls for file system access

### Key Requirements
- Support three configuration strategies as defined in MDT-077
- Maintain backward compatibility with existing Project-First projects
- Ensure CLI and UI produce identical configuration files
- Provide real-time validation feedback for user inputs
- Support tilde expansion for home directory paths

### Integration Points
- Backend APIs: Project creation, editing, and directory validation
- Frontend components: Enhanced modals with strategy selection
- Security: Path traversal protection and input validation
- Cross-browser compatibility for folder selection

### Migration Considerations
- Existing projects maintain current Project-First configuration
- Enhanced forms display existing projects correctly
- Configuration updates handle migration seamlessly
## 6. References
### Related Project Tickets
- **MDT-020**: Configuration Management Improvements and Add Project UI - Project creation functionality foundation
- **MDT-077**: CLI Project Management Tool - Three-strategy architecture definition and advanced project management features

### Key Dependencies
- `shared/services/ProjectService.ts` - Shared project management logic with three-strategy support
- `shared/tools/project-cli.ts` - CLI implementation reference for strategy patterns
- `server/services/ProjectService.ts` - Backend project management requiring alignment with shared service
- `src/components/AddProjectModal.tsx` - Current project creation form requiring enhancement

### Architectural References
- Three-Strategy Architecture: MDT-077 Section 3
- CLI Path Management: MDT-077 Section 4
- Configuration Templates: MDT-077 Section 5
- Original UI Requirements: MDT-020 Section 2
## 8. Clarifications
### Post-Implementation Session 2025-11-27

**Specification Refinement - CR Simplification**:
- **Implementation Details Removed**: Sections 3, 4, 5, and 6 simplified to focus on functional requirements rather than specific implementation approaches
- **Artifact-Specific Requirements Updated**: Acceptance criteria now focus on user outcomes and system behavior rather than detailed UI specifications
- **Reference Consolidation**: Architectural dependencies maintained while removing line-specific references and implementation documentation

**Updated Specification Focus**:
- **Functional Requirements**: Clear user capabilities and system behaviors
- **Architectural Constraints**: Essential technical requirements and security considerations
- **Integration Points**: Key system interfaces and data flow requirements
- **Quality Attributes**: Performance, compatibility, and accessibility requirements

**Specification Quality Improvements**:
- **Artifact References**: Maintain focus on specific files and components rather than abstract concepts
- **Measurable Criteria**: Testable acceptance criteria with clear pass/fail conditions
- **Implementation Neutrality**: Allow multiple valid implementation approaches while maintaining required outcomes
- **Maintainability**: Reduced CR size and complexity for easier future reference
