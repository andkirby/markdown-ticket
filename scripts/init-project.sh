#!/bin/bash

# Project Initialization Script for Markdown Ticket Board
# Usage: ./scripts/init-project.sh [options]

set -e

# Default values
PROJECT_NAME=""
PROJECT_CODE=""
PROJECT_PATH="docs/CRs"
PROJECT_DESC=""
PROJECT_REPO=""
START_NUMBER=1
INTERACTIVE=true
FORCE=false

show_help() {
    cat << EOF
Markdown Ticket Board - Project Initialization Script

Usage: $0 [OPTIONS]

Options:
    -n, --name NAME         Project name (required)
    -c, --code CODE         Project code/prefix (required, e.g., MDT, PROJ)
    -p, --path PATH         Path for CRs (default: docs/CRs)
    -d, --description DESC  Project description
    -r, --repo URL          Repository URL
    -s, --start NUMBER      Starting ticket number (default: 1)
    -f, --force             Force overwrite existing configuration
    -y, --yes               Non-interactive mode (use provided values)
    -h, --help              Show this help

Interactive Examples:
    $0                      # Interactive mode with prompts
    $0 -n "My Project"      # Set name, prompt for other values

Non-interactive Examples:
    $0 -n "My Project" -c "MYPROJ" -y
    $0 -n "Backend API" -c "API" -d "Backend API tickets" -r "https://github.com/user/api" -y

Notes:
    - Creates .mdt-config.toml in current directory
    - Creates global registry entry
    - Creates CRs directory structure
    - Validates project code format (2-10 uppercase letters/numbers)
EOF
}

log_info() {
    echo "ℹ️  $1"
}

log_success() {
    echo "✅ $1"
}

log_error() {
    echo "❌ $1" >&2
}

log_warn() {
    echo "⚠️  $1"
}

validate_project_code() {
    local code="$1"
    if [[ ! "$code" =~ ^[A-Z0-9]{2,10}$ ]]; then
        log_error "Project code must be 2-10 uppercase letters/numbers (e.g., MDT, PROJ, API123)"
        return 1
    fi
}

prompt_value() {
    local prompt="$1"
    local default="$2"
    local value

    # Check if this is an optional field (contains "optional" in prompt)
    if [[ "$prompt" == *"(optional)"* ]]; then
        # For optional fields, allow empty input
        if [ -n "$default" ]; then
            read -p "$prompt [$default]: " value
        else
            read -p "$prompt: " value
        fi
        echo "${value:-$default}"
    elif [ -n "$default" ]; then
        read -p "$prompt [$default]: " value
        echo "${value:-$default}"
    else
        while [ -z "$value" ]; do
            read -p "$prompt: " value
            if [ -z "$value" ]; then
                log_warn "This field is required"
            fi
        done
        echo "$value"
    fi
}

check_existing_config() {
    if [ -f ".mdt-config.toml" ] && [ "$FORCE" = false ]; then
        log_error "Project configuration already exists (.mdt-config.toml)"
        log_info "Use --force to overwrite or run from a different directory"
        exit 1
    fi
}

create_directories() {
    log_info "Creating directory structure..."

    # Create CRs directory
    mkdir -p "$PROJECT_PATH"
    log_success "Created $PROJECT_PATH directory"

    # Create global config directory
    mkdir -p ~/.config/markdown-ticket/projects
    log_success "Created global config directory"
}

create_local_config() {
    log_info "Creating local project configuration..."

    cat > .mdt-config.toml << EOF
[project]
name = "$PROJECT_NAME"
code = "$PROJECT_CODE"
path = "$PROJECT_PATH"
startNumber = $START_NUMBER
counterFile = ".mdt-next"
description = "$PROJECT_DESC"
repository = "$PROJECT_REPO"
EOF

    log_success "Created .mdt-config.toml"
}

create_counter_file() {
    if [ ! -f ".mdt-next" ] || [ "$FORCE" = true ]; then
        echo "$START_NUMBER" > .mdt-next
        log_success "Created .mdt-next with starting number $START_NUMBER"
    else
        log_info "Counter file .mdt-next already exists"
    fi
}

create_global_registry() {
    log_info "Creating global registry entry..."

    local project_dir=$(basename "$(pwd)")
    local registry_file="$HOME/.config/markdown-ticket/projects/${project_dir}.toml"
    local current_date=$(date +%Y-%m-%d)

    cat > "$registry_file" << EOF
[project]
path = "$(pwd)"
active = true

[metadata]
dateRegistered = "$current_date"
lastAccessed = "$current_date"
EOF

    log_success "Created global registry entry"
}

