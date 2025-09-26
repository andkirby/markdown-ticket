#!/bin/bash

# Health check script for mdt-logging MCP server
# Usage: ./health-check.sh

cd "$(dirname "$0")"

echo "🔍 Checking mdt-logging MCP server health..."

# Check if dist directory exists
if [ ! -d "dist" ]; then
    echo "❌ MCP server not built. Run 'npm run build' first."
    exit 1
fi

# Run the health check
npm run health-check
