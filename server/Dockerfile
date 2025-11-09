# Backend Dockerfile - Express.js + Node.js
FROM node:20-alpine AS base
WORKDIR /app

# Install utilities
RUN apk add --no-cache git bash

# Dependencies for server
FROM base AS deps
COPY server/package*.json ./
RUN npm ci

# Development target
FROM deps AS development
COPY server/ .
# Copy built shared code from shared-builder image
COPY --from=markdown-ticket-shared-builder /app/shared-dist ./shared-dist
EXPOSE 3001
ENV NODE_ENV=development
ENV PORT=3001
CMD ["npm", "run", "dev"]

# Production dependencies
FROM base AS prod-deps
COPY server/package*.json ./
RUN npm ci --omit=dev

# Production runtime
FROM base AS production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs

COPY --from=development /app .
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=markdown-ticket-shared-builder /app/shared-dist ./shared-dist

# Create directories for data persistence
RUN mkdir -p /app/sample-tasks && chown nodejs:nodejs /app/sample-tasks

USER nodejs
EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001
CMD ["node", "server.js"]