#!/usr/bin/env bash

# Quick Start Script for MDT
# This script helps you get the system running quickly
# Can be run from any directory - will automatically find the project root

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project root directory
cd "${SCRIPT_DIR}" || exit 1

echo "🏠 Working from project directory: ${SCRIPT_DIR}"

# Verify we're in the correct project directory
if [ ! -f "package.json" ] || (! grep -q "MDT\|md-ticket-board\|markdown-ticket" package.json 2>/dev/null); then
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
    echo "🛑 Stopping MDT processes..."
    kill_processes_on_ports 5173 3001
    echo "✅ All processes stopped"
}

# Check if user wants to stop processes or install global
if [ "$1" = "stop" ]; then
    stop_processes
    exit 0
elif [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "MDT (Markdown-Ticket) Quick Start Script"
    echo "=================================="
    echo ""
    echo "Usage: ./start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend servers"
    echo "  frontend         - Start frontend server only (port 5173)"
    echo "  backend          - Start backend server only (port 3001)"
    echo "  stop             - Stop all running servers"
    echo "  help, --help, -h - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./start.sh              # Start both servers"
    echo "  ./start.sh frontend     # Start frontend only"
    echo "  ./start.sh stop         # Stop all servers"
    exit 0
fi

echo "🚀 Starting MDT setup..."
echo "=================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 16.0.0 or higher."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm."
    exit 1
fi

# Install dependencies
echo "📦 Installing frontend dependencies..."
npm install

echo "📦 Installing server dependencies..."
cd server && npm install && cd ..

# Create tasks directory if it doesn't exist
echo "📁 Creating tasks directory..."
mkdir -p tasks


# Kill existing processes on default ports
echo "🔍 Checking for existing processes on default ports..."
kill_processes_on_ports 5173 3001

# Check if nodemon is installed for development
if ! command -v nodemon &> /dev/null; then
    echo "🔧 Installing nodemon for development..."
    npm install -g nodemon
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 Starting the system..."

# Check if user wants to start both servers (default) or specific ones
if [ -z "$1" ] || [ "$1" = "both" ]; then
    echo "🚀 Starting both frontend and backend servers..."
    npm run dev:full
elif [ "$1" = "frontend" ]; then
    echo "🚀 Starting frontend server only..."
    npm run dev
elif [ "$1" = "backend" ]; then
    echo "🚀 Starting backend server only..."
    npm run dev:server
elif [ "$1" = "stop" ]; then
    stop_processes
    exit 0
else
    echo "❌ Unknown option: $1"
    echo "Usage: ./start.sh [both|frontend|backend|stop]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend servers"
    echo "  frontend         - Start frontend server only (port 5173)"
    echo "  backend          - Start backend server only (port 3001)" 
    echo "  stop             - Stop all running servers"
    exit 1
fi