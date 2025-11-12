#!/bin/sh
set -e

echo "Starting MCP server..."
cd /app/mcp-server


node /app/shared/dist/tools/config-cli.js set discovery.searchPaths "${CONFIG_DISCOVER_PATH:-/projects}"

exec "$@"
