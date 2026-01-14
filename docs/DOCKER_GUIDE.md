# Docker Guide for Markdown Ticket Board

**Implementation patterns and configuration for Docker containerization.**

For quick start and basic commands, see [README.docker.md](../README.docker.md). For technical reference,
see [DOCKER_REFERENCE.md](DOCKER_REFERENCE.md).

---

## bin/dc Wrapper

The `bin/dc` script simplifies Docker Compose commands with automatic file discovery and environment loading.

### How It Works

```bash
./bin/dc [docker-compose-options] [command]
```

**Features:**

- **Mode selection**: `MDT_DOCKER_MODE` environment variable (default: `prod`)
    - `dev` → Includes `docker-compose.dev.yml`
    - `prod` → Includes `docker-compose.prod.yml`
- **Auto-discovery**: Automatically includes `docker-compose.{mode}.*.yml` files
- **Custom projects**: Supports `MDT_DOCKER_PROJECTS_YML` for additional compose files
- **Simply override**: Supports `docker-compose.override.yml` as an additional compose files
- **Environment loading**: Loads `.env` and `.env.local` files

**Sample file volume mapping**: `docker-compose.override.sample.yml`

### Examples

```bash
# Start in dev mode
MDT_DOCKER_MODE=dev ./bin/dc up

# Start in prod mode (default)
./bin/dc up -d

# Add custom project mounts
MDT_DOCKER_PROJECTS_YML=docker-compose.my-projects.yml ./bin/dc up

# Pass any docker-compose option
./bin/dc logs -f backend
./bin/dc exec backend sh
./bin/dc ps
```

### Direct docker-compose Commands

For advanced use cases, you can use docker-compose directly:

```bash
# Development
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Custom compose files
docker-compose -f docker-compose.yml -f docker-compose.projects.yml up -d
```

---

## Volume Mount Patterns

### Single Workspace (Recommended)

Mount your entire workspace directory:

```yaml
# docker-compose.dev.yml or docker-compose.prod.yml
services:
  backend:
    volumes:
      - ~/projects:/projects
  mcp:
    volumes:
      - ~/projects:/projects
```

### Multiple Project Directories

Mount specific projects:

```yaml
services:
  backend:
    volumes:
      - ~/work/project-a:/projects/project-a
      - ~/personal/project-b:/projects/project-b
      - /data/project-c:/projects/project-c
  mcp:
    volumes:
      - ~/work/project-a:/projects/project-a
      - ~/personal/project-b:/projects/project-b
      - /data/project-c:/projects/project-c
```

### docker-compose.override.yml (Recommended for Local)

Use the provided sample for local customization:

```bash
# Copy and customize
cp docker-compose.override.sample.yml docker-compose.override.yml
# Edit with your project paths
```

The override file is automatically loaded by `./bin/dc`. This is the standard Docker Compose pattern for local customizations.

```yaml
# docker-compose.override.yml
x-shared-volumes: &project-volumes
  volumes:
    - ~/my-project:/projects/my-project

services:
  backend:
    <<: *project-volumes
  mcp:
    <<: *project-volumes
```

### YAML Anchor Syntax (Custom Files)

For named override files, use YAML anchors:

```yaml
# docker-compose.projects.yml
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

Use custom project files:

```bash
./bin/dc -f docker-compose.projects.yml up -d --force-recreate
```

---

## Configuration Management (MDT-073)

The backend and MCP containers use a shared configuration system for project discovery.

### Container Paths

```
/app/                    # Application code (excluded from discovery)
/projects/               # Project mount point
/app/config             # Docker configuration directory (persisted in volume)
```

### Environment Variables

Backend and MCP containers have these predefined:

```yaml
environment:
  - CONFIG_DIR=/app/config
  - CONFIG_DISCOVER_PATH=/projects
```

### Using config-cli.js

View and modify configuration from within containers:

```bash
# View current configuration
./bin/dc exec backend node /app/shared/dist/tools/config-cli.js show

