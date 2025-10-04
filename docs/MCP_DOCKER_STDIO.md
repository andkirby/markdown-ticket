# MCP Server Docker Setup with stdio Transport

This guide explains how to run the MCP server in a Docker container while maintaining stdio (standard input/output) connectivity for LLM clients like Claude Code and Amazon Q.

## Overview

The MCP protocol uses stdio transport by default, where:
- LLM clients communicate with the MCP server via standard input/output pipes
- The server receives JSON-RPC messages on stdin
- The server sends JSON-RPC responses on stdout
- All logging goes to stderr

Docker containers can support stdio through the `docker exec` command, allowing LLMs to communicate with containerized MCP servers.

## Architecture

```
┌─────────────────┐
│  LLM Client     │
│ (Claude/Q)      │
└────────┬────────┘
         │ stdio (JSON-RPC)
         ▼
┌─────────────────┐
│ mcp-docker.sh   │  ← Wrapper script
│ (stdio bridge)  │
└────────┬────────┘
         │ docker exec -i
         ▼
┌─────────────────┐
│ Docker          │
│ Container       │
│                 │
│ ┌─────────────┐ │
│ │ MCP Server  │ │
│ │ (Node.js)   │ │
│ └─────────────┘ │
│                 │
│ Volumes:        │
│ - ~/.config/... │
│ - ~/home        │
└─────────────────┘
```

## Quick Start

### 1. Build and Start the MCP Container

```bash
# Build the MCP server image and start the container
docker-compose -f docker-compose.mcp.yml up -d

# Verify the container is running
docker ps | grep markdown-ticket-mcp
```

### 2. Test the MCP Server

```bash
# Test stdio connectivity
docker exec -i markdown-ticket-mcp node /app/mcp-server/dist/index.js

# The server should start and wait for JSON-RPC messages on stdin
# Press Ctrl+C to exit
```

### 3. Configure Your LLM Client

The `mcp-docker.sh` wrapper script bridges stdio between the LLM and the container.

#### For Claude Code:

```bash
# Add the MCP server
claude mcp add mdt-docker ./mcp-docker.sh

# Verify it's registered
claude mcp list

# Test it
claude mcp test mdt-docker
```

#### For Amazon Q:

```bash
# Add the MCP server
q mcp add --name mdt-docker \
  --command "./mcp-docker.sh" \
  --scope global

# Verify
q mcp list

# Test
q mcp test mdt-docker
```

### 4. Using the MCP Server

Once configured, the LLM can use MCP tools transparently:

```bash
# In Claude Code:
> list all CRs in project MDT

# In Amazon Q:
> show me the CRs for project API
```

## Configuration

### Environment Variables

The wrapper script supports customization via environment variables:

```bash
# Set custom container name
export MCP_CONTAINER_NAME="my-mcp-server"

# Set custom projects directory
export MCP_PROJECTS_DIR="/path/to/projects"

# Set custom image name
export MCP_IMAGE_NAME="my-org/mcp-server:latest"

# Use the wrapper
./mcp-docker.sh
```

### Volume Mounts

The default setup mounts:

1. **Config directory** (read-only):
   - Host: `~/.config/markdown-ticket`
   - Container: `/root/.config/markdown-ticket:ro`

2. **Projects workspace**:
   - Host: `~/home` (default)
   - Container: `/workspace`

To mount additional project directories, edit `docker-compose.mcp.yml`:

```yaml
volumes:
  - ~/.config/markdown-ticket:/root/.config/markdown-ticket:ro
  - ~/my-projects:/workspace/my-projects
  - /var/work/project-a:/workspace/project-a
```

### MCP Server Configuration

Create or edit `~/.config/markdown-ticket/mcp-server.toml`:

```toml
[server]
port = 8000
logLevel = "info"

[discovery]
# In Docker, use container paths
scanPaths = [
  "/workspace",           # Main workspace
  "/workspace/project-a", # Specific project
  "/workspace/project-b"
]

excludePaths = [
  "node_modules",
  ".git",
  "vendor"
]

maxDepth = 4
cacheTimeout = 300

[templates]
# Optional custom templates
# customPath = "/root/.config/markdown-ticket/templates"
```

## How It Works

### The Wrapper Script (`mcp-docker.sh`)

The wrapper script does two things:

1. **Container Already Running**: Uses `docker exec` to execute the MCP server in the existing container
   ```bash
   docker exec -i markdown-ticket-mcp node /app/mcp-server/dist/index.js
   ```

2. **No Container**: Starts a temporary container
   ```bash
   docker run --rm -i \
     --name markdown-ticket-mcp-$$ \
     -v ~/.config:/root/.config:ro \
     -v ~/home:/workspace \
     markdown-ticket/mcp-server:latest
   ```

The `-i` flag is critical—it keeps stdin open for JSON-RPC communication.

### stdio Flow

1. LLM writes JSON-RPC request to stdin
2. Wrapper script pipes stdin to `docker exec -i`
3. Docker forwards stdin to the container's process
4. MCP server processes the request
5. MCP server writes JSON-RPC response to stdout
6. Docker forwards stdout back through the pipe
7. Wrapper script pipes stdout to LLM
8. All stderr (logs) goes to the LLM's error stream

## Troubleshooting

