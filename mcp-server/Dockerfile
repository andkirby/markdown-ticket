# Multi-stage Dockerfile for MCP Server
# Development: tsx with hot reload and HTTP transport
# Production: Built TypeScript with HTTP transport
# Build context: Project root (uses npm workspaces)

FROM oven/bun:alpine AS base

WORKDIR /app

# Copy workspace root package.json and shared package.json (workspace monorepo)
COPY package*.json ./
COPY tsconfig.shared.json ./

# Development stage
FROM base AS development

# Copy all package.json files before installing
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY domain-contracts/package*.json ./domain-contracts/

# Copy all source code before installing
COPY shared ./shared
COPY domain-contracts ./domain-contracts

# Install all workspace dependencies at root level
RUN bun install --frozen-lockfile

# Copy MCP server source
COPY mcp-server ./mcp-server

# Build domain-contracts and shared TypeScript code using workspace
RUN cd domain-contracts && bun run build
RUN cd shared && bun run build

# Set working directory to mcp-server
WORKDIR /app/mcp-server

# Expose MCP HTTP port
EXPOSE 3002

# Set environment for HTTP transport
ENV NODE_ENV=development
ENV MCP_HTTP_ENABLED=true
ENV MCP_HTTP_PORT=3002
ENV MCP_BIND_ADDRESS=0.0.0.0
ENV LOG_LEVEL=debug

ENV CONFIG_DIR=/app/config
ENV CONFIG_DISCOVER_PATH=/projects
VOLUME /app/config

# Copy entrypoint script
COPY mcp-server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run with tsx for hot reload
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bun", "run", "dev"]

# Build stage
FROM base AS build

# Copy all package.json files before installing
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY domain-contracts/package*.json ./domain-contracts/

# Copy all source code before installing
COPY shared ./shared
COPY domain-contracts ./domain-contracts
COPY mcp-server ./mcp-server

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Build domain-contracts and shared code first using workspace
RUN cd domain-contracts && bun run build
RUN cd shared && bun run build

# Build config-cli tool
RUN cd shared && bun run build:tools

# Build MCP server code using --prefix (runs build in mcp-server context but from root)
RUN bun run build --prefix mcp-server

# Production stage
FROM oven/bun:alpine AS production

WORKDIR /app

# Copy workspace root package.json
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY domain-contracts/package*.json ./domain-contracts/

# Copy node_modules from build stage (has all deps already installed)
COPY --from=build /app/node_modules ./node_modules

# Install only production dependencies (prunes dev deps from existing node_modules)
RUN bun install --frozen-lockfile --production && \
    bun pm cache rm

# Copy built shared code
COPY --from=build --chown=bun:bun /app/shared/dist ./shared/dist
COPY --from=build --chown=bun:bun /app/shared/package.json ./shared/

# Copy built domain-contracts code
COPY --from=build --chown=bun:bun /app/domain-contracts/dist ./domain-contracts/dist
COPY --from=build --chown=bun:bun /app/domain-contracts/package.json ./domain-contracts/

# Copy built config-cli tool
COPY --from=build --chown=bun:bun /app/shared/dist/tools ./shared/dist/tools

# Copy built MCP server code
COPY --from=build --chown=bun:bun /app/mcp-server/dist ./mcp-server/dist

# Set environment for HTTP transport
ENV NODE_ENV=production
ENV MCP_HTTP_ENABLED=true
ENV MCP_HTTP_PORT=3002
ENV MCP_BIND_ADDRESS=0.0.0.0
ENV LOG_LEVEL=info

# Phase 2 Security (optional, disabled by default)
ENV MCP_SECURITY_ORIGIN_VALIDATION=false
ENV MCP_SECURITY_RATE_LIMITING=false
ENV MCP_SECURITY_AUTH=false

ENV CONFIG_DIR=/app/config
ENV CONFIG_DISCOVER_PATH=/projects

VOLUME /app/config

# Create config directory with proper ownership (after VOLUME)
RUN mkdir -p /app/config && chown bun:bun /app/config

# Copy entrypoint script before switching to non-root user
COPY --chown=bun:bun mcp-server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER bun

# Set working directory to mcp-server
WORKDIR /app/mcp-server

# Expose MCP HTTP port
EXPOSE 3002

# Health check for HTTP transport
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3002/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Run production server
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start MCP server with HTTP transport
# Stdio: Available but not typically used in containers
# HTTP: Enabled via MCP_HTTP_ENABLED=true environment variable
CMD ["bun", "dist/index.js"]
