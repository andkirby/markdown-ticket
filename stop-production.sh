#!/bin/bash

# Stop All Production Services

set -e

echo "🛑 Stopping All Production Services"
echo "================================="

# Function to stop service by PID file
stop_service() {
    local pid_file=$1
    local name=$2

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "🛑 Stopping $name (PID: $pid)..."
            kill $pid
            # Wait for graceful shutdown
            sleep 2
            if ps -p $pid > /dev/null 2>&1; then
                echo "   Force killing $name..."
                kill -9 $pid
            fi
            echo "✅ $name stopped"
        else
            echo "⚠️  $name PID $pid not running"
        fi
        rm -f "$pid_file"
    else
        echo "⚠️  No PID file found for $name"
    fi
}

# Stop services using PID files
stop_service "logs/backend.pid" "Backend Server"
stop_service "logs/mcp-server.pid" "MCP Server"
stop_service "logs/frontend.pid" "Frontend"

# Also kill any remaining processes on the ports
echo ""
echo "🔍 Checking for remaining processes..."

for port in 3001 3002 5173; do
    pid=$(lsof -ti :$port 2>/dev/null || true)
    if [ ! -z "$pid" ]; then
        echo "🛑 Killing process on port $port (PID: $pid)..."
        kill -9 $pid
    fi
done

# Clean up logs if they're getting large
echo ""
echo "🧹 Cleaning up..."
if [ -d "logs" ]; then
    echo "   Log files preserved in logs/ directory"
else
    mkdir -p logs
fi

echo "✅ All services stopped"
echo ""
echo "🔍 Verify no services running:"
echo "   lsof -i :3001  # Backend"
echo "   lsof -i :3002  # MCP Server"
echo "   lsof -i :5173  # Frontend"