### Container Not Found

```bash
# Check if container is running
docker ps -a | grep markdown-ticket-mcp

# Start if stopped
docker-compose -f docker-compose.mcp.yml up -d

# Rebuild if needed
docker-compose -f docker-compose.mcp.yml build --no-cache
```

### LLM Can't Connect

```bash
# Test wrapper script manually
./mcp-docker.sh

# Check wrapper script permissions
chmod +x ./mcp-docker.sh

# Verify Docker socket access
docker info
```

### File Access Issues

```bash
# Check volume mounts
docker inspect markdown-ticket-mcp | jq '.[0].Mounts'

# Test file access in container
docker exec -it markdown-ticket-mcp ls -la /workspace
docker exec -it markdown-ticket-mcp ls -la /root/.config/markdown-ticket
```

### MCP Server Errors

```bash
# View container logs
docker logs markdown-ticket-mcp

# Check MCP server startup
docker exec -it markdown-ticket-mcp node /app/mcp-server/dist/index.js

# Verify config
docker exec -it markdown-ticket-mcp cat /root/.config/markdown-ticket/mcp-server.toml
```

## Advanced Usage

### Running Multiple MCP Instances

You can run multiple MCP containers for different projects:

```bash
# Start first instance
MCP_CONTAINER_NAME=mcp-project-a docker-compose -f docker-compose.mcp.yml up -d

# Start second instance with different volumes
MCP_CONTAINER_NAME=mcp-project-b \
MCP_PROJECTS_DIR=/path/to/project-b \
docker-compose -f docker-compose.mcp.yml up -d

# Configure LLMs
claude mcp add project-a ./mcp-docker.sh --container mcp-project-a
claude mcp add project-b ./mcp-docker.sh --container mcp-project-b
```

### Custom Dockerfile

To customize the MCP server build:

```dockerfile
# Dockerfile.mcp.custom
FROM markdown-ticket/mcp-server:latest

# Add custom dependencies
RUN apk add --no-cache git

# Copy custom templates
COPY ./my-templates /app/templates

# Use custom entrypoint
COPY ./custom-entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
```

Build and use:

```bash
docker build -f Dockerfile.mcp.custom -t my-mcp-server .
MCP_IMAGE_NAME=my-mcp-server ./mcp-docker.sh
```

### Health Checks

Add a health check to the docker-compose:

```yaml
services:
  mcp:
    # ... existing config ...
    healthcheck:
      test: ["CMD", "node", "-e", "process.exit(0)"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

## Performance Considerations

- **stdio overhead**: `docker exec` adds ~10-50ms latency per request
- **Volume performance**: Use `:delegated` mount option on macOS for better performance
- **Container resources**: Default limits are usually sufficient for MCP servers

```yaml
services:
  mcp:
    # ... existing config ...
    deploy:
      resources:
        limits:
          cpus: '0.5'
          memory: 512M
        reservations:
          cpus: '0.25'
          memory: 256M
```

## Security

### Best Practices

1. **Read-only mounts**: Mount config directories as `:ro`
2. **Minimal volumes**: Only mount what's needed
3. **Non-root user**: MCP Dockerfile runs as `node` user
4. **Network isolation**: MCP container doesn't need network access
5. **Image scanning**: Regularly scan images for vulnerabilities

```bash
# Scan image for vulnerabilities
docker scan markdown-ticket/mcp-server:latest

# Run container with security options
docker run --rm -i \
  --security-opt no-new-privileges \
  --cap-drop ALL \
  --read-only \
  markdown-ticket/mcp-server:latest
```

## Migration from Host-based MCP

If you're currently running MCP on the host:

1. **Backup config**:
   ```bash
   cp -r ~/.config/markdown-ticket ~/.config/markdown-ticket.backup
   ```

2. **Test in parallel**:
   ```bash
   # Old: Host-based
   claude mcp add mdt-host node ./mcp-server/dist/index.js

   # New: Docker-based
   claude mcp add mdt-docker ./mcp-docker.sh

   # Test both work
   claude mcp test mdt-host
   claude mcp test mdt-docker
   ```

3. **Switch over**:
   ```bash
   # Remove old
   claude mcp remove mdt-host

   # Rename new to default
   claude mcp remove mdt-docker
   claude mcp add mdt ./mcp-docker.sh
   ```

## Comparison: Docker vs Host

| Aspect | Host-based | Docker-based |
|--------|-----------|--------------|
| **Setup** | Simple | Moderate |
| **Dependencies** | Requires Node.js | Only Docker |
| **Isolation** | No | Yes |
| **Portability** | Platform-specific | Cross-platform |
| **Performance** | Best | Good (slight overhead) |
| **Updates** | Manual | `docker pull` |
| **Debugging** | Easy | Moderate |

## Next Steps

1. ✅ Set up MCP server in Docker
2. ✅ Configure LLM client
3. 🔲 Integrate with CI/CD for automatic builds
4. 🔲 Set up monitoring and logging
5. 🔲 Create production deployment with orchestration (Kubernetes, ECS)

## Related Documentation

- [MDT-055: Docker Containerization Architecture](../CRs/MDT-055-docker-containerization-architecture-for-multi-ser.md)
- [MCP Protocol Specification](https://modelcontextprotocol.io)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
