#!/bin/sh
set -e

echo "Starting backend server..."
cd /app/server
exec "$@"
