# Docker Development Guide

This guide explains how to run and develop the Markdown Ticket Board application using Docker, without needing to install Node.js, npm, or other dependencies locally.

## Prerequisites

- Docker (version 20.10+)
- Docker Compose (version 2.0+)

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd markdown-ticket
   ```

2. **Start the development environment**:
   ```bash
   ./scripts/docker-dev.sh dev
   ```

3. **Access the application**:
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Development Scripts

The `./scripts/docker-dev.sh` script provides convenient commands for Docker-based development:

### Core Commands

```bash
# Start full development environment (recommended)
./scripts/docker-dev.sh dev

# Start individual services
./scripts/docker-dev.sh frontend    # Frontend only (port 5173)
./scripts/docker-dev.sh backend     # Backend only (port 3001)
./scripts/docker-dev.sh mcp         # MCP server only

# Production-like environment
./scripts/docker-dev.sh prod
```

### Project Management

```bash
# Initialize new project (interactive setup)
./scripts/docker-dev.sh init-project

# Create a new project in separate directory
./scripts/docker-dev.sh create-project "My API" API projects/my-api

# Show project URL for manual opening
./scripts/docker-dev.sh open-project projects/my-api
```

### Development Tasks

```bash
# Install/update dependencies
./scripts/docker-dev.sh install

# Run npm commands
./scripts/docker-dev.sh npm install react-router-dom
./scripts/docker-dev.sh npm run build

# Run linting
./scripts/docker-dev.sh lint

# Run tests
./scripts/docker-dev.sh test
```

### Sample Data Management

```bash
# Create sample tickets only (no backup/clean)
./scripts/docker-dev.sh create-samples

# Reset sample data (backup, clean, recreate)
./scripts/docker-dev.sh reset-samples

# Reset with options
./scripts/docker-dev.sh reset-samples -f      # Force mode (no prompts)
./scripts/docker-dev.sh reset-samples -k -f   # Keep config, just reset tickets
./scripts/docker-dev.sh reset-samples -n -f   # Just clean, don't recreate samples
```

### Utilities

```bash
# Open shell in running development container
./scripts/docker-dev.sh shell

# View logs for all services
./scripts/docker-dev.sh logs

# Build all Docker images
./scripts/docker-dev.sh build

# Clean up everything (containers, volumes, images)
./scripts/docker-dev.sh clean

# Reset environment (clean + build + start)
./scripts/docker-dev.sh reset
```

## Docker Architecture

### Images

- **Dockerfile**: Multi-stage production build
- **Dockerfile.dev**: Development build with hot reload

### Services

- **app-dev**: Full development environment with hot reload
- **frontend**: Frontend-only development
- **backend**: Backend-only development
- **mcp-server**: MCP server for AI integration
- **app-prod**: Production-like environment
- **test**: Testing environment with Playwright

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

1. Initialize a new project:
   ```bash
   ./scripts/docker-dev.sh init-project
   ```
   This will guide you through creating your first project configuration.

2. Start the development environment:
   ```bash
   ./scripts/docker-dev.sh dev
   ```

3. The application will be available at:
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3001

4. Your project should now be visible in the UI

### Multi-Project Setup

For working with multiple projects, you can create separate project directories:

1. Create a new project in a subdirectory:
   ```bash
   ./scripts/docker-dev.sh create-project "Backend API" API projects/backend-api
   ```

2. Get the URL for a specific project:
   ```bash
   ./scripts/docker-dev.sh open-project projects/backend-api
   ```

3. Open the project URL shown to access that specific project

### Making Changes

1. Edit files directly on your host machine
2. Changes are automatically reflected in the running containers
3. Frontend has hot reload, backend restarts automatically

### Adding Dependencies

```bash
# Frontend dependencies
./scripts/docker-dev.sh npm install package-name

# Backend dependencies
./scripts/docker-dev.sh shell
cd server && npm install package-name

# MCP server dependencies
./scripts/docker-dev.sh shell
cd mcp-server && npm install package-name
```

### Running Tests

```bash
# Run E2E tests
./scripts/docker-dev.sh test

# Run backend tests
./scripts/docker-dev.sh shell
cd server && npm test

# Run MCP server tests
./scripts/docker-dev.sh shell
cd mcp-server && npm test
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
./scripts/docker-dev.sh shell
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

# Use the built-in reset script with backup
./scripts/docker-dev.sh reset-samples   # Creates timestamped backups automatically
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
   ./scripts/docker-dev.sh reset
   ```

### Permission Issues
If you encounter permission issues:

1. Check file ownership:
   ```bash
   ./scripts/docker-dev.sh shell
   ls -la /app
   ```

2. Fix permissions if needed:
   ```bash
   sudo chown -R $(id -u):$(id -g) .
   ```

### Clean Slate
To completely reset the environment:

```bash
./scripts/docker-dev.sh clean
./scripts/docker-dev.sh reset
```

### Reset Sample Data
To reset sample tickets and start fresh:

```bash
# Interactive mode (recommended) - backs up, cleans, recreates
./scripts/docker-dev.sh reset-samples

# Force mode (no prompts)
./scripts/docker-dev.sh reset-samples -f

# Keep project configuration, just reset tickets
./scripts/docker-dev.sh reset-samples -k -f

# Just clean existing tickets, don't recreate samples
./scripts/docker-dev.sh reset-samples -n -f

# Create new samples without cleaning existing ones
./scripts/docker-dev.sh create-samples
```

### Project Management Issues
If you encounter issues with project registration:

```bash
# Check project configuration
cat .mdt-config.toml

# Re-register a project that's not showing up
./scripts/docker-dev.sh init-project -f

# Get URL for a specific project
./scripts/docker-dev.sh open-project projects/my-project
```

## Production Deployment

### Building Production Image
```bash
docker build -t markdown-ticket:latest .
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
./scripts/docker-dev.sh prod
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

1. **Use the scripts**: Always use `./scripts/docker-dev.sh` for consistency
2. **Persistent volumes**: Your ticket data persists between container restarts
3. **Hot reload**: Both frontend and backend support hot reload
4. **Clean regularly**: Use `clean` command to free up Docker space
5. **Shell access**: Use `shell` command to debug issues inside containers