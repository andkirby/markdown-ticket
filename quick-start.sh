#!/bin/bash

# Quick Start Script for md-ticket-board
# This script helps you get the system running quickly

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

# Check if user wants to stop processes
if [ "$1" = "stop" ]; then
    stop_processes
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
    npm run server:dev
elif [ "$1" = "stop" ]; then
    stop_processes
    exit 0
else
    echo "❌ Unknown option: $1"
    echo "Usage: ./quick-start.sh [both|frontend|backend|stop]"
    exit 1
fi