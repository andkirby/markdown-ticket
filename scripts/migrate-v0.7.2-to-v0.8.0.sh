#!/usr/bin/env bash
#
# Migration Script: v0.7.2 to v0.8.0
#
# This script handles the upgrade from Markdown Ticket Board v0.7.2 to v0.8.0
#
# Key changes in v0.8.0:
# - TOML configuration: flat keys → nested [project.document] table
# - New dependencies: redoc, swagger-jsdoc, sonner
# - Conditional exports for browser compatibility
#
# Usage:
#   cd /path/to/project
#   ./scripts/migrate-v0.7.2-to-v0.8.0.sh [--dry-run] [--force]
#
# Options:
#   --dry-run    Show what would be changed without making changes
#   --force      Override existing .mdt-config.toml structure
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script options
DRY_RUN=false
FORCE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    --force)
      FORCE=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--force]"
      echo ""
      echo "Migration Script: v0.7.2 to v0.8.0"
      echo ""
      echo "Options:"
      echo "  --dry-run    Show what would be changed without making changes"
      echo "  --force      Override existing .mdt-config.toml structure"
      echo "  -h, --help   Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Project root (assumes script is in scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

CONFIG_FILE="$PROJECT_ROOT/.mdt-config.toml"
BACKUP_FILE="$CONFIG_FILE.v0.7.2.backup"

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if config file exists
check_config_exists() {
  if [[ ! -f "$CONFIG_FILE" ]]; then
    log_error "Configuration file not found: $CONFIG_FILE"
    log_info "Please run this script from the project root or ensure .mdt-config.toml exists"
    exit 1
  fi
}

# Check if migration is needed
check_migration_needed() {
  local config="$1"

  # Check for v0.7.2 style flat keys (underscore_case at root level)
  if grep -q "^[[:space:]]*document_paths[[:space:]]*=" "$config"; then
    return 0  # Migration needed
  fi

  if grep -q "^[[:space:]]*exclude_folders[[:space:]]*=" "$config"; then
    return 0  # Migration needed
  fi

  if grep -q "^[[:space:]]*max_depth[[:space:]]*=" "$config"; then
    return 0  # Migration needed
  fi

  # Check if [project.document] already exists
  if grep -q "^\[project\.document\]" "$config"; then
    if [[ "$FORCE" == "true" ]]; then
      log_warning "[project.document] section already exists (will recreate with --force)"
      return 0
    else
      log_warning "Configuration already migrated to v0.8.0 format"
      return 1  # No migration needed
    fi
  fi

  return 1  # No migration needed
}

