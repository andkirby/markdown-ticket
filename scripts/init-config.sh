#!/bin/bash
# scripts/init-config.sh
# Initialize markdown-ticket global configuration
# Supports two modes:
#   1. Interactive mode: For localhost setup with custom project paths
#   2. Automatic mode: For Docker container setup with predefined paths

set -e  # Exit on any error

# Default configuration
DEFAULT_CONFIG_DIR="${MDT_CONFIG_DIR:-$HOME/.config/markdown-ticket}"
DEFAULT_MODE="interactive"

# Parse command line arguments
MODE="$DEFAULT_MODE"
CONFIG_DIR="$DEFAULT_CONFIG_DIR"

show_usage() {
    cat << EOF
Usage: $0 [OPTIONS]

Initialize markdown-ticket global configuration

OPTIONS:
    --auto               Skip interactive setup and use defaults
                         (Docker containers should use this flag)
    -h, --help          Show this help message

MODES:
    Default (interactive)    Interactive setup for localhost development
                            - Prompts for individual project registration
                            - Configure auto-discovery search paths
                            - Creates config in ~/.config/markdown-ticket

    --auto                  Automatic setup with defaults
                            - Uses predefined auto-discovery paths
                            - No user interaction required
                            - Optimized for Docker containers

EXAMPLES:
    $0                      # Interactive setup (default)
    $0 --auto              # Automatic setup for Docker
    $0 --help              # Show this help

DOCKER USAGE:
Docker containers should use the --auto flag:
    command: ["./scripts/init-config.sh", "--auto"]

Then mount your projects as volumes:
    docker run -v /host/project1:/projects/project1 \\
               -v /host/project2:/projects/project2 \\
               -v /host/config:/config/markdown-ticket \\
               markdown-ticket

EOF
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --auto)
            MODE="auto"
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "❌ Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

INITIALIZED_MARKER="$CONFIG_DIR/.initialized"

echo "🔧 Initializing markdown-ticket configuration..."
echo "   Mode: $MODE"
echo "   Config directory: $CONFIG_DIR"

# Check if already initialized
if [ -f "$INITIALIZED_MARKER" ]; then
    echo "ℹ️  Configuration already exists - skipping initialization"
    echo "   Config dir: $CONFIG_DIR"
    exit 0
fi

# Create configuration directories
echo "📁 Creating configuration directories..."
mkdir -p "$CONFIG_DIR"/{projects,templates}

# Interactive configuration setup
setup_interactive_config() {
    echo "📝 Setting up interactive configuration for localhost..."

    # Try to find template in different locations
    TEMPLATE_PATHS=(
        "/app/config-templates/global-config.toml"     # Docker location
        "config-templates/global-config.toml"          # Local project location
        "./config-templates/global-config.toml"        # Current directory
    )

    TEMPLATE_FOUND=false
    for TEMPLATE_PATH in "${TEMPLATE_PATHS[@]}"; do
        if [ -f "$TEMPLATE_PATH" ]; then
            cp "$TEMPLATE_PATH" "$CONFIG_DIR/config.toml"
            echo "   ✅ Interactive config created from template: $TEMPLATE_PATH"
            TEMPLATE_FOUND=true
            break
        fi
    done

    if [ "$TEMPLATE_FOUND" = true ]; then
        # Replace Docker-specific paths with localhost defaults for interactive mode
        replace_docker_paths_with_localhost_defaults
        # Then customize search paths interactively
        customize_search_paths_interactive
    else
        # Fallback to manual creation if no template
        create_interactive_config_manual
    fi
}

# Replace Docker-specific search paths with empty array for interactive customization
replace_docker_paths_with_localhost_defaults() {
    echo "   🔄 Adapting template for localhost environment..."

    # Create a temporary file with empty searchPaths for user customization
    TEMP_CONFIG=$(mktemp)
    # Replace the searchPaths section with empty array and examples
    cat > "$TEMP_CONFIG" << EOF
# Markdown Ticket Global Configuration
# Adapted for localhost interactive setup

[dashboard]
port = 3002
autoRefresh = true
refreshInterval = 5000

[discovery]
autoDiscover = true
searchPaths = [
    # Examples:
    # "$HOME/projects",
    # "$HOME/work",
    # "$HOME/Documents",
    # "/custom/path/to/projects"
]

[server]
logLevel = "info"

[templates]
# Custom templates directory
# customPath = "/config/markdown-ticket/templates"
EOF
    mv "$TEMP_CONFIG" "$CONFIG_DIR/config.toml"

    echo "   ✅ Template adapted for interactive setup (empty searchPaths)"
}

