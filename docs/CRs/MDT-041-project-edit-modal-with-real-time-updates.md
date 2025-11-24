---
code: MDT-041
title: Project Edit Modal with Real-time Updates
status: In Progress
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
| `src/components/EditProjectModal.tsx` | React Component | Project editing modal with strategy support |
| `src/components/ProjectStrategySelector.tsx` | React Component | Configuration strategy selection UI |
| `src/components/PathValidation.tsx` | React Component | Enhanced path validation with tilde expansion |
| `src/hooks/useProjectStrategies.ts` | Custom Hook | Project strategy management logic |

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `src/components/AddProjectModal.tsx` | Enhancement | Add strategy selection, path controls, tickets path field |
| `server/services/ProjectService.ts` | Enhancement | Add strategy support, tilde expansion, path creation control |
| `shared/services/ProjectService.ts` | Reference | Align backend with shared service implementation |
| `src/components/ProjectManager.tsx` | Enhancement | Add strategy indicators, edit buttons |
| `server/routes/projects.ts` | Addition | Add project update endpoints with strategy support |

### UI Form Structure Enhancement

#### **Project Creation Form Fields**
1. **Project Name** (required, text input)
2. **Project Code** (auto-generated, read-only display)
3. **Project Path** (required, directory picker with tilde expansion support)
   - Shows discovery path status indicator
   - Auto-detects whether path is within configured discovery paths
4. **Create Project Path** (checkbox, default: false)
5. **Configuration Strategy**:
   - **"Use Global Config Only"** checkbox with tooltip (i) for explanation
   - **Auto-Determined Strategy** displayed to user:
     - **Auto-Discovery**: When path is within discovery paths
     - **Project-First**: When path is outside discovery paths
6. **Tickets Path** (text input, default: "docs/CRs", relative path only)
7. **Description** (optional, textarea)
8. **Repository URL** (optional, text input)

#### **Project Edit Form Fields**
Same as creation but with **read-only fields**:
- **Project Code** (read-only)
- **Project Path** (read-only)
- **Configuration Strategy** (read-only - cannot change strategy after creation)

### Backend API Enhancements

#### **Updated Endpoints**
```
POST /api/projects/create
- Supports: strategy, createProjectPath, ticketsPath parameters
- Path validation with tilde expansion
- Strategy-specific configuration creation

PUT /api/projects/:id
- New endpoint for project updates
- Validates strategy constraints
- Updates only editable fields (name, description, repository, ticketsPath)
```

#### **Path Validation Logic**
```typescript
// Expand ~ to home directory
const expandedPath = projectPath.replace(/^~($|\/)/, `${os.homedir()}$1`);

// Validate project path exists or create if flag set
if (!fs.existsSync(expandedPath)) {
  if (createProjectPath) {
    await fs.mkdir(expandedPath, { recursive: true });
  } else {
    throw new Error('Project path does not exist. Use "Create Project Path" option to create it.');
  }
}
```

### Integration Points
- **From**: `AddProjectModal` enhanced form (`/api/projects/create`)
- **From**: `EditProjectModal` new form (`/api/projects/:id`)
- **To**: Enhanced `ProjectService.createProject()` and `ProjectService.updateProject()` methods
- **Interface**: Existing HTTP API with new optional parameters

## 4. Acceptance Criteria

### Functional - Project Creation Enhancement
- [ ] Project creation form includes configuration strategy selection (Project-First, Global-Only, Auto-Discovery)
- [ ] "Create Project Path" checkbox controls automatic directory creation (default: false)
- [ ] "Tickets Path" field allows custom relative paths (default: "docs/CRs")
- [ ] Path validation supports tilde expansion (`~/` paths)
- [ ] Project creation succeeds with all three configuration strategies
- [ ] Strategy selection creates appropriate config files (local, global, or both)
- [ ] Form validation enforces relative paths for tickets directory
- [ ] Error messages provide clear guidance for path and strategy issues

### Functional - Project Edit Modal
- [ ] Edit modal accessible from project manager (edit button/pencil icon)
- [ ] Edit form displays current project configuration correctly
- [ ] Project code and path fields are read-only in edit form
- [ ] Configuration strategy is read-only (cannot change after creation)
- [ ] Editable fields: name, description, repository URL, tickets path
- [ ] Changes apply immediately to both local and global configurations
- [ ] Real-time updates reflect changes across the application
- [ ] Edit modal validates all changes before saving

### Functional - CLI vs UI Parity
- [ ] UI supports all CLI project creation strategies (MDT-077 alignment)
- [ ] UI provides same path management options as CLI (`--create-project-path`, `--tickets-path`)
- [ ] Both UI and CLI produce identical configuration files
- [ ] UI supports tilde expansion matching CLI behavior
- [ ] Configuration validation works consistently across UI and CLI
- [ ] Project discovery returns same results regardless of creation method

### Non-Functional
- [ ] No performance impact on project operations (< 100ms additional processing)
- [ ] Cross-platform compatibility maintained (macOS, Linux, Windows)
- [ ] Backward compatibility with existing projects maintained
- [ ] All existing project management tests continue to pass
- [ ] Responsive design works on mobile and desktop viewports
- [ ] Accessibility compliance for form controls and modals
- [ ] Form area uses ScrollArea component for small viewport heights (max-h-[80vh])
- [ ] Modal content remains scrollable while header and footer stay fixed

