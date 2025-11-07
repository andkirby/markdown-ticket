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
    shell       Open shell in running development container (or start new if not running)
    npm         Run npm command in container (e.g., ./scripts/docker-dev.sh npm install)
    lint        Run linting
    install     Install/update dependencies

Project Management:
    init-project Initialize a new project (interactive setup)
    create-project Create a new project in separate directory
    open-project Show project URL for manual opening

Sample Data:
    create-samples Create sample tickets only (no backup/clean)
    reset-samples Reset sample data (backup, clean, recreate)
    reset       Reset development environment (clean + build + dev)

Examples:
    $0 dev                          # Start development environment
    $0 init-project                 # Initialize new project (interactive)
    $0 create-project "My API" API  # Create new project in projects/my-api
    $0 open-project projects/my-api # Show project URL for manual access
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

    "shell")
        echo "🐚 Opening shell in running development container..."
        ensure_docker

        # Check if development container is running
        if docker_compose ps --services --filter "status=running" | grep -q "app-dev"; then
            # Connect to running container
            docker_compose exec app-dev sh
        else
            echo "⚠️  Development container is not running. Starting a new shell session..."
            docker_compose --profile dev run --rm app-dev sh
        fi
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



    "open-project")
        if [ $# -lt 2 ]; then
            echo "❌ Usage: $0 open-project <project-subdirectory>"
            echo "Example: $0 open-project projects/my-api"
            exit 1
        fi

        TARGET_PROJECT="$2"
        TARGET_PATH="$TARGET_PROJECT"

        if [ ! -d "$TARGET_PATH" ]; then
            echo "❌ Project directory not found: $TARGET_PATH"
            echo "💡 Available project directories:"
            find projects -type d -name "*" 2>/dev/null | head -10 | sed 's/^/  - /' || echo "  - No projects/ directory found"
            exit 1
        fi

        PROJECT_CODE=$(get_project_code "$TARGET_PATH")
        PROJECT_NAME=$(get_project_name "$TARGET_PATH")

        if [ -z "$PROJECT_CODE" ]; then
            echo "❌ Could not find project code in $TARGET_PATH/.mdt-config.toml"
            exit 1
        fi

        PROJECT_URL="http://localhost:5173/prj/$PROJECT_CODE"
        echo "📁 Project: $PROJECT_NAME ($PROJECT_CODE)"
        echo "📂 Path: $TARGET_PATH"
        echo ""
        show_project_url "$PROJECT_URL"
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