# Frontend Dockerfile - React + Vite + TypeScript
FROM node:20-alpine AS base
WORKDIR /app

# Install utilities
RUN apk add --no-cache git bash

# Copy package files and install dependencies
FROM base AS deps
COPY package*.json ./
RUN npm ci

# Development target
FROM deps AS development
COPY . .
# Copy built shared code from shared-builder
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
EXPOSE 5173
ENV VITE_API_BASE_URL=http://backend:3001
CMD ["npm", "run", "dev"]

# Production build target
FROM deps AS builder
COPY . .
# Copy built shared code from shared-builder
COPY --from=markdown-ticket-shared-builder:latest /app/shared-dist ./shared-dist
RUN npm run build

# Production runtime
FROM nginx:alpine AS production
COPY --from=builder /app/dist /usr/share/nginx/html
COPY <<EOF /etc/nginx/conf.d/default.conf
server {
    listen 5173;
    location / {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
EXPOSE 5173
CMD ["nginx", "-g", "daemon off;"]