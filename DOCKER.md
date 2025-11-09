# Docker Development Guide

Complete Docker setup and development guide for the Markdown Ticket Board project with auto-discovery capabilities.

## Overview

The project uses a **multi-container Docker architecture** with:
- **Shared Builder**: Compiles shared TypeScript code used across all services
- **Frontend**: React + Vite development server (port 5173)
- **Backend**: Express.js API server (port 3001)
- **MCP Server**: Model Context Protocol server for AI integration
- **MCP Dev Tools**: Development utilities and logging tools

## Quick Start

```bash
# Clone repository
git clone <repository-url>
cd markdown-ticket

# Start complete development environment
./scripts/docker-env.sh dev

# Access application
open http://localhost:5173
```

## Docker Commands

### Environment Management

```bash
# Start complete development environment (recommended)
./scripts/docker-env.sh dev

# Start individual services
./scripts/docker-env.sh frontend    # Frontend only
./scripts/docker-env.sh backend     # Backend only
./scripts/docker-env.sh mcp         # MCP server only
./scripts/docker-env.sh mcp-dev     # MCP dev tools only

# Production environment
./scripts/docker-env.sh prod

# Testing
./scripts/docker-env.sh test        # Run E2E tests
```

### Build and Maintenance

```bash
# Build all Docker images
./scripts/docker-env.sh build

# Clean up containers, volumes, and images
./scripts/docker-env.sh clean

# View logs for all services
./scripts/docker-env.sh logs

# Install dependencies
./scripts/docker-env.sh install
```

## Auto-Discovery System

### How It Works

1. **MCP Server Startup**: On first run, the MCP server:
   - Creates global configuration at `~/.config/markdown-ticket/`
   - Scans Docker-aware paths for projects with `.mdt-config.toml` files
   - Creates registry entries for discovered projects

2. **Backend Integration**: The backend:
   - Reads the MCP-created project registry
   - Sets up file watchers for all discovered projects
   - Provides multi-project API endpoints

3. **Cross-Container Sharing**:
   - Configuration persists in Docker volumes
   - Registry files shared between MCP server and backend
   - Projects auto-discovered across container restarts

### Sample Projects

The system includes sample projects for testing:
- **Sudoku Game Project (SUD)**: Example project with CRs and documentation
- **Markdown Ticket Project (MDT)**: The main project itself

## Docker Architecture

### Container Structure

```
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Frontend      │  │    Backend      │  │   MCP Server    │
│  (React/Vite)   │  │ (Express.js)    │  │  (Node.js)      │
│   Port 5173     │  │   Port 3001     │  │   Internal      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                     │                     │
         └─────────────────────┼─────────────────────┘
                              │
                    ┌─────────────────┐
                    │  Shared Builder │
                    │  (TypeScript)   │
                    └─────────────────┘
```

### Volume Mounts

```yaml
volumes:
  user_config: ~/.config/markdown-ticket    # Global configuration
  project_data: /app/data                   # Project data persistence

# Service-specific mounts:
frontend:
  - ./src:/app/src                          # Hot reload source
  - ./public:/app/public                    # Static assets

backend:
  - ./server:/app                           # Backend source
  - ./server/sample-projects:/app/sample-projects  # Sample projects
  - ./.mdt-config.toml:/app/project-root/.mdt-config.toml  # Project root config

mcp-server:
  - ./mcp-server:/app                       # MCP source
  - ./server/sample-projects:/app/sample-projects  # Sample projects
  - ./.mdt-config.toml:/app/project-root/.mdt-config.toml  # Project root config
```

## Development Workflow

### 1. First Time Setup

```bash
# Clean environment and start fresh
./scripts/docker-env.sh clean
./scripts/docker-env.sh dev
```

On first startup:
- Shared dependencies are built automatically
- MCP server creates global configuration
- Projects are auto-discovered and registered
- Backend sets up file watchers
- Frontend connects to backend API