create_sample_readme() {
    if [ ! -f "$PROJECT_PATH/README.md" ]; then
        log_info "Creating sample README in CRs directory..."

        cat > "$PROJECT_PATH/README.md" << EOF
# $PROJECT_NAME - Change Requests

This directory contains change requests (CRs) for the $PROJECT_NAME project.

## Ticket Format

Tickets follow the naming convention: \`${PROJECT_CODE}-###-title.md\`

Example: \`${PROJECT_CODE}-001-initial-setup.md\`

## Creating Tickets

- Use the web UI to create tickets
- Or create markdown files manually following the format in \`docs/create_ticket.md\`
- Follow the guidelines in the project's \`docs/create_ticket.md\` file

## Project Information

- **Project Code**: $PROJECT_CODE
- **Description**: $PROJECT_DESC
- **Repository**: $PROJECT_REPO
- **Next Ticket Number**: $START_NUMBER
EOF

        log_success "Created sample README in $PROJECT_PATH/"
    fi
}

interactive_setup() {
    log_info "🚀 Markdown Ticket Board - Project Setup"
    echo ""

    PROJECT_NAME=$(prompt_value "Project name" "$PROJECT_NAME")

    # Generate default code from name if not provided
    if [ -z "$PROJECT_CODE" ]; then
        local default_code=$(echo "$PROJECT_NAME" | tr '[:lower:]' '[:upper:]' | sed 's/[^A-Z0-9]//g' | cut -c1-6)
        PROJECT_CODE=$(prompt_value "Project code (2-10 uppercase letters/numbers)" "$default_code")
    else
        PROJECT_CODE=$(prompt_value "Project code (2-10 uppercase letters/numbers)" "$PROJECT_CODE")
    fi

    validate_project_code "$PROJECT_CODE"

    PROJECT_PATH=$(prompt_value "CRs directory path" "$PROJECT_PATH")
    PROJECT_DESC=$(prompt_value "Project description (optional)" "${PROJECT_DESC:-}")
    PROJECT_REPO=$(prompt_value "Repository URL (optional)" "${PROJECT_REPO:-}")
    START_NUMBER=$(prompt_value "Starting ticket number" "$START_NUMBER")

    echo ""
    log_info "Configuration Summary:"
    echo "  Name: $PROJECT_NAME"
    echo "  Code: $PROJECT_CODE"
    echo "  Path: $PROJECT_PATH"
    echo "  Description: $PROJECT_DESC"
    echo "  Repository: $PROJECT_REPO"
    echo "  Starting Number: $START_NUMBER"
    echo ""

    read -p "Create project with these settings? (y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "Project creation cancelled"
        exit 0
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--name)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -c|--code)
            PROJECT_CODE="$2"
            shift 2
            ;;
        -p|--path)
            PROJECT_PATH="$2"
            shift 2
            ;;
        -d|--description)
            PROJECT_DESC="$2"
            shift 2
            ;;
        -r|--repo)
            PROJECT_REPO="$2"
            shift 2
            ;;
        -s|--start)
            START_NUMBER="$2"
            shift 2
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -y|--yes)
            INTERACTIVE=false
            shift
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Main execution
main() {
    log_info "Initializing Markdown Ticket Board project..."

    # Check for existing config
    check_existing_config

    # Interactive setup if needed
    if [ "$INTERACTIVE" = true ]; then
        interactive_setup
    else
        # Validate required fields for non-interactive mode
        if [ -z "$PROJECT_NAME" ] || [ -z "$PROJECT_CODE" ]; then
            log_error "Project name and code are required in non-interactive mode"
            log_info "Use: $0 -n \"My Project\" -c \"MYPROJ\" -y"
            exit 1
        fi
        validate_project_code "$PROJECT_CODE"
    fi

    # Create everything
    create_directories
    create_local_config
    create_counter_file
    create_global_registry
    create_sample_readme

    echo ""
    log_success "🎉 Project '$PROJECT_NAME' initialized successfully!"
    echo ""
    log_info "Next steps:"
    echo "  1. Start the application: ./scripts/docker-dev.sh dev"
    echo "  2. Open http://localhost:5173 in your browser"
    echo "  3. Create your first ticket using the UI"
    echo ""
    log_info "Files created:"
    echo "  - .mdt-config.toml (local project config)"
    echo "  - .mdt-next (ticket counter)"
    echo "  - $PROJECT_PATH/ (tickets directory)"
    echo "  - ~/.config/markdown-ticket/projects/$(basename "$(pwd)").toml (global registry)"
}

# Run main function
main