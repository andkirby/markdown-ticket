# MCP Server for Universal CR Management - User Guide

Essential guide for using the MCP Server that enables any MCP-compatible LLM to create, read, update, and manage Change Requests across multiple projects.

## Quick Setup

### 1. Build the Server
```bash
cd ~/markdown-ticket/mcp-server
npm install
npm run build
```

### 2. Add to Your AI Assistant

#### Claude Code (Recommended)
```bash
# Global access (all projects)
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js

# Project-specific access
claude mcp add mdt-all node $HOME/markdown-ticket/mcp-server/dist/index.js \
  --env MCP_PROJECT_FILTER=MDT \
  --env MCP_SCAN_PATHS=$(pwd)
```

#### Amazon Q CLI
```bash
q mcp add --name mdt-all \
  --command "node" \
  --args $HOME/markdown-ticket/mcp-server/dist/index.js \
  --scope global --force
```



### 3. Test Connection
Ask your AI assistant: "List all my projects using the MCP server"

### 4. Claude Code Memory Setup

For optimal experience with Claude Code, add this to your global memory:

**Global Memory (recommended):**
```
For tickets management use MCP mdt-all. If you don't have project code in your memory, use this command `cat .mdt-config.toml | grep 'code = '` to find it out, or projects list from this MCP.
```

**Or add per-project:**
```
For ticket (change request / CR) management use MCP mdt-all. Project code is "YOUR_PROJECT_CODE".
```

This helps Claude Code remember to use the MCP tools and automatically discover project codes.

## Dual Transport Architecture

The MCP server supports **dual transports** for maximum compatibility:

### Stdio Transport (Default)
- **Use Case**: Direct AI assistant integration (Claude Desktop, VS Code)
- **Connection**: stdin/stdout communication
- **Setup**: No additional configuration needed

### HTTP Transport (New)
- **Use Case**: Web clients, Docker containers, remote access
- **Connection**: HTTP/JSON-RPC endpoints
- **Enabled by default**: All npm scripts include HTTP transport

#### HTTP Endpoints
- `POST http://localhost:3002/mcp` - JSON-RPC tool calls
- `GET http://localhost:3002/mcp` - Server-Sent Events (SSE)
- `GET http://localhost:3002/health` - Health check
- `DELETE http://localhost:3002/mcp` - Session management

#### HTTP Testing with curl
```bash
# Test tools list
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'

# Test project listing
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'

# Check health
curl http://localhost:3002/health
```

#### HTTP Client Setup
```bash
# Start HTTP server
cd mcp-server
npm run dev

# Test with MCP Inspector (browser UI)
npx @modelcontextprotocol/inspector --transport streamable-http --server-url http://localhost:3002/mcp
```

## Essential Tools

The MCP server provides **10 consolidated tools** for complete CR management:

### Core Operations
- **`list_projects`** - Discover all available projects
- **`get_project_info`** - Get detailed project information
- **`list_crs`** - List CRs with filtering (status, type, priority)
- **`get_cr`** - Get CR content (modes: full, attributes, metadata)

### CR Management
- **`create_cr`** - Create new CRs (auto-generates templates)
- **`update_cr_attrs`** - Update CR attributes (title, priority, etc.)
- **`update_cr_status`** - Update CR status workflow
- **`delete_cr`** - Remove CRs

### Advanced Features
- **`manage_cr_sections`** - Efficient section operations (84-94% token savings)
- **`suggest_cr_improvements`** - Get AI-powered improvement suggestions

## Integration Setup

### Environment Variables
- `MCP_PROJECT_FILTER=MDT` - Limit to specific project
- `MCP_SCAN_PATHS=/path/to/project` - Set project directory
- `MCP_HTTP_ENABLED=true|false` - Enable/disable HTTP transport (default: true)
- `MCP_HTTP_PORT=3002` - Change HTTP port (default: 3002)

### HTTP Transport Control

**Note**: All npm scripts (`build`, `start`, `dev`) have HTTP transport enabled by default.

#### Custom HTTP Port
```bash
# Use custom HTTP port
MCP_HTTP_PORT=8080 npm run dev

# Or set environment variable
export MCP_HTTP_PORT=8080
npm run dev
```

#### Manual Server Control
```bash
# Run server directly with HTTP transport
MCP_HTTP_ENABLED=true MCP_HTTP_PORT=3002 node dist/index.js

# Run with stdio transport only (no HTTP)
node dist/index.js

# Development with HTTP transport
MCP_HTTP_ENABLED=true MCP_HTTP_PORT=9000 tsx src/index.ts

# Development with stdio transport only
tsx src/index.ts
```

### Project Requirements
Each project needs:
1. **Configuration File**: `.mdt-config.toml` with project code
2. **CR Directory**: Path specified in config (usually `docs/CRs`)
3. **Counter File**: `.mdt-next` for CR numbering

**Sample `.mdt-config.toml`:**
```toml
[project]
name = "My Project"
code = "MDT"
path = "docs/CRs"
startNumber = 1
```

## HTTP Transport Features

### Security Options (Optional)
Configure via environment variables:

```bash
# Enable rate limiting
MCP_SECURITY_RATE_LIMITING=true
MCP_RATE_LIMIT_MAX=100
MCP_RATE_LIMIT_WINDOW_MS=60000

# Enable authentication
MCP_SECURITY_AUTH=true
MCP_AUTH_TOKEN=your-secret-token

# Enable origin validation
MCP_SECURITY_ORIGIN_VALIDATION=true
MCP_ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
```

### Session Management
- **Optional Sessions**: HTTP requests can use `Mcp-Session-Id` header
- **Timeout**: Default 30 minutes (configurable)
- **SSE Streaming**: Real-time updates for connected clients

### Docker Benefits
- **No Docker Exec Overhead**: HTTP eliminates container communication issues
- **Network Access**: Access MCP server from any container/host
- **Load Balancing**: Multiple MCP server instances behind load balancer

## Tool Usage Examples

### Basic Workflow
```bash
# 1. List projects
list_projects()

# 2. List CRs in MDT project
list_crs(project="MDT", filters={status: "Proposed"})

# 3. Create a new CR
create_cr(
  project="MDT",
  type="Feature Enhancement",
  data={title: "Add user authentication", priority: "High"}
)

# 4. Update specific section (94% token savings)
manage_cr_sections(
  project="MDT",
  key="MDT-001",
  operation="update",
  section="## 5. Acceptance Criteria",
  updateMode="replace",
  content="- [ ] Users can login with email/password\n- [ ] Session management works"
)
```

### HTTP Request Examples
```bash
# Create CR via HTTP
curl -X POST http://localhost:3002/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0","id":1,
    "method":"tools/call",
    "params":{
      "name":"create_cr",
      "arguments":{
        "project":"MDT",
        "type":"Bug Fix",
        "data":{"title":"Fix login bug","priority":"High"}
      }
    }
  }'
```

## Performance Notes

- **Startup**: < 1 second
- **Tool Operations**: < 200ms average
- **Section Operations**: 84-94% token reduction vs full document
- **HTTP Overhead**: < 5ms compared to stdio
- **Memory Usage**: ~50MB base + project cache

---

**For detailed tool reference**: See `mcp-server/MCP_TOOLS.md`
**For request examples**: See `mcp-server/MCP_REQUEST_SAMPLES.md`
**Issues**: Report in your project's issue tracker