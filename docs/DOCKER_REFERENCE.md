# Docker Technical Reference

**Comprehensive technical reference for Docker containerization of the Markdown Ticket Board.**

This document contains detailed technical specifications, configurations, and troubleshooting information. For getting
started, see [README.docker.md](../README.docker.md). For implementation patterns,
see [DOCKER_GUIDE.md](DOCKER_GUIDE.md).

---

## Port Mappings

- **Frontend (dev)**: Container 5173 → Host 5174
- **Frontend (prod)**: Container 80 → Host 5174
- **Backend**: Container 3001 → Not exposed (internal only)
- **MCP Server**: Container 3002 → Host 3012

### Important Notes

- **Backend is internal only**: Runs on Docker network, accessible via frontend proxy at `/api/*`
- **Frontend proxy**: All `/api/*` requests are proxied to backend on port 3001
- **MCP HTTP**: Exposed on host port 3012 for LLM client connections

---

## Container Services

### Frontend (`mdt-frontend`)

**Development Mode:**

- Runtime: Vite dev server with Hot Module Replacement (HMR)
- Port: 5173 (container) → 5174 (host)
- Watch: `src/` directory for instant updates
- Proxy: `/api/*` → backend:3001

**Production Mode:**

- Runtime: Nginx alpine
- Port: 80 (container) → 80 (host)
- Build: Optimized static files from `npm run build`
- Proxy: `/api/*` → backend:3001
- User: Non-root `nginx` user

### Backend (`mdt-backend`)

**Runtime:** Node.js with tsx (TypeScript executor)

**Services:**
- Express.js API server on port 3001
- Chokidar file watcher (polling mode for Docker)
- Server-Sent Events (SSE) for real-time updates

**Watch Paths:**

- `server/` - Backend code (auto-restart)
- `/projects` - Mounted ticket files (SSE broadcast)

**Health Check:** `GET /api/health`

### MCP Server (`mdt-mcp`)

**Runtime:** Node.js with tsx (TypeScript executor)

**Transports:**

- **HTTP**: Enabled on port 3002 (host: 3012)
    - Endpoint: `http://localhost:3012/mcp`
    - SSE streaming supported
    - Session management via headers

**Tools Implemented:**

- `list_projects` - List all discovered projects
- `get_project_info` - Get project metadata
- `list_crs` - List CRs with filtering
- `get_cr` - Get CR by key
- `create_cr` - Create new CR
- `update_cr_status` - Update CR status
- `update_cr_attrs` - Update CR attributes
- `delete_cr` - Delete CR
- `manage_cr_sections` - CRUD operations on CR sections
- `suggest_cr_improvements` - Analyze CR completeness

**Health Check:** `GET /health`

---

## MCP HTTP Endpoint Reference

### Base URL

```
http://localhost:3012/mcp
```

### Endpoints

| Endpoint  | Method | Purpose           | Request Format                                           |
|-----------|--------|-------------------|----------------------------------------------------------|
| `/mcp`    | POST   | JSON-RPC requests | `{"jsonrpc":"2.0","method":"...","params":{...},"id":1}` |
| `/mcp`    | GET    | SSE streaming     | N/A (event stream)                                       |
| `/health` | GET    | Health check      | N/A (returns `{"status":"ok"}`)                          |

### Request Headers

```bash
# Standard JSON-RPC
Content-Type: application/json

# Session Management (optional)
Mcp-Session-Id: <session-uuid>
```

### Session Management

The MCP server supports session persistence via the `Mcp-Session-Id` header:

1. **First request**: Server creates new session, returns `Mcp-Session-Id` header
2. **Subsequent requests**: Include the header to maintain session context
3. **Session scope**: Project discovery state, configuration caches
4. **Session lifecycle**: Valid for container lifetime

### Example JSON-RPC Request

```bash
curl -X POST http://localhost:3012/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "list_projects",
      "arguments": {}
    },
    "id": 1
  }'
```

---

## Security Configuration

### Phase 2 Security Features

**Note:** These are optional advanced features for production deployments.

### Origin Validation

```yaml
environment:
  - MCP_SECURITY_ORIGIN_VALIDATION=true
  - MCP_ALLOWED_ORIGINS=https://yourdomain.com,https://app.yourdomain.com
```

