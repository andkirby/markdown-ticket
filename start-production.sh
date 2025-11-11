#!/bin/bash

# Production Start Script for Frontend + Backend + MCP Server
# Starts all services in production mode

set -e

echo "🚀 Starting All Services in Production Mode"
echo "=========================================="

# Function to check if port is available
check_port() {
    local port=$1
    if lsof -i :$port > /dev/null 2>&1; then
        echo "⚠️  Port $port is already in use"
        return 1
    fi
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local url=$1
    local name=$2
    local max_attempts=30
    local attempt=1

    echo "⏳ Waiting for $name to be ready..."
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            echo "✅ $name is ready!"
            return 0
        fi
        echo "   Attempt $attempt/$max_attempts..."
        sleep 1
        attempt=$((attempt + 1))
    done

    echo "❌ $name failed to start within $max_attempts seconds"
    return 1
}

# Check if all components are built
echo "🔍 Checking if components are built..."

if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Frontend not built. Run 'npm run build:all' first"
    exit 1
fi

if [ ! -d "server/dist" ] || [ ! -f "server/dist/server.js" ]; then
    echo "❌ Server not built. Run 'npm run build:all' first"
    exit 1
fi

if [ ! -d "mcp-server/dist" ] || [ ! -f "mcp-server/dist/index.js" ]; then
    echo "❌ MCP Server not built. Run 'npm run build:all' first"
    exit 1
fi

echo "✅ All components built"

# Check ports
echo ""
echo "🔍 Checking port availability..."
check_port 5173 || (echo "Frontend port 5173 is in use. Stop the service first." && exit 1)
check_port 3001 || (echo "Backend port 3001 is in use. Stop the service first." && exit 1)
check_port 3002 || (echo "MCP Server port 3002 is in use. Stop the service first." && exit 1)
echo "✅ All ports available"

# Create logs directory
mkdir -p logs

# Start services
echo ""
echo "🚀 Starting services..."

# Start Backend Server
echo "🔧 Starting Backend Server (port 3001)..."
cd server && NODE_ENV=production nohup npm start > ../logs/backend.log 2>&1 &
BACKEND_PID=$!
cd ..
echo "   Backend PID: $BACKEND_PID"

# Start MCP Server
echo "🔧 Starting MCP Server (port 3002)..."
cd mcp-server && MCP_HTTP_ENABLED=true NODE_ENV=production nohup npm start > ../logs/mcp-server.log 2>&1 &
MCP_PID=$!
cd ..
echo "   MCP Server PID: $MCP_PID"

# Start Frontend (static server)
echo "🔧 Starting Frontend (port 5173)..."
cd dist && python3 -m http.server 5173 > ../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..
echo "   Frontend PID: $FRONTEND_PID"

# Save PIDs
echo "$BACKEND_PID" > logs/backend.pid
echo "$MCP_PID" > logs/mcp-server.pid
echo "$FRONTEND_PID" > logs/frontend.pid

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to start..."

wait_for_service "http://localhost:3001/health" "Backend Server"
wait_for_service "http://localhost:3002/health" "MCP Server"
wait_for_service "http://localhost:5173" "Frontend"

# Show service URLs
echo ""
echo "🎉 All services started successfully!"
echo "=================================="
echo "🌐 Frontend:     http://localhost:5173"
echo "🔧 Backend API:  http://localhost:3001"
echo "🤖 MCP Server:   http://localhost:3002"
echo "=================================="

echo ""
echo "📝 Logs:"
echo "   Backend:   logs/backend.log"
echo "   MCP:       logs/mcp-server.log"
echo "   Frontend:  logs/frontend.log"
echo ""
echo "🛑 To stop all services: ./stop-production.sh"
echo "🔍 To check status: ps aux | grep -E '(node|python3)' | grep -v grep"

exit 0