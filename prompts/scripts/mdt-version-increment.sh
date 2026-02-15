#!/usr/bin/env bash
# MDT Plugin Version Increment Script
#
# This script manages version numbers for the MDT plugin in plugin.json.
# It supports semantic versioning with pre-release suffixes following the
# transition path: dev → alpha → beta → rc → release (stable)
#
# Usage: mdt-version-increment.sh <action> [--dry-run]
#
# Actions:
#   dev      - Smart dev increment (first pre-release stage)
#              Examples: 0.10.0 → 0.11.0-dev → 0.11.0-dev.1 → 0.11.0-dev.2
#   alpha    - Transition to alpha or increment alpha number
#              Examples: 0.11.0-dev.3 → 0.11.0-alpha → 0.11.0-alpha.1
#   beta     - Transition to beta or increment beta number
#              Examples: 0.11.0-alpha.3 → 0.11.0-beta → 0.11.0-beta.1
#   rc       - Transition to rc or increment rc number
#              Examples: 0.11.0-beta.3 → 0.11.0-rc → 0.11.0-rc.1
#   release  - Remove any pre-release suffix to create stable release
#              Examples: 0.11.0-rc.5 → 0.11.0
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
  echo "Actions: dev, alpha, beta, rc, release, minor, patch" >&2
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
  # Handle versions with suffix (e.g., 0.3.0-dev, 0.3.0-alpha.1, 0.3.0-beta.2, 0.3.0-rc.22)
  # Suffix can be: -dev, -alpha, -beta, -rc, optionally followed by .N
  if [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)(-([a-z]+))(\.([0-9]+))?$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    SUFFIX="-${BASH_REMATCH[5]}"
    SUFFIX_TYPE="${BASH_REMATCH[5]}"
    SUFFIX_NUM="${BASH_REMATCH[7]:-0}"
    HAS_SUFFIX=true
  elif [[ "$version" =~ ^([0-9]+)\.([0-9]+)\.([0-9]+)$ ]]; then
    MAJOR="${BASH_REMATCH[1]}"
    MINOR="${BASH_REMATCH[2]}"
    PATCH="${BASH_REMATCH[3]}"
    HAS_SUFFIX=false
    SUFFIX=""
    SUFFIX_TYPE=""
    SUFFIX_NUM=0
  else
    echo "Error: Invalid version format: $version" >&2
    exit 1
  fi
}

# Pre-release suffix priority order (for transitions)
SUFFIX_ORDER=("dev" "alpha" "beta" "rc")

