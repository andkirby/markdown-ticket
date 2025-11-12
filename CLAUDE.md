# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Frontend (React + Vite + TypeScript)
- `npm run dev` - Start frontend development server (localhost:5173)
- `npm run build` - Build for production (TypeScript + Vite)
- `npm run lint` - Run ESLint with TypeScript rules
- `npm run preview` - Preview production build

### Backend (Express.js + Node.js)
- `npm run dev:server` or `cd server && npm run dev` - Start backend with nodemon (localhost:3001)
- `npm run server` or `cd server && npm start` - Start backend in production mode
- `cd server && npm run create-samples` - Create sample ticket files
- `cd server && npm test` - Run backend Jest tests

### MCP Server (Model Context Protocol)
- `cd mcp-server && npm run build` - Build MCP server (required after code changes)
- `cd mcp-server && npm run dev` - Run MCP server in development mode with stdio transport (uses tsx, no build needed)
- `MCP_HTTP_ENABLED=true npm run dev` - Run MCP server with both stdio and HTTP transports
- `cd mcp-server && npm test` - Run MCP server Jest tests
- `cd mcp-server && npm run test:watch` - Run MCP tests in watch mode

**Testing HTTP Transport:**
```bash
# Start server with HTTP transport enabled
cd mcp-server && MCP_HTTP_ENABLED=true MCP_HTTP_PORT=3002 npm run dev

# Test with MCP Inspector (opens browser UI)
npx @modelcontextprotocol/inspector --transport streamable-http --server-url http://localhost:3002/mcp

# Test with curl
curl -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' \
  http://localhost:3002/mcp
```

**MCP Transport Options:**
- **Stdio Transport** (default): Always enabled, used by Claude Desktop and other stdio-based clients
- **HTTP Transport** (optional): Enable with `MCP_HTTP_ENABLED=true`, provides HTTP/JSON-RPC endpoint at `http://localhost:3002/mcp`
  - Eliminates docker-exec overhead in containerized deployments
  - Implements MCP Streamable HTTP specification (2025-06-18)
  - Endpoints: POST /mcp (JSON-RPC), GET /mcp (SSE streaming), GET /health, DELETE /mcp (session deletion)

**Phase 2 Features (all optional, disabled by default):**
- **Session Management**: Mcp-Session-Id header for stateful connections
- **SSE Streaming**: GET /mcp for real-time server-initiated messages
- **Rate Limiting**: Prevent abuse with configurable request limits
- **Authentication**: Bearer token authentication for secure access
- **Origin Validation**: DNS rebinding protection

**Environment Variables:**

Core:
- `MCP_HTTP_ENABLED=true` - Enable HTTP transport
- `MCP_HTTP_PORT=3002` - HTTP port (default: 3002)
- `MCP_BIND_ADDRESS=127.0.0.1` - Bind address (use 0.0.0.0 for Docker)

Phase 2 Security (all optional):
- `MCP_SESSION_TIMEOUT_MS=1800000` - Session timeout in ms (default: 30 min)
- `MCP_SECURITY_ORIGIN_VALIDATION=true` - Enable origin validation
- `MCP_ALLOWED_ORIGINS=http://localhost:5173` - Comma-separated allowed origins
- `MCP_SECURITY_RATE_LIMITING=true` - Enable rate limiting
- `MCP_RATE_LIMIT_MAX=100` - Max requests per window (default: 100)
- `MCP_RATE_LIMIT_WINDOW_MS=60000` - Rate limit window in ms (default: 1 min)
- `MCP_SECURITY_AUTH=true` - Enable Bearer token authentication
- `MCP_AUTH_TOKEN=your-token` - Required auth token

### Full Stack Development
- `npm run dev:full` - **RECOMMENDED** - Builds shared code and starts both frontend and backend concurrently
  - Equivalent to: `npm run build:shared && concurrently "npm run dev" "npm run dev:server"`
  - **Important**: Rebuilds shared types automatically before starting servers

### Testing
- `npm run test:e2e` - Run Playwright E2E tests across browsers
- `npm run test:e2e:ui` - Run Playwright tests with interactive UI
- `npm run test:e2e:headed` - Run Playwright tests in headed browser mode
- `npm run test:e2e:report` - Show Playwright test report
- `PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/specific-test.spec.ts --project=chromium` - Run specific test without server restart

## Architecture Overview

### Core Concept
AI-powered Kanban board where **tickets are markdown files** with YAML frontmatter stored in `docs/CRs/`. Changes are version-controlled with Git. The system provides real-time file watching, multi-project support, and MCP integration for AI assistants.

### Frontend Architecture (src/)

**Key Pattern**: Custom React hooks for state management, no external state library.

**Critical Services**:
- `fileService.ts` - Ticket CRUD operations with localStorage fallback
- `fileWatcher.ts` - Real-time file change polling (1-second intervals)
- `markdownParser.ts` - YAML frontmatter + markdown body parsing

