# Docker Development Guide

This guide explains how to run and develop the Markdown Ticket Board application using Docker, without needing to install Node.js, npm, or other dependencies locally.

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

## Architecture Overview

The project uses a **unified multi-stage Dockerfile** that supports both development and production environments through build targets. This approach provides:

- **Shared foundation**: Single `node:20-alpine` base with common utilities (git, bash)
- **Optimized layer caching**: Separate dependency stages for dev and production
- **Consistent environments**: Same base image across all services
- **Single file management**: One Dockerfile instead of separate dev/prod files

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd markdown-ticket
   ```

2. **Start the development environment**:
   ```bash
   ./scripts/docker-env.sh dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Development Scripts

Two scripts provide complete Docker-based development:

- **`./scripts/docker-env.sh`** - Environment management (start/stop/build containers)
- **`./scripts/docker-run.sh`** - Run commands in active containers

### Environment Management (docker-env.sh)

```bash
# Start full development environment (recommended)
./scripts/docker-env.sh dev

# Start individual services
./scripts/docker-env.sh frontend    # Frontend only (port 5173)
./scripts/docker-env.sh backend     # Backend only (port 3001)
./scripts/docker-env.sh mcp         # MCP server only

# Production-like environment
./scripts/docker-env.sh prod

# Environment operations
./scripts/docker-env.sh build       # Build all images
./scripts/docker-env.sh clean       # Clean up everything
./scripts/docker-env.sh reset       # Reset environment
./scripts/docker-env.sh test        # Run E2E tests
./scripts/docker-env.sh logs        # Show logs for all services
./scripts/docker-env.sh install     # Install/update dependencies
```

### Running Commands (docker-run.sh)

```bash
# NPM commands in specific services
./scripts/docker-run.sh frontend npm install
./scripts/docker-run.sh frontend npm run build
./scripts/docker-run.sh backend npm run create-samples
./scripts/docker-run.sh mcp npm run dev
./scripts/docker-run.sh mcp-tools npm run health-check

# Access service shells
./scripts/docker-run.sh dev shell           # General development shell
./scripts/docker-run.sh frontend shell      # Frontend-specific shell
./scripts/docker-run.sh backend shell       # Backend-specific shell
./scripts/docker-run.sh mcp shell          # MCP server shell

# View service logs and status
./scripts/docker-run.sh frontend logs      # Frontend logs only
./scripts/docker-run.sh backend logs       # Backend logs only
./scripts/docker-run.sh frontend status    # Service status

# Service aliases (shorter)
./scripts/docker-run.sh fe npm install     # frontend
./scripts/docker-run.sh be npm test        # backend
```

### Project Management

```bash
# Project setup is done manually by creating configuration files
# See "First Time Setup" and "Multi-Project Setup" sections below

# Sample data management
./scripts/docker-env.sh create-samples      # Create sample tickets
./scripts/docker-run.sh backend npm run create-samples  # Direct npm approach
```

### Development Tasks

```bash
# Install/update dependencies
./scripts/docker-env.sh install

# Run npm commands (use docker-run.sh for active containers)
./scripts/docker-run.sh frontend npm install react-router-dom
./scripts/docker-run.sh frontend npm run build

# Run linting
./scripts/docker-run.sh frontend npm run lint

# Run tests
./scripts/docker-env.sh test        # E2E tests (starts test environment)
./scripts/docker-run.sh backend npm test    # Backend unit tests
```

### Utilities

```bash
# Environment management
./scripts/docker-env.sh build       # Build all Docker images
./scripts/docker-env.sh clean       # Clean up everything (containers, volumes, images)
./scripts/docker-env.sh reset       # Reset environment (clean + build + start)
./scripts/docker-env.sh logs        # Show logs for all services

# Sample data
./scripts/docker-env.sh create-samples     # Create sample tickets

# Service access (requires running containers)
./scripts/docker-run.sh dev shell          # General development shell
./scripts/docker-run.sh frontend shell     # Frontend-specific shell
./scripts/docker-run.sh backend shell      # Backend-specific shell

# Service monitoring (requires running containers)
./scripts/docker-run.sh frontend logs      # Frontend logs only
./scripts/docker-run.sh backend logs       # Backend logs only
./scripts/docker-run.sh frontend status    # Service status
```

## Docker Architecture

### Unified Dockerfile Structure

The single `Dockerfile` contains multiple build targets:

**Foundation Stages:**
- **base**: `node:20-alpine` + common utilities (git, bash)
- **deps-base**: Package files setup for all services
- **dev-deps**: All dependencies (including dev dependencies)
- **prod-deps**: Production-only dependencies

**Development Targets:**
- **frontend**: Frontend development with hot reload (port 5173)
- **backend**: Backend development with hot reload (port 3001)
- **mcp**: MCP server development
- **development**: Full development environment (both ports)
- **test**: E2E testing with Playwright

**Production Targets:**
- **builder**: Builds all components (frontend, backend, dev-tools)
- **runner**: Production runtime with optimized layers and security

### Services (via docker-compose.yml)

