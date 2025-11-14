#!/usr/bin/env bash

# Production Start Script for MDT
# This script starts the production servers using built .js files
# Can be run from any directory - will automatically find the project root

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project root directory
cd "${SCRIPT_DIR}" || exit 1

echo "🏠 Working from project directory: ${SCRIPT_DIR}"

# Verify we're in the correct project directory
if [ ! -f "package.json" ] || (! grep -q "MDT\|markdown-ticket" package.json 2>/dev/null); then
    echo "❌ Error: This doesn't appear to be the MDT project directory"
    echo "   Expected to find package.json with project identifiers in: ${SCRIPT_DIR}"
    echo "   Please make sure the script is in the project root directory"
    exit 1
fi

echo "✅ Found MDT project"

# Function to kill processes on specific ports
kill_processes_on_ports() {
    local ports=("$@")
    for port in "${ports[@]}"; do
        echo "🔍 Checking for processes on port $port..."
        pids=$(lsof -ti:"$port" 2>/dev/null)
        if [ -n "$pids" ]; then
            echo "🔥 Killing processes on port $port: $pids"
            kill -9 $pids 2>/dev/null
            echo "✅ Processes on port $port killed"
        else
            echo "✅ No processes found on port $port"
        fi
    done
}

# Function to stop all running processes
stop_processes() {
    echo "🛑 Stopping MDT production processes..."
    kill_processes_on_ports 4173 5173 3001
    echo "✅ All processes stopped"
}

# Check if user wants to stop processes
if [ "$1" = "stop" ]; then
    stop_processes
    exit 0
elif [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "MDT (Markdown-Ticket) Production Start Script"
    echo "=============================================="
    echo ""
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend production servers"
    echo "  frontend         - Start frontend production server only (port 4173)"
    echo "  backend          - Start backend production server only (port 3001)"
    echo "  stop             - Stop all running production servers"
    echo "  build            - Build all projects before starting (if needed)"
    echo "  help, --help, -h - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh              # Start both production servers"
    echo "  ./start.sh frontend     # Start frontend production only"
    echo "  ./start.sh build        # Build then start both servers"
    echo "  ./start.sh stop         # Stop all production servers"
    echo ""
    echo "Note: This script uses pre-built .js files. Run 'npm run build:all' first if needed."
    echo "For development mode with hot-reload, use: ./start-dev.sh"
    exit 0
fi

echo "🚀 Starting MDT production setup..."
echo "======================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.0.0 or higher."
    exit 1
fi

# Check if production builds exist
echo "🔍 Checking for production builds..."

missing_builds=false

# Check frontend build
if [ ! -d "dist" ] || [ ! -f "dist/index.html" ]; then
    echo "❌ Frontend build not found in ./dist/"
    missing_builds=true
fi

# Check server build
if [ ! -d "server/dist" ] || [ ! -f "server/dist/server.js" ]; then
    echo "❌ Server build not found in ./server/dist/"
    missing_builds=true
fi

# Check shared build
if [ ! -d "shared/dist" ]; then
    echo "❌ Shared build not found in ./shared/dist/"
    missing_builds=true
fi

# If builds are missing, offer to build them
if [ "$missing_builds" = true ]; then
    if [ "$1" = "build" ]; then
        echo "🔨 Building all components..."
        npm run build:all
        if [ $? -ne 0 ]; then
            echo "❌ Build failed. Please check the build logs above."
            exit 1
        fi
        echo "✅ Build complete!"
    else
        echo ""
        echo "❌ Production builds are missing. Run with 'build' option to create them:"
        echo "   ./start.sh build"
        echo ""
        echo "Or build manually:"
        echo "   npm run build:all"
        echo ""
        echo "Then run this script again without 'build' option."
        exit 1
    fi
else
    echo "✅ All production builds found"
fi

# Kill existing processes on default ports
echo "🔍 Checking for existing processes on default ports..."
kill_processes_on_ports 4173 5173 3001

echo "✅ Setup complete!"
echo ""
echo "🎯 Starting production servers..."

# Check if user wants to start both servers (default) or specific ones
if [ -z "$1" ] || [ "$1" = "both" ] || [ "$1" = "build" ]; then
    echo "🚀 Starting both frontend and backend production servers..."

    # Start backend in background
    echo "🔧 Starting backend production server on port 3001..."
    cd server && node dist/server.js &
    BACKEND_PID=$!
    cd ..

    # Give backend a moment to start
    sleep 2

    # Start frontend in background
    echo "🎨 Starting frontend production server on port 4173..."
    (cd "${SCRIPT_DIR}" && npm run preview) &
    FRONTEND_PID=$!

    echo ""
    echo "✅ Production servers started!"
    echo "   Frontend: http://localhost:4173 (PID: $FRONTEND_PID)"
    echo "   Backend:  http://localhost:3001 (PID: $BACKEND_PID)"
    echo ""
    echo "To stop servers, run: ./start.sh stop"
    echo ""
    echo "Press Ctrl+C to stop watching (servers will continue running)"

    # Wait for interrupt signal
    trap 'echo ""; echo "🛑 Stopping production servers..."; kill $FRONTEND_PID $BACKEND_PID 2>/dev/null; echo "✅ Servers stopped"; exit 0' INT

    # Keep script running to monitor processes
    wait

elif [ "$1" = "frontend" ]; then
    echo "🚀 Starting frontend production server only..."
    cd "${SCRIPT_DIR}" && npm run preview

elif [ "$1" = "backend" ]; then
    echo "🚀 Starting backend production server only..."
    cd server && node dist/server.js

else
    echo "❌ Unknown option: $1"
    echo "Usage: ./start.sh [both|frontend|backend|stop|build]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend production servers"
    echo "  frontend         - Start frontend production server only (port 4173)"
    echo "  backend          - Start backend production server only (port 3001)"
    echo "  stop             - Stop all running production servers"
    echo "  build            - Build all projects then start both servers"
    exit 1
fi