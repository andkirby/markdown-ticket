#!/usr/bin/env bash
#
# Migration Script: v0.7.2 to v0.8.0 (All Projects)
#
# This script handles the upgrade from Markdown Ticket Board v0.7.2 to v0.8.0
# for ALL projects registered in the global project registry or discovered
# through search paths.
#
# Usage:
#   ./scripts/migrate-all-projects-v0.7.2-to-v0.8.0.sh [--dry-run] [--force] [--path /custom/path]
#
# Options:
#   --dry-run       Show what would be changed without making changes
#   --force         Override existing .mdt-config.toml structure
#   --path PATH     Scan specific path instead of global search paths
#   --only PROJECT  Migrate only specific project directory
#

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Script options
DRY_RUN=false
FORCE=false
CUSTOM_PATH=""
ONLY_PROJECT=""

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
    --path)
      CUSTOM_PATH="$2"
      shift 2
      ;;
    --only)
      ONLY_PROJECT="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 [--dry-run] [--force] [--path PATH] [--only PROJECT]"
      echo ""
      echo "Migration Script: v0.7.2 to v0.8.0 (All Projects)"
      echo ""
      echo "Options:"
      echo "  --dry-run       Show what would be changed without making changes"
      echo "  --force         Override existing .mdt-config.toml structure"
      echo "  --path PATH     Scan specific path instead of global search paths"
      echo "  --only PROJECT  Migrate only specific project directory"
      echo "  -h, --help      Show this help message"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      exit 1
      ;;
  esac
done

# Global config paths
GLOBAL_CONFIG_DIR="$HOME/.config/markdown-ticket"
GLOBAL_CONFIG_FILE="$GLOBAL_CONFIG_DIR/config.toml"
PROJECT_REGISTRY_DIR="$GLOBAL_CONFIG_DIR/projects"

# Arrays to store discovered projects
declare -a PROJECTS_TO_MIGRATE=()
declare -a PROJECTS_ALREADY_MIGRATED=()
declare -a PROJECTS_NO_CONFIG=()
declare -a PROJECTS_ERRORS=()

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

log_project() {
  echo -e "${CYAN}[PROJECT]${NC} $1"
}

# Expand tilde in path
expand_path() {
  local path="$1"
  echo "${path/#\~/$HOME}"
}

