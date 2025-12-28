#!/bin/sh
set -e

echo "Starting MCP server..."
cd /app/mcp-server

# Create default config if it doesn't exist
if [ ! -f /app/config/config.toml ]; then
    echo "Creating default config at /app/config/config.toml"
    mkdir -p /app/config
    cat > /app/config/config.toml << 'EOF'
# Docker Configuration for Markdown Ticket
# This config is container-only and independent of host configuration
[discovery]
autoDiscover = true
searchPaths = ["/projects"]
EOF
fi

node /app/shared/dist/tools/config-cli.js set discovery.searchPaths "${CONFIG_DISCOVER_PATH:-/projects}"

exec "$@"
