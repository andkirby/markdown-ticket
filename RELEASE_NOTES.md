# Release Notes

## v0.7.2 (2025-12-03)

### 🚀 Improvements

**Enhanced Project Management UI (MDT-041)**
- **Dark Theme Support**: Complete dark mode compatibility for AddProjectModal components
- **Auto-Discovery Indicators**: Visual feedback showing automatic project detection status
- **Real Directory Validation**: Validates directory existence with graceful fallback handling
- **Improved Scrolling**: Fixed modal scrolling issues with ScrollArea component implementation
- **Enhanced Path Resolution**: Better handling of project paths with tilde expansion support

**Consolidated Ticket Management (MDT-082)**
- **Unified Service Layer**: Consolidated duplicate ticket CRUD operations into shared services
- **ProjectManager Integration**: Added ProjectManager to server for centralized ticket handling
- **Eliminated Duplication**: Removed redundant ticket management code across frontend and backend
- **Improved Performance**: Reduced overhead through shared service architecture

**UI Components (MDT-076)**
- **Reusable Alert Component**: New consistent alert system for user feedback across the application
- **Standardized Error Messages**: Uniform error display with proper styling and accessibility

### 🐛 Bug Fixes

**Project Configuration**
- **Registry Management**: Enhanced registry file reference handling and project ID consistency
- **Path Validation**: Fixed missing getSystemDirectories method in path selector functionality
- **Active Project Filtering**: Properly filter inactive projects from API responses

**YAML Frontmatter**
- **Title Attribute**: Fixed removal of title attribute from YAML frontmatter to prevent conflicts
- **Header Duplication**: Prevented doubled headers when sections are renamed

**CLI Tool (MDT-077)**
- **Enhanced UX**: Improved delete operations with visual feedback
- **Path Management**: Added enhanced flags for better path handling
- **Validation**: Comprehensive project validation utilities

### 📚 Documentation

**Architecture Documentation**
- **Technical Debt**: Documented critical technical debt in server project management
- **Refactoring Guides**: Added comprehensive refactoring documentation for MDT-082
- **CLI Guides**: Enhanced CLI project management documentation

**Internal Improvements**
- **Import Organization**: Standardized imports with path aliases and fixed symlink issues
- **Code Structure**: Improved component organization with consistent naming conventions

---

## v0.7.1 (2025-11-14)

### 🎉 New Features

**CLI Project Management Tool (MDT-077)**
- **Command-line Interface**: Comprehensive CLI for project CRUD operations
- **Interactive Mode**: Guided project creation with template support
- **Non-Interactive Mode**: Automation-friendly commands for CI/CD pipelines
- **Template Operations**: Import and export project configurations
- **Integration Ready**: Works seamlessly with existing ProjectService architecture

**Flexible Section Matching (MDT-052)**
- **User-Friendly Format**: MCP tools now accept section names like "Description" or "1. Description"
- **No Exact Syntax Required**: Eliminates need for precise "## 1. Description" markdown format
- **Improved AI Integration**: Makes it easier for AI assistants to work with ticket sections
- **Backwards Compatible**: Still supports exact markdown heading syntax
- **Helpful Error Messages**: Provides section suggestions when section not found

### 🚀 Improvements

**Enhanced Ticket Creation Workflow**
- **Comprehensive Prompt Template**: Updated `prompts/mdt-ticket-creation.md` with detailed guidelines
- **Critical Rules**: Clear rules to avoid common mistakes when creating tickets
- **MCP Tool Examples**: Practical examples for using MCP tools effectively
- **Quality Checklist**: Before-submitting checklist ensures high-quality tickets
- **Diagram Guidelines**: Best practices for including technical diagrams

**Project Rebranding**
- **Consistent Naming**: Updated from 'md-ticket-board' to 'markdown-ticket' throughout
- **Portable Scripts**: Changed shebang to `#!/usr/bin/env bash` for better compatibility
- **Port Configuration**: Production frontend moved from port 5173 to 4173
- **Package Naming**: Consistent project/package ID across all components

**Docker Configuration**
- **MCP Stdio-only Option**: New `docker-compose.mcp-stdio-only.yml` for traditional stdio transport
- **Flexible Transport**: Choose between HTTP and stdio MCP transports in Docker

### 🐛 Bug Fixes

**Ticket Numbering in Subdirectories (MDT-071)**
- **Critical Fix**: Resolved duplicate ticket numbers when `.mdt-next` file is missing
- **Subdirectory Support**: Now correctly handles CRs in subdirectories like `docs/CRs/`
- **Path Resolution**: Uses `getCRPath()` to find correct CR directory before scanning
- **Verified Fix**: Tested with both root-level and subdirectory CR paths

### 📚 Documentation