# Migrate configuration file
migrate_config() {
  local config="$1"
  local output="$2"
  local in_project_section=false
  local in_document_section=false
  local skip_until_next_section=false

  # Extract values from old format
  local document_paths=()
  local exclude_folders=()
  local max_depth=""

  # First pass: collect values
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines for value extraction
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
      continue
    fi

    # Extract document_paths
    if [[ "$line" =~ ^[[:space:]]*document_paths[[:space:]]*=[[:space:]]*\[(.*)\]$ ]]; then
      local paths="${BASH_REMATCH[1]}"
      # Parse array elements
      while [[ "$paths" =~ \"([^\"]+)\"(.*) ]]; do
        document_paths+=("\"${BASH_REMATCH[1]}\"")
        paths="${BASH_REMATCH[2]}"
      done
    fi

    # Extract exclude_folders
    if [[ "$line" =~ ^[[:space:]]*exclude_folders[[:space:]]*=[[:space:]]*\[(.*)\]$ ]]; then
      local folders="${BASH_REMATCH[1]}"
      while [[ "$folders" =~ \"([^\"]+)\"(.*) ]]; do
        exclude_folders+=("\"${BASH_REMATCH[1]}\"")
        folders="${BASH_REMATCH[2]}"
      done
    fi

    # Extract max_depth
    if [[ "$line" =~ ^[[:space:]]*max_depth[[:space:]]*=[[:space:]]*([0-9]+) ]]; then
      max_depth="${BASH_REMATCH[1]}"
    fi
  done < "$config"

  # Second pass: write new config
  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip old flat keys
    if [[ "$line" =~ ^[[:space:]]*(document_paths|exclude_folders|max_depth)[[:space:]]*= ]]; then
      continue
    fi

    # Skip empty lines that were between old keys
    if [[ "$line" =~ ^[[:space:]]*$ ]] && [[ "$skip_until_next_section" == "true" ]]; then
      continue
    fi

    # Reset skip when we hit a non-empty, non-comment line
    if [[ ! "$line" =~ ^[[:space:]]*(#|$) ]]; then
      skip_until_next_section=false
    fi

    # Check for [project] section to insert [project.document] after
    if [[ "$line" =~ ^\[project\] ]] && [[ "$in_project_section" == "false" ]]; then
      in_project_section=true
      echo "$line" >> "$output"
      continue
    fi

    # Insert [project.document] section after the last [project] key
    # Detect when we're moving to a new top-level section
    if [[ "$line" =~ ^\[.*\] ]] && [[ ! "$line" =~ ^\[project\. ]] && [[ "$in_project_section" == "true" ]] && [[ "$in_document_section" == "false" ]]; then
      # Insert [project.document] section before new section
      in_document_section=true

      if [[ ${#document_paths[@]} -gt 0 ]] || [[ ${#exclude_folders[@]} -gt 0 ]] || [[ -n "$max_depth" ]]; then
        echo "" >> "$output"
        echo "[project.document]" >> "$output"

        if [[ ${#document_paths[@]} -gt 0 ]]; then
          echo "paths = [" >> "$output"
          for path in "${document_paths[@]}"; do
            echo "    $path," >> "$output"
          done
          echo "]" >> "$output"
        fi

        if [[ ${#exclude_folders[@]} -gt 0 ]]; then
          echo "excludeFolders = [" >> "$output"
          for folder in "${exclude_folders[@]}"; do
            echo "    $folder," >> "$output"
          done
          echo "]" >> "$output"
        fi

        if [[ -n "$max_depth" ]]; then
          echo "maxDepth = $max_depth" >> "$output"
        fi
      fi

      echo "$line" >> "$output"
      continue
    fi

    echo "$line" >> "$output"
  done < "$config"

  # Handle case where [project] is at end of file
  if [[ "$in_project_section" == "true" ]] && [[ "$in_document_section" == "false" ]]; then
    if [[ ${#document_paths[@]} -gt 0 ]] || [[ ${#exclude_folders[@]} -gt 0 ]] || [[ -n "$max_depth" ]]; then
      echo "" >> "$output"
      echo "[project.document]" >> "$output"

      if [[ ${#document_paths[@]} -gt 0 ]]; then
        echo "paths = [" >> "$output"
        for path in "${document_paths[@]}"; do
          echo "    $path," >> "$output"
        done
        echo "]" >> "$output"
      fi

      if [[ ${#exclude_folders[@]} -gt 0 ]]; then
        echo "excludeFolders = [" >> "$output"
        for folder in "${exclude_folders[@]}"; do
          echo "    $folder," >> "$output"
        done
        echo "]" >> "$output"
      fi

      if [[ -n "$max_depth" ]]; then
        echo "maxDepth = $max_depth" >> "$output"
      fi
    fi
  fi
}

# Main migration workflow
main() {
  log_info "Markdown Ticket Board Migration: v0.7.2 → v0.8.0"
  echo ""

  # Check config file
  check_config_exists

  # Check if migration is needed
  if ! check_migration_needed "$CONFIG_FILE"; then
    log_success "No migration needed"
    exit 0
  fi

  log_info "Configuration file: $CONFIG_FILE"
  echo ""

  # Backup original config
  if [[ "$DRY_RUN" == "false" ]]; then
    log_info "Creating backup: $BACKUP_FILE"
    cp "$CONFIG_FILE" "$BACKUP_FILE"
  fi

  # Perform migration
  local temp_config="$CONFIG_FILE.tmp"

  log_info "Migrating configuration schema..."
  log_info "  - document_paths → [project.document].paths"
  log_info "  - exclude_folders → [project.document].excludeFolders"
  log_info "  - max_depth → [project.document].maxDepth"

  migrate_config "$CONFIG_FILE" "$temp_config"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    log_info "DRY RUN - Preview of changes:"
    echo "================================"
    diff -u "$CONFIG_FILE" "$temp_config" || true
    echo "================================"
    rm -f "$temp_config"
    log_info "No changes made (use --dry-run=false to apply)"
    exit 0
  fi

  # Replace original config
  mv "$temp_config" "$CONFIG_FILE"
  log_success "Configuration migrated"

  echo ""
  log_info "Next steps:"
  echo "  1. Review the migrated configuration: $CONFIG_FILE"
  echo "  2. Run: npm install"
  echo "  3. Run: npm run build:shared"
  echo "  4. Start the application: npm run dev:full"
  echo ""
  log_info "Backup saved at: $BACKUP_FILE"

  # Check for npm
  if command -v npm &> /dev/null; then
    echo ""
    read -p "Install npm dependencies now? [y/N] " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      log_info "Running: npm install"
      npm install
      log_success "Dependencies installed"

      log_info "Running: npm run build:shared"
      npm run build:shared
      log_success "Shared package built"

      log_success "Migration complete!"
    else
      log_info "Skipping npm install. Run manually when ready:"
      echo "  npm install && npm run build:shared"
    fi
  fi
}

# Run main
main
