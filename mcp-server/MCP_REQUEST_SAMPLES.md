# MCP Server Request Samples

Sample request and response data for the MCP CR Management Server using the shared core architecture.

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

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": false
      }
    },
    "serverInfo": {
      "name": "mcp-cr-server",
      "version": "1.0.0"
    }
  }
}
```

## Project Management

### List All Projects
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
        "text": "📋 **Discovered Projects** (5 total)\n\n**MDT** - Markdown Ticket Board\n- Path: /Users/kirby/home/markdown-ticket\n- CRs: 6 total\n- Last accessed: 2025-09-10\n\n**LlmTranslator** - LLM Translation Service\n- Path: /Users/kirby/home/LlmTranslator\n- CRs: 3 total\n- Last accessed: 2025-09-09"
      }
    ]
  }
}
```

### Get Project Information
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

## CR Management

### List CRs with Filters
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
        "status": ["In Progress", "Approved"],
        "type": "Feature Enhancement"
      }
    }
  }
}
```

### Get Specific CR
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "get_cr_full_content",
    "arguments": {
      "project": "MDT",
      "key": "MDT-006"
    }
  }
}
```

### Create New CR with Template
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "create_cr",
    "arguments": {
      "project": "MDT",
      "type": "Bug Fix",
      "data": {
        "title": "Fix duplicate project detection",
        "description": "React warnings about duplicate keys in project list",
        "priority": "High",
        "phaseEpic": "Phase 4 - Polish",
        "assignee": "Development Team"
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
        "text": "✅ **Created CR MDT-008** - Fix duplicate project detection\n\n**Details:**\n- Project: MDT (Markdown Ticket Board)\n- Type: Bug Fix\n- Priority: High\n- File: /Users/kirby/home/markdown-ticket/docs/CRs/MDT-008-fix-duplicate-project-detection.md\n\n**Template Applied:** Bug Fix template from shared/templates/bug-fix.md\n\n**Next Steps:**\n1. Review and refine the CR content\n2. Update status when ready to proceed\n3. Assign team members if needed"
      }
    ]
  }
}
```

### Update CR Attributes
```json
{
  "jsonrpc": "2.0",
  "id": 7,
  "method": "tools/call",
  "params": {
    "name": "update_cr_attrs",
    "arguments": {
      "project": "MDT",
      "key": "MDT-008",
      "attributes": {
        "priority": "Critical",
        "assignee": "Senior Developer",
        "phaseEpic": "Phase 4 - Critical Fixes"
      }
    }
  }
}
```

### Update CR Status
```json
{
  "jsonrpc": "2.0",
  "id": 8,
  "method": "tools/call",
  "params": {
    "name": "update_cr_status",
    "arguments": {
      "project": "MDT",
      "key": "MDT-008",
      "status": "In Progress"
    }
  }
}
```

## Template Management

### List Available Templates
```json
{
  "jsonrpc": "2.0",
  "id": 9,
  "method": "tools/call",
  "params": {
    "name": "list_cr_templates",
    "arguments": {}
  }
}
```

### Get CR Attributes (Metadata Only)
```json
{
  "jsonrpc": "2.0",
  "id": 6,
  "method": "tools/call",
  "params": {
    "name": "get_cr_attributes",
    "arguments": {
      "project": "MDT",
      "key": "MDT-006"
    }
  }
}
```

### Get Template Structure
```json
{
  "jsonrpc": "2.0",
  "id": 10,
  "method": "tools/call",
  "params": {
    "name": "get_cr_template",
    "arguments": {
      "type": "Architecture"
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
        "text": "📋 **Architecture Template Structure**\n\n**Required Fields:** title, description, rationale\n\n**Template Sections:**\n1. Problem Statement (required) - What architectural challenge needs to be addressed?\n2. Proposed Solution (required) - High-level architectural approach\n3. Design Rationale (required) - Why this approach over alternatives\n4. Impact Analysis (required) - System-wide implications and dependencies\n\n**Template File:** shared/templates/architecture.md"
      }
    ]
  }
}
```

## Section-Based Content Operations

### List CR Sections
List all sections in a CR document with hierarchical tree structure. Enables section discovery before reading or updating. **Token Efficiency: ~150 tokens vs ~2500 for full document (94% savings).**

```json
{
  "jsonrpc": "2.0",
  "id": 11,
  "method": "tools/call",
  "params": {
    "name": "list_cr_sections",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052"
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
        "text": "📑 **Sections in CR MDT-052** - Add section-based content updates\n\nFound 17 sections:\n\n- # Add section-based content updates (empty)\n  - ## 1. Description (1234 chars)\n    - ### Problem Statement (567 chars)\n    - ### Current State (345 chars)\n  - ## 2. Solution Analysis (890 chars)\n  - ## 3. Implementation Specification (1567 chars)\n  - ## 4. Acceptance Criteria (432 chars)\n  - ## 5. Implementation Notes (789 chars)\n\n**Usage:**\nTo read or update a section, use the **exact header text** shown above (with # symbols).\n\n**Examples:**\n- `section: \"## 1. Description\"` - reads/updates that section\n- `section: \"### Problem Statement\"` - reads/updates the subsection"
      }
    ]
  }
}
```

### Get CR Section Content
Read specific section content without loading full document. **Token Efficiency: ~125 tokens vs ~800 for full document (84% savings).**

```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "method": "tools/call",
  "params": {
    "name": "get_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "### Problem Statement"
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
        "text": "📖 **Section Content from CR MDT-052**\n\n**Section:** # Add section-based content updates / ## 1. Description / ### Problem Statement\n**Content Length:** 567 characters\n\n---\n\nLLMs currently waste 90-98% of tokens when updating CR documents because they must send the entire document content even when changing a single section. For a typical 2000-line CR document, updating one paragraph requires sending ~2500 tokens in the request, when only ~150 tokens of actual content are being modified.\n\n---\n\nUse `update_cr_section` to modify this section."
      }
    ]
  }
}
```

### Update CR Section (Replace Operation)
Replace entire section content. **Token Efficiency: ~150 tokens vs ~2500 for full document update (94% savings).**

```json
{
  "jsonrpc": "2.0",
  "id": 13,
  "method": "tools/call",
  "params": {
    "name": "update_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "## 4. Acceptance Criteria",
      "operation": "replace",
      "content": "- [ ] All three section-based tools are accessible via MCP\n- [ ] `list_cr_sections` correctly identifies all document sections\n- [ ] `get_cr_section` retrieves section content efficiently\n- [ ] `update_cr_section` with all three operations works correctly\n- [ ] Token usage is significantly reduced (90%+ savings)\n- [ ] No data corruption or formatting issues occur"
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
        "text": "✅ **Updated Section in CR MDT-052**\n\n**Section:** # Add section-based content updates / ## 4. Acceptance Criteria\n**Operation:** replace\n**Content Length:** 334 characters\n\n- Title: Add section-based content updates\n- Updated: 2025-10-02T00:06:19.706Z\n- File: /Users/kirby/home/markdown-ticket/docs/CRs/MDT-052-add-section-based-content-updates.md\n\nSection content has been completely replaced."
      }
    ]
  }
}
```

### Update CR Section (Append Operation)
Add content to end of existing section. Ideal for adding implementation notes or additional requirements.

```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "method": "tools/call",
  "params": {
    "name": "update_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "## 5. Implementation Notes",
      "operation": "append",
      "content": "\n\n### Performance Results\n- Section parsing: O(n) where n = number of lines\n- Average section update: 150 tokens vs 2500 tokens (94% savings)\n- Tested on documents up to 500 lines with no performance degradation"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 14,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Updated Section in CR MDT-052**\n\n**Section:** # Add section-based content updates / ## 5. Implementation Notes\n**Operation:** append\n**Content Length:** 234 characters\n\n- Title: Add section-based content updates\n- Updated: 2025-10-02T00:12:45.123Z\n- File: /Users/kirby/home/markdown-ticket/docs/CRs/MDT-052-add-section-based-content-updates.md\n\nContent has been added to the end of the section."
      }
    ]
  }
}
```

### Update CR Section (Prepend Operation)
Add content to beginning of existing section. Ideal for adding context or summary notes.

```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "method": "tools/call",
  "params": {
    "name": "update_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "## 5. Implementation Notes",
      "operation": "prepend",
      "content": "**Status: Implemented and Tested (2025-10-02)**\n\nAll three section-based tools are fully operational and have been validated with comprehensive testing.\n\n---\n\n"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 15,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "✅ **Updated Section in CR MDT-052**\n\n**Section:** # Add section-based content updates / ## 5. Implementation Notes\n**Operation:** prepend\n**Content Length:** 178 characters\n\n- Title: Add section-based content updates\n- Updated: 2025-10-02T00:15:32.456Z\n- File: /Users/kirby/home/markdown-ticket/docs/CRs/MDT-052-add-section-based-content-updates.md\n\nContent has been added to the beginning of the section."
      }
    ]
  }
}
```

### Section-Based Workflow Example
Typical workflow combining all three section tools:

```json
// 1. Discover sections
{
  "jsonrpc": "2.0",
  "id": 16,
  "method": "tools/call",
  "params": {
    "name": "list_cr_sections",
    "arguments": { "project": "MDT", "key": "MDT-052" }
  }
}

