# MDT (Markdown Ticket) Project Instructions

## Project Overview
You are working with the MDT (Markdown Ticket) system - a Kanban-style project management tool where tickets are stored as Markdown files with YAML frontmatter. This project uses an MCP (Model Context Protocol) server for Change Request (CR) management.

## When to Use MCP Markdown-Ticket Functions

### Always Use MCP For:
- **CR Management**: Creating, reading, updating, or deleting Change Requests
- **Project Discovery**: When user asks about available projects or CR counts
- **Status Updates**: When user wants to change CR status (Proposed → Approved → In Progress → Implemented)
- **CR Analysis**: When user needs suggestions, improvements, or related CR searches
- **Cross-Project Work**: Managing CRs across multiple codebases

### Key Trigger Phrases:
- "Create a CR/change request for..."
- "What CRs do we have?" / "Show me CRs"
- "Update CR-XXX status to..."
- "Are there CRs related to [topic]?"
- "Mark [feature] as implemented"
- "What should I work on next?"
- "Review/analyze CR-XXX"

## MCP Function Usage Patterns

### 1. Project Discovery
```
User mentions CRs → Always start with:
- mcp__markdown-ticket__list_projects (to show available projects)
- mcp__markdown-ticket__get_project_info (for project details)
```

### 2. CR Creation Workflow
```
User requests new CR → Use this sequence:
1. mcp__markdown-ticket__get_cr_template (get appropriate template)
2. mcp__markdown-ticket__validate_cr_data (validate before creation)
3. mcp__markdown-ticket__create_cr (create the CR)
4. Confirm creation and provide CR key to user
```

### 3. CR Research and Analysis
```
User asks about existing CRs → Use:
- mcp__markdown-ticket__list_crs (with filters for status/priority/type)
- mcp__markdown-ticket__get_cr_full_content (for specific CR details with full content)
- mcp__markdown-ticket__get_cr_attributes (for metadata-only operations, 90-95% more efficient)
- mcp__markdown-ticket__find_related_crs (for topic-based searches)
- mcp__markdown-ticket__suggest_cr_improvements (for analysis)
```

### 4. Status Management
```
User mentions completion/progress → Use:
- mcp__markdown-ticket__update_cr_status (change status)
- For bug fixes marked "Implemented" → offer mcp__markdown-ticket__delete_cr after verification period
```

## CR Types and When to Use Each

- **Architecture**: System design, infrastructure changes, major refactoring
- **Feature Enhancement**: New functionality, UI improvements, feature additions  
- **Bug Fix**: Error corrections, issue resolutions (can be deleted after implementation)
- **Technical Debt**: Code cleanup, optimization, maintainability improvements
- **Documentation**: User guides, API docs, technical specifications

## CR Status Lifecycle

1. **Proposed** → Initial state (use for all new CRs)
2. **Approved** → Ready for implementation
3. **In Progress** → Currently being worked on
4. **Implemented** → Complete (permanent ADR record)
5. **Rejected** → Not proceeding

## Project Context

### Project Code System:
Each project has its own unique code for CR identification:
- **MDT Project** (Markdown Ticket Board): Uses code "MDT" → CRs like MDT-001, MDT-002, etc.
- **CR Project** (LLM Translator): Uses code "CR" → CRs like CR-A001, CR-A002, etc.

**Important**: Always use the correct project code when creating or referencing CRs. The MCP will automatically determine the project context and assign the appropriate code prefix.

### MDT Project Structure:
- **Frontend**: React + TypeScript + Vite (port 5173)
- **Backend**: Express.js (port 3001)
- **Storage**: Markdown files with YAML frontmatter in `docs/CRs/`
- **Real-time**: File watcher polls for changes every 1 second
- **Testing**: Playwright E2E tests across browsers

### Development Commands:
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run test:e2e` - Run Playwright tests
- `npm run lint` - ESLint with TypeScript

## CR Best Practices

### Always Include in CRs:
- **Problem Statement**: What needs to be solved
- **Current State**: How things work now  
- **Desired State**: How they should work
- **Rationale**: Why this change is needed
- **Acceptance Criteria**: Specific, testable conditions

### YAML Frontmatter Rules:
- **Mandatory**: code, title, status, dateCreated, type, priority
- **Optional**: Only include if they have values (phaseEpic, relatedTickets, impact, etc.)
- **Format**: Use clean YAML, not markdown bullets

### Example YAML Frontmatter:

**For MDT Project (Markdown Ticket Board):**
```yaml
---
code: MDT-004
title: Implement Real-time File Synchronization
status: Proposed
dateCreated: 2025-09-04
type: Feature Enhancement
priority: High
phaseEpic: Phase B (Real-time Features)
relatedTickets: MDT-002,MDT-003
---
```

**For CR Project (LLM Translator):**
```yaml
---
code: CR-A020
title: Add Dark Mode Toggle to Settings
status: Proposed
dateCreated: 2025-09-04
type: Feature Enhancement
priority: Medium
phaseEpic: Phase A (Foundation)
---
```

## Proactive Behavior

### Suggest CR Creation When User:
- Describes complex features or architectural changes
- Reports bugs or system issues
- Mentions technical debt or refactoring needs
- Plans new functionality

### Reference Existing CRs When:
- User works on related functionality
- Implementation conflicts might exist
- Dependencies need to be considered
- Similar work has been done before

## Error Handling

If MCP functions fail:
1. Check if projects are properly configured
2. Verify CR format and required fields
3. Ensure proper project context
4. Fall back to manual CR creation guidance using `docs/create_ticket.md`

## Integration with Development Workflow

- **Before coding**: Check for related CRs that might affect your work
- **During development**: Update CR status to "In Progress"
- **After completion**: Mark CRs as "Implemented" and add implementation notes
- **Bug fixes**: Can be deleted after 30-90 day verification period

Remember: The MCP is your primary interface for all CR-related activities. Use it consistently to maintain proper documentation standards and project visibility.