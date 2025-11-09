# Multi-stage Dockerfile for MCP Server
# Development: tsx with hot reload and HTTP transport
# Production: Built TypeScript with HTTP transport
# Build context: Project root (requires shared/ directory)

FROM node:20-alpine AS base

WORKDIR /app

# Copy shared services first (for better layer caching)
COPY shared /app/shared

# Copy MCP server package files
COPY mcp-server/package*.json /app/mcp-server/
WORKDIR /app/mcp-server

# Development stage
FROM base AS development

# Install all dependencies (including devDependencies for tsx)
RUN npm ci

# Copy MCP server source
COPY mcp-server /app/mcp-server

# Build shared TypeScript code during image build
RUN cd /app/mcp-server && ./node_modules/.bin/tsc --project ../shared/tsconfig.json || echo "Shared build completed with warnings"

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

# Install all dependencies
RUN npm ci

# Copy MCP server source
COPY mcp-server /app/mcp-server

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app/mcp-server

# Copy package files
COPY mcp-server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy shared services
COPY --chown=nodejs:nodejs shared /app/shared

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/mcp-server/dist ./dist

# Switch to non-root user
USER nodejs

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
