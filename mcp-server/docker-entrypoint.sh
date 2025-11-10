#!/bin/sh
set -e

echo "Starting MCP server..."
cd /app/mcp-server
exec "$@"