# Set discovery paths
./bin/dc exec backend node /app/shared/dist/tools/config-cli.js set discovery.searchPaths "/projects"

# Get specific value
./bin/dc exec backend node /app/shared/dist/tools/config-cli.js get discovery.searchPaths
```

Configuration persists in the `docker-config` volume at `/app/config`.

---

## Demo Mode

Demo mode includes pre-configured projects for testing and demonstration.

```bash
# Start with demo projects
./bin/dc -f docker-compose.demo.yml up

# Or combine with other compose files
docker-compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.demo.yml up
```

Demo projects are mounted from `./demo-projects/` and provide sample tickets for testing the UI and MCP tools.

---

## Container Architecture

### Container Overview

| Service             | Container Port | Host Port | Purpose                  |
|---------------------|----------------|-----------|--------------------------|
| **Frontend** (dev)  | 5173           | 5174      | Vite dev server with HMR |
| **Frontend** (prod) | 80             | 5174      | Nginx static server      |
| **Backend**         | 3001           | (none)    | Express.js API + SSE     |
| **MCP**             | 3002           | 3012      | HTTP transport for LLM   |

**Note:** Backend is internal only, accessible via frontend proxy at `/api/*`.

### Container Communication

```
Host (localhost:5174, :3012)
    ↓
Frontend Container
    └── /api/* → Backend:3001 (proxy, includes SSE)

Backend Container
    ├── SSE → Frontend (real-time ticket updates)
    └── Mounted volumes (/projects)

MCP Container
    ├── HTTP transport → Host:3012 (LLM clients)
    └── Mounted volumes (/projects) [same as backend]
```

---

## Common Issues

### Port Conflicts

```bash
# Check what's using the port
lsof -i :5174   # Frontend
lsof -i :3012   # MCP

# Change ports in docker-compose files if needed
```

### File Watching Not Working

```bash
# Verify polling is enabled
./bin/dc exec backend printenv | grep CHOKIDAR

# Check volume mounts
./bin/dc exec backend ls -la /projects

# Restart backend
./bin/dc restart backend
```

### Configuration Not Persisting

```bash
# Check config volume
./bin/dc exec backend ls -la /app/config

# View current config
./bin/dc exec backend node /app/shared/dist/tools/config-cli.js show
```

### MCP Connection Issues

```bash
# Test health endpoint
curl http://localhost:3012/health

# Check MCP container
./bin/dc ps mcp
./bin/dc logs -f mcp

# Verify HTTP transport enabled
./bin/dc exec mcp printenv | grep MCP_HTTP
```

### Health Checks

```bash
# Check all containers
./bin/dc ps

# Test frontend
curl http://localhost:5174/

# Test backend (via frontend proxy)
curl http://localhost:5174/api/projects

# Test MCP
curl http://localhost:3012/health
```

---

## Security Configuration

For production deployments, enable optional security features.
See [DOCKER_REFERENCE.md - Security Configuration](DOCKER_REFERENCE.md#security-configuration) for details.

```yaml
environment:
  # Origin validation
  - MCP_SECURITY_ORIGIN_VALIDATION=true
  - MCP_ALLOWED_ORIGINS=https://yourdomain.com

  # Rate limiting
  - MCP_SECURITY_RATE_LIMITING=true
  - MCP_RATE_LIMIT_MAX=100

  # Authentication
  - MCP_SECURITY_AUTH=true
  - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}
```

---

## Related Documentation

- [README.docker.md](../README.docker.md) - Quick start guide
- [DOCKER_REFERENCE.md](DOCKER_REFERENCE.md) - Technical reference, troubleshooting
- [MDT-055](../CRs/MDT-055-docker-containerization-architecture-for-multi-ser.md) - Docker Architecture CR
- [MDT-073](../CRs/MDT-073-docker-based-configuration-management.md) - Configuration Management CR
