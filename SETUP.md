# MD Ticket Board - Setup Guide

## Overview
This is a Markdown-based ticket board application with a React frontend, Express.js backend, and MCP (Model Context Protocol) server. The application allows you to manage tickets stored as Markdown files with a drag-and-drop Kanban board interface, featuring **auto-discovery** of projects and AI assistant integration.

## Architecture
- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Express.js server with multi-project file system integration
- **MCP Server**: Model Context Protocol server for AI assistant integration
- **Data Storage**: Markdown files in project `docs/CRs/` directories
- **Real-time Updates**: File watcher with Server-Sent Events (SSE)
- **Auto-Discovery**: Automatic project detection and registry creation
- **Docker-First**: Containerized development environment with shared dependencies

## Prerequisites
- **Docker & Docker Compose** (recommended)
- OR Node.js (v20 or higher) for local development

## Quick Start (Docker - Recommended)

### 1. Clone and Start
```bash
git clone <repository-url>
cd markdown-ticket

# Start complete development environment
./scripts/docker-env.sh dev
```

This single command:
- Builds all Docker containers with shared dependencies
- Starts frontend (localhost:5173), backend (localhost:3001), and MCP server
- **Auto-discovers** projects and creates registry entries
- Sets up file watchers for real-time updates
- Includes sample projects (like the Sudoku Game Project)

### 2. Access the Application
- **Web Interface**: http://localhost:5173
- **Backend API**: http://localhost:3001/api
- **MCP Server**: Runs internally for AI assistant integration

### 3. First Run Auto-Discovery
On first startup, the MCP server automatically:
- Creates global configuration at `~/.config/markdown-ticket/`
- Discovers projects with `.mdt-config.toml` files
- Registers projects in the global registry
- Sets up file watchers for multi-project support

## Alternative Docker Commands

```bash
# Individual services
./scripts/docker-env.sh frontend    # Frontend only
./scripts/docker-env.sh backend     # Backend only
./scripts/docker-env.sh mcp         # MCP server only
./scripts/docker-env.sh mcp-dev     # MCP dev tools

# Management
./scripts/docker-env.sh build       # Build all images
./scripts/docker-env.sh clean       # Clean containers/volumes
./scripts/docker-env.sh logs        # View logs
```

## Local Development (Non-Docker)

If you prefer local development without Docker:

### 1. Install Dependencies
```bash
npm install                    # Root dependencies
cd server && npm install      # Backend dependencies
cd ../mcp-server && npm install  # MCP server dependencies
```

### 2. Build Shared Code
```bash
npm run build:shared          # Compile shared TypeScript
```

### 3. Start Services
```bash
npm run dev:full              # Frontend + Backend
# OR start individually:
npm run dev                   # Frontend (port 5173)
npm run dev:server           # Backend (port 3001)
cd mcp-server && npm run dev # MCP server
```

## API Endpoints

The backend server provides these API endpoints (proxied through the frontend):

### Multi-Project Management
- `GET /api/projects` - List all discovered projects
- `GET /api/projects/:id/crs` - List CRs for specific project
- `GET /api/projects/:id/config` - Get project configuration
- `PATCH /api/projects/:id/crs/:crId` - Update specific CR
- `POST /api/projects/create` - Create new project

### Legacy Single-Project (Backwards Compatible)
- `GET /api/tasks` - List all ticket files (legacy)
- `GET /api/tasks/:filename` - Get specific ticket content
- `POST /api/tasks/save` - Save ticket file
- `DELETE /api/tasks/:filename` - Delete ticket file

### System Endpoints
- `GET /api/status` - Server status and configuration
- `GET /api/events` - Server-Sent Events (SSE) for real-time updates
- `GET /api/documents` - Document discovery with tree navigation

## File Structure

