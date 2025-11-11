# Multi-stage Dockerfile for Backend (Express.js)
# Development: tsx with hot reload
# Production: Built TypeScript running on Node.js
# Build context: Project root (uses npm workspaces)

FROM node:20-alpine AS base
WORKDIR /app

# Copy workspace root package.json and shared package.json (workspace monorepo)
COPY package*.json ./
COPY tsconfig.shared.json ./
COPY shared/package.json ./shared/
COPY server/package.json ./server/
COPY mcp-server/package.json ./mcp-server/

# Development stage
FROM base AS development

# Install all workspace dependencies at root level
RUN npm ci

# Copy shared source code
COPY shared ./shared

# Copy server source code
COPY server ./server

# Build shared TypeScript code using workspace
RUN cd shared && npm run build

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

# Run with tsx for hot reload
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "dev"]

# Build stage
FROM base AS build

# Install all dependencies
RUN npm ci

# Copy all source code
COPY shared ./shared
COPY server ./server

# Build shared code first using workspace
RUN cd shared && npm run build

# Build server code
WORKDIR /app/server
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
COPY server/package.json ./server/

# Copy node_modules from build stage (all deps needed for production)
COPY --from=build /app/node_modules ./node_modules

# Prune to production dependencies only
RUN npm ci --only=production --prefer-offline && \
    npm cache clean --force

# Copy built shared code
COPY --from=build --chown=nodejs:nodejs /app/shared/dist ./shared/dist
COPY --from=build --chown=nodejs:nodejs /app/shared/package.json ./shared/

# Copy built server code
COPY --from=build --chown=nodejs:nodejs /app/server/dist ./server/dist

# Switch to non-root user
USER nodejs

# Set working directory to server
WORKDIR /app/server

# Expose backend port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV CHOKIDAR_USEPOLLING=true

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the server
CMD ["npm", "start"]
