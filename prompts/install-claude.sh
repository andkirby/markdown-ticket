#!/bin/bash

# Install script for MDT (Markdown Ticket) commands
# This script installs MDT workflow prompts as Claude Code slash commands

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default values
VERBOSE=false
PROJECT_PATH=""
LOCAL_INSTALL=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE=true
            shift
            ;;
        --local|-l)
            LOCAL_INSTALL=true
            shift
            ;;
        --project-path)
            if [[ -z "$2" || "$2" == --* ]]; then
                print_error "Missing path after --project-path"
                echo "Usage: $0 --project-path /path/to/project"
                exit 1
            fi
            PROJECT_PATH="$2"
            LOCAL_INSTALL=true
            shift 2
            ;;
        --help|-h)
            echo "MDT Command Installer"
            echo
            echo "Usage: $0 [OPTIONS]"
            echo
            echo "Options:"
            echo "  --verbose, -v          Show detailed installation output"
            echo "  --local, -l            Install locally to .claude/commands/mdt/"
            echo "  --project-path PATH     Install locally to project's .claude/commands/mdt/"
            echo "  --help, -h             Show this help message"
            echo
            echo "Examples:"
            echo "  $0                      # Global install to ~/.claude/commands/"
            echo "  $0 --local              # Local install to .claude/commands/mdt/"
            echo "  $0 --project-path /path/to/project  # Local install in specific directory"
            echo
            echo "Default: Installs globally to ~/.claude/commands/ without mdt- prefix"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Print functions
print_verbose() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${GREEN}[INFO]${NC} $1"
    fi
}

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Script directory (always where this script is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root detection
if [[ "$LOCAL_INSTALL" == "true" ]]; then
    if [[ -z "$PROJECT_PATH" ]]; then
        PROJECT_PATH="$(pwd)"
    fi
    PROJECT_ROOT="$PROJECT_PATH"
    CLAUDE_COMMANDS_DIR="$PROJECT_ROOT/.claude/commands/mdt"
else
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    CLAUDE_COMMANDS_DIR="$HOME/.claude/commands/mdt"
fi

# Source directory containing MDT prompts (always where script is located)
MDT_PROMPTS_DIR="$SCRIPT_DIR"
MDT_HOOKS_DIR="$SCRIPT_DIR/hooks"

# List of MDT commands to install (without mdt- prefix)
MDT_COMMANDS=(
    "ticket-creation"
    "requirements"
    "assess"
    "domain-audit"
    "domain-lens"
    "architecture"
    "clarification"
    "tasks"
    "implement"
    "tech-debt"
    "reflection"
    "tests"
    "poc"
)

# Check if Claude commands directory exists, create if not
ensure_claude_dir() {
    if [[ ! -d "$CLAUDE_COMMANDS_DIR" ]]; then
        print_verbose "Creating directory at $CLAUDE_COMMANDS_DIR"
        mkdir -p "$CLAUDE_COMMANDS_DIR"
    fi
}

# Check for existing global installations when doing local install
check_existing_global() {
    if [[ "$LOCAL_INSTALL" == "true" ]]; then
        local global_dir="$HOME/.claude/commands"
        local has_global=false

        for cmd in "${MDT_COMMANDS[@]}"; do
            if [[ -f "$global_dir/mdt-$cmd.md" ]]; then
                has_global=true
                break
            fi
        done

        if [[ "$has_global" == "true" ]]; then
            echo
            print_warning "Found existing global MDT commands in ~/.claude/commands/"
            echo -n "Are you sure you want to install locally? This will create project-specific commands. [y/N] "
            read -r response
            if [[ ! "$response" =~ ^[Yy]$ ]]; then
                print_info "Installation cancelled"
                exit 0
            fi
        fi
    fi
}

# Install a single MDT command
install_command() {
    local cmd_name="$1"
    local source_file="$MDT_PROMPTS_DIR/mdt-$cmd_name.md"
    local target_file="$CLAUDE_COMMANDS_DIR/$cmd_name.md"

    if [[ ! -f "$source_file" ]]; then
        print_error "Source file not found: $source_file"
        return 1
    fi

    print_verbose "Installing $cmd_name command..."
    cp "$source_file" "$target_file"

    if [[ $? -eq 0 ]]; then
        return 0
    else
        print_error "Failed to install $cmd_name"
        return 1
    fi
}

# Verify installation
verify_installation() {
    print_verbose "Verifying installation..."

    local failed=0
    for cmd in "${MDT_COMMANDS[@]}"; do
        if [[ ! -f "$CLAUDE_COMMANDS_DIR/$cmd.md" ]]; then
            failed=1
            break
        fi
    done

    return $failed
}

# Install SessionStart hook for project variables
install_session_hook() {
    local hook_source="$MDT_HOOKS_DIR/mdt-project-vars.sh"
    local hook_target="$HOME/.claude/hooks/mdt-project-vars.sh"
    local settings_file="$HOME/.claude/settings.json"

    if [[ ! -f "$hook_source" ]]; then
        print_warning "Hook script not found: $hook_source"
        print_warning "Skipping SessionStart hook installation"
        return 0
    fi

    print_verbose "Installing SessionStart hook..."

    # Create hooks directory if needed
    mkdir -p "$(dirname "$hook_target")"

    # Copy hook script
    cp "$hook_source" "$hook_target"
    chmod +x "$hook_target"

    if [[ $? -ne 0 ]]; then
        print_warning "Failed to copy hook script"
        return 1
    fi

    # Register hook in settings.json
    if [[ -f "$settings_file" ]]; then
        # Check if hook already registered
        if grep -q "mdt-project-vars.sh" "$settings_file" 2>/dev/null; then
            print_verbose "Hook already registered in settings.json"
            return 0
        fi

        # Add hook to SessionStart array using jq if available
        if command -v jq &> /dev/null; then
            print_verbose "Registering hook in settings.json..."

            # Create a backup
            cp "$settings_file" "$settings_file.bak"

            # Add the hook using jq
            jq --arg cmd "~/.claude/hooks/mdt-project-vars.sh" '
                .hooks.SessionStart[0].hooks += [{"type": "command", "command": $cmd}]
            ' "$settings_file.bak" > "$settings_file" 2>/dev/null || {
                print_warning "Failed to register hook in settings.json (jq failed)"
                print_warning "Hook installed at $hook_target - add manually to SessionStart hooks"
                rm -f "$settings_file.bak"
                return 1
            }

            rm -f "$settings_file.bak"
            print_info "SessionStart hook registered in settings.json"
        else
            print_warning "jq not found - hook copied but not registered in settings.json"
            print_warning "Add manually to ~/.claude/settings.json SessionStart hooks"
        fi
    else
        print_warning "settings.json not found - hook copied but not registered"
        print_warning "Add manually to ~/.claude/settings.json SessionStart hooks"
    fi

    return 0
}

