# MCP Server for Universal CR Management - User Guide

This guide provides complete instructions for installing, configuring, and using the MCP Server for Universal CR Management. The server enables any MCP-compatible LLM to create, read, update, and manage Change Requests across multiple projects seamlessly.

## Table of Contents

1. [Quick Setup Guide](#quick-setup-guide)
2. [Overview](#overview)
3. [Prerequisites](#Prerequisites)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [Getting Started](#getting-started)
7. [Tool Reference](#tool-reference)
8. [Integration Setup](#integration-setup)
9. [Troubleshooting](#troubleshooting)
10. [Advanced Usage](#advanced-usage)

## Quick Setup Guide

### Pre-conditions
- Markdown-ticket project installed in `~/markdown-ticket`
- MCP server built (`npm run build` in mcp-server directory)
- Your project has a project code (e.g., "COD")

### Setup Process
1. Navigate to your project directory:
   ```bash
   cd /path/to/my-project
   ```

2. Choose your AI assistant and scope:

#### Amazon Q CLI

**Local scope** (project-specific, **🔴 currently not working - keep for future**):
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=COD \
  --env MCP_SCAN_PATHS="$(pwd)" \
  --scope workspace --force
```

**Global scope** (works, access all projects):
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global --force
```

#### Claude Code

**Local scope** (recommended, LLM sees only one project):
```bash
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=COD \
  --env MCP_SCAN_PATHS=$(pwd)
```

**Global scope** (access any project from anywhere):
```bash
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js
```

### Configuration Explained

**Environment Variables:**
- `MCP_PROJECT_FILTER=COD` - Limits MCP to specific project code (replace "COD" with your project code)
- `MCP_SCAN_PATHS=$(pwd)` - Sets project path for scanning (uses current directory)

**Scopes:**
- **Local/Workspace**: MCP only available in current project directory
  - ✅ **Security**: Only sees one project
  - ✅ **Focus**: LLM context limited to current project
  - ❌ **Limitation**: Must be run from project directory
  
- **Global**: MCP available from any directory
  - ✅ **Convenience**: Access from anywhere
  - ✅ **Multi-project**: Can work with all configured projects
  - ⚠️ **Security**: LLM can see all projects

**Recommendations:**
- Use **Local scope** for project-specific work (more secure)
- Use **Global scope** for multi-project management
- Replace "COD" with your actual project code
- For Amazon Q, use global scope until local scope is fixed

## Overview

The MCP CR Server provides **15 comprehensive tools** that enable LLMs to:

- **Discover Projects**: Automatically find and list all your CR projects
- **Manage CRs**: Create, read, update, and delete Change Requests
- **Section-Based Operations**: Efficiently read and update specific sections (90-98% token savings)
- **Template System**: Use type-specific templates for consistent CR structure
- **Validation**: Validate CR data before creation to prevent errors
- **Advanced Operations**: Find related CRs and get improvement suggestions

**Key Features:**
- 🔍 **Automatic Project Discovery** - Scans for `*-config.toml` files
- 🎯 **15 MCP Tools** covering complete CR lifecycle
- ⚡ **Section-Based Updates** - 90-98% token savings for targeted edits
- 📋 **5 CR Templates** (Architecture, Feature, Bug Fix, Tech Debt, Documentation)
- ⚡ **High Performance** - < 1s startup, < 200ms operations
- 🌐 **Universal Access** - Works with any MCP-compatible LLM

## Prerequisites

Before installing the MCP server, ensure you have:

- **Node.js 18+** installed on your system
- **npm** or **yarn** package manager
- **MCP-compatible client** (Claude Desktop, VS Code with MCP extension, etc.)
- **Project(s)** with `*-config.toml` files (see [Project Setup](#project-setup))

## Installation

### Step 1: Navigate to MCP Server Directory

```bash
cd /path/to/markdown-ticket/mcp-server
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Build the Server

```bash
npm run build
```

This creates the `dist/` directory with compiled JavaScript files.

### Step 4: Verify Installation

Test that the server starts correctly:

```bash
npm run dev
```

You should see output like:
```
🚀 Initializing MCP CR Server...
✅ Services initialized
🔧 Validating configuration...
🔍 Discovering projects...
📁 Found X projects
✅ MCP CR Server is running and ready for connections!
```

Press `Ctrl+C` to stop the test.

## Configuration

### Default Configuration

The server works out-of-the-box with sensible defaults:

- **Scan Paths**: `~`, `~/projects`, `~/work`, `~/Documents`
- **Max Depth**: 4 directory levels
- **Cache Timeout**: 5 minutes
- **Log Level**: info

### Custom Configuration File

Create a configuration file at one of these locations:

1. `~/.config/mcp-server/config.toml` (recommended)
2. `~/.mcp-server.toml`
3. Current directory: `mcp-server-config.toml`

**Sample Configuration:**

```toml
[server]
port = 8000
logLevel = "info"  # debug, info, warn, error

[discovery]
# Paths to scan for *-config.toml files
scanPaths = [
  "~",
  "~/projects", 
  "~/work",
  "~/Documents/code"
]

# Directories to exclude from scanning
excludePaths = [
  "node_modules",
  ".git", 
  "vendor",
  ".next",
  "dist",
  "build",
  "__pycache__",
  ".vscode"
]

# Maximum directory depth to scan
maxDepth = 4

# Cache timeout in seconds
cacheTimeout = 300

[templates]
# Optional: Path to custom templates
# customPath = "~/.config/mcp-server/templates"
```

### Project Setup

For the server to discover your projects, each project needs:

1. **Configuration File**: `*-config.toml` (e.g., `.mdt-config.toml`)
2. **CR Directory**: Directory specified in config (e.g., `docs/CRs`)
3. **Counter File**: File to track CR numbers (e.g., `.mdt-next`)

**Example Project Structure:**
```
my-project/
├── .mdt-config.toml          # Project configuration
├── .mdt-next                 # Counter file (contains next number)
└── docs/CRs/                 # CR directory
    ├── MDT-001-feature.md
    └── MDT-002-bugfix.md
```

**Sample `.mdt-config.toml`:**
```toml
[project]
name = "My Project"
code = "MDT"
path = "docs/CRs"
startNumber = 1
counterFile = ".mdt-next"
description = "My awesome project"
repository = "https://github.com/user/project"
```

## Getting Started

### Step 1: Start the Server

```bash
cd mcp-server
npm start
```

Or for development with auto-reload:
```bash
npm run dev
```

### Step 2: Connect Your MCP Client

The server uses **stdio transport**, so it connects via stdin/stdout rather than a network port.

### Step 3: Verify Connection

Once connected, your MCP client should show **15 available tools**:

**Project Management:**
- `list_projects` - List all discovered projects
- `get_project_info` - Get detailed project information

**CR Operations:**
- `list_crs` - List CRs with filtering options
- `get_cr` - Get detailed CR information
- `create_cr` - Create new CRs
- `update_cr_status` - Update CR status
- `delete_cr` - Delete CRs

**Section-Based Operations** ⚡ *90-98% token savings*:
- `list_cr_sections` - Discover all sections in a CR document
- `get_cr_section` - Read specific section content efficiently
- `update_cr_section` - Update sections with replace/append/prepend operations

**Templates & Validation:**
- `get_cr_template` - Get CR templates
- `validate_cr_data` - Validate CR data
- `get_next_cr_number` - Get next CR number

**Advanced:**
- `find_related_crs` - Find related CRs
- `suggest_cr_improvements` - Get improvement suggestions

## Tool Reference

### Project Management Tools

#### `list_projects`
Lists all discovered projects with their basic information.

**Parameters:** None

**Example Response:**
```
📁 Found 3 projects:

• MDT - Markdown Ticket Board
  Description: Kanban-style ticket board
  Path: /path/to/project/docs/CRs
  CRs: 5

• API - Backend API
  Description: REST API services  
  Path: /path/to/api/docs/CRs
  CRs: 12
```

#### `get_project_info`
Get detailed information about a specific project.

**Parameters:**
- `key` (string): Project key (e.g., "MDT")

**Example:**
```json
{
  "key": "MDT"
}
```

### CR Operations Tools

#### `list_crs`
List CRs for a project with optional filtering.

**Parameters:**
- `project` (string): Project key
- `filters` (object, optional): Filter criteria
  - `status`: String or array of status values
  - `type`: String or array of CR types  
  - `priority`: String or array of priorities

**Example:**
```json
{
  "project": "MDT",
  "filters": {
    "status": ["Proposed", "Approved"],
    "priority": "High"
  }
}
```

#### `get_cr`
Get detailed information about a specific CR.

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key (e.g., "MDT-004")

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-004"
}
```

#### `create_cr`
Create a new CR in the specified project.

**Parameters:**
- `project` (string): Project key
- `type` (string): CR type ("Architecture", "Feature Enhancement", "Bug Fix", "Technical Debt", "Documentation")
- `data` (object): CR data
  - `title` (string, required): CR title
  - `priority` (string, optional): "Low", "Medium", "High", "Critical"
  - `description` (string, optional): Problem description
  - `rationale` (string, optional): Why this CR is needed
  - `impactAreas` (array, optional): Areas of system affected
  - `content` (string, optional): Full markdown content

**Example:**
```json
{
  "project": "MDT",
  "type": "Feature Enhancement", 
  "data": {
    "title": "Add dark mode toggle",
    "priority": "Medium",
    "description": "Users need ability to switch themes",
    "rationale": "Improves accessibility and user preference",
    "impactAreas": ["Frontend UI", "CSS styling", "User settings"]
  }
}
```

#### `update_cr_status`
Update the status of an existing CR.

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key
- `status` (string): New status ("Proposed", "Approved", "In Progress", "Implemented", "Rejected")

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-006",
  "status": "Approved"
}
```

#### `delete_cr`
Delete a CR (typically used for implemented bug fixes).

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-003"
}
```

### Template & Validation Tools

#### `get_cr_template`
Get the template structure for a specific CR type.

**Parameters:**
- `type` (string): CR type

**Example:**
```json
{
  "type": "Bug Fix"
}
```

#### `validate_cr_data`
Validate CR data before creation.

**Parameters:**
- `project` (string): Project key
- `data` (object): CR data to validate

**Example:**
```json
{
  "project": "MDT",
  "data": {
    "title": "Fix authentication bug",
    "type": "Bug Fix",
    "priority": "High"
  }
}
```

#### `get_next_cr_number`
Get the next available CR number for a project.

**Parameters:**
- `project` (string): Project key

**Example:**
```json
{
  "project": "MDT"
}
```

### Advanced Tools

#### `find_related_crs`
Find CRs related to given keywords.

**Parameters:**
- `project` (string): Project key  
- `keywords` (array): Keywords to search for

**Example:**
```json
{
  "project": "MDT",
  "keywords": ["authentication", "login", "security"]
}
```

#### `suggest_cr_improvements`
Get suggestions for improving an existing CR.

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key to analyze

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-004"
}
```

### Section-Based Operations Tools

The section-based tools provide **90-98% token savings** compared to full document operations by targeting specific sections.

#### `list_cr_sections`
List all sections in a CR document with hierarchical tree structure. Use this to discover available sections before reading or updating.

**Parameters:**
- `project` (string): Project key (e.g., "MDT", "SEB")
- `key` (string): CR key (e.g., "MDT-001", "SEB-010")

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-052"
}
```

**Example Response:**
```
📑 Sections in CR MDT-052 - Add section-based content updates

Found 17 sections:

- # Add section-based content updates (empty)
  - ## 1. Description (1234 chars)
    - ### Problem Statement (567 chars)
    - ### Current State (345 chars)
  - ## 2. Solution Analysis (890 chars)
  - ## 3. Implementation Specification (1567 chars)

Usage:
To read or update a section, use the exact header text shown (with # symbols).
```

**Token Efficiency:** ~150 tokens vs ~2500 for full document (94% savings)

#### `get_cr_section`
Read specific section content without loading the full document. Use `list_cr_sections` first to discover available sections.

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key
- `section` (string): Section to read. Can be:
  - Simple name: "Problem Statement" or "Requirements"
  - Markdown header: "### Problem Statement" or "## 2. Solution Analysis"
  - Hierarchical path for duplicates: "## Feature AA / ### Requirements"

**Example:**
```json
{
  "project": "MDT",
  "key": "MDT-052",
  "section": "### Problem Statement"
}
```

**Token Efficiency:** ~125 tokens vs ~800 for full document (84% savings)

#### `update_cr_section`
Update a specific section efficiently. Supports three operations:

**Parameters:**
- `project` (string): Project key
- `key` (string): CR key
- `section` (string): Section to update (same format as `get_cr_section`)
- `operation` (string): Operation type:
  - `"replace"` - Replace entire section content
  - `"append"` - Add content to end of section
  - `"prepend"` - Add content to beginning of section
- `content` (string): Content to apply

**Example (Replace):**
```json
{
  "project": "MDT",
  "key": "MDT-052",
  "section": "## 4. Acceptance Criteria",
  "operation": "replace",
  "content": "- [ ] All three section-based tools work correctly\n- [ ] Token usage is reduced by 90%+\n- [ ] No data corruption occurs"
}
```

**Example (Append):**
```json
{
  "project": "MDT",
  "key": "MDT-052",
  "section": "## 5. Implementation Notes",
  "operation": "append",
  "content": "\n\n### Performance Results\n- Section parsing: O(n) complexity\n- Average update: 150 tokens vs 2500 tokens (94% savings)"
}
```

**Token Efficiency:** ~150 tokens vs ~2500 for full document update (94% savings)

**Workflow Example:**
```
1. list_cr_sections(project="MDT", key="MDT-052")
2. get_cr_section(project="MDT", key="MDT-052", section="## 1. Description")
3. update_cr_section(project="MDT", key="MDT-052", section="## 5. Implementation Notes", operation="append", content="...")
```

## Integration Setup

### Claude Desktop

1. **Build the MCP Server:**
   ```bash
   cd mcp-server
   npm run build
   ```

2. **Get the full path to the server:**
   ```bash
   pwd
   # Copy the output, e.g., /Users/yourname/projects/markdown-ticket/mcp-server
   ```

3. **Open Claude Desktop Settings** and add to MCP configuration:

   ```json
   {
     "mcpServers": {
       "cr-management": {
         "command": "node",
         "args": ["/full/path/to/mcp-server/dist/index.js"],
         "env": {}
       }
     }
   }
   ```

4. **Restart Claude Desktop** for changes to take effect.

5. **Test the connection** by asking Claude:
   ```
   "List all my projects using the MCP CR server"
   ```

### VS Code with MCP Extension

1. Install an MCP extension for VS Code
2. Configure the extension to use the built MCP server
3. Point to the `dist/index.js` file

### Other MCP Clients

Any MCP-compatible client can connect using the stdio transport protocol. Refer to your client's documentation for MCP server configuration.

## Troubleshooting

### Server Won't Start

**Problem**: Error when running `npm run dev` or `npm start`

**Solutions:**
1. **Check Node.js version:**
   ```bash
   node --version  # Should be 18+
   ```

2. **Reinstall dependencies:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Check for TypeScript errors:**
   ```bash
   npm run build
   ```

### No Projects Found

**Problem**: Server starts but reports "Found 0 projects"

**Solutions:**
1. **Verify project structure:**
   - Ensure you have `*-config.toml` files in your projects
   - Check that scan paths include your project directories

2. **Check configuration:**
   ```bash
   # Create config file with your project paths
   mkdir -p ~/.config/mcp-server
   cat > ~/.config/mcp-server/config.toml << 'EOF'
   [discovery]
   scanPaths = ["/path/to/your/projects"]
   maxDepth = 5
   EOF
   ```

3. **Test project discovery manually:**
   - Check that config files exist: `find ~ -name "*-config.toml" -type f`

### Permission Errors

**Problem**: "Permission denied" or file system errors

**Solutions:**
1. **Check directory permissions:**
   ```bash
   ls -la /path/to/project/
   chmod 755 /path/to/project/docs/CRs
   ```

2. **Verify write access:**
   ```bash
   touch /path/to/project/docs/CRs/test.md
   rm /path/to/project/docs/CRs/test.md
   ```

### MCP Client Connection Issues

**Problem**: Client can't connect to MCP server

**Solutions:**
1. **Verify server path:**
   ```bash
   ls -la /full/path/to/mcp-server/dist/index.js
   ```

2. **Test server independently:**
   ```bash
   node /full/path/to/mcp-server/dist/index.js
   ```

3. **Check client logs** for specific error messages

### Configuration Errors

**Problem**: Configuration validation failures

**Solutions:**
1. **Check TOML syntax:**
   ```bash
   # Test TOML file
   node -e "console.log(require('toml').parse(require('fs').readFileSync('config.toml', 'utf8')))"
   ```

2. **Validate paths exist:**
   ```bash
   ls -la ~/projects  # Check scan paths exist
   ```

3. **Use absolute paths** instead of relative ones in config

### Common Error Messages

#### "Failed to parse config file"
- **Cause**: Invalid TOML syntax
- **Fix**: Check for missing quotes, brackets, or proper TOML structure

#### "Scan path does not exist"  
- **Cause**: Configured scan path doesn't exist
- **Fix**: Update `scanPaths` in config or create the directories

#### "CR validation failed"
- **Cause**: Required fields missing from CR data
- **Fix**: Use `validate_cr_data` tool before `create_cr`

#### "Project 'XXX' not found"
- **Cause**: Project key doesn't match discovered projects
- **Fix**: Use `list_projects` to see available project keys

## Advanced Usage

### Custom Templates

Create custom CR templates by:

1. **Create templates directory:**
   ```bash
   mkdir -p ~/.config/mcp-server/templates
   ```

2. **Add template files:**
   ```bash
   # Example custom Bug Fix template
   cat > ~/.config/mcp-server/templates/bug-fix.md << 'EOF'
   # Custom Bug Fix Template
   
   ## Problem Description
   [Describe the issue]
   
   ## Steps to Reproduce
   [Detailed steps]
   
   ## Expected vs Actual
   [What should happen vs what happens]
   EOF
   ```

3. **Update configuration:**
   ```toml
   [templates]
   customPath = "~/.config/mcp-server/templates"
   ```

### Performance Optimization

For large numbers of projects (100+):

1. **Increase cache timeout:**
   ```toml
   [discovery]
   cacheTimeout = 900  # 15 minutes
   ```

2. **Limit scan depth:**
   ```toml
   [discovery]
   maxDepth = 3
   ```

3. **Add more exclusions:**
   ```toml
   [discovery]
   excludePaths = [
     "node_modules", ".git", "vendor", 
     "target", "build", "dist", ".next",
     "venv", "__pycache__", ".pytest_cache"
   ]
   ```

### Batch Operations

Use the MCP tools programmatically for batch operations:

```javascript
// Example: Update all "Proposed" CRs to "Approved"
// (This would be done through your MCP client)

1. list_crs(project="MDT", filters={status: "Proposed"})
2. For each CR: update_cr_status(project="MDT", key=cr.key, status="Approved")
```

### Integration with CI/CD

The MCP server can be integrated into CI/CD pipelines:

1. **Automated CR creation** from commit messages
2. **Status updates** based on deployment stages  
3. **Related CR discovery** for impact analysis

### Multi-Project Workflows

For managing multiple related projects:

1. **Cross-project searches:**
   ```json
   {
     "project": "API",
     "keywords": ["authentication"]
   }
   ```

2. **Consistent numbering** across project families
3. **Template sharing** via custom template paths

---

## Support and Resources

- **Implementation Details**: See `docs/CRs/MDT-004-mcp-server-cr-management.md`
- **Request Examples**: See `mcp-server/MCP_REQUEST_SAMPLES.md`
- **Project Configuration**: See existing `.mdt-config.toml` files
- **Issues**: Report problems in your project's issue tracker

For additional help or feature requests, consult the MCP server implementation documentation or create a new CR using the server itself! 🎯