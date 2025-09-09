# Release Notes

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
