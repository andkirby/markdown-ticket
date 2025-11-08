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

### Full Stack Development
- `npm run dev:full` - **RECOMMENDED** - Start both frontend and backend concurrently

### Testing
- `npm run test:e2e` - Run Playwright E2E tests across browsers
- `npm run test:e2e:ui` - Run Playwright tests with interactive UI
- `npm run test:e2e:headed` - Run Playwright tests in headed browser mode
- `npm run test:e2e:report` - Show Playwright test report
- `PWTEST_SKIP_WEB_SERVER=1 npx playwright test tests/e2e/specific-test.spec.ts --project=chromium` - Run specific test without server restart

### Docker Development (Alternative)
- `./scripts/docker-env.sh dev` - **RECOMMENDED** - Start full development environment in Docker
- `./scripts/docker-env.sh frontend` - Start frontend only in Docker (localhost:5173)
- `./scripts/docker-env.sh backend` - Start backend only in Docker (localhost:3001)
- `./scripts/docker-env.sh mcp` - Start MCP server only in Docker
- `./scripts/docker-env.sh test` - Run E2E tests in Docker
- `./scripts/docker-env.sh build` - Build all Docker images
- `./scripts/docker-env.sh clean` - Clean up Docker containers and images
- `./scripts/docker-run.sh <service> <command>` - Run commands in active containers
- `./scripts/docker-run.sh dev shell` - Open shell in development container

**Docker Benefits**: No need to install Node.js locally, consistent environment, isolated dependencies.
**Complete Docker Guide**: See [DOCKER.md](DOCKER.md) for comprehensive Docker documentation.

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

### MCP Integration Priority

**Always attempt MCP operations first**:
1. Try `mcp__mdt-all__*` or `mcp__markdown-ticket__*` tools
2. If fails, ask user: "The MCP server appears disconnected. Please run `/mcp` to reconnect."
3. Only after user confirms MCP restart, fall back to manual file operations

**MCP Server Scopes**:
- `mdt-all` (global) - Access all projects from any directory
- `mdt-tickets` (local) - Filtered to specific project via `MCP_PROJECT_FILTER`

**Available Tools**: `list_projects`, `list_crs`, `get_cr_full_content`, `get_cr_attributes`, `create_cr`, `update_cr_status`, `update_cr_attrs`, `delete_cr`, `suggest_cr_improvements`, section-based updates

### Logging & Debugging

**Backend Logs**:
- Use `mcp__mdt-logging__get_logs` to read backend logs
- SSE stream: `mcp__mdt-logging__stream_url`

**Frontend Logs**:
- Use `mcp__mdt-logging__get_frontend_logs` for browser console logs
- Session management: `get_frontend_session_status`, `stop_frontend_logging`

**Never restart servers** - use MCP logging tools instead unless user explicitly requests restart.

## Docker Architecture

### Unified Multi-stage Dockerfile
The project uses a single `Dockerfile` with multiple build targets for optimal caching and consistency:

**Foundation Stages**:
- `base`: node:20-alpine + git + bash
- `deps-base`: Package files for all services
- `dev-deps`: All dependencies (including dev)
- `prod-deps`: Production-only dependencies

**Development Targets**:
- `frontend`: Frontend with hot reload (port 5173)
- `backend`: Backend with hot reload (port 3001)
- `mcp`: MCP server development
- `development`: Full dev environment (both ports)
- `test`: E2E testing with Playwright

**Production Targets**:
- `builder`: Compiles all components
- `runner`: Optimized production runtime

**Key Benefits**: Better Docker layer caching, consistent environments, single file maintenance.

**Current Status**: MCP server build temporarily disabled in production due to TypeScript compilation issues.

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
- Automatically start frontend (5173) and backend (3001) servers
- Use `PWTEST_SKIP_WEB_SERVER=1` to skip server startup for debugging

**Backend Tests** (Jest):
- Unit tests for services, utilities, and controllers
- Run with `cd server && npm test`

## Important Conventions

- **Never include AI attribution** in git commits (no "Co-Authored-By: Claude")
- **Always use relative paths** in backend APIs for portability
- **Check for stale closures** when adding React hooks that reference changing state
- **Use MCP tools** before manual file operations
- **Follow CR format** from `docs/create_ticket.md` for all tickets
