# Multi-stage Dockerfile for MCP Server
# Development: tsx with hot reload and HTTP transport
# Production: Built TypeScript with HTTP transport
# Build context: Project root (uses npm workspaces)

FROM node:20-alpine AS base

WORKDIR /app

# Copy workspace root package.json and shared package.json (workspace monorepo)
COPY package*.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY mcp-server/package.json ./mcp-server/

# Development stage
FROM base AS development

# Install all workspace dependencies at root level
RUN npm ci

# Copy shared source code
COPY shared ./shared

# Copy MCP server source
COPY mcp-server ./mcp-server

# Build shared TypeScript code using workspace
RUN cd shared && npm run build

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

# Copy entrypoint script
COPY mcp-server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Run with tsx for hot reload
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all workspace dependencies
RUN npm ci

# Copy all source code
COPY shared ./shared
COPY mcp-server ./mcp-server

# Build shared code first using workspace
RUN cd shared && npm run build

# Build MCP server code
WORKDIR /app/mcp-server
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy workspace root package.json
COPY package*.json ./
COPY shared/package.json ./shared/
COPY mcp-server/package.json ./mcp-server/

# Copy node_modules from build stage (has all deps already installed)
COPY --from=build /app/node_modules ./node_modules

# Install only production dependencies (prunes dev deps from existing node_modules)
RUN npm ci --omit=dev && \
    npm cache clean --force

# Copy built shared code
COPY --from=build --chown=nodejs:nodejs /app/shared/dist ./shared/dist
COPY --from=build --chown=nodejs:nodejs /app/shared/package.json ./shared/

# Copy built MCP server code
COPY --from=build --chown=nodejs:nodejs /app/mcp-server/dist ./mcp-server/dist

# Switch to non-root user
USER nodejs

# Set working directory to mcp-server
WORKDIR /app/mcp-server

# Expose MCP HTTP port
EXPOSE 3002

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

# Health check for HTTP transport
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start MCP server with HTTP transport
# Stdio: Available but not typically used in containers
# HTTP: Enabled via MCP_HTTP_ENABLED=true environment variable
CMD ["node", "dist/index.js"]
