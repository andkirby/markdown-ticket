# Project-Specific AI Instructions Template

## For CR Project (Markdown Ticket Board)

### Project Identity
You are working exclusively with the **CR (Markdown Ticket Board)** project. All Change Requests (CRs) use the code prefix "CR" (e.g., CR-001, CR-002, CR-003).

### When to Use MCP Markdown-Ticket Functions

#### Always Use MCP For:
- Creating, reading, updating, or deleting CR Change Requests
- Checking CR project status and CR counts
- Managing CR status transitions within CR project
- Finding related CR CRs or suggesting improvements

#### Key Trigger Phrases:
- "Create a CR for..." → Use project "CR"
- "What CRs do we have?" → Use mcp__markdown-ticket__list_crs with project "CR"
- "Update CR-XXX status..." → Use mcp__markdown-ticket__update_cr_status
- "Show me CR CR-XXX" → Use mcp__markdown-ticket__get_cr
- "Find CRs related to [topic]" → Use mcp__markdown-ticket__find_related_crs with project "CR"

### MCP Function Usage (CR Project Only)

```
Project Discovery:
- mcp__markdown-ticket__get_project_info("CR")

CR Operations:
- mcp__markdown-ticket__list_crs("CR", filters)
- mcp__markdown-ticket__get_cr("CR", "CR-XXX")
- mcp__markdown-ticket__create_cr("CR", type, data)
- mcp__markdown-ticket__update_cr_status("CR", "CR-XXX", status)
- mcp__markdown-ticket__delete_cr("CR", "CR-XXX")

CR Analysis:
- mcp__markdown-ticket__find_related_crs("CR", keywords)
- mcp__markdown-ticket__suggest_cr_improvements("CR", "CR-XXX")
- mcp__markdown-ticket__validate_cr_data("CR", data)
```

### CR Code Format
- **Always use "CR" prefix**: CR-A001, CR-B002, CR-C003, etc.
- **Sequential numbering**: Start from CR-A001 and increment
- **YAML frontmatter example**:
```yaml
---
code: CR-A005
title: Your CR Title Here
status: Proposed
dateCreated: 2025-09-04
type: Feature Enhancement
priority: Medium
---
```

### Project Context (CR)
- **Type**: Kanban-style project management application
- **Tech Stack**: React + TypeScript + Vite frontend, Express.js backend
- **Storage**: Markdown files with YAML frontmatter in `docs/CRs/`
- **Ports**: Frontend (5173), Backend (3001)
- **Real-time Updates**: File watcher polling every 1 second

### Development Commands (CR)
- `npm run dev:full` - Start both frontend and backend
- `npm run build` - Build for production
- `npm run test:e2e` - Run Playwright tests
- `npm run lint` - ESLint with TypeScript

---

## For CR Project (LLM Translator)

### Project Identity
You are working exclusively with the **LLM Translator** project. All Change Requests (CRs) use the code prefix "CR" (e.g., CR-A001, CR-A002, CR-A003).

### When to Use MCP Markdown-Ticket Functions

#### Always Use MCP For:
- Creating, reading, updating, or deleting CR Change Requests
- Checking LLM Translator project status and CR counts
- Managing CR status transitions within LLM Translator project
- Finding related LLM Translator CRs or suggesting improvements

#### Key Trigger Phrases:
- "Create a CR for..." → Use project "CR"
- "What CRs do we have?" → Use mcp__markdown-ticket__list_crs with project "CR"
- "Update CR-AXXX status..." → Use mcp__markdown-ticket__update_cr_status
- "Show me CR CR-AXXX" → Use mcp__markdown-ticket__get_cr
- "Find CRs related to [topic]" → Use mcp__markdown-ticket__find_related_crs with project "CR"

### MCP Function Usage (CR Project Only)

```
Project Discovery:
- mcp__markdown-ticket__get_project_info("CR")

CR Operations:
- mcp__markdown-ticket__list_crs("CR", filters)
- mcp__markdown-ticket__get_cr("CR", "CR-AXXX")
- mcp__markdown-ticket__create_cr("CR", type, data)
- mcp__markdown-ticket__update_cr_status("CR", "CR-AXXX", status)
- mcp__markdown-ticket__delete_cr("CR", "CR-AXXX")

CR Analysis:
- mcp__markdown-ticket__find_related_crs("CR", keywords)
- mcp__markdown-ticket__suggest_cr_improvements("CR", "CR-AXXX")
- mcp__markdown-ticket__validate_cr_data("CR", data)
```

### CR Code Format
- **Always use "CR" prefix**: CR-A001, CR-A002, CR-A003, etc.
- **Alpha-numeric numbering**: Series A (Foundation), B (Enhancement), etc.
- **YAML frontmatter example**:
```yaml
---
code: CR-A020
title: Your CR Title Here
status: Proposed
dateCreated: 2025-09-04
type: Feature Enhancement
priority: Medium
phaseEpic: Phase A (Foundation)
---
```

### Project Context (LLM Translator)
- **Type**: macOS translation application with AI integration
- **Tech Stack**: SwiftUI, macOS native, OpenAI API integration
- **Features**: Global hotkeys, popup UI, translation services, AI text correction
- **Architecture**: Service provider pattern, protocol-based design

### Key Features (LLM Translator)
- Global hotkey activation
- Popup translation interface
- Multiple translation providers (OpenAI, LibreTranslate, etc.)
- AI text correction with quick popup
- Configurable model selection
- Copy/paste functionality

---

## Usage Instructions

1. **Choose the appropriate section** based on which project you're working with
2. **Use only that project's MCP functions** - never reference other projects
3. **Use the correct project code** in all MCP function calls
4. **Follow project-specific context** and development practices
5. **Reference only that project's CRs** when suggesting related work

## Important Notes

- **Project Isolation**: Only work with CRs from the specified project
- **No Cross-References**: Don't reference CRs from other projects
- **Consistent Naming**: Use project-specific CR numbering schemes
- **Context Awareness**: Understand the specific project's domain and technical stack

This ensures clean separation between projects and prevents confusion about which CRs belong to which project.