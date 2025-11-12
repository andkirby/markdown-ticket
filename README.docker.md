# Docker Setup for Markdown Ticket Board

This guide explains how to run the Markdown Ticket Board application using Docker containers.

## Architecture Overview

The application uses a **three-container architecture**:

```
┌─────────────────────────────────────────────────────┐
│                Docker Compose                        │
├──────────────┬──────────────┬──────────────────────┤
│  Frontend    │   Backend    │    MCP Server        │
│  :5173       │   :3001      │    :3002             │
│  (Vite)      │  (Express)   │  (HTTP Transport)    │
└──────────────┴──────────────┴──────────────────────┘
       │              │                  │
       └──────────────┴──────────────────┘
                      │
              ┌───────┴────────┐
              │  Docker Volume  │
              │  (Project CRs)  │
              └─────────────────┘
```

### Container Services

1. **Frontend** (`mdt-frontend`)
   - React + Vite development server or Nginx production server
   - Port: `5173` (development) or `80` (production)
   - Hot reload enabled in development mode

2. **Backend** (`mdt-backend`)
   - Express.js API server
   - Port: `3001`
   - File watching with Chokidar (polling mode)
   - SSE for real-time updates

3. **MCP Server** (`mdt-mcp`)
   - Model Context Protocol HTTP transport
   - Port: `3002`
   - Endpoint: `http://localhost:3002/mcp`
   - Implements MCP Streamable HTTP specification (MDT-074)

## Quick Start

### Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose 1.29+ (or `docker compose` plugin)
- 2GB+ available RAM
- Markdown ticket projects configured in `~/.config/markdown-ticket/`

### Development Mode (Recommended)

Start all services with hot reload:

```bash
# Start in foreground (see logs)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Start in background
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001/api
- MCP HTTP: http://localhost:3002/mcp
- Health checks:
  - http://localhost:3001/api/health
  - http://localhost:3002/health

### Production Mode

Build and run optimized containers:

```bash
# Build production images
docker-compose -f docker-compose.yml -f docker-compose.prod.yml build

# Start in background
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# View logs
docker-compose logs -f

# Stop and remove containers
docker-compose down
```

**Note:** In production mode, the frontend runs on port 80 with Nginx.

## Configuration

### Environment Variables

Create a `.env` file in the project root for custom configuration:

```bash
# Project directory to mount (required for backend and MCP)
MCP_PROJECTS_DIR=/path/to/your/workspace

# MCP Security (optional - Phase 2 features)
MCP_SECURITY_AUTH=true
MCP_AUTH_TOKEN=your-secret-token
MCP_ALLOWED_ORIGINS=http://localhost:5173
```

### Multi-Project Setup

The backend and MCP server need access to your markdown ticket projects. Configure volume mounts in `docker-compose.dev.yml` or `docker-compose.prod.yml`:

**Option 1: Single workspace directory**
```yaml
volumes:
  - ${MCP_PROJECTS_DIR:-${HOME}/home}:/workspace
```

**Option 2: Specific project directories**
```yaml
volumes:
  - ~/work/project-a:/projects/project-a
  - ~/personal/project-b:/projects/project-b
  - /data/project-c:/projects/project-c
```

**Option 3: Environment variable**
```bash
export MCP_PROJECTS_DIR=~/workspace
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Global Config

The application requires access to the global registry at `~/.config/markdown-ticket/`. This is automatically mounted as:

- Development: Read-write access
- Production: Read-only access

## Container Management

### View Running Containers

```bash
docker-compose ps
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f frontend
docker-compose logs -f backend
docker-compose logs -f mcp
```

### Rebuild Containers

```bash
# Rebuild all services
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build

# Rebuild specific service
docker-compose build frontend

# Rebuild without cache
docker-compose build --no-cache
```

### Restart Services

```bash
# Restart all services
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Execute Commands in Containers

```bash
# Open shell in backend container
docker-compose exec backend sh

# Run npm command in frontend container
docker-compose exec frontend npm run lint

# Check MCP server version
docker-compose exec mcp node -v
```

## Development Workflow

### Hot Reload

All services support hot reload in development mode:

1. **Frontend**: Vite HMR - changes to `src/` files trigger instant updates
2. **Backend**: tsx watch mode - changes to `server/` files restart the server
3. **MCP**: tsx watch mode - changes to `mcp-server/src/` files restart the server

Simply edit files locally, and changes will be reflected in the containers.

### Debugging

#### View Container Status
```bash
docker-compose ps
docker-compose top
```

#### Check Health
```bash
# Backend health
curl http://localhost:3001/api/health