```
markdown-ticket/
├── src/                    # React frontend source code
│   ├── components/         # React components
│   ├── services/          # Business logic services
│   ├── hooks/             # Custom React hooks
│   └── types/             # TypeScript type definitions
├── server/                # Express.js backend (modular architecture)
│   ├── controllers/       # HTTP request handling
│   ├── services/          # Business logic layer
│   ├── repositories/      # Data access layer
│   ├── routes/           # Express route definitions
│   ├── middleware/       # Cross-cutting concerns
│   ├── sample-projects/  # Sample projects for auto-discovery
│   └── Dockerfile        # Backend container configuration
├── mcp-server/           # Model Context Protocol server
│   ├── src/              # MCP server source code
│   ├── tools/            # MCP tool implementations
│   └── Dockerfile        # MCP container configuration
├── shared/               # Code shared across all services
│   ├── models/           # TypeScript interfaces and types
│   ├── services/         # Shared business logic
│   ├── utils/            # Utility functions
│   └── templates/        # CR templates for different types
├── docs/                 # Project documentation
│   └── CRs/              # Change Request files (project root)
├── scripts/              # Development and build scripts
│   └── docker-env.sh     # Docker environment management
├── docker-compose.yml    # Multi-service container orchestration
├── Dockerfile.shared     # Shared dependencies container
└── .mdt-config.toml      # Project configuration file
```

## Development Workflow

### Auto-Discovery System
The system automatically discovers projects containing `.mdt-config.toml` files:
1. MCP server scans configured paths and Docker-aware locations
2. Creates registry entries in `~/.config/markdown-ticket/projects/`
3. Backend reads registry for multi-project file watching
4. Frontend displays all discovered projects

### Adding New Projects
1. Create a `.mdt-config.toml` file in your project directory:
```toml
[project]
code = "ABC"
name = "Your Project Name"
cr_path = "docs/CRs"
repository = "local"

[counter]
next = 1
```
2. Restart the development environment or trigger auto-discovery
3. Project appears automatically in the interface

### Adding New Tickets
1. Create a new Markdown file in the project's CR directory (e.g., `docs/CRs/`)
2. Follow the YAML frontmatter format:
```yaml
---
code: ABC-001
title: Your Ticket Title
status: Proposed
type: Feature Enhancement
priority: Medium
---
```
3. File watchers automatically detect and load the new ticket

### Ticket Status Flow
- **Proposed** → **Approved** → **In Progress** → **Implemented**
- Optional: **Rejected**, **On Hold**

## Key Features

### Auto-Discovery Engine
- **MCP Server**: Automatically discovers projects with `.mdt-config.toml` files
- **Registry System**: Creates persistent project registry for cross-container sharing
- **Docker-Aware Paths**: Scans container-specific locations for projects
- **Multi-Project Support**: Manages multiple projects simultaneously

### Real-Time Updates
- **Server-Sent Events (SSE)**: Push-based real-time updates from backend
- **File Watchers**: Multi-project file system monitoring with `chokidar`
- **Optimistic UI**: Immediate drag-and-drop feedback with server sync
- **Cross-Container Events**: Events shared between MCP server and backend

### Shared Architecture
- **Shared Code**: TypeScript models, services, and utilities shared across services
- **Template System**: File-based CR templates for different ticket types
- **Type Safety**: End-to-end TypeScript type checking across all services
- **Modular Backend**: Layered architecture with controllers, services, repositories

### AI Integration
- **MCP Server**: Full Model Context Protocol implementation
- **CR Management Tools**: AI assistants can create, read, update CRs
- **Multi-Project Context**: AI understands project structure and relationships
- **Development Tools**: MCP dev tools for logging and debugging

## Configuration

### Environment Variables
The application uses the following environment variables:

**Docker Environment** (`.env.docker`):
- `COMPOSE_PROJECT_NAME=markdown-ticket`: Docker project name
- `VITE_API_BASE_URL=http://localhost:3001`: Backend URL for containers

**Development**:
- `PORT`: Backend server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `MCP_LOG_LEVEL`: MCP server logging level (debug/info/warn/error)
- `MCP_PROJECT_FILTER`: Filter MCP tools to specific project

**Project Discovery**:
- Auto-discovery scans Docker-aware paths: `/app`, `/app/sample-projects`, `/workspace`
- Registry stored at: `~/.config/markdown-ticket/projects/`
- Global config at: `~/.config/markdown-ticket/config.toml`

### Tailwind CSS
The application uses Tailwind CSS for styling. Configuration is in:
- `tailwind.config.js` - Tailwind configuration
- `postcss.config.js` - PostCSS configuration
- `src/index.css` - Global styles with Tailwind imports

## Scripts

