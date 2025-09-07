# MCP Server Request Samples

This document provides sample request and response data for the MCP CR Management Server.

## Connection and Initialization

### Initialize MCP Connection
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "claude-desktop",
      "version": "0.5.0"
    }
  }
}
```

## Project Management Tools

### 1. List Projects
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "list_projects",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📁 Found 3 projects:\n\n• **MDT** - Markdown Ticket Board\n  Description: Kanban-style ticket board with markdown storage\n  Path: /Users/user/projects/markdown-ticket/docs/CRs\n  CRs: 5\n\n• **API** - REST API Project\n  Description: Backend API services\n  Path: /Users/user/projects/api/docs/CRs\n  CRs: 12\n\n• **WEB** - Frontend Web App\n  Description: React-based frontend application\n  Path: /Users/user/projects/web/docs/CRs\n  CRs: 8"
      }
    ]
  }
}
```

### 2. Get Project Info
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "get_project_info",
    "arguments": {
      "key": "MDT"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📋 Project: **MDT** - Markdown Ticket Board\n\n**Details:**\n- Key: MDT\n- Description: Kanban-style ticket board with markdown storage\n- Path: /Users/user/projects/markdown-ticket/docs/CRs\n- Total CRs: 5\n- Last Accessed: 2025-09-04T08:30:00.000Z\n\n**Configuration:**\n- Start Number: 1\n- Counter File: .mdt-next\n- Repository: https://github.com/user/markdown-ticket"
      }
    ]
  }
}
```

## CR Operations

### 3. List CRs
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "list_crs",
    "arguments": {
      "project": "MDT",
      "filters": {
        "status": ["Proposed", "Approved"],
        "type": "Feature Enhancement",
        "priority": "High"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "🎫 Found 2 CRs matching filters:\n\n**MDT-004** - MCP Server for Universal CR Management\n- Status: Proposed\n- Type: Architecture\n- Priority: High\n- Created: 2025-09-01\n- Phase: Phase A (Foundation)\n\n**MDT-001** - Multi-Project CR Management Dashboard\n- Status: Approved\n- Type: Feature Enhancement\n- Priority: High\n- Created: 2025-08-30\n- Phase: Phase A (Foundation)"
      }
    ]
  }
}
```

### 4. Get Specific CR
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_cr",
    "arguments": {
      "project": "MDT",
      "key": "MDT-004"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📄 **MDT-004** - MCP Server for Universal CR Management\n\n**Metadata:**\n- Status: Proposed\n- Type: Architecture\n- Priority: High\n- Created: 2025-09-01T00:00:00.000Z\n- Modified: 2025-09-04T08:30:00.000Z\n- Phase: Phase A (Foundation)\n- Source: User Request\n- Impact: High\n- Effort: High\n\n**Description:**\nA Model Context Protocol (MCP) server that provides universal programmatic access to the CR management system, enabling any MCP-compatible LLM to create, read, update, and manage CRs across multiple projects seamlessly.\n\n**Key Features:**\n- Universal LLM access to CR management\n- Automatic project discovery\n- CR creation, validation, and lifecycle management\n- Multi-project support\n- Rich tool interface\n\n**File:** /Users/user/projects/markdown-ticket/docs/CRs/MDT-004-mcp-server-cr-management.md"
      }
    ]
  }
}
```

### 5. Create New CR
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "MDT",
      "type": "Feature Enhancement",
      "data": {
        "title": "Add dark mode toggle to application",
        "priority": "Medium",
        "phaseEpic": "Phase B (Enhancement)",
        "description": "Users need the ability to switch between light and dark themes for better accessibility and user preference.",
        "rationale": "Improves user experience and accessibility, especially for users who prefer dark interfaces or work in low-light environments.",
        "impactAreas": [
          "Frontend UI components",
          "CSS styling and themes",
          "User preferences storage",
          "Settings page"
        ]
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Created CR MDT-006**: Add dark mode toggle to application\n\n**Details:**\n- Key: MDT-006\n- Status: Proposed\n- Type: Feature Enhancement\n- Priority: Medium\n- Phase: Phase B (Enhancement)\n- Created: 2025-09-04T08:35:00.000Z\n\n**File Created:** /Users/user/projects/markdown-ticket/docs/CRs/MDT-006-add-dark-mode-toggle.md\n\nThe CR has been created with a complete template including:\n- Problem statement and description\n- Impact areas (Frontend UI, CSS styling, etc.)\n- Standard CR sections ready for completion\n- YAML frontmatter with all metadata\n\nNext step: Update the CR with detailed implementation specifications."
      }
    ]
  }
}
```