# Customize search paths for interactive mode
customize_search_paths_interactive() {
    echo ""
    echo "🔍 Project Discovery Setup"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Markdown-ticket will automatically scan these directories for projects"
    echo "containing .mdt-config.toml files. Add your main development directories."
    echo ""
    echo "ℹ️  Note: These categories are purely for organization - all project types"
    echo "   work identically. The system scans all directories for .mdt-config.toml files."
    echo ""
    echo "💡 Tips:"
    echo "   • Press Enter to accept the suggested default path"
    echo "   • Type a custom absolute path (e.g. /Users/john/code)"
    echo "   • Type 'no' to skip that directory"
    echo ""

    SEARCH_PATHS=""

    # Projects directory
    DEFAULT_PROJECTS_PATH="$HOME/projects"
    echo "1️⃣ Personal Projects Directory"
    echo "   Example: Personal side projects, open source contributions, experiments"
    echo "   Location: Where you keep projects you work on in your free time"
    read -p "   Directory [$DEFAULT_PROJECTS_PATH]: " PROJECTS_PATH
    PROJECTS_PATH="${PROJECTS_PATH:-$DEFAULT_PROJECTS_PATH}"
    if [[ "$PROJECTS_PATH" != "no" && -d "$PROJECTS_PATH" ]]; then
        SEARCH_PATHS="    \"$PROJECTS_PATH\""
        echo "   ✅ Added: $PROJECTS_PATH"
    elif [[ "$PROJECTS_PATH" != "no" ]]; then
        echo "   ⚠️  Directory does not exist: $PROJECTS_PATH"
    else
        echo "   ⏭️  Skipped"
    fi
    echo ""

    # Work directory
    DEFAULT_WORK_PATH="$HOME/work"
    echo "2️⃣ Work/Company Projects Directory"
    echo "   Example: Company repositories, client projects, corporate work"
    echo "   Location: Where you keep projects related to your job"
    read -p "   Directory [$DEFAULT_WORK_PATH]: " WORK_PATH
    WORK_PATH="${WORK_PATH:-$DEFAULT_WORK_PATH}"
    if [[ "$WORK_PATH" != "no" && -d "$WORK_PATH" ]]; then
        if [ -n "$SEARCH_PATHS" ]; then
            SEARCH_PATHS="$SEARCH_PATHS,\n    \"$WORK_PATH\""
        else
            SEARCH_PATHS="    \"$WORK_PATH\""
        fi
        echo "   ✅ Added: $WORK_PATH"
    elif [[ "$WORK_PATH" != "no" ]]; then
        echo "   ⚠️  Directory does not exist: $WORK_PATH"
    else
        echo "   ⏭️  Skipped"
    fi
    echo ""

    # Documents directory
    DEFAULT_DOCS_PATH="$HOME/Documents"
    echo "3️⃣ Documents Directory"
    echo "   Example: Documentation projects, note-taking systems, writing projects"
    echo "   Location: Where you keep markdown-based or documentation projects"
    read -p "   Directory [$DEFAULT_DOCS_PATH]: " DOCS_PATH
    DOCS_PATH="${DOCS_PATH:-$DEFAULT_DOCS_PATH}"
    if [[ "$DOCS_PATH" != "no" && -d "$DOCS_PATH" ]]; then
        if [ -n "$SEARCH_PATHS" ]; then
            SEARCH_PATHS="$SEARCH_PATHS,\n    \"$DOCS_PATH\""
        else
            SEARCH_PATHS="    \"$DOCS_PATH\""
        fi
        echo "   ✅ Added: $DOCS_PATH"
    elif [[ "$DOCS_PATH" != "no" ]]; then
        echo "   ⚠️  Directory does not exist: $DOCS_PATH"
    else
        echo "   ⏭️  Skipped"
    fi
    echo ""

    # Additional custom path
    echo "4️⃣ Additional Custom Directory (Optional)"
    echo "   Any other directory where you keep projects"
    echo "   Example: /opt/projects, /Users/name/source, /custom/path"
    read -p "   Custom path (or press Enter to finish): " ADDITIONAL_PATH
    if [[ -n "$ADDITIONAL_PATH" && -d "$ADDITIONAL_PATH" ]]; then
        if [ -n "$SEARCH_PATHS" ]; then
            SEARCH_PATHS="$SEARCH_PATHS,\n    \"$ADDITIONAL_PATH\""
        else
            SEARCH_PATHS="    \"$ADDITIONAL_PATH\""
        fi
        echo "   ✅ Added: $ADDITIONAL_PATH"
    elif [[ -n "$ADDITIONAL_PATH" ]]; then
        echo "   ⚠️  Directory does not exist: $ADDITIONAL_PATH"
    else
        echo "   ⏭️  No additional path specified"
    fi
    echo ""

    # Update search paths in config if user provided any
    if [ -n "$SEARCH_PATHS" ]; then
        # Create a temporary file with the new search paths
        TEMP_CONFIG=$(mktemp)
        # Replace the searchPaths section
        awk -v paths="$SEARCH_PATHS" '
        BEGIN { in_search_paths = 0 }
        /^searchPaths = \[/ {
            print "searchPaths = ["
            print paths
            print "]"
            in_search_paths = 1
            next
        }
        /^\]/ && in_search_paths {
            in_search_paths = 0
            next
        }
        !in_search_paths { print }
        ' "$CONFIG_DIR/config.toml" > "$TEMP_CONFIG"
        mv "$TEMP_CONFIG" "$CONFIG_DIR/config.toml"
        echo "   ✅ Search paths customized"
    else
        echo "   ℹ️  No search paths configured - you can add them later in the config file"
        echo "       Config location: $CONFIG_DIR/config.toml"
    fi
}