# Get next suffix type in the progression
next_suffix() {
  local current="$1"
  local i
  for i in "${!SUFFIX_ORDER[@]}"; do
    if [[ "${SUFFIX_ORDER[$i]}" == "$current" ]]; then
      if [[ $i -lt $((${#SUFFIX_ORDER[@]} - 1)) ]]; then
        echo "${SUFFIX_ORDER[$((i + 1))]}"
        return 0
      fi
    fi
  done
  echo "release"
  return 0
}

# Process based on action
case "$ACTION" in
  dev)
    # Smart dev increment:
    # - 0.10.0 => 0.11.0-dev (from stable)
    # - 0.11.0-dev => 0.11.0-dev.1 (from dev without number)
    # - 0.11.0-dev.1 => 0.11.0-dev.2 (from dev with number)
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == true && "$SUFFIX_TYPE" == "dev" ]]; then
      # Already on dev - increment dev number
      NEW_SUFFIX_NUM=$((SUFFIX_NUM + 1))
      if [[ $NEW_SUFFIX_NUM -eq 1 ]]; then
        NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}.${NEW_SUFFIX_NUM}"
      else
        NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}${SUFFIX}.${NEW_SUFFIX_NUM}"
      fi
    elif [[ "$HAS_SUFFIX" == true ]]; then
      echo "Error: Cannot transition to dev from $SUFFIX_TYPE. Use 'release' first." >&2
      exit 1
    else
      # On stable - start new dev
      NEW_MINOR=$((MINOR + 1))
      NEW_VERSION="${MAJOR}.${NEW_MINOR}.0-dev"
    fi
    update_version "$NEW_VERSION"
    ;;

  alpha)
    # Transition to alpha or increment alpha:
    # - 0.11.0-dev.3 => 0.11.0-alpha (from dev)
    # - 0.11.0-alpha => 0.11.0-alpha.1 (from alpha without number)
    # - 0.11.0-alpha.1 => 0.11.0-alpha.2 (from alpha with number)
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == false ]]; then
      echo "Error: Cannot transition to alpha from stable. Use 'dev' first." >&2
      exit 1
    fi
    if [[ "$SUFFIX_TYPE" == "alpha" ]]; then
      # Already on alpha - increment alpha number
      NEW_SUFFIX_NUM=$((SUFFIX_NUM + 1))
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-alpha.${NEW_SUFFIX_NUM}"
    elif [[ "$SUFFIX_TYPE" == "dev" ]]; then
      # Transition from dev to alpha
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-alpha"
    else
      echo "Error: Cannot transition to alpha from $SUFFIX_TYPE." >&2
      exit 1
    fi
    update_version "$NEW_VERSION"
    ;;

  beta)
    # Transition to beta or increment beta:
    # - 0.11.0-alpha.3 => 0.11.0-beta (from alpha)
    # - 0.11.0-beta => 0.11.0-beta.1 (from beta without number)
    # - 0.11.0-beta.1 => 0.11.0-beta.2 (from beta with number)
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == false ]]; then
      echo "Error: Cannot transition to beta from stable. Use 'dev' or 'alpha' first." >&2
      exit 1
    fi
    if [[ "$SUFFIX_TYPE" == "beta" ]]; then
      # Already on beta - increment beta number
      NEW_SUFFIX_NUM=$((SUFFIX_NUM + 1))
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-beta.${NEW_SUFFIX_NUM}"
    elif [[ "$SUFFIX_TYPE" == "alpha" || "$SUFFIX_TYPE" == "dev" ]]; then
      # Transition from alpha/dev to beta
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-beta"
    else
      echo "Error: Cannot transition to beta from $SUFFIX_TYPE." >&2
      exit 1
    fi
    update_version "$NEW_VERSION"
    ;;

  rc)
    # Transition to rc or increment rc:
    # - 0.11.0-beta.3 => 0.11.0-rc (from beta)
    # - 0.11.0-rc => 0.11.0-rc.1 (from rc without number)
    # - 0.11.0-rc.1 => 0.11.0-rc.2 (from rc with number)
    parse_version "$CURRENT_VERSION"
    if [[ "$HAS_SUFFIX" == false ]]; then
      echo "Error: Cannot transition to rc from stable. Use 'dev', 'alpha', or 'beta' first." >&2
      exit 1
    fi
    if [[ "$SUFFIX_TYPE" == "rc" ]]; then
      # Already on rc - increment rc number
      NEW_SUFFIX_NUM=$((SUFFIX_NUM + 1))
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-rc.${NEW_SUFFIX_NUM}"
    elif [[ "$SUFFIX_TYPE" == "beta" || "$SUFFIX_TYPE" == "alpha" || "$SUFFIX_TYPE" == "dev" ]]; then
      # Transition from beta/alpha/dev to rc
      NEW_VERSION="${MAJOR}.${MINOR}.${PATCH}-rc"
    else
      echo "Error: Cannot transition to rc from $SUFFIX_TYPE." >&2
      exit 1
    fi
    update_version "$NEW_VERSION"
    ;;

  release)
    # Remove any pre-release suffix to create stable release:
    # 0.11.0-dev.5 => 0.11.0
    # 0.11.0-alpha.3 => 0.11.0
    # 0.11.0-beta.22 => 0.11.0
    # 0.11.0-rc.5 => 0.11.0
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
    echo "Valid actions: dev, alpha, beta, rc, release, minor, patch" >&2
    exit 1
    ;;
esac
