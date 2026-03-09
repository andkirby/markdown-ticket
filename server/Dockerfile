# Multi-stage Dockerfile for Backend (Express.js)
# Development: tsx with hot reload
# Production: Built TypeScript running on Bun
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
COPY domain-contracts/package*.json ./domain-contracts/
COPY mcp-server/package*.json ./mcp-server/

# Copy all source code before installing
COPY shared ./shared
COPY domain-contracts ./domain-contracts

# Install all workspace dependencies at root level
RUN bun install --frozen-lockfile

# Copy server source code
COPY server ./server

# Build domain-contracts and shared TypeScript code using workspace
RUN cd domain-contracts && bun run build
RUN cd shared && bun run build

# Set working directory to server
WORKDIR /app/server

# Expose backend port
EXPOSE 3001

# Set environment
ENV NODE_ENV=development
ENV CHOKIDAR_USEPOLLING=true
# FRONTEND_URL not set - MCP dev tools disabled by default in Docker
# Set via docker-compose.yml if needed: FRONTEND_URL=http://frontend:5173

# Copy entrypoint script
COPY server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV CONFIG_DIR=/app/config
ENV CONFIG_DISCOVER_PATH=/projects

# Create config directory with proper ownership
RUN mkdir -p /app/config && chown bun:bun /app/config
VOLUME /app/config

# Run with tsx for hot reload
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["bun", "run", "dev"]

# Build stage
FROM base AS build

# Copy all package.json files before installing
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY domain-contracts/package*.json ./domain-contracts/
COPY mcp-server/package*.json ./mcp-server/

# Copy all source code before installing
COPY shared ./shared
COPY domain-contracts ./domain-contracts
COPY server ./server

# Install all workspace dependencies
RUN bun install --frozen-lockfile

# Build domain-contracts and shared code first using workspace
RUN cd domain-contracts && bun run build
RUN cd shared && bun run build

# Build server code
WORKDIR /app/server
RUN bun run build

# Production stage
FROM oven/bun:alpine AS production

WORKDIR /app

# Copy workspace root package.json
COPY package*.json ./
COPY shared/package*.json ./shared/
COPY server/package*.json ./server/
COPY domain-contracts/package*.json ./domain-contracts/
COPY mcp-server/package*.json ./mcp-server/

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

# Copy built server code
COPY --from=build --chown=bun:bun /app/server/dist ./server/dist

ENV CONFIG_DIR=/app/config
ENV CONFIG_DISCOVER_PATH=/projects

VOLUME /app/config

# Create config directory with proper ownership (after VOLUME)
RUN mkdir -p /app/config && chown bun:bun /app/config

# Copy entrypoint script before switching to non-root user
COPY --chown=bun:bun server/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Switch to non-root user
USER bun

# Set working directory to server
WORKDIR /app/server

# Expose backend port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV CHOKIDAR_USEPOLLING=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD bun -e "fetch('http://localhost:3001/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Set entrypoint
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the server
CMD ["bun", "start"]