### Integration Testing
- [ ] End-to-end: Project creation with each strategy creates proper config files
- [ ] End-to-end: Project editing updates configurations correctly
- [ ] Integration: CLI-created projects appear correctly in UI
- [ ] Integration: UI-created projects work correctly with CLI tools
- [ ] API: New endpoints return proper error responses for invalid inputs
- [ ] UI: Real-time updates propagate across all connected clients

### Manual Testing
- [ ] User can create Global-Only project with clean project directory
- [ ] User can create Auto-Discovery project with no global registration
- [ ] User can edit project name and see changes immediately
- [ ] User receives clear error messages for invalid paths or strategies
- [ ] User can use tilde paths in both creation and editing workflows

## 5. Implementation Notes

### Key Implementation Details
- **Configuration Strategy UI**: Use radio buttons for strategy selection with clear descriptions
- **Path Expansion**: Apply same pattern as CLI - `/^~($|\/)/` regex with `os.homedir()` replacement
- **Conditional Logic**: Show/hide form fields based on strategy selection (Global-Only hides local config options)
- **Validation Strategy**: Separate validation for project paths (absolute) vs tickets paths (relative)
- **Edit Constraints**: Project code and path are immutable after creation to prevent breaking references
- **Strategy Immutability**: Configuration strategy cannot be changed after project creation

### UI Component Requirements

#### **Configuration Strategy Selection**
- **"Use Global Config Only"** checkbox with tooltip icon (i)
- Tooltip provides clear explanation: "Store project configuration only in global registry, no config files in project directory"
- **Auto-Detection Logic**: System automatically determines strategy based on project path location:
  - **Auto-Discovery**: Selected path is within configured discovery paths
  - **Project-First**: Selected path is outside discovery paths
- **Visual Indicators**:
  - Show clear indicator when project path is within discovery paths
  - Display the determined strategy (Auto-Discovery vs Project-First) to user
  - Highlight the path status in the form
- **Edit Form Behavior**: Strategy selection is read-only in edit forms (strategy immutable after creation)
- **Accessibility**: Proper labeling, keyboard navigation, and screen reader support for tooltips

#### **Scrollable Modal Form Structure**
- Modal container with maximum height of 80% viewport
- Fixed header containing modal title
- Scrollable content area for form fields
- Fixed footer containing action buttons (Save, Cancel)
- Responsive behavior for small viewport heights
- Smooth scrolling with proper padding and spacing

### Backend Integration Patterns
- **Shared Service Usage**: Align `server/services/ProjectService.ts` with `shared/services/ProjectService.ts`
- **Strategy Handling**: Backend creates configs based on strategy parameter
- **Error Consistency**: Same error messages and validation logic as CLI
- **Configuration Templates**: Use identical templates across CLI, UI, and API

### Database/File System Considerations
- **Global-Only Projects**: Only create `~/.config/markdown-ticket/projects/{project}.toml`
- **Project-First Projects**: Create both global registry and local `.mdt-config.toml`
- **Auto-Discovery Projects**: Only create local `.mdt-config.toml`, no global registry
- **Tickets Directory**: Auto-create relative tickets path when valid

### Testing Strategy
- **Unit Tests**: Test each strategy's config file generation
- **Integration Tests**: Verify CLI and UI produce identical configurations
- **E2E Tests**: Test complete workflows from creation to editing
- **Path Validation**: Test tilde expansion with various home directory configurations

### Migration Considerations
- **Existing Projects**: Maintain backward compatibility with current Project-First projects
- **Configuration Updates**: Handle migration of existing projects to new enhanced forms
- **UI Updates**: Existing projects display correctly in enhanced project manager

## 6. References

### Related Project Tickets
- **MDT-020**: Configuration Management Improvements and Add Project UI - Established project creation UI functionality and form structure
- **MDT-077**: CLI Project Management Tool - Defined three-strategy architecture and advanced project management features

### Related Code
- `shared/services/ProjectService.ts` - Shared project management logic with three-strategy support
- `shared/tools/project-cli.ts` - CLI implementation reference for strategy patterns
- `server/services/ProjectService.ts` - Backend project management (needs alignment with shared service)
- `src/components/AddProjectModal.tsx` - Current project creation form (needs enhancement)
- `src/components/ProjectManager.tsx` - Project list management (needs edit buttons)
- `server/routes/projects.ts` - Project API endpoints (needs update endpoints)

### CLI vs UI Alignment Reference
- CLI command: `npm run project:create -- --global-only --create-project-path --tickets-path "custom/tickets"`
- UI equivalent: Strategy selection + checkboxes + custom tickets path field
- Both must produce identical configuration files

### Related Documentation
- Three-Strategy Architecture: MDT-077 Section 3 (lines 72-91)
- CLI Path Management: MDT-077 Section 4 (lines 121-137)
- Configuration Templates: MDT-077 Section 5 (lines 407-409)
- Original UI Requirements: MDT-020 Section 2.2 (lines 60-73)

### Test Coverage Requirements
- Unit tests for each configuration strategy
- Integration tests for CLI vs UI configuration parity
- E2E tests for enhanced project creation and editing workflows
- Path validation tests with tilde expansion