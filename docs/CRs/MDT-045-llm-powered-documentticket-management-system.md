---
code: MDT-045
title: LLM-Powered Document/Ticket Management System
status: Approved
dateCreated: 2025-09-13T13:11:31.218Z
type: Feature Enhancement
priority: High
phaseEpic: AI Integration Phase 1
description: Integrate LLM capabilities into the MDT UI to enable natural language document creation, updates, and management with git diff approval workflows.
rationale: Enable users to manage tickets and documents through natural language interactions, making the system more accessible and efficient while maintaining version control and approval workflows.
---











# LLM-Powered Document/Ticket Management System

## 1. Description

### Problem Statement
Integrate LLM capabilities into the MDT UI to enable natural language document creation, updates, and management with git diff approval workflows.

### Current State
The MDT system currently provides:
- Console-based ticket/document CRUD operations via MCP server
- React frontend with Kanban boards for visualization
- File-based markdown storage with git version control
- Manual document creation and editing workflows

Users must manually create and edit tickets/documents through traditional UI forms or direct file editing.

### Desired State
Enable natural language interaction for document management through LLM integration:
- **Document Creation**: "Create a bug fix ticket for API timeout issues"
- **Document Updates**: "Update this ticket to include performance requirements" 
- **Git Integration**: LLM-generated commit messages with diff approval workflows
- **Configuration Flexibility**: Support multiple LLM providers (OpenAI, Claude, Ollama, LlamaFile, custom endpoints)

### Rationale
Enable users to manage tickets and documents through natural language interactions, making the system more accessible and efficient while maintaining version control and approval workflows.

## 2. Solution Analysis

### Architectural Approach
**Recommended**: Layered Service Architecture with Event-Driven Updates
- **LLM Service Layer**: Abstracted behind existing MCP server
- **Change Management**: Shadow document pattern for pending changes
- **Git Integration**: Diff visualization with approval workflows
- **Provider Flexibility**: OpenAI-compatible endpoint configuration

### Technical Feasibility Assessment
- ✅ **High Feasibility**: Document creation, full updates, git diff workflows
- ⚠️ **Moderate Complexity**: Change approval UI, real-time collaboration
- 🔴 **Future Phase**: Selective text editing, advanced approval workflows

### Key Design Decisions
1. **Integration Pattern**: Embedded into existing Kanban workflow vs separate AI mode
2. **LLM Provider Strategy**: Multi-provider support with configuration UI
3. **Approval Workflow**: MVP focuses on user self-approval with undo/redo
4. **Version Control**: Git-based change tracking with LLM-generated commit messages

## 3. Implementation Specification

### MVP Scope (Phase 1)
1. **LLM Provider Configuration**
   - Configuration UI for multiple providers (OpenAI, Claude, Ollama, LlamaFile)
   - Support for custom OpenAI-compatible endpoints
   - Provider authentication and validation

2. **Document Creation via LLM**
   - Natural language prompts for ticket creation
   - Template-based generation with validation
   - Integration with existing MCP ticket creation functions

3. **Document Updates via LLM**
   - Full document modification through natural language
   - Preview mode with git diff visualization
   - User approval workflow before applying changes

4. **Git Integration**
   - LLM-generated commit messages
   - Diff preview with side-by-side or unified view
   - Basic undo/redo functionality

### Technical Components
1. **MCP Server Extensions**
   ```typescript
   // New MCP functions to add
   'llm-create-cr': async (params) => { /* Generate CR from prompt */ }
   'llm-update-cr': async (params) => { /* Update CR from prompt */ }
   'llm-generate-commit': async (params) => { /* Generate commit message */ }
   'preview-changes': async (params) => { /* Generate diff preview */ }
   'approve-changes': async (params) => { /* Apply approved changes */ }
   ```

2. **React UI Components**
   - LLM provider configuration panel
   - Natural language input interface
   - Diff visualization component (react-diff-viewer-continued)
   - Change approval/rejection controls

3. **State Management**
   - Document state tracking (original, pending, preview)
   - LLM operation status management
   - Change queue for approval workflows

### Future Enhancements (Post-MVP)
- Selective text editing with AST-based positioning
- Multi-user approval workflows with role-based permissions
- Real-time collaborative editing
- Advanced validation pipelines

## 4. Acceptance Criteria

### Core LLM Integration
- [ ] Users can configure multiple LLM providers (OpenAI, Claude, Ollama, LlamaFile)
- [ ] Support for custom OpenAI-compatible endpoints
- [ ] Provider authentication and connection validation
- [ ] Error handling for LLM service failures

### Document Creation
- [ ] Natural language prompt interface for creating new tickets
- [ ] LLM generates structured markdown following CR templates
- [ ] Generated content validates against required fields
- [ ] User can review and edit LLM-generated content before saving

### Document Updates
- [ ] Natural language prompts for modifying existing tickets
- [ ] LLM preserves document structure and required metadata
- [ ] Generated changes maintain internal link integrity
- [ ] Content validation prevents malformed markdown

### Git Integration & Approval Workflow
- [ ] Diff preview showing original vs. LLM-generated changes
- [ ] Side-by-side and unified diff visualization options
- [ ] User approval/rejection controls for changes
- [ ] LLM generates descriptive commit messages
- [ ] Undo/redo functionality for applied changes

### User Interface Integration
- [ ] LLM features integrated into existing Kanban workflow
- [ ] Clear visual indicators for LLM-processing states
- [ ] Responsive feedback during LLM operations
- [ ] Fallback to manual editing if LLM operations fail

### Performance & Security
- [ ] Rate limiting on LLM requests
- [ ] Input sanitization for user prompts
- [ ] Response validation against malicious content
- [ ] Audit trail for all LLM-generated changes

## 5. Implementation Notes

### Open Questions for Resolution
1. **Integration Scope**: Embed LLM features directly in Kanban cards vs separate AI assistant interface?
2. **Role-Based Permissions**: Should there be different approval roles (Editor, Approver, Admin) in future phases?
3. **Provider Priority**: Which LLM provider should be default/recommended for optimal CR generation?
4. **Performance Optimization**: How to handle large documents efficiently during LLM processing?
5. **Collaboration Handling**: How to resolve conflicts when multiple users request LLM changes simultaneously?

### Technical Considerations
- **AST-Based Text Processing**: Required for future selective editing features
- **Shadow Document Pattern**: Manage pending changes without disrupting live documents  
- **Validation Pipeline**: Ensure LLM outputs maintain document structure integrity
- **State Management**: Complex state for original, pending, and preview document versions

### Implementation Phases
**Phase 1 (MVP)**: Core LLM integration with full document operations
**Phase 2**: Selective text editing with diff approvals
**Phase 3**: Multi-user workflows and advanced collaboration features

## 6. References

### Architectural Analysis
- Solutions architect analysis provided comprehensive technical feasibility assessment
- Recommended layered service architecture with event-driven updates
- Identified key challenges: selective updates, change management, validation

### Technology Stack Recommendations
- **LLM Integration**: OpenAI GPT-4, Anthropic Claude, Ollama compatibility
- **React Components**: react-diff-viewer-continued for diff visualization
- **Markdown Processing**: remark ecosystem for AST-based operations
- **State Management**: Zustand or React Query for complex LLM operation states

### Related Discussions
- Initial architecture brainstorming session covering use cases and technical approach
- User requirements clarification for MVP scope and future enhancements