# Docker Setup for Markdown Ticket Board

**Complete Docker containerization with hot reload and MCP HTTP transport.**

---

## Quick Start

### 1. Prerequisites
- Docker Desktop or Docker Engine 20.10+
- Docker Compose 1.29+ (or `docker compose` plugin)
- Markdown ticket projects configured in `~/.config/markdown-ticket/`

### 2. Start
```bash
./bin/dc up        # Start in foreground
./bin/dc up -d     # Start in background
```

### 3. Verify
- Frontend: http://localhost:5174
- MCP: http://localhost:3012/mcp
- Health: `curl http://localhost:3012/health`

### 4. Connect MCP to Claude

**HTTP transport (recommended):**
```bash
claude mcp add --scope user --transport http mdt-all http://localhost:3012/mcp
```

**STDIO transport (via Docker):**
```bash
claude mcp remove mdt-all --scope user  # delete existing if needed
claude mcp add --scope user mdt-all docker -- exec --env MCP_HTTP_ENABLED=false -i markdown-ticket-mcp node /app/mcp-server/dist/index.js
```

---

## Common Commands

```bash
# Start/Stop
./bin/dc up -d [--build] [--force-recreate]    # Start
./bin/dc down      # Stop

# Logs
./bin/dc logs -f           # All logs
./bin/dc logs -f backend   # Specific service

# Rebuild
./bin/dc build             # Rebuild all
./bin/dc build frontend    # Rebuild specific
```

**Note:** Commands use `MDT_DOCKER_MODE` (default: `prod`). Set `MDT_DOCKER_MODE=dev` for development mode.

---

## Mode Selection

| Aspect | Dev (`MDT_DOCKER_MODE=dev`) | Prod (default) |
|--------|----------------------------|----------------|
| Hot Reload | Yes | No |
| Port | 5174 | 80 |
| Use Case | Active development | Deployment/testing |

---

## Configuration

### Volume Mounting

For mounting your local project, use `docker-compose.override.yml`(or declare `MDT_DOCKER_PROJECTS_YML=docker-compose.my.yml` `.env.local`):

```bash
# Copy the sample
cp docker-compose.override.sample.yml docker-compose.override.yml

# Edit with your project paths
vim docker-compose.override.yml
```

The override file is automatically loaded by `./bin/dc`. Example:

```yaml
x-shared-volumes: &project-volumes
  volumes:
    - ~/my-project:/projects/my-project

services:
  backend:
    <<: *project-volumes
  mcp:
    <<: *project-volumes
```

For advanced configuration (security, rate limiting, custom volumes), see **[docs/DOCKER_REFERENCE.md](docs/DOCKER_REFERENCE.md)**.

---

## Troubleshooting

**Containers won't start:**
```bash
docker info                    # Check Docker daemon
./bin/dc logs                  # View errors
./bin/dc down -v && ./bin/dc build --no-cache && ./bin/dc up
```

**Port conflicts:**
```bash
lsof -i :5174   # Frontend
lsof -i :3012   # MCP
```

**File watching not working:**
1. Verify volume mounts in `docker-compose.dev.yml`
2. Check `CHOKIDAR_USEPOLLING=true` is set
3. Restart: `./bin/dc restart`

---

## MCP Integration

Configure LLM clients (Claude Desktop, etc.):

```json
{
  "mcpServers": {
    "markdown-ticket": {
      "url": "http://localhost:3012/mcp",
      "transport": "http"
    }
  }
}
```

For detailed MCP endpoints, session management, and advanced features, see **[docs/DOCKER_REFERENCE.md](docs/DOCKER_REFERENCE.md)**.

---

## Additional Resources

- **[docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)** - Implementation patterns, configuration management
- **[docs/DOCKER_REFERENCE.md](docs/DOCKER_REFERENCE.md)** - Technical reference, port mappings, advanced troubleshooting
- **[MDT-055](docs/CRs/MDT-055-docker-containerization-architecture-for-multi-ser.md)** - Docker Architecture CR
- **[MDT-074](docs/CRs/MDT-074-sse-transport-implementation-for-mcp-operations.md)** - MCP HTTP Transport CR
- [Docker Documentation](https://docs.docker.com/)