# MCP health
curl http://localhost:3002/health

# Frontend (should return HTML)
curl http://localhost:5173/
```

#### Inspect Container
```bash
# View environment variables
docker-compose exec backend env

# Check mounted volumes
docker-compose exec backend ls -la /workspace

# View running processes
docker-compose exec mcp ps aux
```

## MCP Integration

The MCP server runs with HTTP transport enabled, accessible at `http://localhost:3002/mcp`.

### Connecting LLM Clients

Configure your LLM client (Claude Desktop, etc.) to use the HTTP transport:

```json
{
  "mcpServers": {
    "markdown-ticket": {
      "url": "http://localhost:3002/mcp",
      "transport": "http"
    }
  }
}
```

### MCP Endpoints

- **JSON-RPC**: `POST http://localhost:3002/mcp`
- **SSE Streaming**: `GET http://localhost:3002/mcp`
- **Health Check**: `GET http://localhost:3002/health`
- **Session Management**: Use `Mcp-Session-Id` header

### Phase 2 Security Features (Optional)

Enable additional security in production:

```yaml
environment:
  - MCP_SECURITY_ORIGIN_VALIDATION=true
  - MCP_ALLOWED_ORIGINS=https://yourdomain.com
  - MCP_SECURITY_RATE_LIMITING=true
  - MCP_RATE_LIMIT_MAX=100
  - MCP_SECURITY_AUTH=true
  - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
```

## Troubleshooting

### Containers Won't Start

```bash
# Check Docker daemon is running
docker info

# View detailed error logs
docker-compose logs

# Remove containers and volumes, then rebuild
docker-compose down -v
docker-compose -f docker-compose.yml -f docker-compose.dev.yml build --no-cache
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

### Port Conflicts

If ports are already in use:

```bash
# Check what's using the port (macOS/Linux)
lsof -i :5173
lsof -i :3001
lsof -i :3002

# Change ports in docker-compose.yml
ports:
  - "5174:5173"  # Map host 5174 to container 5173
```

### File Watching Not Working

File watching uses polling mode (`CHOKIDAR_USEPOLLING=true`) to work reliably in Docker. If changes aren't detected:

1. Verify volume mounts in `docker-compose.dev.yml`
2. Restart the containers: `docker-compose restart`
3. Check container logs: `docker-compose logs -f backend`

### Permission Issues

If you get permission errors accessing mounted volumes:

```bash
# Check file ownership in container
docker-compose exec backend ls -la /workspace

# Fix ownership (development only)
sudo chown -R $(whoami):$(whoami) /path/to/projects
```

### MCP Server Not Accessible

```bash
# Check MCP container is running
docker-compose ps mcp

# Check MCP health endpoint
curl http://localhost:3002/health

# View MCP logs
docker-compose logs -f mcp

# Verify HTTP transport is enabled
docker-compose exec mcp env | grep MCP_HTTP
```

## Performance Considerations

### Development Mode

- Uses multi-stage Dockerfiles with development target
- Source code mounted as volumes for hot reload
- ~2GB RAM for all services
- Slower than native Node.js due to volume mounting overhead

### Production Mode

- Uses multi-stage Dockerfiles with production target
- Optimized builds with production dependencies only
- Smaller image sizes (~100-200MB per service)
- Better performance with no volume overhead
- Non-root users for security

### Resource Limits

Production mode includes default resource limits:

```yaml
deploy:
  resources:
    limits:
      cpus: '1.0'
      memory: 512M
    reservations:
      cpus: '0.5'
      memory: 256M
```

Adjust based on your deployment needs.

## Migration from Native Setup

### For Developers

1. **Week 1**: Try Docker setup alongside native Node.js
2. **Week 2**: Use Docker as primary development environment
3. **Week 3**: Report any issues or performance concerns
4. **Week 4**: Optimize based on feedback

### Rollback to Native

If you need to go back to native Node.js:

```bash
# Stop containers
docker-compose down

# Use native commands
npm run dev:full
```

All your projects and configuration remain unchanged.

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [MDT-055: Docker Architecture CR](docs/CRs/MDT-055-docker-containerization-architecture-for-multi-ser.md)
- [MDT-074: MCP HTTP Transport CR](docs/CRs/MDT-074-sse-transport-implementation-for-mcp-operations.md)
- [MCP Specification](https://spec.modelcontextprotocol.io/)

## Support

For issues or questions:

1. Check container logs: `docker-compose logs -f`
2. Verify configuration in docker-compose files
3. Review this README and troubleshooting section
4. File an issue in the project repository
