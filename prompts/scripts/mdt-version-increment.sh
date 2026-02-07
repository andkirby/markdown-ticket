#!/usr/bin/env bash
# MDT Plugin Version Increment Script
#
# This script manages version numbers for the MDT plugin in plugin.json.
# It supports semantic versioning with pre-release suffixes (e.g., -beta, -rc).
#
# Usage: mdt-version-increment.sh <action> [--dry-run]
#
# Actions:
#   beta     - Smart beta increment (handles all beta transitions)
#              Examples: 0.10.0 → 0.11.0-beta → 0.11.0-beta.1 → 0.11.0-beta.2
#   release  - Remove any pre-release suffix to create stable release
#              Examples: 0.11.0-beta.22 → 0.11.0, 0.11.0-rc.5 → 0.11.0
#   minor    - Increment minor version (only works on stable versions)
#              Example: 0.10.0 → 0.11.0
#   patch    - Increment patch version (only works on stable versions)
#              Example: 0.10.0 → 0.10.1
#
# Options:
#   --dry-run  - Show what would be done without making changes
#
# Version file: mdt/.claude-plugin/plugin.json

set -euo pipefail

PLUGIN_FILE="mdt/.claude-plugin/plugin.json"
DRY_RUN=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --dry-run)
      DRY_RUN=true
      shift
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      ACTION="$1"
      shift
      ;;
  esac
done

if [[ -z "${ACTION:-}" ]]; then
  echo "Usage: $0 <action>" >&2
  echo "Actions: beta, release, minor, patch" >&2
  echo "Options: --dry-run" >&2
  exit 1
fi

# Check if plugin file exists
if [[ ! -f "$PLUGIN_FILE" ]]; then
  echo "Error: Plugin file not found: $PLUGIN_FILE" >&2
  exit 1
fi

# Extract current version
CURRENT_VERSION=$(jq -r '.version' "$PLUGIN_FILE")
echo "Current version: $CURRENT_VERSION"

# Function to update version
update_version() {
  local new_version="$1"
  echo "New version: $new_version"

  if [[ "$DRY_RUN" == true ]]; then
    echo "[DRY RUN] Would update $PLUGIN_FILE"
    jq --arg v "$new_version" '.version = $v' "$PLUGIN_FILE"
  else
    tmp_file=$(mktemp)
    jq --arg v "$new_version" '.version = $v' "$PLUGIN_FILE" > "$tmp_file"
    mv "$tmp_file" "$PLUGIN_FILE"
    echo "Updated $PLUGIN_FILE to version $new_version"
  fi
}

# Parse version into components
parse_version() {
  local version="$1"
  # Handle versions with suffix (e.g., 0.3.0-beta, 0.3.0-beta.1, 0.3.0-rc.22)
  if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-[^.]+)(\.([0-9]+))?$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    SUFFIX="${BASH_REMATCH[4]}"
    SUFFIX_NUM="${BASH_REMATCH[6]:-0}"
    HAS_SUFFIX=true
  elif [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    HAS_SUFFIX=false
    SUFFIX=""
  else
    echo "Error: Invalid version format: $version" >&2
    exit 1
  fi
}

# Process based on action
case "$ACTION" in
  beta)
    # Smart beta increment:
    # - 0.10.0 => 0.11.0-beta (from stable)
    # - 0.11.0-beta => 0.11.0-beta.1 (from beta without number)
    # - 0.11.0-beta.1 => 0.11.0-beta.2 (from beta with number)
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == true ]]; then
      # Already has suffix - increment suffix number
      NEW_SUFFIX_NUM=$((SUFFIX_NUM + 1))
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}.${NEW_SUFFIX_NUM}"
    else
      # On stable - start new beta
      NEW_MINOR=$((MINOR + 1))
      NEW_VERSION="${MAJOR}.${NEW_MINOR}.0-beta"
    fi
    update_version "$NEW_VERSION"
    ;;

  release)
    # 0.3.0-beta.22 => 0.3.0 (removes any suffix)
    # 0.3.0-rc.5 => 0.3.0
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" != true ]]; then
      echo "Error: Current version does not have a suffix to release." >&2
      exit 1
    fi
    NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}"
    update_version "$NEW_VERSION"
    ;;

  minor)
    # 0.2.0 => 0.3.0
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == true ]]; then
      echo "Error: Cannot increment minor version on version with suffix. Use 'release' first." >&2
      exit 1
    fi
    NEW_MINOR=$((MINOR + 1))
    NEW_VERSION="${MAJOR}.${NEW_MINOR}.0"
    update_version "$NEW_VERSION"
    ;;

  patch)
    # 0.2.0 => 0.2.1
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == true ]]; then
      echo "Error: Cannot increment patch version on version with suffix. Use 'release' first." >&2
      exit 1
    fi
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
    update_version "$NEW_VERSION"
    ;;

  *)
    echo "Error: Unknown action: $ACTION" >&2
    echo "Valid actions: beta, release, minor, patch" >&2
    exit 1
    ;;
esac
