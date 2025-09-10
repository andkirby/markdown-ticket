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
    "name": "get_cr",
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

## Analysis and Suggestions

### Get CR Improvement Suggestions
```json
{
  "jsonrpc": "2.0",
  "id": 11,
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
  "id": 11,
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

### Invalid Project
```json
{
  "jsonrpc": "2.0",
  "id": 12,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "❌ **Error in get_cr**\n\nProject 'INVALID' not found. Available projects: MDT, LlmTranslator, goto_dir, sentence-breakdown, debug\n\nPlease check your input parameters and try again."
      }
    ]
  }
}
```

### Invalid Status Transition
```json
{
  "jsonrpc": "2.0",
  "id": 13,
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
  "id": 14,
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
