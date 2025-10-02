# Release Notes

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