**View Structure**:
- `Board` - Kanban board with drag-and-drop (HTML5 Drag & Drop API)
- `List` - Tabular view with sorting/filtering
- `DocumentsView` - File browser with collapsible tree navigation

**State Management**:
- `useProjectManager.ts` - Central hub for project/ticket state (recently refactored to use refs for stale closure prevention)
- `useTicketOperations.ts` - Ticket CRUD operations
- `useSSEEvents.ts` - Server-Sent Events for real-time updates

### Backend Architecture (server/)

**Layered Architecture** (refactored Oct 2024 from 2,456-line monolith):

```
server/
├── server.js (253 lines) - Application orchestration only
├── controllers/    - HTTP request handling
├── services/       - Business logic
├── repositories/   - Data access (file system)
├── routes/         - Express route definitions
├── middleware/     - Cross-cutting concerns
└── utils/          - Pure utility functions
```

**Key Services**:
- `ProjectService` - Multi-project management
- `TicketService` - CR/ticket operations with numbering
- `DocumentService` - Document discovery with path filtering
- `FileSystemService` - Legacy task file operations

**Important Routes**:
- `/api/projects` - Multi-project operations
- `/api/projects/:id/crs` - Project-specific CRs
- `/api/documents` - Document discovery with .mdt-config.toml path filtering
- `/api/filesystem` - File tree for path selection
- `/api/events` - SSE endpoint for real-time updates

### Shared Architecture (shared/)

**Purpose**: Code shared across frontend, backend, and MCP server to maintain consistency

**Key Modules**:
- `shared/models/Types.ts` - CR, CRStatus, CRType, CRPriority type definitions
- `shared/models/Project.ts` - Project, ProjectConfig interfaces
- `shared/services/ProjectService.ts` - Multi-project discovery and validation
- `shared/services/MarkdownService.ts` - YAML frontmatter parsing and CR file I/O
- `shared/services/TemplateService.ts` - CR template management
- `shared/templates/` - File-based templates for each CR type

**Build Required**: Run `npm run build:shared` to compile TypeScript before starting dev servers. This is automatically done by `npm run dev:full`.

### Data Flow & Real-time Updates

1. **Tickets as Files**: Each CR is a `.md` file in `docs/CRs/` with YAML frontmatter
2. **File Watching**: Backend uses `chokidar` to watch CR directories across all projects
3. **SSE Broadcasting**: File changes trigger SSE events to all connected clients
4. **Frontend Polling**: `fileWatcher.ts` also polls `/api/tasks` every 1 second as backup
5. **Optimistic UI**: Drag-and-drop updates UI immediately, then syncs to server

### Project Configuration System

**Dual Configuration Approach**:

1. **Global Registry** (`~/.config/markdown-ticket/projects/{project-dir}.toml`):
   - Minimal discovery metadata
   - Enables multi-project support
   - Created/updated via UI

2. **Local Configuration** (`{project}/.mdt-config.toml`):
   - Operational details: name, code, CR path, repository
   - `document_paths` array for document discovery
   - `exclude_folders` for filtering
   - Counter tracking in `.mdt-next` file

**Project Discovery**: Backend scans global registry on startup, validates local configs, sets up file watchers for each project.

## Critical Implementation Details

### Ticket File Format
```yaml
---
code: MDT-001
title: Example Ticket
status: Proposed
type: Feature Enhancement
priority: Medium
phaseEpic: Phase A
dependsOn: MDT-005
blocks: MDT-010
---

## 1. Description
Problem statement and context...

## 2. Rationale
Why this change is needed...
```

**Required Sections**: Description, Rationale, Solution Analysis, Implementation Specification, Acceptance Criteria

### Stale Closure Prevention
**Critical Pattern**: The frontend had pervasive stale closure bugs due to React hooks capturing old state. **Always use refs for values that change frequently and are accessed in callbacks/effects**. See `useProjectManager.ts` for the canonical pattern.

### Path Handling
- **Backend**: Always use relative paths from project root
- **Document Discovery**: `DocumentService` converts to relative paths for consistency
- **Frontend**: PathSelector expects relative paths for checkbox state tracking

### Smart Links & Markdown Processing
**Pattern**: Showdown.js with custom extensions for ticket reference links

**Link Processing Pipeline** (see `useTicketLinks.ts` and `TicketLinkProcessor.ts`):
1. `classifyLink()` at `useTicketLinks.ts:149` - Identifies ticket references (MDT-001) vs regular URLs
2. Showdown converts markdown to HTML
3. `TicketLinkProcessor.ts:68` - Post-processes HTML to add clickable ticket links with hover previews
4. **Critical**: Use absolute URLs for ticket links to prevent Showdown from treating them as relative paths

**Common Bug**: If ticket links show duplicated base URLs (e.g., `http://localhost:5173http://localhost:5173/...`):
- Check `classifyLink()` correctly identifies absolute URLs starting with `http://` or `https://`
- Verify `TicketLinkProcessor` doesn't prepend base URL to already-absolute URLs
- See MDT-062 for reference implementation

