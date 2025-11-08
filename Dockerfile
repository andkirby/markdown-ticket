# Unified Multi-stage Dockerfile for Markdown Ticket Board
# Supports both development and production environments through build targets

# Shared foundation
FROM node:20-alpine AS base
WORKDIR /app

# Install common utilities needed for development and production
RUN apk add --no-cache git bash

# Dependencies setup stage (shared)
FROM base AS deps-base
# Copy package files for all services
COPY package*.json ./
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/
COPY server/mcp-dev-tools/package*.json ./server/mcp-dev-tools/

# Development dependencies (includes dev dependencies)
FROM deps-base AS dev-deps
RUN npm ci
RUN cd server && npm ci
RUN cd mcp-server && npm ci
RUN cd server/mcp-dev-tools && npm ci

# Production dependencies (production only)
FROM deps-base AS prod-deps
RUN npm ci --only=production --silent
RUN cd server && npm ci --only=production --silent
RUN cd mcp-server && npm ci --only=production --silent
RUN cd server/mcp-dev-tools && npm ci --only=production --silent

# Development targets
# Frontend development target
FROM dev-deps AS frontend
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# Backend development target
FROM dev-deps AS backend
COPY . .
EXPOSE 3001
CMD ["npm", "run", "dev:server"]

# MCP server development target
FROM dev-deps AS mcp
COPY . .
CMD ["sh", "-c", "cd mcp-server && npm run dev"]

# Full development environment (default development)
FROM dev-deps AS development
COPY . .
EXPOSE 5173 3001

# Create directories for data
RUN mkdir -p /app/docs/CRs
RUN mkdir -p /app/data

# Default command for full development
CMD ["npm", "run", "dev:full"]

# Build stage (for production)
FROM dev-deps AS builder
# Copy source code
COPY . .

# Build shared code first (required by both frontend and backend)
RUN npm run build:shared

# Build frontend (includes TypeScript compilation)
RUN npm run build

# Build backend TypeScript (creates dist/ that MCP server depends on)
RUN cd server && npx tsc

# Build dev tools MCP server (no dependencies on main build)
RUN cd server/mcp-dev-tools && npm run build

# Build MCP server (now imports from shared TypeScript source files)
RUN cd mcp-server && npm run build

# Production runner
FROM base AS runner
# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

# Copy built application
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/server ./server
COPY --from=builder --chown=nodejs:nodejs /app/mcp-server/dist ./mcp-server/dist
COPY --from=prod-deps --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/server/node_modules ./server/node_modules
COPY --from=prod-deps --chown=nodejs:nodejs /app/mcp-server/node_modules ./mcp-server/node_modules

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

# Test target for E2E testing
FROM dev-deps AS test
COPY . .
# Create directories for data
RUN mkdir -p /app/docs/CRs
RUN mkdir -p /app/data
CMD ["npm", "run", "test:e2e"]