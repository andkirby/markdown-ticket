- **Code**: MDT-001
- **Title/Summary**: Multi-Project CR Management Dashboard
- **Status**: Proposed
- **Date Created**: 2025-08-31
- **Type**: Feature Enhancement
- **Priority**: High
- **Phase/Epic**: Phase A (Foundation)

# Multi-Project CR Management Dashboard

## 1. Description

### Problem Statement
Currently, users managing multiple projects with CR systems must navigate to each project directory individually to create, view, and manage Change Requests. This creates inefficiency and makes it difficult to maintain oversight across multiple projects.
    
### Current State
- Each project has its own `.{project.code}-config.toml` and CR files in `docs/CRs/`
- Users must manually navigate to each project directory
- No centralized view of CRs across projects
- No unified interface for CR management

### Desired State
A web-based dashboard that provides:
- Dropdown selection of all discovered projects
- Unified CR listing and management interface
- Project registry system for automatic discovery
- Centralized CR creation, editing, and status management

### Rationale
- **Efficiency**: Single interface for multiple projects reduces context switching
- **Oversight**: Better visibility into CR status across all projects
- **Consistency**: Unified interface ensures consistent CR management practices
- **Scalability**: Easily add new projects without tool changes

### Impact Areas
- New web application (React-based dashboard)
- Project discovery and registry system
- Enhanced CR workflow management
- Configuration file structure updates

## 2. Solution Analysis

### Approaches Considered

**Configuration Registry Approach**:
- Projects register themselves in `~/.config/markdown-ticket/project-name.toml`
- Central discovery mechanism scans configuration directory
- Each project maintains its own `.{project.code}-config.toml`

**Auto-Discovery via File System**:
- Scan file system for `.{project.code}-config.toml` files
- No manual registration required
- Potentially slower and resource-intensive

**Git-Based Discovery**:
- Find git repositories and check for CR configurations
- Limited to git-managed projects
- Complex implementation

### Trade-offs Analysis
| Approach | Pros | Cons |
|----------|------|------|
| Configuration Registry | Fast, explicit, controllable | Requires manual registration |
| Auto-Discovery | Automatic, no setup | Slow, resource-heavy |
| Git-Based | Git integration | Limited scope |

### Decision Factors
- **Performance**: Registry approach is fastest for large file systems
- **User Experience**: Explicit registration provides better control
- **Maintenance**: Registry files are easier to manage than scanning
- **Scalability**: Registry approach scales better with many projects

### Chosen Approach
**Configuration Registry Approach** with the following structure:
- Global config: `~/.config/markdown-ticket/config.toml`
- Project registrations: `~/.config/markdown-ticket/projects/*.toml`
- Each project maintains local `.{project.code}-config.toml`

### Rejected Alternatives
- **Auto-Discovery**: Too resource-intensive for large file systems
- **Git-Based**: Too limiting for non-git projects
- **Database Storage**: Adds complexity without significant benefits

## 3. Implementation Specification

### Technical Requirements

**Backend API**:
- Express.js server for CR management endpoints
- Project discovery and configuration loading
- RESTful API for CRUD operations on CRs
- File system integration for CR storage

**Frontend Dashboard**:
- React-based single-page application
- Project dropdown with real-time discovery
- CR listing with filtering and search
- CR creation/editing forms
- Status management interface

**Configuration System**:
- Global config at `~/.config/markdown-ticket/config.toml`
- Project registry files in `~/.config/markdown-ticket/projects/`
- Backward compatibility with existing `.{project.code}-config.toml` files

### API Endpoints
```
GET /api/projects                    # List all registered projects
GET /api/projects/:id/crs           # List CRs for specific project
GET /api/projects/:id/crs/:crId     # Get specific CR
POST /api/projects/:id/crs          # Create new CR
PUT /api/projects/:id/crs/:crId     # Update CR
DELETE /api/projects/:id/crs/:crId  # Delete CR
GET /api/projects/:id/config        # Get project configuration
```

### Configuration Schema
```toml
# ~/.config/markdown-ticket/config.toml
[dashboard]
port = 3002
autoRefresh = true

# ~/.config/markdown-ticket/projects/markdown-ticket.toml
[project]
name = "Markdown Ticket Board"
path = "/Users/kirby/home/markdown-ticket"
configFile = ".mdt-config.toml"
active = true
```

### Database Changes
No database required - file-based storage maintained for CRs and configuration.

### UI/UX Components
- **Project Selector**: Dropdown with project names and codes
- **CR List View**: Table with Code, Title, Status, Priority, Date
- **CR Detail View**: Full CR content with editing capability
- **CR Creation Form**: Wizard-style form following CR template
- **Status Dashboard**: Overview of CR counts by status across projects

## 4. Acceptance Criteria

### Functional Requirements
- [ ] Dashboard discovers and lists all projects with `.{project.code}-config.toml` files
- [ ] Project dropdown allows switching between different projects
- [ ] CR list displays all CRs for selected project with proper formatting
- [ ] New CR creation follows standardized template and updates counter files
- [ ] CR editing preserves all metadata and follows validation rules
- [ ] Status updates are reflected immediately in the interface
- [ ] File system changes are detected and reflected in dashboard

### Non-Functional Requirements
- [ ] Dashboard loads project list in under 2 seconds
- [ ] CR operations (create/read/update) complete in under 1 second
- [ ] Interface is responsive and works on desktop and tablet viewports
- [ ] Configuration changes are detected without server restart
- [ ] System handles up to 50 projects with 100 CRs each

### Testing Requirements
- [ ] Unit tests for all API endpoints and CR operations
- [ ] Integration tests for project discovery and configuration loading
- [ ] E2E tests for complete CR workflow (create, edit, status update)
- [ ] Performance tests for large numbers of projects and CRs
- [ ] Cross-browser compatibility testing (Chrome, Firefox, Safari)

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References

### Related Tasks
- Set up project registry configuration system
- Implement backend API for multi-project CR management
- Create React dashboard with project switching
- Add project discovery and auto-registration features

### Code Changes
- New backend service for project discovery
- React components for dashboard interface
- Configuration file parsers and validators
- File system watchers for live updates

### Documentation Updates
- Update CRs_manual.md with multi-project workflow
- Create dashboard user guide
- Document project registration process
- Update CLAUDE.md with new development commands

### Related CRs
- Future CR for advanced filtering and search
- Future CR for CR templates and automation
- Future CR for project collaboration features