# MCP Server Dockerfile - Model Context Protocol
FROM node:20-alpine AS base
WORKDIR /app

# Install utilities
RUN apk add --no-cache git bash

# Dependencies for MCP server
FROM base AS deps
COPY mcp-server/package*.json ./
RUN npm ci

# Development target
FROM deps AS development
COPY mcp-server/ .
# Copy built shared code from shared-builder
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
# Create symlink for compatibility with existing imports
RUN cd .. && ln -s ./app/shared-dist ./shared
ENV NODE_ENV=development
ENV MCP_PROJECT_FILTER=""
CMD ["npm", "run", "dev"]

# Production dependencies
FROM base AS prod-deps
COPY mcp-server/package*.json ./
RUN npm ci --omit=dev

# Production build target
FROM deps AS builder
COPY mcp-server/ .
# Copy built shared code from shared-builder
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
# Create symlink for compatibility with existing imports
RUN cd .. && ln -s ./app/shared-dist ./shared
RUN npm run build

# Production runtime
FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app .
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
# Create symlink for compatibility with existing imports
RUN cd .. && ln -s ./app/shared-dist ./shared

USER nodejs
ENV NODE_ENV=production
ENV MCP_PROJECT_FILTER=""
CMD ["node", "dist/index.js"]