# Multi-stage Dockerfile for Frontend (React + Vite)
# Development: Vite dev server with hot reload
# Production: Static build served with nginx

FROM oven/bun:alpine AS base
WORKDIR /app

# Install dependencies for shared code and frontend (workspace monorepo)
COPY package*.json ./
COPY tsconfig.shared.json ./
COPY shared ./shared
COPY domain-contracts ./domain-contracts
COPY server/package*.json ./server/
COPY mcp-server/package*.json ./mcp-server/

# Development stage
FROM base AS development

# Install all dependencies (including devDependencies)
RUN bun install --frozen-lockfile

# Copy the frontend area (app source + vite/tailwind/tsconfig configs).
# The build script needs tsconfig.shared.json (copied in base) and runs the
# frontend typecheck/build via `bun run --cwd frontend`.
COPY frontend ./frontend

# Build domain-contracts and shared code
RUN bun run build:domain-contracts
RUN bun run build:shared

# Expose Vite dev server port
EXPOSE 5173

# Set environment
ENV NODE_ENV=development

# Start Vite dev server with host 0.0.0.0 for Docker
CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0"]

# Production build stage
FROM base AS build

# Install all dependencies for build (including devDependencies for compilation)
RUN bun install --frozen-lockfile

# Copy the frontend area (app source + vite/tailwind/tsconfig configs).
# The build script needs tsconfig.shared.json (copied in base) and runs the
# frontend typecheck/build via `bun run --cwd frontend`.
COPY frontend ./frontend
COPY domain-contracts ./domain-contracts

# Build domain-contracts, shared code, and frontend
RUN bun run build:domain-contracts
RUN bun run build

# Production stage
FROM nginx:alpine AS production

# Copy custom nginx config
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built assets from build stage
COPY --from=build /app/dist /usr/share/nginx/html

# Fix permissions for nginx to serve files
RUN chmod go+r /usr/share/nginx/html -R

# Expose nginx port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