### 2. Making Changes

**Frontend Changes**:
- Files in `src/` are hot-reloaded automatically
- No restart needed for React component changes

**Backend Changes**:
- Files in `server/` trigger automatic restart via nodemon
- API changes reflected immediately

**MCP Server Changes**:
- Files in `mcp-server/` trigger restart
- For production builds: run `cd mcp-server && npm run build`

**Shared Code Changes**:
- Files in `shared/` require rebuilding shared dependencies
- Run `./scripts/docker-env.sh build shared-builder` or restart services

### 3. Adding New Projects

Create a new project with auto-discovery:
```bash
# Create project directory
mkdir my-new-project
cd my-new-project

# Create configuration
cat > .mdt-config.toml << EOF
[project]
code = "MNP"
name = "My New Project"
cr_path = "docs/CRs"
repository = "local"

[counter]
next = 1
EOF

# Create CRs directory
mkdir -p docs/CRs

# Restart to trigger auto-discovery
cd ../markdown-ticket
./scripts/docker-env.sh clean && ./scripts/docker-env.sh dev
```

## Troubleshooting

### Auto-Discovery Issues

```bash
# Check MCP server discovered projects
docker logs markdown-ticket-mcp-server-1

# Check backend project loading
docker logs markdown-ticket-backend-1

# Verify registry files
docker exec markdown-ticket-backend-1 ls -la /root/.config/markdown-ticket/projects/

# Check project accessibility
docker exec markdown-ticket-backend-1 ls -la /app/sample-projects/
```

### Container Issues

```bash
# View container status
docker ps -a

# Access container shell
docker exec -it markdown-ticket-backend-1 sh
docker exec -it markdown-ticket-frontend-1 sh

# View container logs
docker logs markdown-ticket-frontend-1 --follow
docker logs markdown-ticket-backend-1 --follow
docker logs markdown-ticket-mcp-server-1 --follow

# Restart specific service
docker restart markdown-ticket-backend-1
```

### Build Issues

```bash
# Clean Docker cache
docker system prune -f

# Rebuild all images
./scripts/docker-env.sh clean
./scripts/docker-env.sh build

# Force rebuild without cache
docker-compose build --no-cache
```

### Volume Issues

```bash
# Check volume mounts
docker volume ls | grep markdown-ticket

# Remove volumes (WARNING: deletes data)
./scripts/docker-env.sh clean  # Removes containers and volumes

# Inspect volume contents
docker run --rm -v markdown-ticket_user_config:/data alpine ls -la /data
```

## Advanced Configuration

### Environment Variables

Create `.env.docker` for custom configuration:
```bash
# Project name (affects container names)
COMPOSE_PROJECT_NAME=markdown-ticket

# Frontend configuration
VITE_API_BASE_URL=http://localhost:3001

# Backend configuration
PORT=3001
NODE_ENV=development

# MCP configuration
MCP_LOG_LEVEL=info
MCP_PROJECT_FILTER=""
```

### Custom Docker Compose

For custom setups, you can override docker-compose settings:
```bash
# Create docker-compose.override.yml
# Use different ports, add new services, etc.
```

### Production Deployment

```bash
# Build for production
./scripts/docker-env.sh build

# Start production environment
./scripts/docker-env.sh prod

# Or manually
docker-compose --profile prod up --build
```

## Performance Tips

1. **Use Docker Desktop with adequate resources**: 4GB+ RAM, 2+ CPUs
2. **Enable BuildKit**: `export DOCKER_BUILDKIT=1`
3. **Use .dockerignore**: Exclude unnecessary files from build context
4. **Layer caching**: Dependencies are cached in separate layers
5. **Volume mounts**: Source code changes don't require rebuilds

## Security Considerations

- Containers run as non-root user in production
- No sensitive data in environment variables
- Volume mounts are read-only where appropriate
- Network isolation between services
- Regular base image updates (Node 20 Alpine)