// 2. Read specific section
{
  "jsonrpc": "2.0",
  "id": 17,
  "method": "tools/call",
  "params": {
    "name": "get_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "## 1. Description"
    }
  }
}

// 3. Update section
{
  "jsonrpc": "2.0",
  "id": 18,
  "method": "tools/call",
  "params": {
    "name": "update_cr_section",
    "arguments": {
      "project": "MDT",
      "key": "MDT-052",
      "section": "## 5. Implementation Notes",
      "operation": "append",
      "content": "\n\nAdditional implementation details..."
    }
  }
}
```

## Analysis and Suggestions

### Get CR Improvement Suggestions
```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "method": "tools/call",
  "params": {
    "name": "suggest_cr_improvements",
    "arguments": {
      "project": "MDT",
      "key": "MDT-006"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 19,
  "result": {
    "suggestions": [
      {
        "category": "completeness",
        "priority": "medium",
        "suggestion": "Add performance impact analysis",
        "reason": "Architecture changes should include performance considerations"
      },
      {
        "category": "clarity",
        "priority": "low",
        "suggestion": "Include diagrams for complex architectural changes",
        "reason": "Visual aids help communicate architectural decisions"
      }
    ],
    "overallScore": 8,
    "strengths": [
      "Comprehensive implementation plan",
      "Clear problem statement",
      "Well-defined phases"
    ],
    "weaknesses": [
      "Missing performance analysis",
      "Could benefit from architectural diagrams"
    ]
  }
}
```

## Error Responses

### Section Not Found
```json
{
  "jsonrpc": "2.0",
  "id": 20,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in get_cr_section**\n\nSection '## Non-existent Section' not found in CR MDT-052.\n\nAvailable sections:\n- # Add section-based content updates\n- ## 1. Description\n- ### Problem Statement\n- ### Current State\n- ## 2. Solution Analysis\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

### Ambiguous Section Match
```json
{
  "jsonrpc": "2.0",
  "id": 21,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in update_cr_section**\n\nMultiple sections match 'Requirements'. Please use a hierarchical path:\n\n- # Feature A / ## Requirements\n- # Feature B / ## Requirements\n\nUse the full hierarchical path to specify which section to update.\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

### Invalid Project
```json
{
  "jsonrpc": "2.0",
  "id": 22,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in get_cr_full_content**\n\nProject 'INVALID' not found. Available projects: MDT, LlmTranslator, goto_dir, sentence-breakdown, debug\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

### Invalid Status Transition
```json
{
  "jsonrpc": "2.0",
  "id": 23,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in update_cr_status**\n\nInvalid status transition from 'Implemented' to 'In Progress'. Valid transitions from 'Implemented': none (terminal state)\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

### Missing Required Fields
```json
{
  "jsonrpc": "2.0",
  "id": 24,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in create_cr**\n\nValidation failed:\n- title: Required field is missing\n- type: Must be one of: Architecture, Feature Enhancement, Bug Fix, Technical Debt, Documentation\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

## Configuration Examples

### MCP Server Configuration
**File:** `~/.config/markdown-ticket/mcp-server.toml`
```toml
[server]
port = 8000
logLevel = "info"

[discovery]
# Explicit paths for security
scanPaths = [
  "/Users/kirby/home",
  "/Users/kirby/projects"
]

excludePaths = [
  "node_modules",
  ".git",
  "dist",
  "build"
]

maxDepth = 4
cacheTimeout = 300

[templates]
customPath = "/Users/kirby/.config/markdown-ticket/templates"
```

### Environment Variables
```bash
# Limit MCP to specific project
export MCP_PROJECT_FILTER=MDT

# Set project scan paths
export MCP_SCAN_PATHS="/Users/kirby/home/markdown-ticket"
```

## Integration Testing

### Test MCP Server Locally
```bash
# Build and start MCP server
cd mcp-server
npm run build
npm start

# Test with curl (if HTTP endpoint available)
curl -X POST http://localhost:8000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'
```

### Test with AI Assistants
```bash
# Add to Amazon Q CLI
q mcp add --name mdt-test \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global

# Test basic functionality
q chat "List all projects using MCP"
q chat "Create a new bug fix CR for project MDT"
```
