# Multi-stage Dockerfile for Markdown Ticket Board
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY server/mcp-dev-tools/package*.json ./server/mcp-dev-tools/

# Install dependencies
RUN npm ci --only=production --silent
RUN cd server && npm ci --only=production --silent
RUN cd mcp-server && npm ci --only=production --silent
RUN cd server/mcp-dev-tools && npm ci --only=production --silent

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app

# Copy package files and install all dependencies (including dev)
COPY package*.json ./
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY server/mcp-dev-tools/package*.json ./server/mcp-dev-tools/

RUN npm ci --silent
RUN cd server && npm ci --silent
RUN cd mcp-server && npm ci --silent
RUN cd server/mcp-dev-tools && npm ci --silent

# Copy source code
COPY . .

# Build frontend
RUN npm run build

# Build MCP server
RUN cd mcp-server && npm run build

# Build dev tools MCP server
RUN cd server/mcp-dev-tools && npm run build

# Production image
FROM base AS runner
WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/mcp-server/dist ./mcp-server/dist
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=deps --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=deps --chown=nodejs:nodejs /app/mcp-server/node_modules ./mcp-server/node_modules

# Copy package.json files for runtime
COPY --chown=nodejs:nodejs package*.json ./
COPY --chown=nodejs:nodejs server/package*.json ./server/
COPY --chown=nodejs:nodejs mcp-server/package*.json ./mcp-server/

# Create directories for data persistence
RUN mkdir -p /app/docs/CRs && chown nodejs:nodejs /app/docs/CRs
RUN mkdir -p /app/data && chown nodejs:nodejs /app/data

USER nodejs

# Expose ports
EXPOSE 3001 5173

# Default command (can be overridden)
CMD ["node", "server/server.js"]