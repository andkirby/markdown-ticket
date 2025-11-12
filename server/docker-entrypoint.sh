#!/bin/sh
set -e

echo "Starting backend server..."
cd /app/server

node /app/shared/dist/tools/config-cli.js set discovery.searchPaths "${CONFIG_DISCOVER_PATH:-/projects}"

exec "$@"
