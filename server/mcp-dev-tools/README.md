# MCP Development Tools

MCP server for accessing application logs during development. Provides LLMs with filtered access to backend logs without overwhelming output.

## Features

- **Log Access**: Get recent logs with line limits and text filtering
- **SSE Streaming**: Real-time log streaming with filtering (experimental)
- **Smart Filtering**: Filter logs by text patterns
- **Development Focus**: Designed for development workflow assistance

## Setup

### 1. Build the MCP Server

```bash
cd server/mcp-dev-tools
npm install
npm run build
```

### 2. Start Backend with Log Interception

The main backend server (`server/server.js`) now includes:
- Console.log interception and buffering
- `/api/logs` endpoint for polling
- `/api/logs/stream` endpoint for SSE

Just start the backend normally:
```bash
cd server
node server.js
```

### 3. Configure MCP Client

**Amazon Q CLI (Global):**
```bash
q mcp add --name mdt-dev-tools \
  --command "node" \
  --args /Users/kirby/home/markdown-ticket/server/mcp-dev-tools/dist/index.js \
  --scope global --force
```

**Claude Code:**
```bash
claude mcp add mdt-dev-tools node /Users/kirby/home/markdown-ticket/server/mcp-dev-tools/dist/index.js
```

## Available Tools

### `get_logs(lines?, filter?)`
Get recent application logs with optional filtering.

**Parameters:**
- `lines` (number): Number of recent lines (default: 20, max: 100)
- `filter` (string): Text filter to match in log messages

**Example:**
```
get_logs(10, "error")  // Last 10 lines containing "error"
```

### `stream_logs(filter?)`
Get SSE endpoint URL for real-time log streaming.

**Parameters:**
- `filter` (string): Text filter for SSE stream

**Returns:** SSE endpoint URL that can be subscribed to for real-time updates.

## API Endpoints

The backend exposes these endpoints:

- `GET /api/logs?lines=20&filter=error` - Get filtered logs (polling)
- `GET /api/logs/stream?filter=error` - SSE log streaming

## Environment Variables

- `BACKEND_URL` - Backend server URL (default: http://localhost:3001)

## Development

```bash
npm run dev    # Watch mode for TypeScript compilation
npm run build  # Build for production
npm start      # Start MCP server
```

## Usage Example

1. Start backend: `node server/server.js`
2. Configure MCP client (see setup above)
3. Use LLM tools:
   - "Get recent logs" → `get_logs()`
   - "Show errors" → `get_logs(50, "error")`
   - "Monitor logs" → `stream_logs("build")`

The LLM can now monitor your development process and help debug issues in real-time!
