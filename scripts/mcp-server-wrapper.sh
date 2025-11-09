#!/bin/bash
# Wrapper script to run MCP server inside Docker container for Claude Code integration
# This script bridges the host machine with the dockerized MCP server

# Check if Docker container is running
if ! docker ps --format "table {{.Names}}" | grep -q "markdown-ticket-app-dev-1"; then
    echo "Error: Development Docker container is not running." >&2
    echo "Please start it with: docker-compose --profile dev up -d" >&2
    exit 1
fi

# Execute the MCP server inside the Docker container
# Pass through stdin/stdout for MCP protocol communication
exec docker exec -i markdown-ticket-app-dev-1 bash -c "cd mcp-server && node dist/index.js"