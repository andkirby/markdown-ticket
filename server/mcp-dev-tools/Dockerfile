# MCP Dev Tools Dockerfile - Logging and Debugging
FROM node:20-alpine AS base
WORKDIR /app

# Install utilities
RUN apk add --no-cache git bash

# Dependencies for dev tools
FROM base AS deps
COPY server/mcp-dev-tools/package*.json ./
RUN npm ci

# Development target
FROM deps AS development
COPY server/mcp-dev-tools/ .
# Copy built shared code from shared-builder image
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
ENV NODE_ENV=development
CMD ["npm", "run", "dev"]

# Production dependencies
FROM base AS prod-deps
COPY server/mcp-dev-tools/package*.json ./
RUN npm ci --omit=dev

# Production build target
FROM deps AS builder
COPY server/mcp-dev-tools/ .
# Copy built shared code from shared-builder image
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
RUN npm run build

# Production runtime
FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=builder /app .
COPY --from=prod-deps /app/node_modules ./node_modules
# Copy built shared code from shared-builder image
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist

USER nodejs
ENV NODE_ENV=production
CMD ["node", "dist/index.js"]