# Fallback when no template is found
create_interactive_config_manual() {
    echo "   ❌ No config template found in any expected location!"
    echo "   Expected template locations:"
    for TEMPLATE_PATH in "${TEMPLATE_PATHS[@]}"; do
        echo "     - $TEMPLATE_PATH"
    done
    echo ""
    echo "   Please ensure config-templates/global-config.toml exists in your project."
    exit 1
}

# Automatic configuration setup for Docker
setup_automatic_config() {
    echo "📝 Setting up automatic configuration for Docker..."

    # Try to find template in different locations
    TEMPLATE_PATHS=(
        "/app/config-templates/global-config.toml"     # Docker location
        "config-templates/global-config.toml"          # Local project location
        "./config-templates/global-config.toml"        # Current directory
    )

    TEMPLATE_FOUND=false
    for TEMPLATE_PATH in "${TEMPLATE_PATHS[@]}"; do
        if [ -f "$TEMPLATE_PATH" ]; then
            cp "$TEMPLATE_PATH" "$CONFIG_DIR/config.toml"
            echo "   ✅ Automatic config created from template: $TEMPLATE_PATH"
            TEMPLATE_FOUND=true
            break
        fi
    done

    if [ "$TEMPLATE_FOUND" = false ]; then
        echo "   ❌ No config template found in any expected location!"
        echo "   Expected template locations:"
        for TEMPLATE_PATH in "${TEMPLATE_PATHS[@]}"; do
            echo "     - $TEMPLATE_PATH"
        done
        echo ""
        echo "   Please ensure config-templates/global-config.toml exists in your project."
        echo "   For Docker builds, verify the template is copied to /app/config-templates/"
        exit 1
    fi

    echo ""
    echo "📋 DOCKER SETUP INSTRUCTIONS:"
    echo "   To add your projects, mount them as volumes:"
    echo "   docker run -v /host/project1:/projects/project1 \\"
    echo "              -v /host/project2:/projects/project2 \\"
    echo "              -v /host/config:/config/markdown-ticket \\"
    echo "              markdown-ticket"
    echo ""
    echo "   Or use docker-compose with volumes:"
    echo "   volumes:"
    echo "     - /host/project1:/projects/project1"
    echo "     - /host/project2:/projects/project2"
    echo "     - /host/config:/config/markdown-ticket"
    echo ""
}

# Setup templates
setup_templates() {
    TEMPLATES_CREATED=false

    # Try to find templates in different locations
    TEMPLATE_DIR_PATHS=(
        "/app/config-templates/templates"      # Docker location
        "config-templates/templates"           # Local project location
        "./config-templates/templates"         # Current directory
    )

    for TEMPLATE_DIR_PATH in "${TEMPLATE_DIR_PATHS[@]}"; do
        if [ -d "$TEMPLATE_DIR_PATH" ] && [ "$(ls -A "$TEMPLATE_DIR_PATH" 2>/dev/null)" ]; then
            if [ ! -d "$CONFIG_DIR/templates" ] || [ -z "$(ls -A "$CONFIG_DIR/templates" 2>/dev/null)" ]; then
                echo "📋 Creating default templates from: $TEMPLATE_DIR_PATH"
                mkdir -p "$CONFIG_DIR/templates"
                cp "$TEMPLATE_DIR_PATH"/* "$CONFIG_DIR/templates/" 2>/dev/null && TEMPLATES_CREATED=true
                break
            fi
        fi
    done

    if [ "$TEMPLATES_CREATED" = true ]; then
        TEMPLATE_COUNT=$(ls -1 "$CONFIG_DIR/templates" 2>/dev/null | wc -l)
        echo "   ✅ Created $TEMPLATE_COUNT template(s)"
    else
        echo "   ℹ️  Templates already exist or no templates to copy"
    fi
}

# Mode-specific configuration
if [ "$MODE" = "interactive" ]; then
    setup_interactive_config
elif [ "$MODE" = "auto" ]; then
    setup_automatic_config
fi

# Copy default templates
setup_templates

# Mark as initialized with timestamp
echo "$(date -Iseconds)" > "$INITIALIZED_MARKER"
echo "✅ Configuration initialized successfully"
echo "   Location: $CONFIG_DIR"
echo "   Mode: $MODE"
echo "   Timestamp: $(date)"