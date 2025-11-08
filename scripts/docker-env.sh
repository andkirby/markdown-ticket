#!/bin/bash

# Docker Environment Scripts for Markdown Ticket Board
# Usage: ./scripts/docker-env.sh [command]

set -e

show_help() {
    cat << EOF
Docker Environment Management for Markdown Ticket Board

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
    install     Install/update dependencies


Sample Data:
    create-samples Create sample tickets only
    reset       Reset development environment (clean + build + dev)

Examples:
    $0 dev                          # Start development environment
    $0 create-samples               # Create sample tickets only
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

get_project_code() {
    local config_file="$1/.mdt-config.toml"
    if [ -f "$config_file" ]; then
        grep '^code = ' "$config_file" | cut -d'"' -f2
    else
        echo ""
    fi
}

get_project_name() {
    local config_file="$1/.mdt-config.toml"
    if [ -f "$config_file" ]; then
        grep '^name = ' "$config_file" | cut -d'"' -f2
    else
        basename "$1"
    fi
}

show_project_url() {
    local url="$1"
    echo "🌐 Project URL: $url"
    echo "💡 Open this URL in your browser to access the project"
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
        # Stop all profiles to ensure everything is cleaned
        docker_compose --profile dev --profile frontend --profile backend --profile mcp --profile prod --profile test down --volumes --rmi all --remove-orphans
        docker system prune -f
        ;;

    "logs")
        echo "📋 Showing logs..."
        ensure_docker
        docker_compose logs -f
        ;;


    "install")
        echo "📥 Installing/updating dependencies..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev npm install
        docker_compose --profile dev run --rm app-dev sh -c "cd server && npm install"
        docker_compose --profile dev run --rm app-dev sh -c "cd mcp-server && npm install"
        ;;




    "create-samples")
        echo "📝 Creating sample tickets..."
        ensure_docker
        docker_compose --profile dev run --rm app-dev sh -c "cd server && npm run create-samples"
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