Validates `Origin` header on incoming requests to prevent CSRF attacks.

### Rate Limiting

```yaml
environment:
  - MCP_SECURITY_RATE_LIMITING=true
  - MCP_RATE_LIMIT_WINDOW=60000    # 1 minute in ms
  - MCP_RATE_LIMIT_MAX=100         # Max requests per window
```

Limits request rate per IP address to prevent abuse.

### Authentication

```yaml
environment:
  - MCP_SECURITY_AUTH=true
  - MCP_AUTH_TOKEN=${MCP_AUTH_TOKEN}  # From .env file
```

Requires Bearer token authentication:

```bash
curl -H "Authorization: Bearer ${MCP_AUTH_TOKEN}" \
  http://localhost:3012/mcp
```

---

## Resource Limits

Resource limits are configured in `docker-compose.prod.yml`. To customize, edit the `deploy.resources` section for each service.

### Monitoring Resource Usage

```bash
# Live stats
docker stats

# Per-container stats
docker stats mdt-frontend
docker stats mdt-backend
docker stats mdt-mcp
```

---

## Performance Considerations

### Development Mode

| Aspect            | Value        | Notes                       |
|-------------------|--------------|-----------------------------|
| **RAM usage**     | ~2GB         | All services combined       |
| **Build size**    | ~500MB each  | Includes dev dependencies   |
| **Startup time**  | 10-15s       | Node.js + watch mode        |
| **File watching** | Polling mode | Required for Docker volumes |
| **Hot reload**    | <1s          | Vite HMR for frontend       |

**Overhead sources:**

- Volume mounting (bind mounts vs layers)
- Polling file watchers (`CHOKIDAR_USEPOLLING=true`)
- TypeScript compilation (tsx)

### Production Mode

| Aspect           | Value          | Notes                           |
|------------------|----------------|---------------------------------|
| **RAM usage**    | ~500MB         | All services combined           |
| **Image size**   | 100-200MB each | Multi-stage builds, no dev deps |
| **Startup time** | 2-5s           | Optimized images                |
| **Hot reload**   | None           | Static files                    |

**Optimizations:**

- Multi-stage Dockerfiles
- Production-only dependencies
- Nginx for static files
- Non-root users
- No volume mounts (code baked into images)

### Disk Usage

```bash
# Check image sizes
docker images

# Check container disk usage
docker system df

# Clean up unused resources
docker system prune -a
```

---

## Development Workflow

### Hot Reload Details

**Frontend (Vite HMR):**

- watches: `src/` directory
- trigger: File save
- latency: <1 second
- preserves: Component state, CSS, console

**Backend (tsx watch):**

- watches: `server/` directory
- trigger: File save
- latency: 2-3 seconds (TypeScript compilation)
- effect: Full server restart

**MCP (tsx watch):**

- watches: `mcp-server/src/` directory
- trigger: File save
- latency: 2-3 seconds (TypeScript compilation)
- effect: Full server restart, reconnect required

### Debugging Tips

```bash
# View container status
docker-compose ps
docker-compose top

# Inspect container
./bin/dc exec backend env              # Environment variables
./bin/dc exec backend ls -la /projects  # Mounted volumes
./bin/dc exec mcp ps aux                # Running processes

# Network issues
./bin/dc exec frontend ping backend    # Test internal network

# Check file watching
./bin/dc exec backend ls -la /projects # Verify mounts
./bin/dc logs -f backend | grep watch  # Watch events

# MCP debugging
curl http://localhost:3012/health
curl -X POST http://localhost:3012/mcp -d '{"jsonrpc":"2.0","method":"ping","id":1}'
```

---

## Migration from Native Setup

### Migration Path

| Week | Activity       | Goal                                             |
|------|----------------|--------------------------------------------------|
| 1    | Parallel setup | Run Docker alongside native, compare performance |
| 2    | Primary Docker | Use Docker for all development work              |
| 3    | Feedback       | Report issues, performance concerns              |
| 4    | Optimization   | Adjust based on feedback                         |

### Rollback to Native

If you need to revert to native Node.js:

```bash
# Stop Docker containers
./bin/dc down

# Use native development
npm run dev:full
```

