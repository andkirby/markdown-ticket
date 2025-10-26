# MCP Server Dockerfile
# Supports both stdio and HTTP transports

FROM node:20-alpine

WORKDIR /app

# Copy shared services first (for better layer caching)
COPY shared /app/shared

# Copy MCP server package files
COPY mcp-server/package*.json /app/mcp-server/
WORKDIR /app/mcp-server

# Install production dependencies
RUN npm ci --only=production

# Copy MCP server source
COPY mcp-server /app/mcp-server

# Build TypeScript
RUN npm run build

# Expose HTTP port (when enabled via MCP_HTTP_ENABLED=true)
EXPOSE 3002

# Health check (only works when HTTP transport is enabled)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD if [ "$MCP_HTTP_ENABLED" = "true" ]; then \
        wget --no-verbose --tries=1 --spider http://localhost:${MCP_HTTP_PORT:-3002}/health || exit 1; \
      else \
        exit 0; \
      fi

# Start MCP server with both transports
# Stdio: Always enabled
# HTTP: Enabled via MCP_HTTP_ENABLED=true environment variable
CMD ["node", "dist/index.js"]
