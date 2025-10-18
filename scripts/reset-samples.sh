#!/bin/bash

# Reset Sample Data Script for Markdown Ticket Board
# Usage: ./scripts/reset-samples.sh [options]

set -e

# Default values
FORCE=false
KEEP_CONFIG=false
RECREATE_SAMPLES=true

show_help() {
    cat << EOF
Markdown Ticket Board - Reset Sample Data Script

Usage: $0 [OPTIONS]

This script removes existing sample data and optionally recreates fresh samples.

Options:
    -f, --force              Skip confirmation prompts
    -k, --keep-config        Keep project configuration files (.mdt-config.toml, .mdt-next)
    -n, --no-recreate        Don't recreate samples after cleanup (just clean)
    -h, --help               Show this help

Examples:
    $0                       # Interactive: clean and recreate samples
    $0 -f                    # Force: clean and recreate samples without prompts
    $0 -n -f                 # Force: just clean samples, don't recreate
    $0 -k -f                 # Force: clean samples but keep config, then recreate

What this script does:
    1. Removes existing ticket files (*.md) from CRs directory
    2. Optionally removes project configuration files
    3. Optionally recreates fresh sample tickets
    4. Updates counter file if recreating samples

Notes:
    - Always backs up existing files before deletion
    - Safe to run multiple times
    - Use with Docker: ./scripts/docker-dev.sh shell, then run this script
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

backup_existing_data() {
    local backup_dir="backup-$(date +%Y%m%d-%H%M%S)"

    log_info "Creating backup in $backup_dir..."
    mkdir -p "$backup_dir"

    # Backup ticket files
    if [ -d "docs/CRs" ] && [ "$(find docs/CRs -name "*.md" -type f | wc -l)" -gt 0 ]; then
        cp -r docs/CRs "$backup_dir/"
        log_success "Backed up ticket files to $backup_dir/CRs/"
    fi

    # Backup config files
    if [ -f ".mdt-config.toml" ]; then
        cp .mdt-config.toml "$backup_dir/"
        log_success "Backed up .mdt-config.toml to $backup_dir/"
    fi

    if [ -f ".mdt-next" ]; then
        cp .mdt-next "$backup_dir/"
        log_success "Backed up .mdt-next to $backup_dir/"
    fi

    echo ""
    log_info "Backup created in: $backup_dir"
}

clean_ticket_files() {
    log_info "Cleaning existing ticket files..."

    if [ -d "docs/CRs" ]; then
        # Remove all .md files except README.md
        find docs/CRs -name "*.md" -not -name "README.md" -type f -delete
        log_success "Removed existing ticket files from docs/CRs/"
    else
        log_info "No CRs directory found"
    fi
}

clean_config_files() {
    if [ "$KEEP_CONFIG" = false ]; then
        log_info "Cleaning configuration files..."

        if [ -f ".mdt-config.toml" ]; then
            rm .mdt-config.toml
            log_success "Removed .mdt-config.toml"
        fi

        if [ -f ".mdt-next" ]; then
            rm .mdt-next
            log_success "Removed .mdt-next"
        fi

        # Clean global registry
        local project_dir=$(basename "$(pwd)")
        local registry_file="$HOME/.config/markdown-ticket/projects/${project_dir}.toml"
        if [ -f "$registry_file" ]; then
            rm "$registry_file"
            log_success "Removed global registry entry"
        fi
    else
        log_info "Keeping configuration files (--keep-config specified)"
    fi
}

recreate_samples() {
    if [ "$RECREATE_SAMPLES" = true ]; then
        log_info "Recreating sample tickets..."

        # Check if we're in the server directory or need to navigate there
        if [ -f "createSampleTickets.js" ]; then
            # We're in the server directory
            npm run create-samples
        elif [ -f "server/createSampleTickets.js" ]; then
            # We're in the project root
            cd server && npm run create-samples && cd ..
        else
            log_error "Could not find createSampleTickets.js script"
            log_info "Make sure you're running this from the project root or server directory"
            return 1
        fi

        log_success "Sample tickets recreated"

        # Update counter if we have a config
        if [ -f ".mdt-config.toml" ]; then
            # Count existing tickets and update counter
            local ticket_count=$(find docs/CRs -name "MDT-*.md" -type f | wc -l | tr -d ' ')
            local next_number=$((ticket_count + 1))
            echo "$next_number" > .mdt-next
            log_success "Updated counter to $next_number"
        fi
    else
        log_info "Skipping sample recreation (--no-recreate specified)"
    fi
}

confirm_action() {
    if [ "$FORCE" = false ]; then
        echo ""
        log_warn "This will:"
        echo "  - Create a timestamped backup of existing data"
        echo "  - Remove all ticket files (*.md) from docs/CRs/"

        if [ "$KEEP_CONFIG" = false ]; then
            echo "  - Remove project configuration files"
        else
            echo "  - Keep project configuration files"
        fi

        if [ "$RECREATE_SAMPLES" = true ]; then
            echo "  - Recreate fresh sample tickets"
        else
            echo "  - NOT recreate sample tickets"
        fi

        echo ""
        read -p "Continue? (y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "Operation cancelled"
            exit 0
        fi
    fi
}

check_prerequisites() {
    # Check if we're in a project directory
    if [ ! -d "docs" ] && [ ! -d "server" ] && [ ! -f ".mdt-config.toml" ]; then
        log_error "This doesn't appear to be a markdown-ticket project directory"
        log_info "Make sure you're in the project root directory"
        exit 1
    fi

    # Check if npm is available for sample recreation
    if [ "$RECREATE_SAMPLES" = true ] && ! command -v npm &> /dev/null; then
        log_error "npm is required to recreate samples"
        log_info "Either install npm or use --no-recreate flag"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -f|--force)
            FORCE=true
            shift
            ;;
        -k|--keep-config)
            KEEP_CONFIG=true
            shift
            ;;
        -n|--no-recreate)
            RECREATE_SAMPLES=false
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
    log_info "🔄 Resetting Markdown Ticket Board sample data..."
    echo ""

    # Check prerequisites
    check_prerequisites

    # Confirm action
    confirm_action

    # Create backup
    backup_existing_data
    echo ""

    # Clean existing data
    clean_ticket_files
    clean_config_files
    echo ""

    # Recreate samples if requested
    if [ "$RECREATE_SAMPLES" = true ]; then
        recreate_samples
        echo ""
    fi

    log_success "🎉 Sample data reset completed!"
    echo ""

    if [ "$RECREATE_SAMPLES" = true ]; then
        log_info "Next steps:"
        echo "  1. Refresh your browser or restart the application"
        echo "  2. You should see fresh sample tickets in the UI"
    else
        log_info "Next steps:"
        echo "  1. Run ./scripts/init-project.sh to set up a new project"
        echo "  2. Or manually create your project configuration"
    fi

    if [ -d "backup-"* ]; then
        echo ""
        log_info "💾 Your original data has been backed up in the backup-* directory"
    fi
}

# Run main function
main