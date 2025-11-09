#!/bin/bash
# Wrapper script to run MCP server inside Docker container for Claude Code integration
# This script bridges the host machine with the dockerized MCP server

# Change to the project directory to ensure docker-compose works
cd "$(dirname "$0")/.."

# Use docker-compose to run the MCP server with proper configuration
exec docker-compose run --rm -i mcp-server bash -c "cd /app && npm run dev"