### MCP Integration Priority

**Tool Consolidation (Oct 2024)**: MCP tools optimized for 40% token reduction
- ✅ Use `get_cr` with modes (full/attributes/metadata) instead of separate tools
- ✅ Use `manage_cr_sections` for all section operations (list/get/update)
- ✅ Section updates are 84-94% more efficient than full document rewrites

**Always attempt MCP operations first**:
1. Try `mcp__mdt-all__*` or `mcp__markdown-ticket__*` tools
2. If fails, ask user: "The MCP server appears disconnected. Please run `/mcp` to reconnect or verify MCP server is built with `cd mcp-server && npm run build`"
3. Only after user confirms MCP restart, fall back to manual file operations

**MCP Server Scopes**:
- `mdt-all` (global) - Access all projects from any directory
- `mdt-tickets` (local) - Filtered to specific project via `MCP_PROJECT_FILTER`

**MCP Server Architecture** (Updated MDT-074):
The MCP server supports dual transport:
- **Stdio transport** (`mcp-server/src/transports/stdio.ts`): Always enabled, traditional stdio-based communication
- **HTTP transport** (`mcp-server/src/transports/http.ts`): Optional HTTP/JSON-RPC endpoint for containerized deployments
  - Eliminates docker-exec overhead
  - Implements MCP Streamable HTTP specification (2025-06-18)
  - Endpoints: `POST /mcp` (JSON-RPC), `GET /health` (health check)
  - Both transports share the same tool implementations in `mcp-server/src/tools/index.ts`

**Available Tools**: `list_projects`, `get_project_info`, `list_crs`, `get_cr`, `create_cr`, `update_cr_status`, `update_cr_attrs`, `delete_cr`, `manage_cr_sections`, `suggest_cr_improvements`

**See `mcp-server/MCP_TOOLS.md` for complete API reference**

### Logging & Debugging

**Backend Logs**:
- Use `mcp__mdt-logging__get_logs` to read backend logs
- SSE stream: `mcp__mdt-logging__stream_url`

**Frontend Logs**:
- Use `mcp__mdt-logging__get_frontend_logs` for browser console logs
- Session management: `get_frontend_session_status`, `stop_frontend_logging`

**Never restart servers** - use MCP logging tools instead unless user explicitly requests restart.

## CR Management Workflow

**Follow `docs/create_ticket.md` for**:
- When to create CRs (features, bugs, architectural decisions)
- CR structure and required sections
- Status workflow (Proposed → Approved → In Progress → Implemented)
- YAML frontmatter vs markdown content separation

**Key Principles**:
- CRs are permanent ADRs (Architectural Decision Records)
- Document the "why" not just the "what"
- Include Solution Analysis with rejected alternatives
- Keep Implementation Specification detailed and testable

## Common Development Patterns

### Adding New API Endpoints
1. Create route in `server/routes/`
2. Add controller method in `server/controllers/`
3. Implement business logic in `server/services/`
4. Update `server.js` route registration if needed

### Frontend State Updates
1. Check if `useProjectManager` already provides the state
2. Use refs for frequently-changing values accessed in callbacks
3. Implement optimistic updates for better UX
4. Handle SSE events for real-time sync

### Document Path Configuration
1. Edit `.mdt-config.toml` `document_paths` array
2. Use relative paths from project root
3. Add to `exclude_folders` to filter out unwanted directories
4. Frontend PathSelector shows all markdown files respecting these settings

## TypeScript & Build

- **Strict mode enabled** - All type errors must be resolved
- **Bundler module resolution** for modern import syntax
- **Target ES2020** for both frontend and backend
- **Playwright tests** automatically build before running

## Testing Strategy

**E2E Tests** (Playwright):
- Test user workflows across browsers (Chrome, Firefox, Safari, Mobile)
- Automatically start frontend (5173) and backend (3001) servers via `playwright.config.ts`
- Use `PWTEST_SKIP_WEB_SERVER=1` to skip server startup for faster iteration during debugging
- Example: `PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/ticket-move-simple.spec.ts --project=chromium --reporter=line`

**Backend Tests** (Jest):
- Unit tests for services, utilities, and controllers
- Run with `cd server && npm test`

**MCP Server Tests** (Jest):
- Tests for MCP tools and shared services
- Run with `cd mcp-server && npm test`
- Watch mode: `cd mcp-server && npm run test:watch`

## Important Conventions

- **Never include AI attribution** in git commits (no "Co-Authored-By: Claude")
- **Always use relative paths** in backend APIs for portability
- **Check for stale closures** when adding React hooks that reference changing state
- **Use MCP tools** before manual file operations
- **Follow CR format** from `docs/create_ticket.md` for all tickets
- A cli command for teseting MCP with streamable HTTP protocol: 
  timeout 10 npx @modelcontextprotocol/inspector --cli http://localhost:3002/mcp --transport http --method tools/list