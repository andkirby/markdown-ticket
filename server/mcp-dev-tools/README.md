# MCP Development Tools

MCP server that provides LLMs with filtered access to application logs and development status during development. This enables AI assistants to monitor build output, runtime errors, and application health without being overwhelmed by verbose logs.

## Features

- **Frontend Log Access**: Stream and filter frontend development logs
- **Session Management**: Monitor frontend development session status
- **URL Streaming**: Access frontend URLs and endpoints
- **Smart Filtering**: Get last N lines or filter by text patterns
- **Real-time Monitoring**: Live access to development output

## Architecture

This MCP server integrates with the main application via API endpoints rather than external process management, providing a clean separation between development tooling and core application functionality.

## Available Tools

### `get_frontend_logs`
**Description**: Get filtered frontend development logs

**Parameters**:
- `lines` (number, optional): Number of recent log lines to retrieve (default: 50)
- `filter` (string, optional): Text pattern to filter logs
- `level` (string, optional): Log level filter ("error", "warn", "info", "debug")

**Response**: Formatted log output with timestamps and filtering applied

### `get_frontend_session_status`
**Description**: Check the status of the frontend development session

**Parameters**: None

**Response**: Session status including:
- Running state (active/inactive)
- Process information
- Last activity timestamp
- Port and URL information

### `stop_frontend_logging`
**Description**: Stop the frontend logging session

**Parameters**: None

**Response**: Confirmation of logging session termination

### `stream_frontend_url`
**Description**: Access frontend URLs and endpoint information

**Parameters**:
- `path` (string, optional): Specific path to check (default: "/")

**Response**: URL accessibility and response information

## Configuration

### MCP Integration

**Claude Desktop** (`.claude/settings.local.json`):
```json
{
  "mcpServers": {
    "mdt-logging": {
      "type": "stdio",
      "command": "node",
      "args": [
        "~/home/markdown-ticket/server/mcp-dev-tools/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

**Amazon Q CLI** (`.amazonq/mcp.json`):
```json
{
  "mcpServers": {
    "mdt-logging-local": {
      "type": "stdio",
      "command": "node",
      "args": [
        "~/home/markdown-ticket/server/mcp-dev-tools/dist/index.js"
      ],
      "env": {}
    }
  }
}
```

### Environment Variables

- `BACKEND_URL` (optional): Backend server URL (default: "http://localhost:3001")

## Development Setup

### Build the MCP Server
```bash
cd server/mcp-dev-tools
npm install
npm run build
```

### Health Check
```bash
# Run health check via npm
npm run health-check

# Or use the shell wrapper
./health-check.sh
```

The health check verifies that:
- MCP server builds and starts correctly
- Server responds to initialization requests
- No critical startup errors occur

### Start Development Environment
```bash
# Terminal 1: Start backend
cd server
node server.js

# Terminal 2: Start frontend
npm run dev

# Terminal 3: Test MCP server
cd server/mcp-dev-tools
npm start
```

### Testing MCP Tools

**With Claude Desktop**:
```
Get the last 20 lines of frontend logs
Show me any error messages in the frontend logs
Check if the frontend development server is running
```

**With Amazon Q CLI**:
```bash
q chat "Check the frontend development status using MCP"
q chat "Show me recent frontend logs with any errors"
```

## Integration with Main Application

The MCP server connects to the main application through:

1. **Backend API**: Communicates with the Node.js backend server
2. **Log Streaming**: Accesses development logs via API endpoints
3. **Status Monitoring**: Checks application health through status endpoints

## Use Cases

### Development Debugging
- **Monitor build errors** in real-time during development
- **Track runtime issues** without manual log inspection
- **Check application health** before making changes

### AI-Assisted Development
- **LLMs can see errors** and suggest fixes immediately
- **Context-aware debugging** with access to recent logs
- **Automated status checks** before code changes

### Development Workflow
- **Pre-commit checks** - verify no errors before committing
- **Continuous monitoring** - watch for issues during development
- **Smart filtering** - focus on relevant log messages only

## File Structure

```
server/mcp-dev-tools/
├── src/
│   ├── index.ts              # Main MCP server entry point
│   └── tools/
│       ├── frontend-logs.ts      # Log access tools
│       ├── frontend-session.ts   # Session management
│       └── stream-urls.ts         # URL streaming tools
├── dist/                     # Compiled JavaScript output
├── package.json             # Dependencies and scripts
└── README.md               # This documentation
```

## Related Documentation

- **Main README**: Development section with setup instructions
- **MDT-036**: Original CR for MCP Control Server implementation
- **Frontend Development Guide**: `docs/FRONTEND_DEVELOPMENT_GUIDE.md`

## Troubleshooting

### MCP Server Not Starting
1. Ensure the server is built: `npm run build`
2. Check Node.js version compatibility
3. Verify backend server is running on expected port

### No Logs Available
1. Confirm frontend development server is running
2. Check backend API connectivity
3. Verify log endpoints are accessible

### Permission Issues
1. Ensure MCP server has access to log files
2. Check file system permissions
3. Verify backend API authentication (if applicable)

## Future Enhancements

- **Backend log access** - Extend to backend development logs
- **Build process monitoring** - Track compilation and build status
- **Performance metrics** - Monitor development server performance
- **Custom log filters** - User-defined filtering patterns
- **Log persistence** - Optional log history storage