### Docker Scripts (Recommended)
```bash
./scripts/docker-env.sh dev        # Full development environment
./scripts/docker-env.sh frontend   # Frontend only (port 5173)
./scripts/docker-env.sh backend    # Backend only (port 3001)
./scripts/docker-env.sh mcp        # MCP server only
./scripts/docker-env.sh mcp-dev    # MCP development tools
./scripts/docker-env.sh test       # Run E2E tests
./scripts/docker-env.sh build      # Build all images
./scripts/docker-env.sh clean      # Clean containers/volumes
./scripts/docker-env.sh logs       # View all logs
```

### Local Development Scripts
```bash
# Shared dependencies
npm run build:shared               # Build shared TypeScript code

# Frontend (React + Vite)
npm run dev                        # Development server (port 5173)
npm run build                      # Production build
npm run preview                    # Preview production build
npm run lint                       # ESLint

# Backend (Express.js)
npm run dev:server                 # Development server (port 3001)
npm run server                     # Production server
cd server && npm run create-samples # Create sample tickets
cd server && npm test              # Backend tests

# MCP Server
cd mcp-server && npm run build     # Build MCP server
cd mcp-server && npm run dev       # Development mode
cd mcp-server && npm test          # MCP tests

# Combined
npm run dev:full                   # Frontend + Backend (auto-builds shared)
npm run test:e2e                   # E2E tests (Playwright)
```

## Troubleshooting

### Docker Issues

1. **Auto-Discovery Not Working**
   - Check logs: `./scripts/docker-env.sh logs`
   - Ensure `.mdt-config.toml` files exist in project directories
   - Verify volume mounts in `docker-compose.yml`
   - Restart with clean: `./scripts/docker-env.sh clean && ./scripts/docker-env.sh dev`

2. **Projects Not Found**
   - Check MCP server logs for discovery messages
   - Verify registry files: `ls ~/.config/markdown-ticket/projects/`
   - Ensure backend can access project directories via volume mounts

3. **Container Build Issues**
   - Clean Docker cache: `docker system prune -f`
   - Rebuild images: `./scripts/docker-env.sh build`
   - Check Dockerfile syntax and dependencies

4. **Port Conflicts**
   - Stop conflicting services: `docker stop $(docker ps -q)`
   - Check if ports 5173, 3001 are free: `lsof -ti:5173,3001`
   - Modify ports in `docker-compose.yml` if needed

### Local Development Issues

1. **Shared Code Build Errors**
   - Run `npm run build:shared` before starting services
   - Check TypeScript compilation errors in shared directory
   - Ensure all services use the same shared-dist output

2. **File Permission Issues**
   - Ensure project directories are readable/writable
   - Check volume mount permissions in Docker
   - Verify `.mdt-config.toml` file accessibility

3. **MCP Server Issues**
   - Build MCP server: `cd mcp-server && npm run build`
   - Check MCP server logs for configuration errors
   - Verify project registry creation

### Debug Mode

**Docker Debugging**:
```bash
# View logs for specific service
docker logs markdown-ticket-backend-1
docker logs markdown-ticket-mcp-server-1

# Access container shell
docker exec -it markdown-ticket-backend-1 sh
```

**Local Debugging**:
```bash
# Enable verbose logging
MCP_LOG_LEVEL=debug ./scripts/docker-env.sh dev
DEBUG=* npm run dev:full  # Local development
```

## Deployment

### Docker Production (Recommended)
```bash
# Start production environment
./scripts/docker-env.sh prod

# Or build and deploy manually
docker-compose --profile prod up --build
```

### Local Production Build
```bash
# Build all components
npm run build:shared              # Shared dependencies
npm run build                     # Frontend
cd server && npm run build        # Backend (if applicable)
cd ../mcp-server && npm run build # MCP server

# Start production
npm run server                    # Backend production mode
```

### Environment Setup
1. Configure environment variables in `.env.docker` or production `.env`
2. Set `VITE_API_BASE_URL` for frontend API calls
3. Ensure auto-discovery paths are accessible
4. Configure volume mounts for persistent data
5. Set up reverse proxy if needed (nginx, traefik, etc.)

## Contributing

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation as needed
4. Test both frontend and backend changes

## License
This project is open source and available under the MIT License.