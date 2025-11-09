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

The main script provides complete Docker-based development:

- **`./scripts/docker-env.sh`** - Environment management (start/stop/build containers)

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

### Running Commands in Containers

For running commands inside containers, use `docker-compose exec` directly:

```bash
# NPM commands in specific services
docker-compose exec frontend npm install
docker-compose exec frontend npm run build
docker-compose exec backend npm run create-samples
docker-compose exec mcp-server npm run dev

# Access service shells
docker-compose exec app-dev sh             # General development shell
docker-compose exec frontend sh            # Frontend-specific shell
docker-compose exec backend sh             # Backend-specific shell
docker-compose exec mcp-server sh          # MCP server shell

# View service logs
docker-compose logs frontend               # Frontend logs
docker-compose logs backend                # Backend logs
docker-compose logs -f app-dev             # Follow all dev logs
```

### Project Management

```bash
# Project setup is done manually by creating configuration files
# See "First Time Setup" and "Multi-Project Setup" sections below

# Sample data management
./scripts/docker-env.sh create-samples      # Create sample tickets
docker-compose exec backend npm run create-samples  # Direct npm approach
```

### Development Tasks

```bash
# Install/update dependencies
./scripts/docker-env.sh install

# Run npm commands (for active containers)
docker-compose exec frontend npm install react-router-dom
docker-compose exec frontend npm run build

# Run linting
docker-compose exec frontend npm run lint

# Run tests
./scripts/docker-env.sh test        # E2E tests (starts test environment)
docker-compose exec backend npm test    # Backend unit tests
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

### Port Conflicts
If ports 5173 or 3001 are already in use:

1. Stop the conflicting services
2. Or modify ports in `docker-compose.yml`

### File Watching Issues
File watching should work automatically with `CHOKIDAR_USEPOLLING=true`. If you experience issues:

1. Restart the development environment:
   ```bash
   ./scripts/docker-env.sh reset
   ```

### Permission Issues
If you encounter permission issues:

1. Check file ownership:
   ```bash
   docker-compose exec app-dev sh
   ls -la /app
   ```

2. Fix permissions if needed:
   ```bash
   sudo chown -R $(id -u):$(id -g) .
   ```

### Clean Slate
To completely reset the environment:

```bash
./scripts/docker-env.sh clean
./scripts/docker-env.sh reset
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

## Data Persistence

### Ticket Files
Ticket files are stored directly in your project directory structure and mounted into containers. This provides better visibility and direct access to your files.

### Accessing Ticket Files
```bash
# Files are directly accessible on your host machine:
ls docs/CRs/                    # Main project tickets
ls projects/*/docs/CRs/         # Sub-project tickets

# Or access via container shell:
docker-compose exec app-dev sh
ls /app/docs/CRs/               # Current project
ls /app/projects/*/docs/CRs/    # All projects
```

### Backup/Restore Tickets
Since tickets are stored directly in your project directories, you can use standard file operations:

```bash
# Backup entire project structure
cp -r . backup-$(date +%Y%m%d)

# Backup specific project tickets
cp -r projects/my-api/docs/CRs ./backup-my-api-tickets

# Recreate sample tickets if needed
./scripts/docker-env.sh create-samples
```

### Adding Dependencies

```bash
# Frontend dependencies
docker-compose exec frontend npm install package-name

# Backend dependencies
docker-compose exec backend npm install package-name

# MCP server dependencies
docker-compose exec mcp-server npm install package-name
```

### Running Tests

```bash
# Run E2E tests
./scripts/docker-env.sh test

# Run backend tests
docker-compose exec backend npm test

# Run MCP server tests
docker-compose exec mcp-server npm test
```

## VS Code Integration

### Development in Container
If using VS Code, you can develop directly in the container:

1. Install the "Dev Containers" extension
2. Open the project folder
3. Use "Reopen in Container" command

### Dockerfile for VS Code
Create `.devcontainer/devcontainer.json`:

```json
{
  "name": "Markdown Ticket Board",
  "dockerComposeFile": "../docker-compose.yml",
  "service": "app-dev",
  "workspaceFolder": "/app",
  "customizations": {
    "vscode": {
      "extensions": [
        "bradlc.vscode-tailwindcss",
        "esbenp.prettier-vscode",
        "ms-playwright.playwright"
      ]
    }
  }
}
```

## Environment Variables

Common environment variables you can set in `docker-compose.yml`:

```yaml
environment:
  - NODE_ENV=development
  - CHOKIDAR_USEPOLLING=true  # Enable file watching
  - PORT=3001                 # Backend port
  - FRONTEND_PORT=5173        # Frontend port
```

## Tips

1. **Use the scripts**: Always use `./scripts/docker-env.sh` for consistency
2. **Persistent volumes**: Your ticket data persists between container restarts
3. **Hot reload**: Both frontend and backend support hot reload
4. **Clean regularly**: Use `clean` command to free up Docker space
5. **Shell access**: Use `docker-compose exec <service> sh` to debug issues inside containers

## Security Considerations

- Containers run as non-root user in production
- No sensitive data in environment variables
- Volume mounts are read-only where appropriate
- Network isolation between services
- Regular base image updates (Node 20 Alpine)