**Streamlined README**
- **41% Reduction**: Reduced from 423 to 250 lines for better readability
- **Improved Quick Start**: MCP setup integrated directly into Quick Start section
- **AI-First Focus**: Clearer positioning as AI-powered development tool
- **Visual Workflow**: Added Mermaid diagram showing AI-human collaboration phases
- **Better Organization**: Moved Quick Start after value proposition for immediate clarity

**Enhanced Docker Guide**
- **71% Reduction**: Streamlined from 578 to 166 lines
- **bin/dc Documentation**: Added comprehensive guide for Docker wrapper script
- **Configuration Focus**: Practical usage patterns for CONFIG_DIR and CONFIG_DISCOVER_PATH
- **Quick Reference**: Problem-solution pairs for common troubleshooting scenarios

**Improved Ticket Templates**
- **Artifact-Specification Format**: Better structure for ADR-style tickets
- **Tables and Lists**: Replaced prose with scannable tables and bullet points
- **Specific File Paths**: All changes include exact file paths and line numbers
- **Measurable Criteria**: Clear acceptance criteria with specific test cases

### 🔧 Technical Details

**Start Script Improvements**
- **Portable Shebang**: All scripts use `#!/usr/bin/env bash` for cross-platform support
- **Better Package Detection**: Improved patterns for detecting package.json files
- **Production Fixes**: Corrected frontend startup to use `npm run preview`

**Section Validation**
- **Flexible Matching**: SimpleSectionValidator now includes `normalizeForMatching()` function
- **Smart Normalization**: Strips markdown syntax and numbering for comparison
- **Error Messaging**: Provides helpful suggestions when sections don't match

---

## v0.7.0 (2025-11-12)

### 🎉 Major New Features

**Complete Docker Containerization**
- **Full Docker Architecture**: Production-ready container deployment with multi-environment support
- **Simplified Docker Scripts**: `bin/dc` wrapper script for easy Docker Compose management
- **Multi-Stage Builds**: Optimized containers with proper dependency management
- **Volume Mounting**: Flexible project mounting with custom configurations
- **Health Checks**: Built-in container health monitoring and endpoints

**Advanced Configuration Management (MDT-073)**
- **CLI Configuration Tool**: Runtime configuration management via command-line interface
- **Environment Variable Support**: Dynamic path configuration through environment variables
- **Centralized Config Handling**: Robust fallback logic for configuration discovery
- **Production Config Management**: Persistent configuration in Docker environments

**Enhanced Project Discovery UI (MDT-076)**
- **"No Projects Found" Interface**: Comprehensive UI when no projects are configured
- **Configuration-Driven Discovery**: Step-by-step guidance for project setup
- **Smart Path Suggestions**: Intelligent recommendations for project paths

### 🚀 MCP Server Enhancements

**HTTP Transport Improvements**
- **Phase 2 Features**: Advanced MCP HTTP transport with session management
- **Streamable HTTP Support**: Implementation of 2025-06-18 MCP specification
- **Container Optimization**: HTTP transport eliminates docker-exec overhead
- **Enhanced Security**: Rate limiting, origin validation, and authentication options

**Tool Consolidation**
- **40% Token Reduction**: Continued optimization of MCP tools for efficiency
- **Section-Based Operations**: 84-94% more efficient than full document updates
- **Quiet Mode**: Reduced output for cleaner integration with AI assistants

### 🛠 Development Infrastructure

**Production Deployment**
- **Deployment Scripts**: Comprehensive npm scripts for production environments
- **Workspace Management**: npm workspaces for shared dependency resolution
- **Multi-Environment Support**: Development, staging, and production configurations
- **Build Optimization**: Improved build processes with proper TypeScript compilation

**Code Organization**
- **Shared Package Migration**: Consolidated shared code under `@mdt/shared` package
- **TypeScript Path Mapping**: Clean import structure across frontend and backend
- **Module Resolution**: Fixed ES module compatibility issues

### 🐛 Bug Fixes

**Docker Environment**
- **Permission Issues**: Resolved nginx and nodejs user permissions in containers
- **Module Import Fixes**: Fixed backend module resolution in Docker environments
- **Build Compatibility**: Resolved npm ci workspace compatibility issues
- **Production Dependencies**: Fixed dependency management for production builds

**Configuration System**
- **Hardcoded Path Elimination**: Replaced all hardcoded paths with configurable constants
- **Environment Variable Support**: Added robust fallback logic for configuration paths
- **CLI Production Fixes**: Ensured configuration CLI works in production environments

### 📚 Documentation

**Docker Guide**: Comprehensive Docker deployment documentation with examples
- Architecture overview and container configuration
- Development and production deployment patterns
- Troubleshooting common Docker issues
- Volume mounting and project configuration examples

**Configuration Documentation**: Complete guide for MDT-073 configuration management
- CLI tool usage and examples
- Environment variable configuration
- Production deployment configuration patterns

