#!/bin/bash

# Docker Environment Scripts for Markdown Ticket Board
# Usage: ./scripts/docker-env.sh [command]

set -e

PROJECT_NAME="markdown-ticket"
COMPOSE_FILE="docker-compose.yml"

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

Project Management:
    create-project Create a new project in separate directory

Sample Data:
    create-samples Create sample tickets only (no backup/clean)
    reset-samples Reset sample data (backup, clean, recreate)
    reset       Reset development environment (clean + build + dev)

Examples:
    $0 dev                          # Start development environment
    $0 create-project "My API" API  # Create new project in projects/my-api
    $0 create-samples               # Create sample tickets only
    $0 reset-samples                # Reset sample data (interactive)
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
        docker_compose down --volumes --rmi all --remove-orphans
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

    "create-project")
        if [ $# -lt 2 ]; then
            echo "❌ Usage: $0 create-project \"Project Name\" [PROJECT_CODE] [subdirectory]"
            echo "Examples:"
            echo "  $0 create-project \"My API\" API"
            echo "  $0 create-project \"My API\" API projects/my-api"
            exit 1
        fi

        PROJECT_NAME="$2"
        PROJECT_CODE="${3:-$(echo "$PROJECT_NAME" | tr '[:lower:]' '[:upper:]' | sed 's/[^A-Z0-9]//g' | cut -c1-3)}"
        TARGET_DIR="${4:-projects/$(echo "$PROJECT_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g')}"

        echo "🚀 Creating new project '$PROJECT_NAME' with code '$PROJECT_CODE' in '$TARGET_DIR'..."
        ensure_docker

        # Create target directory structure
        if [ ! -d "$TARGET_DIR" ]; then
            mkdir -p "$TARGET_DIR"
            echo "📁 Created directory: $TARGET_DIR"
        fi

        # Create minimal project structure
        mkdir -p "$TARGET_DIR/docs/CRs"
        echo "📁 Created docs/CRs directory for tickets"

        # Create project configuration files directly in target directory
        docker_compose --profile dev run --rm -v "$PWD/$TARGET_DIR:/target" app-dev sh -c "
            # Create project config
            cat > '/target/.mdt-config.toml' << EOF
[project]
name = \"$PROJECT_NAME\"
code = \"$PROJECT_CODE\"
path = \"docs/CRs\"
startNumber = 1
counterFile = \".mdt-next\"
dateCreated = \"\$(date -Iseconds)\"
EOF

            # Initialize counter
            echo '1' > '/target/.mdt-next'

            # Register in global registry
            mkdir -p \"/root/.config/markdown-ticket/projects\"
            cat > \"/root/.config/markdown-ticket/projects/\$(echo '$TARGET_DIR' | sed 's|/|-|g').toml\" << EOF
[project]
path = \"/app/$TARGET_DIR\"
active = false
dateRegistered = \"\$(date -Iseconds)\"
EOF
        "

        echo "✅ Project '$PROJECT_NAME' created successfully in $TARGET_DIR"
        echo "📝 Project structure:"
        echo "  - $TARGET_DIR/.mdt-config.toml (project configuration)"
        echo "  - $TARGET_DIR/.mdt-next (ticket counter)"
        echo "  - $TARGET_DIR/docs/CRs/ (ticket storage)"
        echo ""
        echo "💡 To work with this project:"
        echo "  1. Switch to project: $0 switch-project $TARGET_DIR"
        echo "  2. Use the main markdown-ticket system to manage tickets"
        echo "  3. Tickets will be stored in $TARGET_DIR/docs/CRs/"
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