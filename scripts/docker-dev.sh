#!/bin/bash

# Docker Development Scripts for Markdown Ticket Board
# Usage: ./scripts/docker-dev.sh [command]

set -e

PROJECT_NAME="markdown-ticket"
COMPOSE_FILE="docker-compose.yml"

show_help() {
    cat << EOF
Docker Development Scripts for Markdown Ticket Board

Usage: $0 [COMMAND]

Commands:
    dev         Start full development environment (frontend + backend)
    frontend    Start frontend only
    backend     Start backend only
    mcp         Start MCP server only
    prod        Start production environment
    test        Run E2E tests
    build       Build all images
    clean       Stop and remove containers, volumes, and images
    logs        Show logs for all services
    shell       Open shell in development container
    npm         Run npm command in container (e.g., ./scripts/docker-dev.sh npm install)
    lint        Run linting
    install     Install/update dependencies
    init-project Initialize a new project (interactive setup)
    create-samples Create sample tickets only (no backup/clean)
    reset-samples Reset sample data (backup, clean, recreate)
    reset       Reset development environment (clean + build + dev)

Examples:
    $0 dev                          # Start development environment
    $0 init-project                 # Initialize new project (interactive)
    $0 create-samples               # Create sample tickets only
    $0 reset-samples                # Reset sample data (interactive)
    $0 npm install react-router    # Install new package
    $0 shell                        # Open shell in container
    $0 test                         # Run tests
    $0 clean                        # Clean everything
EOF
}

ensure_docker() {
    if ! command -v docker &> /dev/null; then
        echo "Error: Docker is not installed or not in PATH"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo "Error: Docker Compose is not installed"
        exit 1
    fi
}

docker_compose() {
    if command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        docker compose "$@"
    fi
}

case "${1:-help}" in
    "dev")
        echo "🚀 Starting development environment..."
        ensure_docker
        docker_compose --profile dev up --build
        ;;

    "frontend")
        echo "🎨 Starting frontend only..."
        ensure_docker
        docker_compose --profile frontend up --build frontend
        ;;

    "backend")
        echo "⚙️  Starting backend only..."
        ensure_docker
        docker_compose --profile backend up --build backend
        ;;

    "mcp")
        echo "🤖 Starting MCP server..."
        ensure_docker
        docker_compose --profile mcp up --build mcp-server
        ;;

    "prod")
        echo "🏭 Starting production environment..."
        ensure_docker
        docker_compose --profile prod up --build app-prod
        ;;

    "test")
        echo "🧪 Running E2E tests..."
        ensure_docker
        docker_compose --profile test up --build --abort-on-container-exit test
        ;;

    "build")
        echo "🔨 Building all images..."
        ensure_docker
        docker_compose build
        ;;

    "clean")
        echo "🧹 Cleaning up containers, volumes, and images..."
        ensure_docker
        docker_compose down --volumes --rmi all --remove-orphans
        docker system prune -f
        ;;

    "logs")
        echo "📋 Showing logs..."
        ensure_docker
        docker_compose logs -f
        ;;

    "shell")
        echo "🐚 Opening shell in development container..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev sh
        ;;

    "npm")
        shift
        echo "📦 Running npm command: npm $*"
        ensure_docker
        docker_compose --profile dev run --rm app-dev npm "$@"
        ;;

    "lint")
        echo "🔍 Running linting..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev npm run lint
        ;;

    "install")
        echo "📥 Installing/updating dependencies..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev npm install
        docker_compose --profile dev run --rm app-dev sh -c "cd server && npm install"
        docker_compose --profile dev run --rm app-dev sh -c "cd mcp-server && npm install"
        ;;

    "init-project")
        echo "🚀 Initializing new project..."
        ensure_docker
        shift
        docker_compose --profile dev run --rm app-dev ./scripts/init-project.sh "$@"
        ;;

    "create-samples")
        echo "📝 Creating sample tickets..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev sh -c "cd server && npm run create-samples"
        ;;

    "reset-samples")
        echo "🔄 Resetting sample data..."
        ensure_docker
        shift
        docker_compose --profile dev run --rm app-dev ./scripts/reset-samples.sh "$@"
        ;;

    "reset")
        echo "🔄 Resetting development environment..."
        ensure_docker
        $0 clean
        $0 build
        $0 dev
        ;;

    "help"|"-h"|"--help")
        show_help
        ;;

    *)
        echo "❌ Unknown command: $1"
        echo ""
        show_help
        exit 1
        ;;
esac