### 🔧 Technical Improvements

**Build System**
- **npm Workspaces**: Proper workspace configuration for monorepo management
- **TypeScript Compilation**: Complete server migration to TypeScript
- **Shared Dependencies**: Optimized shared package management
- **Production Builds**: Streamlined build processes for deployment

**Development Experience**
- **Auto-Discovery**: Improved project auto-discovery mechanisms
- **Development Scripts**: Enhanced npm scripts for development workflows
- **Environment Detection**: Better development vs production environment handling

---

## v0.6.0 (2025-10-18)

### Bug Fixes
- **Smart Link URL Duplication**: Fixed critical bug where ticket links would show duplicated base URLs (e.g., `http://localhost:5173http://localhost:5173/...`).
- **Project Creation SSE Events**: Resolved event ID mismatch issues when creating new projects that could cause UI inconsistencies.
- **Stale Closure in Ticket Updates**: Fixed state update prevention that could stop board view updates when tickets were modified.
- **API Endpoint Consistency**: Updated AddProjectModal to use correct `/api/directories` endpoint for directory discovery.
- **Navigation Race Conditions**: Resolved race conditions in smart link navigation that could cause broken links.

### Improvements
- **Smart Links Reliability**: Comprehensive fixes for URL duplication issues, ensuring ticket references display correctly without duplicated base URLs.
- **Project Management**: Enhanced project ID validation and duplicate detection to prevent configuration conflicts.
- **MCP Tool Optimization**: Finalized 40% token reduction improvements through tool consolidation and efficient section-based operations.
- **Link Classification**: Improved absolute URL recognition for ticket links, preventing conflicts with regular web URLs.
- **Automatic Git Worktree Exclusion**: Project discovery now automatically excludes git worktrees to prevent duplicate project detection and confusion.
- **File Watcher-based Project Lifecycle**: Improved automatic detection of project creation, deletion, and configuration changes without requiring manual refresh.

### Planning & Architecture
- ~~**MCP Transport Requirements**: Created requirements for future MCP Streamable HTTP transport implementation (MDT-071 - declined)~~.
- **Server TypeScript Migration**: Planned migration of server architecture to TypeScript for better type safety (MDT-072).
- **Docker Infrastructure**: Planned simplification of Docker containerization architecture (MDT-055).
- **Content Sanitization**: Planned MCP content sanitization with conservative security approach (MDT-068).

---

## v0.5.0 (2025-10-14)

### New Features
- **Smart Links**: Automatic conversion of ticket references (MDT-001) to clickable links with hover previews. Navigate between related tickets instantly.
- **Table of Contents**: Auto-generated ToC for all markdown documents with persistent button state. Quickly jump to any section within long tickets.
- **H1 Title Management**: Automatic standardization and management of H1 headers in tickets to maintain consistent formatting across projects.
- **Enhanced MCP Tools**: New `update_cr_section` tool for updating specific ticket sections (98% more efficient than full document updates).
- **Event History Dev Tool**: Advanced development tool for tracking and debugging real-time events and listener management.

### Improvements
- **Document View Enhancement**: Clickable labels and persistent sorting preferences in the documents view for better navigation.
- **Path Selector Logic**: Improved project switching logic with immediate ticket clearing to prevent cross-project data errors.
- **Cross-Project Operations**: Enhanced drag-and-drop between projects with proper view mode preservation.
- **Layered Architecture**: Complete backend refactoring to clean layered architecture improving maintainability and scalability.
- **Real-time Updates**: Enhanced file system change detection for more reliable markdown updates across all views.
- **Security Improvements**: Strengthened path validation and access controls for multi-project environments.

### Bug Fixes
- **Cross-Project Errors**: Fixed critical bugs causing data corruption when switching between projects rapidly.
- **Drag-and-Drop Issues**: Resolved stale closure problems that caused 404 errors during cross-project ticket operations.
- **Build Process**: Fixed ES module import issues and TypeScript compilation problems in shared libraries.
- **Mermaid Rendering**: Fixed diagram rendering and placeholder corruption issues.
- **Event Management**: Complete resolution of stale closure bugs throughout the application using useRef patterns.

### Technical Improvements
- **Component Architecture**: Applied useRef pattern consistently across all components to prevent React stale closure bugs
- **TypeScript Configuration**: Replaced ES module workarounds with proper TypeScript configuration
- **Build Optimization**: Removed tracked compiled JS files and improved shared library compilation
- **Event System**: Enhanced SSE event handling with better error prevention and cleanup

---

## v0.4.0 (2025-10-02)

