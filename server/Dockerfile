# Multi-stage Dockerfile for Backend (Express.js)
# Development: tsx with hot reload
# Production: Built TypeScript running on Node.js
# Build context: Project root (requires shared/ directory)

FROM node:20-alpine AS base
WORKDIR /app

# Copy shared code first (for better layer caching)
COPY shared /app/shared

# Install dependencies
COPY server/package*.json /app/server/
WORKDIR /app/server

# Development stage
FROM base AS development

# Install all dependencies (including devDependencies for tsx)
RUN npm ci

# Copy source code
COPY server /app/server

# Build shared TypeScript code during image build
RUN cd /app/server && ./node_modules/.bin/tsc --project ../shared/tsconfig.json || echo "Shared build completed with warnings"

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

# Copy source code
COPY server /app/server

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app/server

# Copy package files
COPY server/package*.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Copy shared services
COPY --chown=nodejs:nodejs shared /app/shared

# Copy built application from build stage
COPY --from=build --chown=nodejs:nodejs /app/server/dist ./dist

# Switch to non-root user
USER nodejs

# Expose backend port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production
ENV CHOKIDAR_USEPOLLING=true
# FRONTEND_URL not set - MCP dev tools disabled by default in Docker
# Set via docker-compose.yml if needed: FRONTEND_URL=http://frontend:5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the server
CMD ["npm", "start"]