# Show usage information
show_usage() {
    echo
    print_info "MDT commands have been installed successfully!"
    echo "Location: $CLAUDE_COMMANDS_DIR"
    echo

    # Show hook installation status
    if [[ "$LOCAL_INSTALL" != "true" ]]; then
        if [[ -f "$HOME/.claude/hooks/mdt-project-vars.sh" ]]; then
            print_info "SessionStart hook installed: ~/.claude/hooks/mdt-project-vars.sh"
            echo "  Auto-injects PROJECT_CODE and TICKETS_PATH from .mdt-config.toml"
        fi
    fi
    echo
    echo "Available commands:"
    echo "  /mdt:ticket-creation    - Create CR with structured questioning"
    echo "  /mdt:requirements       - Generate EARS-formatted requirements"
    echo "  /mdt:assess             - Evaluate affected code fitness"
    echo "  /mdt:domain-audit       - Analyze code for DDD violations"
    echo "  /mdt:domain-lens        - Surface DDD constraints for architecture"
    echo "  /mdt:tests              - Generate BDD test specs + executable tests"
    echo "  /mdt:architecture       - Surface decisions, define structure + size limits"
    echo "  /mdt:clarification      - Fill specification gaps"
    echo "  /mdt:tasks              - Break CR into constrained tasks"
    echo "  /mdt:implement          - Execute tasks with TDD verification"
    echo "  /mdt:tech-debt          - Detect debt patterns"
    echo "  /mdt:reflection         - Capture learnings"
    echo "  /mdt:poc                - Create proof-of-concept spike"
    echo
    echo "Full workflow chain:"
    echo "  /mdt:ticket-creation → /mdt:requirements → /mdt:assess → /mdt:tests"
    echo "  → /mdt:domain-lens (optional) → /mdt:architecture → /mdt:clarification → /mdt:tasks"
    echo "  → /mdt:implement → /mdt:tech-debt → /mdt:reflection"
    echo
    echo "DDD toolkit:"
    echo "  /mdt:domain-audit → Create refactoring CR → /mdt:domain-lens → /mdt:architecture"
    echo
    echo "Workflows are optional - use what you need:"
    echo
    print_info "Restart Claude Code to see the new commands"
}

# Main installation
main() {
    print_verbose "Starting MDT command installation..."
    print_verbose "Source directory: $MDT_PROMPTS_DIR"
    print_verbose "Target directory: $CLAUDE_COMMANDS_DIR"

    # Check if prompts directory exists
    if [[ ! -d "$MDT_PROMPTS_DIR" ]]; then
        print_error "MDT prompts directory not found: $MDT_PROMPTS_DIR"
        print_error "Please run this script from the markdown-ticket project root"
        exit 1
    fi

    # Check for existing global installations when doing local install
    check_existing_global

    # Ensure Claude commands directory exists
    ensure_claude_dir

    # Install each command
    local failed=0
    for cmd in "${MDT_COMMANDS[@]}"; do
        if ! install_command "$cmd"; then
            failed=1
        fi
    done

    # Install SessionStart hook (global only)
    if [[ "$LOCAL_INSTALL" != "true" ]]; then
        install_session_hook
    fi

    # Verify installation
    if verify_installation && [[ $failed -eq 0 ]]; then
        show_usage
        exit 0
    else
        print_error "Installation completed with errors"
        exit 1
    fi
}

# Run main installation
main