### New Features
- **URL-based Routing**: Navigate directly to specific tickets and views using URLs. Share links to tickets or open them directly from the address bar.
- **Mermaid Diagram Support**: Render Mermaid diagrams in markdown documents with fullscreen viewing, adaptive scaling, and intuitive zoom controls.
- **Document Filtering**: Filter documents and tickets by multiple criteria for easier navigation in large projects.
- **Collapsible Directories**: Organize document view with collapsible directory trees for better navigation.
- **Section-based MCP Updates**: Efficient CR updates through MCP tools that modify specific sections instead of entire documents, saving up to 98% of tokens.

### Improvements
- **Document Sorting**: Added date display and sorting functionality for documents in the document view.
- **Frontend Logging**: Implemented autostart feature for early log capture during development.
- **MCP Documentation**: Comprehensive updates to MCP tools documentation with section-based operations.
- **Ticket Interface**: Consolidated description and rationale fields into unified Ticket interface.

### Bug Fixes
- **Date Sorting**: Fixed broken date sorting for ISO strings and missing lastModified fields.
- **Drag-and-Drop**: Resolved drag-and-drop issues with optimistic UI updates.
- **Event System**: Fixed bugs in event handling and project creation.
- **MCP Server**: Resolved ES modules import issues and stdout contamination.
- **Counter API**: Fixed syntax errors in counter API implementation.

### Technical Improvements
- Rate-limiting for status endpoint to improve performance
- Enhanced frontend logger with better debugging capabilities
- Upgraded dependencies and configurations
- TypeScript ES modules compilation fixes

---

## v0.3.0 (2025-09-11)

### New Features
- **Badge Components**: Enhanced visual display of ticket attributes with styled badges
- **Project Editing**: Added capability to edit project names and document paths
- **Backlog Management**: Hide/show functionality for backlog tickets in board view
- **MCP Development Tools**: New MCP server for real-time development log access
- **Shared Core Architecture**: Unified architecture across frontend and backend components

### Improvements
- **ScrollArea Enhancement**: Implemented auto-hide scrollbars with improved UX
- **Project Selector**: Enhanced hover effects and improved layout design
- **Sorting Fixes**: Resolved sorting issues for newly created tickets
- **On Hold Status**: Fixed drag-and-drop functionality and UI improvements for On Hold tickets
- **Documentation**: Updated ticket creation guides for better consistency

### Bug Fixes
- Fixed Rejected tickets appearing in wrong Kanban column
- Resolved On Hold ticket visibility issues in board view
- Improved drag-and-drop behavior for On Hold status tickets
- Removed non-functional cache clear button

---

## v0.2.1 (2025-09-09)

### Bug Fixes
- **On Hold Status**: Fixed visibility of tickets with "On Hold" status in the board view
- **Documentation**: Updated ticket creation guide for better clarity and consistency

### Known Issues
- **Cache Clean Button**: Currently non-functional, will be addressed in future release

---

## v0.2.0 (2025-09-09)

### New Features
- **Enhanced Ticket Viewer**: Comprehensive attribute display with structured block layout showing all ticket details
- **Relationship Attributes**: Full support for ticket relationships (depends on, blocks, related tickets)
- **Status Toggle Buttons**: Quick status changes directly from Kanban columns
- **Real-time Updates**: SSE-based live updates with optimistic UI
- **Improved Sorting**: Fixed list view sorting with proper date field handling

### Improvements
- **TicketCode Component**: Better ticket identifier formatting and display
- **MCP Documentation**: Comprehensive API documentation and browser console integration guide
- **Attribute Simplification**: Streamlined CR attributes for better usability
- **Markdown Compatibility**: Fixed ToC anchor compatibility with GitHub

### Bug Fixes
- Fixed frontend compilation errors after attribute changes
- Resolved Board component state synchronization issues
- Fixed list view sorting not working properly
- Fixed markdown anchor compatibility issues

---

## v0.1.0 (2025-09-07)

### Core Features
- **Kanban Board Interface**: Visual drag-and-drop ticket management
- **Multi-Project Support**: Manage multiple projects from single dashboard
- **Document Viewer**: Tree navigation with markdown rendering
- **MCP Server Integration**: Model Context Protocol for AI assistant integration
- **Project Configuration**: Dual-configuration system (global registry + local config)

### User Interface
- **Board/List/Docs Switcher**: Toggle between different view modes
- **Add Project Modal**: Complete project creation workflow
- **Duplicate Detection**: Smart ticket numbering with conflict resolution
- **Responsive Design**: Dark/light theme support

### Technical Infrastructure
- **File System Integration**: Real-time file watching and updates
- **Configuration Management**: TOML-based project and user settings
- **Markdown Storage**: All tickets stored as markdown with YAML frontmatter
- **TypeScript**: Full type safety throughout the application

### Documentation
- Comprehensive README with setup instructions
- MCP integration guides for AI assistants
- Project management documentation
- Development and testing guides
