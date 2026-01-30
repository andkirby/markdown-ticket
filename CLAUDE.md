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

### Code Quality Metrics
- `scripts/metrics/run.sh` - Analyze code complexity for changed TypeScript files (shows yellow/red zones)
- `scripts/metrics/run.sh --all` - Show all changed files regardless of thresholds
- `scripts/metrics/run.sh path/to/dir-or-file.ts` - Analyze specific directory or file
- `scripts/metrics/run.sh --json` - Output LLM-friendly JSON format
- See `scripts/metrics/README.md` for full documentation and configuration options

### Code Analysis Tools
- `scip-finder <symbol>` - Search for symbols in SCIP code intelligence indexes (more accurate than grep)
  - `--scip <path>` - Path to SCIP index file (auto-discovers if not provided), you should use the one from root: `index.scip`
  - `--from <file>` - Filter to symbols defined in specific file
  - `--folder <path>` - Filter occurrences to files within folder
  - `--format json` - Output JSON for programmatic analysis
  - Examples:
    - Find usages of Ticket declared in a certain file: `scip-finder --from shared/models/Ticket.ts Ticket`
    - Find usages of method Ticket.save(): `scip-finder Ticket.save()`
    - Find usages of myFunction declared in handler.ts: `scip-finder --from handler.ts myFunction`

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

### TypeScript Patterns

**Before writing any TypeScript code, read [docs/PRE_IMPLEMENT.md](docs/PRE_IMPLEMENT.md)** for established patterns:
- Type-safe enum pattern with named access + array
- Naming conventions for types, values, and collections
- Type inference best practices

Following documented patterns prevents duplication and ensures consistency across the codebase.

## Documentation Priority

**ALWAYS check existing documentation FIRST before answering "how to" questions.**

### Common Questions → Documentation Reference

When users ask "how to" questions, search and read the relevant documentation before responding:

| Question Type | Primary Documentation |
|---------------|----------------------|
| "How do I run this?" | `README.md` (Quick Start section) |
| "How do I use Docker?" | `docs/DOCKER_GUIDE.md`, `README.docker.md`, `docs/CRs/MDT-055*.md` (Docker architecture) |
| "How do I configure projects?" | `docs/CONFIG_SPECIFICATION.md`, `docs/CONFIG_GLOBAL_SPECIFICATION.md` |
| "How does [feature] work?" | `docs/ARCHITECTURE.md`, `server/docs/ARCHITECTURE.md`, `docs/CRs/` (feature tickets) |
| "How do I develop locally?" | `docs/DEVELOPMENT_GUIDE.md` |
| "How do I use MCP?" | `docs/MCP_SERVER_GUIDE.md`, `docs/CRs/MDT-074*.md` (MCP HTTP), `docs/CRs/MDT-004*.md` (MCP server) |
| "How was [feature] implemented?" | Search `docs/CRs/MDT-*` for relevant ticket describing the implementation |

### Response Pattern

1. **Search for documentation first**
   - **Project docs only**: Search in `docs/`, root-level `*.md`, and `server/docs/`
   - Use `Glob` for specific patterns: `docs/*GUIDE.md`, `docs/CONFIG*.md`
   - **DO NOT** glob all `**/*.md` (includes node_modules, other projects, irrelevant files)
   - Use `Grep` in docs directory: `pattern="docker.*setup"`, `path="docs/"`
   - Check root-level files: `README.md`, `README.docker.md`, `CLAUDE.md`
   - Always read README.md sections before reverse-engineering from code

2. **Point user to official docs** with specific file paths and line references
   - Example: "See docs/DOCKER_GUIDE.md lines 13-45 for complete setup"

3. **Only supplement** if docs are incomplete or unclear
   - Add context or clarification
   - Provide examples not in the docs

4. **Never recreate** instructions that already exist in documentation
   - Trust the official documentation
   - Avoid reverse-engineering setup from code when docs exist

### Why This Matters

- Official docs are maintained and reviewed by project maintainers
- Prevents conflicting or outdated instructions
- Respects the effort put into documentation
- Saves user time by directing them to authoritative sources
- Documentation may contain important context, warnings, or edge cases not obvious from code alone
