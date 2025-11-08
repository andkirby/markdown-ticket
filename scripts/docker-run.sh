#!/bin/bash

# Docker Run Scripts for Markdown Ticket Board
# Usage: ./scripts/docker-run.sh <service> <command...>

set -e

show_help() {
    cat << EOF
Docker Run Scripts for Markdown Ticket Board

Execute commands in running service containers.

Usage: $0 <SERVICE> <COMMAND...>

Services:
    frontend, fe     Frontend service (React/Vite)
    backend, be      Backend service (Express/Node.js)
    mcp              MCP server service
    mcp-tools        MCP dev tools service
    dev              Full development container (app-dev)

Commands:
    npm <args>       Run npm commands
    shell            Open interactive shell
    logs             Show service logs
    status           Show service status

Examples:
    $0 frontend npm install
    $0 frontend npm run build
    $0 backend npm run create-samples
    $0 backend npm test
    $0 mcp npm run dev
    $0 mcp-tools npm run health-check
    $0 frontend shell
    $0 backend logs
    $0 dev status

Notes:
    - Services must be running (use docker-env.sh to start them)
    - For npm commands, the working directory is automatically set correctly
    - Use 'dev' service for general commands that work across the entire app
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

get_container_name() {
    local service="$1"

    case "$service" in
        "frontend"|"fe")
            echo "frontend"
            ;;
        "backend"|"be")
            echo "backend"
            ;;
        "mcp")
            echo "mcp-server"
            ;;
        "mcp-tools")
            echo "mcp-server"  # Note: mcp-tools runs in same container as mcp
            ;;
        "dev")
            echo "app-dev"
            ;;
        *)
            echo ""
            ;;
    esac
}

get_working_directory() {
    local service="$1"

    case "$service" in
        "frontend"|"fe"|"dev")
            echo "/app"
            ;;
        "backend"|"be")
            echo "/app/server"
            ;;
        "mcp")
            echo "/app/mcp-server"
            ;;
        "mcp-tools")
            echo "/app/server/mcp-dev-tools"
            ;;
        *)
            echo "/app"
            ;;
    esac
}

check_service_running() {
    local container="$1"

    if ! docker_compose ps --services --filter "status=running" | grep -q "^${container}$"; then
        echo "❌ Service '${container}' is not running"
        echo "💡 Start it first with: ./scripts/docker-env.sh dev"
        echo "💡 Or for specific services: ./scripts/docker-env.sh ${container}"
        return 1
    fi
    return 0
}

run_command_in_service() {
    local service="$1"
    local command="$2"
    shift 2
    local args="$@"

    local container=$(get_container_name "$service")
    if [ -z "$container" ]; then
        echo "❌ Unknown service: $service"
        echo ""
        show_help
        exit 1
    fi

    # Check if service is running
    if ! check_service_running "$container"; then
        exit 1
    fi

    local workdir=$(get_working_directory "$service")

    case "$command" in
        "npm")
            echo "📦 Running npm in $service service: npm $args"
            docker_compose exec -w "$workdir" "$container" npm $args
            ;;
        "shell")
            echo "🐚 Opening shell in $service service ($workdir)..."
            docker_compose exec -w "$workdir" "$container" sh
            ;;
        "logs")
            echo "📋 Showing logs for $service service..."
            docker_compose logs -f "$container"
            ;;
        "status")
            echo "📊 Status for $service service..."
            docker_compose ps "$container"
            ;;
        *)
            echo "🚀 Running command in $service service: $command $args"
            docker_compose exec -w "$workdir" "$container" $command $args
            ;;
    esac
}

# Main execution
case "${1:-help}" in
    "help"|"-h"|"--help"|"")
        show_help
        ;;
    *)
        if [ $# -lt 2 ]; then
            echo "❌ Error: Both service name and command are required"
            echo ""
            show_help
            exit 1
        fi
        ensure_docker
        run_command_in_service "$@"
        ;;
esac