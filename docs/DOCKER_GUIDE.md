# Docker Guide for Markdown Ticket Board 1

Quick start guide for Docker containerization of the Markdown Ticket (MDT) application.

## Quick Start

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+

### Quick Start

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Stop
docker-compose down -v
```

**Access**: Frontend `http://localhost:5174`, MCP `http://localhost:3012/mcp`

## Architecture

Ticket: MDT-055

### Container Overview

| Service | Port Mapping | Purpose | Access |
|---------|---------------|---------|--------|
| **Frontend** | `5174:5173` | React + Vite dev server | `http://localhost:5174` |
| **Backend** | Network only | Express.js API + SSE | Via frontend proxy |
| **MCP** | `3012:3002` | HTTP transport for LLM | `http://localhost:3012/mcp` |

### Container Paths

```
/app/                    # Application code (excluded from discovery)
/projects/              # Project mount point
/app/config             # Docker configuration directory
```

## Configuration

### Environment Variables

```yaml
environment:
  # Core
  - NODE_ENV=development
  - CHOKIDAR_USEPOLLING=true
  - DOCKER=true

  # MCP
  - MCP_HTTP_ENABLED=true
  - MCP_HTTP_PORT=3002
  - MCP_BIND_ADDRESS=0.0.0.0

  # Configuration Management (MDT-073)
  - CONFIG_DIR=/app/config
  - CONFIG_DISCOVER_PATH=/projects
```

### Configuration Management (MDT-073)

The `bin/dc` script automatically loads `.env` and `.env.local` files, where you can declare `MDT_DOCKER_MODE`.

#### Environment Variables

Backend and MCP containers have predefined environment variables:
```yaml
environment:
  - CONFIG_DIR=/app/config
  - CONFIG_DISCOVER_PATH=/projects
```

#### Usage

```bash
# View configuration
bin/dc exec backend node /app/shared/dist/tools/config-cli.js show

# Set discovery paths
bin/dc exec backend node /app/shared/dist/tools/config-cli.js set discovery.searchPaths "/projects,/workspace"
```

Configuration persists in mounted volume `./docker-config:/app/config`

## Usage Patterns

### Development

**Using bin/dc wrapper (recommended):**
```bash
# Production mode
bin/dc up

# Production mode (detached)
bin/dc up -d

# Demo mode
bin/dc -f docker-compose.demo.yml up
```

**Direct docker-compose commands:**
```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Demo
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.demo.yml up
```

### Volume Mount Examples

Use YAML anchor syntax for shared volumes (from `docker-compose.demo.yml`):

```yaml
x-shared-volumes: &project-volumes
  volumes:
    - ./debug-tasks:/projects/demo-project
    - ./:/projects/markdown-ticket

services:
  backend:
    <<: *project-volumes
  mcp:
    <<: *project-volumes
```

To use custom project mounts:
```bash
bin/dc -f docker-compose.projects.yml up -d [--force-recreate]
```

## Troubleshooting

### Common Issues

**Port conflicts**: Check with `lsof -i :5174` and `lsof -i :3012`

**File watching not working**: Verify `CHOKIDAR_USEPOLLING=true` is set

**Volume mount issues**: Check with `docker-compose exec backend ls -la /projects`

**Configuration not persisting**:
```bash
docker-compose exec backend ls -la /app/config
docker-compose exec backend node /app/shared/dist/tools/config-cli.js show
```

**MCP connection**: Test with `curl http://localhost:3012/health`

### Health Checks

```bash
docker-compose ps
curl http://localhost:5174/api/projects
curl http://localhost:3012/health
```

### bin/dc Wrapper

The `bin/dc` script simplifies Docker Compose commands:

- **Environment mode**: `MDT_DOCKER_MODE=prod|dev` (default: prod)
- **Auto file discovery**: Automatically includes matching compose files
- **Environment loading**: Loads `.env` and `.env.local` files

Usage: `bin/dc [docker-compose-options] [command]`

- `bin/dc up` - Start with logs (foreground mode)
- `bin/dc up -d` - Start detached (background mode)
- `bin/dc exec <service> <command>` - Execute commands in containers