### 6. Update CR Status
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "MDT",
      "key": "MDT-006",
      "status": "Approved"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Updated CR MDT-006** status\n\n**Change:** Proposed → Approved\n- Title: Add dark mode toggle to application\n- Updated: 2025-09-04T08:40:00.000Z\n- File: Updated YAML frontmatter and lastModified timestamp\n\nThe CR is now approved and ready for implementation."
      }
    ]
  }
}
```

### 7. Delete CR
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "delete_cr",
    "arguments": {
      "project": "MDT",
      "key": "MDT-003"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "🗑️ **Deleted CR MDT-003**\n\n- Title: Drag-and-drop UI sync bug\n- Type: Bug Fix\n- Status: Implemented\n\nThe bug fix CR has been deleted as it was implemented and verified. Bug CRs are typically removed after successful implementation to reduce clutter, as documented in the CR lifecycle."
      }
    ]
  }
}
```

## Template and Validation Tools

### 8. Get CR Template
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "get_cr_template",
    "arguments": {
      "type": "Bug Fix"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "📋 **Bug Fix CR Template**\n\n**Required Fields:**\n- title (string): Brief description of the bug\n- description (string): Detailed problem statement with reproduction steps\n- priority (Low|Medium|High|Critical): Bug severity\n- currentBehavior (string): What's happening now\n- expectedBehavior (string): What should happen instead\n\n**Template Structure:**\n```markdown\n# [Bug Title]\n\n## 1. Description\n\n### Problem Statement\n[Describe the bug with clear reproduction steps]\n\n### Current Behavior (Wrong)\n[What's actually happening]\n\n### Expected Behavior\n[What should happen instead]\n\n### Root Cause Analysis\n[Why this bug exists - fill after investigation]\n\n### Impact Assessment\n[User impact, system stability, data integrity]\n\n## 2. Solution Analysis\n[Investigation findings and fix approach]\n\n## 3. Implementation Specification\n[Technical fix details]\n\n## 4. Acceptance Criteria\n- [ ] Bug is reproducible in test environment\n- [ ] Root cause is identified and documented\n- [ ] Fix addresses root cause, not just symptoms\n- [ ] Regression tests added to prevent recurrence\n- [ ] No new bugs introduced by the fix\n```\n\n**Bug-Specific Notes:**\n- Bug CRs can be deleted after successful implementation\n- Focus on root cause analysis, not just symptoms\n- Always include regression prevention measures"
      }
    ]
  }
}
```

### 9. Validate CR Data
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "validate_cr_data",
    "arguments": {
      "project": "MDT",
      "data": {
        "title": "Fix authentication timeout",
        "type": "Bug Fix",
        "priority": "High",
        "description": "Users are getting logged out unexpectedly after 5 minutes"
      }
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **CR Data Validation Results**\n\n**Status:** Valid ✅\n\n**Validation Details:**\n- ✅ Title: Present and descriptive\n- ✅ Type: Valid Bug Fix type\n- ✅ Priority: Valid High priority\n- ✅ Description: Present with problem context\n\n**Suggestions:**\n- 💡 Consider adding reproduction steps to description\n- 💡 Include expected vs actual behavior details\n- 💡 Specify affected user groups or scenarios\n\n**Next Steps:**\n1. Add detailed reproduction steps\n2. Create the CR using create_cr tool\n3. Investigate root cause for proper analysis section"
      }
    ]
  }
}
```

### 10. Get Next CR Number
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "get_next_cr_number",
    "arguments": {
      "project": "MDT"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "🔢 **Next CR Number for MDT Project**\n\n**Next Available:** MDT-007\n\n**Details:**\n- Project Code: MDT\n- Current Counter: 7\n- Counter File: .mdt-next\n- Start Number: 1\n- Format: MDT-XXX (3-digit zero-padded)\n\n**Recent CRs:**\n- MDT-006: Add dark mode toggle to application\n- MDT-005: Project selection persistence\n- MDT-004: MCP Server for Universal CR Management\n\nThe next CR created will automatically use MDT-007."
      }
    ]
  }
}
```

## Advanced Operations

### 11. Find Related CRs
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "find_related_crs",
    "arguments": {
      "project": "MDT",
      "keywords": ["authentication", "login", "user", "security"]
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "🔍 **Related CRs Found**\n\nSearched for: authentication, login, user, security\n\n**Direct Matches (2):**\n\n**MDT-002** - User Authentication System\n- Status: Implemented\n- Type: Feature Enhancement\n- Priority: High\n- Keywords: authentication, user, login, security\n- Relevance: 95%\n\n**MDT-008** - Fix login session timeout\n- Status: Proposed\n- Type: Bug Fix\n- Priority: Medium\n- Keywords: login, user, authentication\n- Relevance: 80%\n\n**Potential Matches (1):**\n\n**MDT-001** - Multi-Project Dashboard\n- Status: Approved\n- Type: Feature Enhancement\n- Keywords: user (in context of user interface)\n- Relevance: 25%\n\n**Relationships:**\n- MDT-002 → MDT-008 (authentication system → login bug)\n- Consider linking these CRs if working on authentication improvements"
      }
    ]
  }
}
```