# Get search paths from global config or use default
get_search_paths() {
  local paths=()

  if [[ -n "$CUSTOM_PATH" ]]; then
    paths=("$(expand_path "$CUSTOM_PATH")")
  elif [[ -n "$ONLY_PROJECT" ]]; then
    paths=("$(expand_path "$ONLY_PROJECT")")
  elif [[ -f "$GLOBAL_CONFIG_FILE" ]]; then
    # Parse searchPaths from global config
    while IFS= read -r line; do
      if [[ "$line" =~ searchPaths[[:space:]]*=[[:space:]]*\[(.*)\] ]]; then
        local search_paths="${BASH_REMATCH[1]}"
        # Extract quoted paths
        while [[ "$search_paths" =~ \"([^\"]+)\"(.*) ]]; do
          paths+=("$(expand_path "${BASH_REMATCH[1]}")")
          search_paths="${BASH_REMATCH[2]}"
        done
      fi
    done < "$GLOBAL_CONFIG_FILE"

    # If no paths defined, use default
    if [[ ${#paths[@]} -eq 0 ]]; then
      paths+=("$HOME")
    fi
  else
    paths+=("$HOME")
  fi

  printf '%s\n' "${paths[@]}"
}

# Find all projects with .mdt-config.toml
find_projects() {
  local search_paths=("$@")
  declare -a found_projects=()

  for search_path in "${search_paths[@]}"; do
    if [[ ! -d "$search_path" ]]; then
      log_warning "Search path does not exist: $search_path"
      continue
    fi

    log_info "Scanning: $search_path"

    # Find directories containing .mdt-config.toml
    while IFS= read -r config_file; do
      local project_dir
      project_dir="$(dirname "$config_file")"
      found_projects+=("$project_dir")
    done < <(find "$search_path" -maxdepth 3 -name ".mdt-config.toml" -type f 2>/dev/null)
  done

  printf '%s\n' "${found_projects[@]}"
}

# Check if config needs migration
check_migration_needed() {
  local config="$1"

  # Check for v0.7.2 style flat keys (underscore_case at root level)
  # Use single grep with -E to avoid exit code issues with set -e
  if grep -qE "^[[:space:]]*(document_paths|exclude_folders|max_depth)[[:space:]]*=" "$config" 2>/dev/null; then
    return 0  # Migration needed
  fi

  return 1  # No migration needed
}

# Migrate a single project config
migrate_project_config() {
  local config_file="$1"
  local project_name
  project_name="$(basename "$(dirname "$config_file")")"

  log_project "Migrating: $project_name"

  # Create backup
  local backup_file="${config_file}.v0.7.2.backup"
  if [[ "$DRY_RUN" == "false" ]]; then
    cp "$config_file" "$backup_file"
    log_info "  Backup: $backup_file"
  fi

  # Extract values from old format
  local -a document_paths=()
  local -a exclude_folders=()
  local max_depth=""

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip comments and empty lines for value extraction
    if [[ "$line" =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
      continue
    fi

    # Extract document_paths
    if [[ "$line" =~ ^[[:space:]]*document_paths[[:space:]]*=[[:space:]]*\[(.*)\]$ ]]; then
      local paths="${BASH_REMATCH[1]}"
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
  done < "$config_file"

  # Build new config
  local temp_config="${config_file}.tmp"
  local in_project_section=false
  local in_document_section=false

  while IFS= read -r line || [[ -n "$line" ]]; do
    # Skip old flat keys
    if [[ "$line" =~ ^[[:space:]]*(document_paths|exclude_folders|max_depth)[[:space:]]*= ]]; then
      continue
    fi

    # Check for [project] section
    if [[ "$line" =~ ^\[project\] ]] && [[ "$in_project_section" == "false" ]]; then
      in_project_section=true
      echo "$line" >> "$temp_config"
      continue
    fi

    # Insert [project.document] section before new top-level section
    if [[ "$line" =~ ^\[.*\] ]] && [[ ! "$line" =~ ^\[project\. ]] && [[ "$in_project_section" == "true" ]] && [[ "$in_document_section" == "false" ]]; then
      in_document_section=true

      if [[ ${#document_paths[@]} -gt 0 ]] || [[ ${#exclude_folders[@]} -gt 0 ]] || [[ -n "$max_depth" ]]; then
        echo "" >> "$temp_config"
        echo "[project.document]" >> "$temp_config"

        if [[ ${#document_paths[@]} -gt 0 ]]; then
          echo "paths = [" >> "$temp_config"
          for path in "${document_paths[@]}"; do
            echo "    $path," >> "$temp_config"
          done
          echo "]" >> "$temp_config"
        fi

        if [[ ${#exclude_folders[@]} -gt 0 ]]; then
          echo "excludeFolders = [" >> "$temp_config"
          for folder in "${exclude_folders[@]}"; do
            echo "    $folder," >> "$temp_config"
          done
          echo "]" >> "$temp_config"
        fi

        if [[ -n "$max_depth" ]]; then
          echo "maxDepth = $max_depth" >> "$temp_config"
        fi
      fi

      echo "$line" >> "$temp_config"
      continue
    fi

    echo "$line" >> "$temp_config"
  done < "$config_file"

  # Handle case where [project] is at end of file
  if [[ "$in_project_section" == "true" ]] && [[ "$in_document_section" == "false" ]]; then
    if [[ ${#document_paths[@]} -gt 0 ]] || [[ ${#exclude_folders[@]} -gt 0 ]] || [[ -n "$max_depth" ]]; then
      echo "" >> "$temp_config"
      echo "[project.document]" >> "$temp_config"

      if [[ ${#document_paths[@]} -gt 0 ]]; then
        echo "paths = [" >> "$temp_config"
        for path in "${document_paths[@]}"; do
          echo "    $path," >> "$temp_config"
        done
        echo "]" >> "$temp_config"
      fi

      if [[ ${#exclude_folders[@]} -gt 0 ]]; then
        echo "excludeFolders = [" >> "$temp_config"
        for folder in "${exclude_folders[@]}"; do
          echo "    $folder," >> "$temp_config"
        done
        echo "]" >> "$temp_config"
      fi

      if [[ -n "$max_depth" ]]; then
        echo "maxDepth = $max_depth" >> "$temp_config"
      fi
    fi
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    echo ""
    diff -u "$config_file" "$temp_config" || true
    rm -f "$temp_config"
    return 0
  fi

  mv "$temp_config" "$config_file"
  log_success "  Migrated successfully"
  return 0
}

# Main migration workflow
main() {
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}Markdown Ticket Board Migration${NC}"
  echo -e "${CYAN}v0.7.2 → v0.8.0 (All Projects)${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo ""

  # Get search paths
  local -a search_paths
  mapfile -t search_paths < <(get_search_paths)

  log_info "Search paths:"
  for path in "${search_paths[@]}"; do
    echo "  - $path"
  done
  echo ""

  # Find all projects
  log_info "Discovering projects..."
  local -a projects
  mapfile -t projects < <(find_projects "${search_paths[@]}")

  if [[ ${#projects[@]} -eq 0 ]]; then
    log_warning "No projects found with .mdt-config.toml"
    exit 0
  fi

  log_info "Found ${#projects[@]} project(s) with .mdt-config.toml"
  echo ""

  # Categorize projects
  for project_dir in "${projects[@]}"; do
    local config_file="$project_dir/.mdt-config.toml"

    if [[ ! -f "$config_file" ]]; then
      PROJECTS_NO_CONFIG+=("$project_dir")
      continue
    fi

    if check_migration_needed "$config_file"; then
      PROJECTS_TO_MIGRATE+=("$config_file")
    else
      PROJECTS_ALREADY_MIGRATED+=("$config_file")
    fi
  done

  # Summary
  log_info "Migration Summary:"
  echo "  Projects needing migration: ${#PROJECTS_TO_MIGRATE[@]}"
  echo "  Projects already migrated: ${#PROJECTS_ALREADY_MIGRATED[@]}"
  echo "  Projects without config: ${#PROJECTS_NO_CONFIG[@]}"
  echo ""

  # Migrate projects
  if [[ ${#PROJECTS_TO_MIGRATE[@]} -eq 0 ]]; then
    log_success "No migrations needed"
    exit 0
  fi

  if [[ "$DRY_RUN" == "true" ]]; then
    log_warning "DRY RUN MODE - No changes will be made"
    echo ""
  fi

  local success_count=0
  local error_count=0

  local total=${#PROJECTS_TO_MIGRATE[@]}
  local current=0

  for config_file in "${PROJECTS_TO_MIGRATE[@]}"; do
    current=$((current + 1))
    echo -e "${CYAN}━━━[$current/$total]━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    if migrate_project_config "$config_file"; then
      success_count=$((success_count + 1))
    else
      error_count=$((error_count + 1))
      PROJECTS_ERRORS+=("$config_file")
    fi
    echo ""
  done

  # Final summary
  echo -e "${CYAN}=================================${NC}"
  echo -e "${CYAN}Migration Complete${NC}"
  echo -e "${CYAN}=================================${NC}"
  echo ""
  log_success "Successfully migrated: $success_count project(s)"

  if [[ $error_count -gt 0 ]]; then
    log_error "Failed to migrate: $error_count project(s)"
    for config in "${PROJECTS_ERRORS[@]}"; do
      echo "  - $config"
    done
  fi

  if [[ ${#PROJECTS_ALREADY_MIGRATED[@]} -gt 0 ]]; then
    log_info "Already migrated (${#PROJECTS_ALREADY_MIGRATED[@]}):"
    for config in "${PROJECTS_ALREADY_MIGRATED[@]}"; do
      echo "  - $(dirname "$config")"
    done
  fi

  if [[ "$DRY_RUN" == "false" ]]; then
    echo ""
    log_info "Next steps:"
    echo "  1. Review migrated configurations"
    echo "  2. Run: npm install && npm run build:shared"
    echo "  3. Restart the application"
    echo ""
    log_info "Backup files created with .v0.7.2.backup suffix"
  fi
}

# Run main
main