All projects and configuration remain unchanged (they're in mounted volumes).

### Key Differences

| Aspect            | Docker                    | Native                    |
|-------------------|---------------------------|---------------------------|
| **Startup**       | `./bin/dc up`             | `npm run dev:full`        |
| **Ports**         | Frontend: 5174, MCP: 3012 | Frontend: 5173, MCP: 3002 |
| **File watching** | Polling mode (slower)     | Native events (faster)    |
| **Isolation**     | Containerized             | Shared system             |
| **Build cache**   | Per-container             | Shared npm cache          |

---

## Advanced Troubleshooting

### Permission Errors

**Symptom:** `EACCES` or `EPERM` errors when accessing mounted volumes.

**Diagnosis:**

```bash
./bin/dc exec backend ls -la /projects
./bin/dc exec backend whoami
```

**Solution (development):**

```bash
# Fix ownership on host
sudo chown -R $(whoami):$(whoami) /path/to/projects

# Or run container as current user (add to docker-compose.dev.yml):
user: "${UID}:${GID}"
```

### MCP Server Not Accessible

**Symptom:** `curl: (7) Failed to connect to localhost port 3012`

**Diagnosis:**

```bash
./bin/dc ps mcp                    # Check running
./bin/dc logs -f mcp | tail -20    # Check logs
docker network inspect mdt_default  # Check network
```

**Common causes:**

1. Container not running: `./bin/dc up -d`
2. Port conflict: `lsof -i :3012`
3. HTTP transport disabled: Check `MCP_HTTP_ENABLED=true`
4. Wrong port: Verify `MCP_HTTP_PORT=3002` (container), mapped to 3012 (host)

### Backend Not Responding

**Symptom:** Frontend shows "Backend disconnected"

**Diagnosis:**

```bash
./bin/dc logs -f backend
./bin/dc exec backend ps aux
./bin/dc exec frontend ping backend
```

**Common causes:**

1. Backend crashed: Check logs for errors
2. Network issue: `docker network inspect mdt_default`
3. No projects mounted: Check volume configuration

### File Watching Not Detecting Changes

**Symptom:** Changes to files not reflected in UI

**Diagnosis:**

```bash
./bin/dc logs -f backend | grep -i watch
./bin/dc exec backend printenv | grep CHOKIDAR
```

**Verification:**

1. `CHOKIDAR_USEPOLLING=true` must be set
2. Volumes must be mounted correctly
3. Files must be in watched paths (`/projects`)

**Solution:**

```bash
# Restart with polling enabled
./bin/dc restart backend
```

### Build Failures

**Symptom:** `npm install` fails during build

**Diagnosis:**

```bash
./bin/dc logs frontend | grep -i error
./bin/dc exec frontend npm --version
```

**Common causes:**

1. Network issues (can't reach npm registry)
2. Corrupted cache: `./bin/dc build --no-cache`
3. Platform incompatibility: Check Docker platform (`docker info`)

**Solution:**

```bash
# Clean rebuild
./bin/dc down -v
./bin/dc build --no-cache
./bin/dc up -d
```

### Volume Mount Issues

**Symptom:** Projects not discovered, "no projects found"

**Diagnosis:**

```bash
./bin/dc exec backend ls -la /projects
```

**Common causes:**

1. Wrong volume mount path in `docker-compose.*.yml`
2. Path not mounted in `docker-compose.*.yml`
3. Permission issues (see above)
4. Missing global config: `~/.config/markdown-ticket/`

**Solution:**

```bash
# Verify mount point
./bin/dc exec backend ls -la /projects

# Check global config
./bin/dc exec backend ls -la /root/.config/markdown-ticket/
```

---

## Related Documentation

- [README.docker.md](../README.docker.md) - Quick start guide
- [DOCKER_GUIDE.md](DOCKER_GUIDE.md) - Implementation patterns and configuration
- [MDT-055](../CRs/MDT-055-docker-containerization-architecture-for-multi-ser.md) - Docker Architecture CR
- [MDT-074](../CRs/MDT-074-sse-transport-implementation-for-mcp-operations.md) - MCP HTTP Transport CR
- [MDT-073](../CRs/MDT-073-docker-based-configuration-management.md) - Configuration Management CR
