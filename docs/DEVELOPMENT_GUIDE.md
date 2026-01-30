# Development Guide

Complete guide for developing and contributing to the Markdown Ticket Board project.

**Related Documentation:**
- **[PRE_IMPLEMENT.md](PRE_IMPLEMENT.md)** - TypeScript patterns, validation workflow, code quality tools, testing strategy
- **[CLAUDE.md](../CLAUDE.md)** - Project-specific guidance and conventions
- **[create_ticket.md](create_ticket.md)** - CR/ticket creation workflow

---

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation
```bash
git clone <repository-url>
cd markdown-ticket
npm install
```

### Development Workflow
**See [PRE_IMPLEMENT.md](PRE_IMPLEMENT.md#build--development-workflow) for:**
- `npm run dev:full` - Start all dev servers (recommended)
- `npm run validate:ts` - Quick TypeScript validation
- `npm run build:all` - Build all projects
- `npm run lint` / `npm run knip` - Code quality tools
- Testing commands

---

## Architecture

### Core Concept
AI-powered Kanban board where **tickets are markdown files** with YAML frontmatter stored in `docs/CRs/`. Changes are version-controlled with Git. The system provides real-time file watching, multi-project support, and MCP integration for AI assistants.

### Project Structure

```
/ (root)
├── src/              # Frontend (React + Vite)
├── server/           # Backend (Express) - layered architecture
├── shared/           # Shared code (compiled separately)
├── mcp-server/       # MCP Server (separate build)
└── domain-contracts/ # Domain types (single source of truth for enums)
```

### Composite Projects & Dependencies

**Build order matters:**
1. `domain-contracts` → foundational types
2. `shared` → depends on `domain-contracts`
3. `server`, `mcp-server` → depend on `shared`
4. Frontend → depends on `shared`

**When making changes to `domain-contracts`, you MUST rebuild it AND rebuild dependent projects.**

### Domain Contracts (Single Source of Truth)

**Purpose:** Centralized type definitions prevent drift between frontend/backend.

```typescript
// ✅ Import from single source
import { CRType, CRTypes, type CRTypeValue } from '@mdt/domain-contracts'

// ❌ Don't define types in multiple places
```

**Location:** `domain-contracts/src/types/schema.ts`

**Type-Safe Enum Pattern:** See [PRE_IMPLEMENT.md](PRE_IMPLEMENT.md#type-safe-enum-pattern) for the pattern used across all CR enums (status, type, priority).

### Frontend Architecture (src/)

**State Management:** Custom React hooks, no external state library
- `useProjectManager.ts` - Central hub (uses refs to prevent stale closures)
- `useTicketOperations.ts` - Ticket CRUD operations
- `useSSEEvents.ts` - Server-Sent Events for real-time updates

**Views:**
- `Board` - Kanban board with drag-and-drop (HTML5 Drag & Drop API)
- `List` - Tabular view with sorting/filtering
- `DocumentsView` - File browser with collapsible tree navigation

### Backend Architecture (server/)

**Layered Architecture:**
```
server/
├── server.ts - Application orchestration
├── controllers/ - HTTP request handling
├── services/ - Business logic
├── repositories/ - Data access (file system)
├── routes/ - Express route definitions
├── middleware/ - Cross-cutting concerns
└── utils/ - Pure utility functions
```

**Key Services:**
- `ProjectService` - Multi-project management
- `TicketService` - CR/ticket operations with numbering
- `DocumentService` - Document discovery with path filtering
- `FileSystemService` - Legacy task file operations

**Important Routes:**
- `/api/projects` - Multi-project operations
- `/api/projects/:id/crs` - Project-specific CRs
- `/api/documents` - Document discovery with .mdt-config.toml path filtering
- `/api/filesystem` - File tree for path selection
- `/api/events` - SSE endpoint for real-time updates

### Shared Architecture (shared/)

**Purpose:** Code shared across frontend, backend, and MCP server

**Key Modules:**
- `models/Types.ts` - Re-exports for backward compatibility
- `models/Project.ts` - Project, ProjectConfig interfaces
- `services/ProjectService.ts` - Multi-project discovery
- `services/MarkdownService.ts` - YAML frontmatter parsing
- `services/TemplateService.ts` - CR template management
- `templates/` - File-based templates for each CR type

**Build Required:** Run `npm run build:shared` to compile TypeScript (auto-done by `dev:full`)

### MCP Server (mcp-server/)

**Dual Transport:**
- **Stdio** (default) - Traditional stdio-based communication
- **HTTP** (optional) - Enable with `MCP_HTTP_ENABLED=true`, provides HTTP/JSON-RPC endpoint for containerized deployments

**Tools:** `list_projects`, `get_project_info`, `list_crs`, `get_cr`, `create_cr`, `update_cr_status`, `update_cr_attrs`, `delete_cr`, `manage_cr_sections`, `suggest_cr_improvements`

**Scope:** `mdt-all` (global) - Access all projects from any directory

**Documentation:** See `mcp-server/MCP_TOOLS.md`

---

## MCP Development Tools

The project includes an MCP server for development log access and monitoring during development.

### Setup
```bash
# Build MCP development tools
cd server/mcp-dev-tools
npm install
npm run build

# Start MCP server (for AI assistant integration)
npm start
```

### Available Tools
- `get_frontend_logs` - Access filtered frontend development logs
- `get_frontend_session_status` - Check frontend development server status
- `stop_frontend_logging` - Stop frontend logging session
- `stream_frontend_url` - Access frontend URLs and endpoints

### AI Assistant Integration
- **Claude Desktop**: Configured as `mdt-logging` in `.claude/settings.local.json`
- **Amazon Q CLI**: Configured as `mdt-logging-local` in `.amazonq/mcp.json`

**Complete Documentation**: See `server/mcp-dev-tools/README.md`

---

## Code Organization

### Frontend Structure
```
src/
├── components/          # React components
├── hooks/              # Custom React hooks
├── types/              # Frontend-specific types
├── config/             # UI configuration
└── utils/              # Frontend utilities
```

### Backend Structure
```
server/
├── routes/             # API routes
├── middleware/         # Express middleware
├── utils/              # Backend utilities
└── mcp-dev-tools/      # MCP development server
```

### Shared Structure
```
shared/
├── models/             # Type definitions (re-exports from domain-contracts)
├── services/           # Business logic services
├── templates/          # CR templates
└── utils/              # Shared utilities
```

---

## Common Development Tasks

### Adding a New CR Type
**See [create_ticket.md](create_ticket.md) for CR structure and workflow.**

1. Add enum to `domain-contracts/src/types/schema.ts` (use type-safe enum pattern)
2. Create template file in `shared/templates/`
3. Update `shared/templates/templates.json`
4. Update frontend type dropdowns
5. Test with MCP server

### Adding New CR Fields
1. Update type in `domain-contracts/src/types/schema.ts` (if enum) or appropriate model
2. Update `MarkdownService` parsing if adding frontmatter fields
3. Update frontend forms and displays
4. Update MCP server tools
5. Update templates if needed

### Working with Templates
- Template files: `shared/templates/*.md`
- Template config: `shared/templates/templates.json`
- Template service: `shared/services/TemplateService.ts`

### Debugging Issues
1. **Use MCP development tools** for real-time log monitoring
2. **Check browser console** for frontend errors
3. **Monitor backend logs** in terminal
4. **Use React DevTools** for component debugging

---

## Configuration

### Environment Variables
- `BACKEND_URL` - Backend server URL (default: http://localhost:3001)
- `MCP_PROJECT_FILTER` - Limit MCP to specific project
- `MCP_SCAN_PATHS` - Set project paths for MCP scanning
- `MCP_HTTP_ENABLED` - Enable HTTP transport for MCP server
- `MCP_HTTP_PORT` - HTTP port for MCP server (default: 3002)

### Configuration Files
- `.mdt-config.toml` - Project configuration (local)
- `~/.config/markdown-ticket/projects/{project-dir}.toml` - Global project registry
- `~/.config/markdown-ticket/mcp-server.toml` - MCP server config
- `~/.config/markdown-ticket/user.toml` - User preferences

**For complete configuration specification, see:**
- **[CONFIG_SPECIFICATION.md](CONFIG_SPECIFICATION.md)** - Local `.mdt-config.toml`
- **[CONFIG_GLOBAL_SPECIFICATION.md](CONFIG_GLOBAL_SPECIFICATION.md)** - Global registry

---

## Troubleshooting

### Common Issues

#### Frontend Not Loading
1. Check if backend is running on port 3001
2. Verify npm dependencies are installed
3. Check browser console for errors

#### MCP Server Issues
1. Ensure server is built: `cd mcp-server && npm run build`
2. Check Node.js version compatibility
3. Verify configuration files exist
4. Try reconnecting: run `/mcp` in Claude Code

#### Build/Type Errors
1. Run `npm run validate:ts` to identify issues
2. Check `domain-contracts` is built: `cd domain-contracts && npm run build`
3. Rebuild dependents after domain-contracts changes: `npm run build:all`

#### Template Issues
1. Check template files exist in `shared/templates/`
2. Verify `templates.json` configuration
3. Ensure TemplateService can read files

---

## Related Documentation

| Topic | Documentation |
|-------|---------------|
| TypeScript patterns & workflows | [PRE_IMPLEMENT.md](PRE_IMPLEMENT.md) |
| Project-specific guidance | [../CLAUDE.md](../CLAUDE.md) |
| CR/ticket creation | [create_ticket.md](create_ticket.md) |
| Configuration | [CONFIG_SPECIFICATION.md](CONFIG_SPECIFICATION.md), [CONFIG_GLOBAL_SPECIFICATION.md](CONFIG_GLOBAL_SPECIFICATION.md) |
| MCP CR Management | `mcp-server/MCP_TOOLS.md` |
| MCP Dev Tools | `server/mcp-dev-tools/README.md` |
| Docker deployment | [DOCKER_GUIDE.md](DOCKER_GUIDE.md), [README.docker.md](../README.docker.md) |
| Environment variables | [ENVIRONMENT_VARIABLES.md](ENVIRONMENT_VARIABLES.md) |

---

## Contributing

1. Fork the repository
2. Create a feature branch
3. Follow development workflow in [PRE_IMPLEMENT.md](PRE_IMPLEMENT.md)
4. Add tests for new functionality
5. Update documentation as needed
6. Submit a pull request

### Code Style
- Use TypeScript for type safety
- Follow type-safe enum pattern (see [PRE_IMPLEMENT.md](PRE_IMPLEMENT.md#type-safe-enum-pattern))
- Import from `domain-contracts` for all shared enums
- Leverage shared services for business logic
- Document new features and APIs