### 12. Suggest CR Improvements
**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "suggest_cr_improvements",
    "arguments": {
      "project": "MDT",
      "key": "MDT-004"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "💡 **CR Improvement Suggestions for MDT-004**\n\n**Current CR:** MCP Server for Universal CR Management\n\n**High-Priority Improvements:**\n\n1. **🏗️ Architecture Diagrams Missing**\n   - Add system architecture diagrams\n   - Include MCP protocol flow diagrams\n   - Show project discovery process visually\n   - *Actionable:* Yes - can be added to Implementation Specification\n\n2. **📊 Performance Requirements Detail**\n   - Current: \"< 2 seconds startup, < 500ms operations\"\n   - Suggested: Add memory usage limits, concurrent user limits\n   - Include benchmarking methodology\n   - *Actionable:* Yes - enhance Non-Functional Requirements section\n\n3. **🔗 Related CR Dependencies**\n   - Consider dependencies on MDT-001 (Multi-Project Dashboard)\n   - Potential conflict resolution with MDT-002 (File Watching)\n   - *Actionable:* Yes - update dependsOn and relatedTickets fields\n\n**Medium-Priority Improvements:**\n\n4. **🛡️ Security Considerations**\n   - Add security analysis for LLM access\n   - File system permission requirements\n   - Configuration file security\n   - *Actionable:* Yes - add Security section\n\n5. **📝 Implementation Timeline**\n   - Break down into phases/milestones\n   - Estimate implementation effort in days/weeks\n   - Identify critical path items\n   - *Actionable:* Yes - add Timeline section\n\n**Validation Improvements:**\n\n6. **✅ Acceptance Criteria Enhancement**\n   - Add specific MCP client compatibility tests\n   - Include error handling scenarios\n   - Add configuration validation tests\n   - *Actionable:* Yes - expand current criteria\n\n**Next Steps:**\n1. Update MDT-004 with architecture diagrams\n2. Enhance performance requirements section\n3. Add security analysis section\n4. Link to related CRs (MDT-001, MDT-002)"
      }
    ]
  }
}
```

## Error Handling Examples

### Invalid Project
```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "error": {
    "code": -32602,
    "message": "Invalid project key",
    "data": {
      "project": "INVALID",
      "available_projects": ["MDT", "API", "WEB"],
      "suggestion": "Use list_projects to see available projects"
    }
  }
}
```

### CR Not Found
```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "error": {
    "code": -32602,
    "message": "CR not found",
    "data": {
      "project": "MDT",
      "key": "MDT-999",
      "suggestion": "Use list_crs to see available CRs in this project"
    }
  }
}
```

### Validation Error
```json
{
  "jsonrpc": "2.0",
  "id": 16,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **CR Data Validation Failed**\n\n**Errors:**\n- ❌ Title: Required field missing\n- ❌ Type: Invalid type 'InvalidType' (must be Architecture, Feature Enhancement, Bug Fix, Technical Debt, or Documentation)\n- ❌ Priority: Invalid priority 'SuperHigh' (must be Low, Medium, High, or Critical)\n\n**Warnings:**\n- ⚠️ Description: Recommended for better CR quality\n- ⚠️ Impact Areas: Consider specifying affected system areas\n\n**Fix Required:** Please correct the errors above before creating the CR."
      }
    ]
  }
}
```

---

## Usage Notes

1. **Project Keys:** Always uppercase (MDT, API, WEB)
2. **CR Keys:** Format PROJECT-XXX (e.g., MDT-004, API-123)
3. **Status Values:** Proposed, Approved, In Progress, Implemented, Rejected
4. **Types:** Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation
5. **Priorities:** Low, Medium, High, Critical
6. **Error Handling:** All tools provide detailed error messages and suggestions
7. **Caching:** Project discovery is cached for performance (configurable timeout)
8. **File Watching:** Changes to config files automatically invalidate cache
9. **Validation:** All CR data is validated before creation/updates
10. **Templates:** Type-specific templates ensure consistent CR structure