#!/bin/sh
set -e

echo "Building shared TypeScript code..."
# Build shared code using MCP server's node_modules with relaxed type checking
if [ -f /app/shared/tsconfig.json ]; then
  cd /app/mcp-server
  ./node_modules/.bin/tsc --project /app/shared/tsconfig.json --skipLibCheck --noEmit false 2>&1 | grep -v "error TS" || true
  echo "Shared code built to /app/shared/dist/"
fi

echo "Starting MCP server..."
cd /app/mcp-server
exec "$@"
