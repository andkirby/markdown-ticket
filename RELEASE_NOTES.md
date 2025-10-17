# Release Notes

## v0.6.0 (2025-10-18)

### New Features
- **MCP Streamable HTTP Transport**: New official MCP transport specification support for better integration with modern AI assistants and improved performance.
- **SSE Transport Architecture**: Enhanced Server-Sent Events transport for MCP operations, providing more reliable real-time communication.
- **Automatic Git Worktree Exclusion**: Project discovery now automatically excludes git worktrees to prevent duplicate project detection and confusion.
- **File Watcher-based Project Lifecycle**: Improved automatic detection of project creation, deletion, and configuration changes without requiring manual refresh.

### Improvements
- **Smart Links Reliability**: Comprehensive fixes for URL duplication issues, ensuring ticket references display correctly without duplicated base URLs.
- **Project Management**: Enhanced project ID validation and duplicate detection to prevent configuration conflicts.
- **MCP Tool Optimization**: Finalized 40% token reduction improvements through tool consolidation and efficient section-based operations.
- **Docker Infrastructure**: Simplified Docker containerization architecture for easier deployment and development setup.
- **Link Classification**: Improved absolute URL recognition for ticket links, preventing conflicts with regular web URLs.

### Bug Fixes
- **Smart Link URL Duplication**: Fixed critical bug where ticket links would show duplicated base URLs (e.g., `http://localhost:5173http://localhost:5173/...`).
- **Project Creation SSE Events**: Resolved event ID mismatch issues when creating new projects that could cause UI inconsistencies.
- **Stale Closure in Ticket Updates**: Fixed state update prevention that could stop board view updates when tickets were modified.
- **API Endpoint Consistency**: Updated AddProjectModal to use correct `/api/directories` endpoint for directory discovery.
- **Navigation Race Conditions**: Resolved race conditions in smart link navigation that could cause broken links.

### Developer Experience
- **Production/Development Setups**: Added practical Docker setup configurations for both development and production environments.
- **Content Sanitization**: Implemented MCP content sanitization with conservative approach for security.
- **Health Check Cleanup**: Simplified infrastructure by removing unnecessary health check endpoints.

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
