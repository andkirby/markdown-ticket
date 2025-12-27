# CLAUDE.md

Guidance for Claude Code working with this repository.

## Development Commands

### Frontend
- `npm run dev` - Dev server (localhost:5173)
- `npm run build` - Production build
- `npm run lint` - ESLint

### Backend
- `npm run dev:server` - Dev server with nodemon (localhost:3001)
- `npm run server` - Production mode
- `cd server && npm test` - Jest tests

### MCP Server
- `cd mcp-server && npm run build` - Build (required after code changes)
- `cd mcp-server && npm run dev` - Dev mode (stdio, uses tsx)
- `MCP_HTTP_ENABLED=true npm run dev` - Stdio + HTTP transports
- `cd mcp-server && npm test` - Jest tests

**HTTP Transport:**
- Enable: `MCP_HTTP_ENABLED=true`
- Port: `MCP_HTTP_PORT=3002` (default)
- Test: `npx @modelcontextprotocol/inspector --transport streamable-http --server-url http://localhost:3002/mcp`
- Optional Phase 2: Session management, SSE streaming, rate limiting, auth, origin validation

### Full Stack
- `npm run dev:full` - **Recommended** - Builds shared code, starts frontend + backend

### Testing
- `npm run test:e2e` - Playwright E2E
- `PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/file.spec.ts --project=chromium` - Run specific test without server restart

## Architecture

**Core Concept**: Kanban board where tickets are markdown files with YAML frontmatter in `docs/CRs/`, version-controlled with Git, with real-time file watching and MCP integration.

### Frontend (src/)
- **State**: Custom React hooks, no external library
- **Key**: `useProjectManager.ts` (central hub, uses refs to prevent stale closures)
- **Views**: Board (drag-drop), List (tabular), DocumentsView (file browser)

### Backend (server/)
Layered architecture: controllers → services → repositories
- `ProjectService` - Multi-project management
- `TicketService` - CR operations with numbering
- `DocumentService` - Document discovery with path filtering
- Routes: `/api/projects`, `/api/projects/:id/crs`, `/api/documents`, `/api/filesystem`, `/api/events` (SSE)

### Shared (shared/)
- **Build Required**: Run `npm run build:shared` before dev servers (auto-done by `dev:full`)
- Types: `CR`, `Project`, `ProjectConfig`
- Services: `ProjectService`, `MarkdownService`, `TemplateService`

### MCP Server (mcp-server/)
- **Transports**: Stdio (default, always enabled), HTTP (optional, for containerized deployments)
- **Tools**: `list_projects`, `get_project_info`, `list_crs`, `get_cr`, `create_cr`, `update_cr_status`, `update_cr_attrs`, `delete_cr`, `manage_cr_sections`, `suggest_cr_improvements`
- **Scope**: `mdt-all` (global, accesses all projects from any directory)
- **Implementation**: Both transports share same tool implementations in `mcp-server/src/tools/index.ts`

### Data Flow
1. Tickets are `.md` files with YAML frontmatter
2. Backend watches directories with `chokidar`
3. SSE broadcasts changes to clients
4. Frontend polls as backup (1s interval)
5. Drag-drop updates UI immediately, then syncs

### Project Configuration
- **Global**: `~/.config/markdown-ticket/projects/{project-dir}.toml` (discovery metadata)
- **Local**: `{project}/.mdt-config.toml` (name, code, paths, counters)
- Backend scans global registry on startup, validates configs, sets up file watchers

## Conventions

- **PROJECT_CODE**: `MDT`
- **TICKETS_PATH**: `docs/CRs/`
- **`CR-KEY` (Ticket key) format**: `{PROJECT_CODE}-###`
- **Ticket docs**: Create in `docs/CRs/MDT-000/` (000 = current ticket number)
- **No AI attribution** in git commits (no "Co-Authored-By:")
- **Use relative paths** in backend APIs
- **Use MCP tools** before manual file operations
- **TypeScript validation**: `npm run validate:ts` (changed files), `npm run validate:ts:all` (all files)
- Never restart servers unless user explicitly requests
