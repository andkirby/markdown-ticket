#!/bin/bash

# Quick Start Script for md-ticket-board
# This script helps you get the system running quickly

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

# Check if nodemon is installed for development
if ! command -v nodemon &> /dev/null; then
    echo "🔧 Installing nodemon for development..."
    npm install -g nodemon
fi

echo "✅ Setup complete!"
echo ""
echo "🎯 To start the system:"
echo "   Frontend only:    npm start"
echo "   Backend only:     npm run server:dev"
echo "   Both (recommended): npm run dev:full"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3001"
echo ""
echo "📚 For more information, see SETUP_AND_RUNNING.md"
echo "🔧 For integration details, see TICKET_MOVE_INTEGRATION.md"