- **app-dev**: Full development environment (target: `development`)
- **frontend**: Frontend-only development (target: `frontend`)
- **backend**: Backend-only development (target: `backend`)
- **mcp-server**: MCP server for AI integration (target: `mcp`)
- **app-prod**: Production-like environment (target: `runner`)
- **test**: Testing environment with Playwright (target: `test`)

### Benefits of Unified Architecture

- **Better caching**: Shared dependency layers across all targets
- **Consistency**: Same Node.js version and utilities everywhere
- **Maintenance**: Single file to update instead of multiple Dockerfiles
- **Efficiency**: Optimal layer reuse between development and production

### Direct Docker Commands

You can also use Docker directly with build targets:

```bash
# Development targets
docker build --target development -t mdt-dev .
docker build --target frontend -t mdt-frontend .
docker build --target backend -t mdt-backend .
docker build --target test -t mdt-test .

# Production targets
docker build --target runner -t mdt-prod .

# Run specific targets
docker run -p 5173:5173 -v .:/app mdt-frontend
docker run -p 3001:3001 -v .:/app mdt-backend
docker run -p 5173:5173 -p 3001:3001 -v .:/app mdt-dev
```

### Volumes

- **Source code**: Entire project directory mounted (`.:/app`) for hot reload during development
- **config_data**: Persistent storage for user configuration and project registry
- **app_data**: Application data storage (production only)
- **node_modules**: Excluded volumes to avoid conflicts with container dependencies
  - `/app/node_modules`
  - `/app/server/node_modules`
  - `/app/mcp-server/node_modules`
  - `/app/server/mcp-dev-tools/node_modules`

## Development Workflow

### First Time Setup

1. Create project configuration manually:
   ```bash
   # Create directory structure
   mkdir -p docs/CRs

   # Create project config
   cat > .mdt-config.toml << EOF
   [project]
   name = "My Project"
   code = "MYPROJ"
   path = "docs/CRs"
   startNumber = 1
   counterFile = ".mdt-next"
   EOF

   # Create ticket counter
   echo "1" > .mdt-next
   ```

2. Start the development environment:
   ```bash
   ./scripts/docker-env.sh dev
   ```

3. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

4. Your project should now be visible in the UI

### Multi-Project Setup

For working with multiple projects, you can create separate project directories manually:

1. Create a new project in a subdirectory:
   ```bash
   mkdir -p projects/backend-api/docs/CRs

   cat > projects/backend-api/.mdt-config.toml << EOF
   [project]
   name = "Backend API"
   code = "API"
   path = "docs/CRs"
   startNumber = 1
   counterFile = ".mdt-next"
   EOF

   echo "1" > projects/backend-api/.mdt-next
   ```

2. Access the project directly through the web UI at http://localhost:5173

### Making Changes

1. Edit files directly on your host machine
2. Changes are automatically reflected in the running containers
3. Frontend has hot reload, backend restarts automatically

### Adding Dependencies

```bash
# Frontend dependencies
./scripts/docker-run.sh frontend npm install package-name

# Backend dependencies
./scripts/docker-run.sh backend npm install package-name

# MCP server dependencies
./scripts/docker-run.sh mcp npm install package-name
```

### Running Tests

```bash
# Run E2E tests
./scripts/docker-env.sh test

# Run backend tests
./scripts/docker-run.sh backend npm test

# Run MCP server tests
./scripts/docker-run.sh mcp npm test
```

## Data Persistence

### Ticket Files
Ticket files are now stored directly in your project directory structure and mounted into containers. This provides better visibility and direct access to your files.

### Accessing Ticket Files
```bash
# Files are directly accessible on your host machine:
ls docs/CRs/                    # Main project tickets
ls projects/*/docs/CRs/         # Sub-project tickets

# Or access via container shell:
./scripts/docker-run.sh dev shell
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

## Troubleshooting

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
   ./scripts/docker-run.sh dev shell
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

### Recreate Sample Data
To create fresh sample tickets:

```bash
# Create sample tickets (adds to existing tickets)
./scripts/docker-env.sh create-samples

# Or manually clean and recreate
rm docs/CRs/*.md  # Remove existing tickets (keep README.md)
./scripts/docker-env.sh create-samples
echo "1" > .mdt-next  # Reset counter if needed
```

### Project Management Issues
If you encounter issues with project registration:

```bash
# Check project configuration
cat .mdt-config.toml

# Recreate project configuration if needed
# (see manual project creation section above)

# Access projects directly through the web UI at http://localhost:5173
```

## Production Deployment

### Building Production Image
```bash
# Build production target
docker build --target runner -t markdown-ticket:latest .

# Or build specific targets for testing
docker build --target frontend -t markdown-ticket-frontend .
docker build --target development -t markdown-ticket-dev .
```

### Running Production Container
```bash
docker run -d \
  -p 3001:3001 \
  -v ticket_data:/app/docs/CRs \
  --name markdown-ticket-prod \
  markdown-ticket:latest
```

### Using Production Compose
```bash
./scripts/docker-env.sh prod
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
5. **Shell access**: Use `./scripts/docker-run.sh <service> shell` to debug issues inside containers