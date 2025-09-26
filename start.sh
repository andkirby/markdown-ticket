#!/bin/bash

# Quick Start Script for md-ticket-board
# This script helps you get the system running quickly
# Can be run from any directory - will automatically find the project root

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Change to the project root directory
cd "$SCRIPT_DIR"

echo "🏠 Working from project directory: $SCRIPT_DIR"

# Verify we're in the correct project directory
if [ ! -f "package.json" ] || ! grep -q "md-ticket-board" package.json 2>/dev/null; then
    echo "❌ Error: This doesn't appear to be the md-ticket-board project directory"
    echo "   Expected to find package.json with 'md-ticket-board' in: $SCRIPT_DIR"
    echo "   Please make sure the script is in the project root directory"
    exit 1
fi

echo "✅ Found md-ticket-board project"

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
    echo "🛑 Stopping md-ticket-board processes..."
    kill_processes_on_ports 5173 3001
    echo "✅ All processes stopped"
}

# Check if user wants to stop processes or install global
if [ "$1" = "stop" ]; then
    stop_processes
    exit 0
elif [ "$1" = "help" ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "md-ticket-board Quick Start Script"
    echo "=================================="
    echo ""
    echo "Usage: ./quick-start.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend servers"
    echo "  frontend         - Start frontend server only (port 5173)"
    echo "  backend          - Start backend server only (port 3001)"
    echo "  stop             - Stop all running servers"
    echo "  install-global   - Create a global symlink to run from anywhere"
    echo "  help, --help, -h - Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./quick-start.sh              # Start both servers"
    echo "  ./quick-start.sh frontend     # Start frontend only"
    echo "  ./quick-start.sh stop         # Stop all servers"
    echo "  ./quick-start.sh install-global  # Install globally as 'md-ticket-board'"
    exit 0
elif [ "$1" = "install-global" ]; then
    echo "🌍 Installing global symlink for md-ticket-board..."
    
    # Check if /usr/local/bin exists and is writable
    if [ ! -d "/usr/local/bin" ]; then
        echo "❌ /usr/local/bin doesn't exist. Creating it..."
        sudo mkdir -p /usr/local/bin
    fi
    
    # Create the symlink
    GLOBAL_LINK="/usr/local/bin/md-ticket-board"
    if [ -L "$GLOBAL_LINK" ]; then
        echo "🔄 Removing existing symlink..."
        sudo rm "$GLOBAL_LINK"
    fi
    
    echo "🔗 Creating symlink: $GLOBAL_LINK -> $SCRIPT_DIR/quick-start.sh"
    sudo ln -s "$SCRIPT_DIR/quick-start.sh" "$GLOBAL_LINK"
    
    if [ -L "$GLOBAL_LINK" ]; then
        echo "✅ Global installation complete!"
        echo "   You can now run 'md-ticket-board' from any directory"
        echo ""
        echo "Examples:"
        echo "  md-ticket-board           # Start both servers"
        echo "  md-ticket-board frontend  # Start frontend only"
        echo "  md-ticket-board backend   # Start backend only"
        echo "  md-ticket-board stop      # Stop all servers"
    else
        echo "❌ Failed to create global symlink"
        exit 1
    fi
    exit 0
fi

echo "🚀 Starting md-ticket-board setup..."
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
    echo "Usage: ./quick-start.sh [both|frontend|backend|stop|install-global]"
    echo ""
    echo "Options:"
    echo "  both (default)   - Start both frontend and backend servers"
    echo "  frontend         - Start frontend server only (port 5173)"
    echo "  backend          - Start backend server only (port 3001)" 
    echo "  stop             - Stop all running servers"
    echo "  install-global   - Create a global symlink to run from anywhere"
    exit 1
fi