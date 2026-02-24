#!/usr/bin/env bash
set -euo pipefail

# MDT Plugin Installer
# ====================
# Installs the MDT (Markdown Ticket) workflow plugin for Claude Code.
#
# Usage: ./install-plugin.sh --local|--docker|--update|-u [-y] [--scope {user|local}] [--mdt PATH] [--help]
#
# Flow:
# 1. Generate .mcp.json config for local Node.js or Docker MCP server
# 2. Check current installation (marketplace + plugin status)
# 3. Show installation summary table
# 4. Confirm if plugin already enabled
# 5. Update/install marketplace (source of plugins)
# 6. Prompt for installation scope (user/local) unless --scope provided or --update mode
# 7. Handle scope change if needed
# 8. Install/update plugin in selected scope
# 9. Enable plugin (if not already enabled)
# 10. Show completion summary and available commands

# Colors for user-friendly output
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly YELLOW='\033[1;33m'
readonly CYAN='\033[0;36m'
readonly GRAY='\033[0;90m'
readonly WHITE_BOLD='\033[1;97m'
readonly NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root is one level up from the script (prompts/ -> markdown-ticket/)
# Can be overridden with --mdt option
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Read marketplace and plugin names from config files
MARKETPLACE_NAME=$(cat "$SCRIPT_DIR/.claude-plugin/marketplace.json" 2>/dev/null | jq -r '.name // "markdown-ticket"')
PLUGIN_NAME_BASE=$(cat "$SCRIPT_DIR/mdt/.claude-plugin/plugin.json" 2>/dev/null | jq -r '.name // "mdt"')
PLUGIN_VERSION=$(cat "$SCRIPT_DIR/mdt/.claude-plugin/plugin.json" 2>/dev/null | jq -r '.version // "0.10.0"')
PLUGIN_ID="${PLUGIN_NAME_BASE}@${MARKETPLACE_NAME}"

MCP_JSON_FILE="$SCRIPT_DIR/mdt/.mcp.json"

# MDT_ROOT defaults to ../markdown-ticket but can be overridden with --mdt option
MDT_ROOT="$PROJECT_ROOT"
MCP_SERVER_LOCAL="$MDT_ROOT/mcp-server/dist/index.js"
MCP_SERVER_DOCKER_URL="http://localhost:3012/mcp"

# Array to collect MCP environment variables (from --mcp-env options)
declare -a MCP_ENV_VARS=()

# Print action log (gray - for "checking...", "creating...", "updating...")
print_log() {
  echo -e "${GRAY}$1${NC}"
}

# Print success status (green - for successful completion)
print_success() {
  echo -e "${GREEN}$1${NC}"
}

# Print error status (red - for errors)
print_error() {
  echo -e "${RED}$1${NC}" >&2
}

# Print question prompt (yellow - for interactive prompts)
print_question() {
  echo -e "${YELLOW}$1${NC}"
}

# Print highlight (bold white - for headers and important text)
print_highlight() {
  echo -e "${WHITE_BOLD}$1${NC}"
}

# Get command description from .md file
get_command_desc() {
  local file="$1"
  # Try to extract from frontmatter description field
  local desc
  desc=$(sed -n '/^description:/p' "$file" 2>/dev/null | sed 's/^description: *//; s/^"//; s/"$//')
  if [[ -n "$desc" ]]; then
    echo "$desc"
    return
  fi
  # Fallback to first heading
  sed -n '1,/^# /p' "$file" 2>/dev/null | grep '^# ' | head -1 | sed 's/^# //; s/^mdt://'
}

# List available commands from commands directory
list_commands() {
  local commands_dir="$SCRIPT_DIR/mdt/commands"
  if [[ -d "$commands_dir" ]]; then
    echo "Available commands:"

    # First pass: collect commands and find max width
    local max_width=0
    local -a cmd_list
    for cmd_file in "$commands_dir"/*.md; do
      if [[ -f "$cmd_file" ]]; then
        local cmd_name
        cmd_name=$(basename "$cmd_file" .md)
        local cmd_display="/mdt:${cmd_name}"
        local cmd_len=${#cmd_display}
        [[ $cmd_len -gt $max_width ]] && max_width=$cmd_len

        local desc
        desc=$(get_command_desc "$cmd_file")
        local title="$desc"
        local version=""
        if [[ -n "$desc" && "$desc" =~ ^(.+)\ \((v[0-9]+)\)$ ]]; then
          title="${BASH_REMATCH[1]}"
          version="${BASH_REMATCH[2]}"
        fi
        cmd_list+=("$cmd_name|$title|$version")
      fi
    done

    # Sort and print with aligned columns
    IFS=$'\n' cmd_list_sorted=($(sort <<<"${cmd_list[*]}"))
    unset IFS

    for entry in "${cmd_list_sorted[@]}"; do
      [[ -z "$entry" ]] && continue
      IFS='|' read -r cmd_name title version <<< "$entry"

      local cmd_display="/mdt:${cmd_name}"
      local padding=$((max_width - ${#cmd_display}))
      local spacer=""
      [[ $padding -gt 0 ]] && spacer=$(printf '%*s' $padding '')

      if [[ -n "$title" ]]; then
        if [[ -n "$version" ]]; then
          echo -e "  ${WHITE_BOLD}${cmd_display}${NC}${spacer} - ${title} ${GRAY}${version}${NC}"
        else
          echo -e "  ${WHITE_BOLD}${cmd_display}${NC}${spacer} - ${title}"
        fi
      else
        echo -e "  ${WHITE_BOLD}${cmd_display}${NC}"
      fi
    done
  fi
}

# Get current plugin status
get_plugin_status() {
  if command -v claude &>/dev/null && command -v jq &>/dev/null; then
    claude plugin list --json 2>/dev/null | jq -r "
      .[] |
      select(.id == \"$PLUGIN_ID\") |
      {
        scope: .scope,
        enabled: .enabled,
        version: .version // \"unknown\",
        mcpType: (if .mcpServers.all.command then \"stdio\" elif .mcpServers.all.url then \"http\" else \"unknown\" end)
      }
    "
  fi
}

# Check if marketplace is already installed
get_marketplace_status() {
  if command -v claude &>/dev/null && command -v jq &>/dev/null; then
    claude plugin marketplace list --json 2>/dev/null | jq -r "
      .[] |
      select(.name == \"$MARKETPLACE_NAME\") |
      {
        name: .name,
        installLocation: .installLocation
      }
    "
  fi
}

# Show help message
show_help() {
  print_highlight "MDT Plugin Installer v${PLUGIN_VERSION}"
  echo ""
  echo "Usage: $0 --local|--docker|--update|-u [-y] [--scope {user|local}] [--mdt PATH] [--mcp-env KEY=VAL] [--help]"
  echo ""
  echo "Options:"
  echo "  --local       Use local Node.js MCP server at: \$MDT_ROOT/mcp-server/dist/index.js"
  echo "  --docker      Use Docker MCP server via HTTP at: $MCP_SERVER_DOCKER_URL"
  echo "  --update, -u  Update mode: detect current installation and update it"
  echo "  -y            Auto-confirm all prompts (use with --update for unattended updates)"
  echo "                Short flags can be combined: -uy is same as -u -y"
  echo "  --scope user  Install in user scope (available to all projects)"
  echo "  --scope local Install in local scope (available only to this project)"
  echo "  --mdt PATH    Path to markdown-ticket directory (default: ../markdown-ticket)"
  echo "  --mcp-env KEY=VAL  Set environment variable for MCP server (repeatable)"
  echo "  --help, -h    Show this help message"
  exit 0
}

# Show error and usage
show_error() {
  print_error "Error: $1"
  echo ""
  echo "Usage: $0 --local|--docker|--update|-u [-y] [--scope {user|local}] [--mdt PATH] [--mcp-env KEY=VAL]"
  echo ""
  echo "Options:"
  echo "  --local       Use local Node.js MCP server at: \$MDT_ROOT/mcp-server/dist/index.js"
  echo "  --docker      Use Docker MCP server via HTTP at: $MCP_SERVER_DOCKER_URL"
  echo "  --update, -u  Update mode: detect current installation and update it"
  echo "  -y            Auto-confirm all prompts (use with --update for unattended updates)"
  echo "                Short flags can be combined: -uy is same as -u -y"
  echo "  --scope user  Install in user scope (available to all projects)"
  echo "  --scope local Install in local scope (available only to this project)"
  echo "  --mdt PATH    Path to markdown-ticket directory (default: ../markdown-ticket)"
  echo "  --mcp-env KEY=VAL  Set environment variable for MCP server (repeatable)"
  echo "  --help, -h    Show this help message"
  exit 1
}

# Parse arguments
if [[ $# -lt 1 ]]; then
  show_error "Missing required argument. Specify --local, --docker, or --update."
fi

# Expand combined short flags (e.g., -uy -> -u -y)
# Done inline to avoid mapfile compatibility issues (bash 3.2 vs 4+)
set -- $(for arg in "$@"; do
  if [[ "$arg" =~ ^-[a-zA-Z]+$ && ! "$arg" =~ ^--[a-zA-Z] ]]; then
    # This is a combined short flag (like -uy), not a long option (like --update)
    # Split into individual flags
    flags="${arg#-}"  # Remove leading dash
    i=0
    while [[ $i -lt ${#flags} ]]; do
      echo "-${flags:$i:1}"
      ((i++))
    done
  else
    echo "$arg"
  fi
done)

MODE=""
SCOPE=""
UPDATE_MODE=false
AUTO_YES=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_help
      ;;
    --update|-u)
      UPDATE_MODE=true
      shift
      ;;
    -y)
      AUTO_YES=true
      shift
      ;;
    --local)
      MODE="local"
      shift
      ;;
    --docker)
      MODE="docker"
      shift
      ;;
    --mdt)
      if [[ -z "${2:-}" || "${2:-}" == "" ]]; then
        show_error "--mdt requires a path (e.g., --mdt ~/home/markdown-ticket)"
      fi
      # Expand ~ to $HOME and resolve path
      MDT_ROOT="$(eval echo "$2")"
      MCP_SERVER_LOCAL="$MDT_ROOT/mcp-server/dist/index.js"
      shift 2
      ;;
    --scope)
      if [[ -z "${2:-}" || "${2:-}" == "" ]]; then
        show_error "--scope requires a value (user or local)"
      fi
      case "$2" in
        user|local)
          SCOPE="$2"
          ;;
        *)
          show_error "Invalid scope: $2

Valid scopes are: user, local"
          ;;
      esac
      shift 2
      ;;
    --mcp-env)
      if [[ -z "${2:-}" || "${2:-}" == "" ]]; then
        show_error "--mcp-env requires a KEY=VALUE pair"
      fi
      # Validate: KEY starts with letter/underscore, contains alphanumeric/underscore, then = and at least one value char
      if [[ ! "$2" =~ ^[A-Za-z_][A-Za-z0-9_]*=.+$ ]]; then
        show_error "Invalid --mcp-env format: $2

Expected: KEY=VALUE (e.g., --mcp-env LOG_LEVEL=debug or CONFIG_DIR=~/path/to/config)"
      fi
      MCP_ENV_VARS+=("$2")
      shift 2
      ;;
    *)
      show_error "Invalid option: $1

Valid options are: --local, --docker, --update, -y, --scope, --mdt, --mcp-env"
      ;;
  esac
done

# Generate .mcp.json config after all arguments parsed (so --mdt can update MDT_ROOT first)
if [[ "$MODE" = "local" ]]; then
  if [[ ! -f "$MCP_SERVER_LOCAL" ]]; then
    show_error "MCP server not found at: $MCP_SERVER_LOCAL

Run 'npm run build' in the mcp-server directory first."
  fi

  # Build JSON with optional env vars using heredoc (handles escapes properly)
  if [[ ${#MCP_ENV_VARS[@]} -gt 0 ]]; then
    # Build env entries line by line with commas between
    env_lines=""
    count=0
    total=${#MCP_ENV_VARS[@]}
    for pair in "${MCP_ENV_VARS[@]}"; do
      key="${pair%%=*}"
      value="${pair#*=}"
      # Escape backslashes and double quotes in value
      value_escaped="${value//\\/\\\\}"
      value_escaped="${value_escaped//\"/\\\"}"
      env_lines+="      \"$key\": \"$value_escaped\""
      count=$((count + 1))
      if [[ $count -lt $total ]]; then
        env_lines+=","
      fi
      env_lines+=$'\n'
    done

    cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "command": "node",
      "args": ["$MCP_SERVER_LOCAL"],
      "env": {
${env_lines}
      }
    }
  }
}
EOF
  else
    cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "command": "node",
      "args": ["$MCP_SERVER_LOCAL"]
    }
  }
}
EOF
  fi
elif [[ "$MODE" = "docker" ]]; then
  cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "type": "http",
      "url": "$MCP_SERVER_DOCKER_URL"
    }
  }
}
EOF
fi

# In update mode, MODE will be detected from current installation
if [[ "$UPDATE_MODE" = true ]]; then
  # Check for required commands first (needed for status check)
  for cmd in claude jq; do
    if ! command -v "$cmd" &>/dev/null; then
      print_error "Required command not found: $cmd"
      echo ""
      print_log "Please install Claude Code CLI and jq."
      exit 1
    fi
  done

  # Check if plugin is already installed
  CURRENT_STATUS_CHECK=$(get_plugin_status)
  if [[ -z "$CURRENT_STATUS_CHECK" ]]; then
    print_error "Plugin is not installed. Use --local or --docker to install first."
    echo ""
    echo "Run: $0 --local"
    exit 1
  fi

  # Detect mode from current MCP type
  CURRENT_MCP_TYPE_CHECK=$(echo "$CURRENT_STATUS_CHECK" | jq -r '.mcpType')
  case "$CURRENT_MCP_TYPE_CHECK" in
    stdio)
      MODE="local"
      if [[ ! -f "$MCP_SERVER_LOCAL" ]]; then
        show_error "MCP server not found at: $MCP_SERVER_LOCAL

Run 'npm run build' in the mcp-server directory first."
      fi

      # Build JSON with optional env vars using heredoc (handles escapes properly)
      if [[ ${#MCP_ENV_VARS[@]} -gt 0 ]]; then
        env_lines=""
        count=0
        total=${#MCP_ENV_VARS[@]}
        for pair in "${MCP_ENV_VARS[@]}"; do
          key="${pair%%=*}"
          value="${pair#*=}"
          value_escaped="${value//\\/\\\\}"
          value_escaped="${value_escaped//\"/\\\"}"
          env_lines+="      \"$key\": \"$value_escaped\""
          ((count++))
          if [[ $count -lt $total ]]; then
            env_lines+=","
          fi
          env_lines+=$(printf '\n')
        done

        cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "command": "node",
      "args": ["$MCP_SERVER_LOCAL"],
      "env": {
${env_lines}
      }
    }
  }
}
EOF
      else
        cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "command": "node",
      "args": ["$MCP_SERVER_LOCAL"]
    }
  }
}
EOF
      fi
      ;;
    http)
      MODE="docker"
      cat > "$MCP_JSON_FILE" <<EOF
{
  "mcpServers": {
    "all": {
      "type": "http",
      "url": "$MCP_SERVER_DOCKER_URL"
    }
  }
}
EOF
      ;;
    *)
      print_error "Could not detect current MCP server type."
      echo "Please specify --local or --docker explicitly."
      exit 1
      ;;
  esac
elif [[ -z "$MODE" ]]; then
  show_error "Missing required argument. Specify --local, --docker, or --update."
fi

# Check for required commands
for cmd in claude jq; do
  if ! command -v "$cmd" &>/dev/null; then
    print_error "Required command not found: $cmd"
    echo ""
    print_log "Please install Claude Code CLI and jq."
    exit 1
  fi
done

print_highlight "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [[ "$UPDATE_MODE" = true ]]; then
  print_highlight "MDT Plugin Updater v${PLUGIN_VERSION} (Update Mode)"
else
  print_highlight "MDT Plugin Installer v${PLUGIN_VERSION}"
fi
print_highlight "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get current status (marketplace + plugin)
echo -n "Checking current installation... "
MARKETPLACE_STATUS=$(get_marketplace_status)
CURRENT_STATUS=$(get_plugin_status)
echo -e "${GREEN}✓${NC}"

# Parse marketplace path (initialize to empty for nounset safety)
MARKETPLACE_PATH=""
if [[ -n "$MARKETPLACE_STATUS" ]]; then
  MARKETPLACE_PATH=$(echo "$MARKETPLACE_STATUS" | jq -r '.installLocation // empty')
fi

# Determine target MCP type and mode label based on mode
TARGET_MCP_TYPE="unknown"
MODE_LABEL=""
case "$MODE" in
  local)
    TARGET_MCP_TYPE="stdio"
    MODE_LABEL="(local)"
    ;;
  docker)
    TARGET_MCP_TYPE="http"
    MODE_LABEL="(docker)"
    ;;
esac

# Show comparison table
echo ""
print_highlight "Installation Summary"

if [[ -n "$CURRENT_STATUS" ]]; then
  CURRENT_SCOPE=$(echo "$CURRENT_STATUS" | jq -r '.scope')
  CURRENT_ENABLED=$(echo "$CURRENT_STATUS" | jq -r '.enabled')
  CURRENT_VER=$(echo "$CURRENT_STATUS" | jq -r '.version')
  CURRENT_MCP_TYPE=$(echo "$CURRENT_STATUS" | jq -r '.mcpType')

  echo -e "  ${WHITE_BOLD}Current:${NC}"
  # Parse plugin ID: "mdt@markdown-ticket" -> "mdt" + "markdown-ticket"
  plugin_name="${PLUGIN_ID%@*}"
  plugin_market="${PLUGIN_ID#*@}"
  echo -e "    Plugin:     ${CYAN}${plugin_name}${NC}${GRAY}@${NC}${CYAN}${plugin_market}${NC}"

  # Only show version arrow if actually different
  if [[ "$CURRENT_VER" != "$PLUGIN_VERSION" && "$CURRENT_VER" != "unknown" ]]; then
    echo -e "    Version:    ${WHITE_BOLD}${CURRENT_VER}${NC} ${GRAY}→${NC} ${WHITE_BOLD}${PLUGIN_VERSION}${NC}"
  else
    echo -e "    Version:    ${WHITE_BOLD}${CURRENT_VER}${NC}"
  fi

  # Show MCP type with inline warning if changing
  if [[ "$CURRENT_MCP_TYPE" != "unknown" && "$CURRENT_MCP_TYPE" != "$TARGET_MCP_TYPE" ]]; then
    echo -e "    MCP:        ${YELLOW}⚠${NC} ${CYAN}${CURRENT_MCP_TYPE}${NC} ${GRAY}→${NC} ${CYAN}${TARGET_MCP_TYPE}${NC} ${GRAY}${MODE_LABEL}${NC}"
  else
    echo -e "    MCP:        ${CYAN}${CURRENT_MCP_TYPE}${NC}"
  fi

  echo -e "    Scope:      ${CYAN}${CURRENT_SCOPE}${NC}"
  if [[ "$CURRENT_ENABLED" = "true" ]]; then
    echo -e "    Status:     ${GREEN}Enabled${NC}"
  else
    echo -e "    Status:     ${RED}Disabled${NC}"
  fi

  # Show warnings for other differences (marketplace path)
  if [[ -n "$MARKETPLACE_PATH" && "$MARKETPLACE_PATH" != "$SCRIPT_DIR" ]]; then
    echo -e "  ${YELLOW}⚠ WARNINGS:${NC}"
    echo -e "    ${YELLOW}Marketplace path mismatch:${NC}"
    echo -e "      Current:  ${GRAY}${MARKETPLACE_PATH}${NC}"
    echo -e "      Target:   ${GRAY}${SCRIPT_DIR}${NC}"
  fi
else
  echo -e "  ${WHITE_BOLD}New Installation:${NC}"
  # Parse plugin ID
  plugin_name="${PLUGIN_ID%@*}"
  plugin_market="${PLUGIN_ID#*@}"
  echo -e "    Plugin:     ${CYAN}${plugin_name}${NC}${GRAY}@${NC}${CYAN}${plugin_market}${NC}"
  echo -e "    Version:    ${WHITE_BOLD}${PLUGIN_VERSION}${NC}"
  echo -e "    MCP:        ${CYAN}${TARGET_MCP_TYPE}${NC} ${GRAY}${MODE_LABEL}${NC}"

  if [[ -n "$MARKETPLACE_PATH" && "$MARKETPLACE_PATH" != "$SCRIPT_DIR" ]]; then
    echo -e "  ${YELLOW}⚠ WARNING: Marketplace path mismatch:${NC}"
    echo -e "    Current:  ${GRAY}${MARKETPLACE_PATH}${NC}"
    echo -e "    Target:   ${GRAY}${SCRIPT_DIR}${NC}"
  fi
fi

# In update mode, show additional summary
if [[ "$UPDATE_MODE" = true ]]; then
  echo ""
  print_highlight "Update Summary"
  echo -e "  ${WHITE_BOLD}Mode:${NC}        ${CYAN}update${NC}"
  echo -e "  ${WHITE_BOLD}Scope:${NC}       ${CYAN}${SCOPE}${NC}"
  echo -e "  ${WHITE_BOLD}MCP Server:${NC}  ${CYAN}${MODE}${NC}"
  echo -e "  ${WHITE_BOLD}Actions:${NC}"
  echo -e "    ${GRAY}•${NC} Update marketplace"
  echo -e "    ${GRAY}•${NC} Reinstall plugin in ${CYAN}${SCOPE}${NC} scope"
  if [[ "$CURRENT_ENABLED" != "true" ]]; then
    echo -e "    ${GRAY}•${NC} Enable plugin"
  fi
fi

# Confirm if plugin is already enabled
if [[ -n "$CURRENT_STATUS" && "$CURRENT_ENABLED" = "true" ]]; then
  if [[ "$AUTO_YES" = true ]]; then
    echo -e "${GRAY}Auto-confirming update...${NC}"
  else
    echo -n -e "${YELLOW}Proceed with update? [y/N]${NC} "
    read -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "Installation cancelled."
      exit 0
    fi
  fi
fi

# Step 1: Update/install marketplace first (plugin source)
echo ""
print_highlight "Marketplace Setup"

if [[ -n "$MARKETPLACE_STATUS" ]]; then
  echo -n "Updating marketplace... "
  if claude plugin marketplace update "$MARKETPLACE_NAME" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}!${NC}"
    echo -n "Re-installing marketplace... "
    claude plugin marketplace remove "$MARKETPLACE_NAME" &>/dev/null || true
    if claude plugin marketplace add "$SCRIPT_DIR" &>/dev/null; then
      echo -e "${GREEN}✓${NC}"
    else
      echo -e "${RED}✗${NC}"
      exit 1
    fi
  fi
else
  echo -n "Adding marketplace... "
  if claude plugin marketplace add "$SCRIPT_DIR" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    exit 1
  fi
fi

# Prompt for scope selection (skip if --scope was provided or in update mode)
if [[ -z "$SCOPE" ]]; then
  # In update mode, use current scope automatically
  if [[ "$UPDATE_MODE" = true && -n "$CURRENT_STATUS" ]]; then
    SCOPE="$CURRENT_SCOPE"
  # In skip-prompts mode with no current installation, default to user scope
  elif [[ "$SKIP_PROMPTS" = true ]]; then
    SCOPE="${CURRENT_SCOPE:-user}"
  else
    echo ""
    print_highlight "Installation Scope"

    # Determine default scope and highlight current
    if [[ -n "$CURRENT_STATUS" ]]; then
      DEFAULT_SCOPE="$CURRENT_SCOPE"
      DEFAULT_NUM="1"
      [[ "$DEFAULT_SCOPE" = "local" ]] && DEFAULT_NUM="2"

      # Highlight current scope with green checkmark
      if [[ "$DEFAULT_SCOPE" = "local" ]]; then
        echo -e "  [1] user   - Available to all projects (recommended)"
        echo -e "  [2] ${GREEN}✓${NC} local  - Available only to this project ${GRAY}(current)${NC}"
      else
        echo -e "  [1] ${GREEN}✓${NC} user   - Available to all projects (recommended) ${GRAY}(current)${NC}"
        echo -e "  [2] local  - Available only to this project"
      fi
    else
      DEFAULT_SCOPE="user"
      DEFAULT_NUM="1"
      echo -e "  [1] user   - Available to all projects (recommended)"
      echo -e "  [2] local  - Available only to this project"
    fi

    read -p "Enter scope [1/2] (default: ${DEFAULT_NUM} - ${DEFAULT_SCOPE}): " -r SCOPE_CHOICE

    case "$SCOPE_CHOICE" in
      2|local)
        SCOPE="local"
        ;;
      *)
        SCOPE="user"
        ;;
    esac
  fi
fi

# Track if scope changed
SCOPE_CHANGED=false
if [[ -n "$CURRENT_STATUS" && "$CURRENT_SCOPE" != "$SCOPE" ]]; then
  SCOPE_CHANGED=true
fi

# Handle scope change: uninstall from old scope first
if [[ "$SCOPE_CHANGED" = true ]]; then
  echo -e "${YELLOW}⚠ Scope change detected:${NC} ${CYAN}${CURRENT_SCOPE}${NC} → ${CYAN}${SCOPE}${NC}"
  echo -n "Uninstalling from ${CURRENT_SCOPE} scope... "
  if claude plugin uninstall "$PLUGIN_ID" --scope "$CURRENT_SCOPE" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${YELLOW}!${NC} (may not have been installed)"
  fi
fi

# Check if plugin is already installed in the selected scope
INSTALLED_IN_SCOPE=$(claude plugin list --json 2>/dev/null | jq -r ".[] | select(.id == \"$PLUGIN_ID\" and .scope == \"$SCOPE\") | .id")

if [[ "$SCOPE_CHANGED" = true ]]; then
  echo -n "Reinstalling plugin in ${SCOPE} scope... "
  if claude plugin install "$PLUGIN_ID" --scope "$SCOPE" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    exit 1
  fi
elif [[ -n "$INSTALLED_IN_SCOPE" ]]; then
  echo -n "Updating plugin in ${SCOPE} scope... "
  if claude plugin install "$PLUGIN_ID" --scope "$SCOPE" --reinstall &>/dev/null || \
     claude plugin install "$PLUGIN_ID" --scope "$SCOPE" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    exit 1
  fi
else
  echo -n "Installing plugin in ${SCOPE} scope... "
  if claude plugin install "$PLUGIN_ID" --scope "$SCOPE" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    exit 1
  fi
fi

# Prompt for enabling plugin
# Skip if already enabled AND scope didn't change
if [[ -z "$CURRENT_STATUS" || "$CURRENT_ENABLED" != "true" || "$SCOPE_CHANGED" = true ]]; then
  echo ""
  print_highlight "Enable Plugin"

  if [[ "$AUTO_YES" = true ]]; then
    echo -e "${GRAY}Auto-enabling plugin...${NC}"
  else
    echo -n -e "${YELLOW}Enable plugin now? [Y/n]${NC} "
    read -n 1 -r
    echo ""

    if [[ $REPLY =~ ^[Nn]$ ]]; then
      echo "Plugin installed but not enabled."
      echo ""
      echo "To enable later, run:"
      echo -e "  ${WHITE_BOLD}claude plugin enable $PLUGIN_ID --scope $SCOPE${NC}"
      exit 0
    fi
  fi

  echo -n "Enabling plugin... "
  if claude plugin enable "$PLUGIN_ID" --scope "$SCOPE" &>/dev/null; then
    echo -e "${GREEN}✓${NC}"
  else
    echo -e "${RED}✗${NC}"
    echo "You may enable it manually with:"
    echo -e "  ${WHITE_BOLD}claude plugin enable $PLUGIN_ID --scope $SCOPE${NC}"
  fi
fi

# Final status summary
echo ""
print_success "Installation complete!"

FINAL_STATUS=$(get_plugin_status)
if [[ -n "$FINAL_STATUS" ]]; then
  FINAL_SCOPE=$(echo "$FINAL_STATUS" | jq -r '.scope')
  FINAL_ENABLED=$(echo "$FINAL_STATUS" | jq -r '.enabled')

  # Parse plugin ID
  plugin_name="${PLUGIN_ID%@*}"
  plugin_market="${PLUGIN_ID#*@}"

  if [[ "$FINAL_ENABLED" = "true" ]]; then
    echo -e "  ${GREEN}✓${NC} ${CYAN}${plugin_name}${NC}${GRAY}@${NC}${CYAN}${plugin_market}${NC} ${WHITE_BOLD}v${PLUGIN_VERSION}${NC} ${GREEN}enabled${NC} in ${CYAN}${FINAL_SCOPE}${NC} scope"
  else
    echo -e "  ${GRAY}○${NC} ${CYAN}${plugin_name}${NC}${GRAY}@${NC}${CYAN}${plugin_market}${NC} ${WHITE_BOLD}v${PLUGIN_VERSION}${NC} installed in ${CYAN}${FINAL_SCOPE}${NC} scope (not enabled)"
  fi
else
  echo "  Could not verify final status. Please check with:"
  echo -e "  ${CYAN}claude plugin list${NC}"
  exit 1
fi

# Show available commands (dynamically from files)
echo ""
list_commands
echo "Management commands:"
echo -e "  ${GRAY}# Show all plugins${NC}"
echo -e "  ${WHITE_BOLD}claude plugin list${NC}"
echo -e "  ${GRAY}# Show plugin details${NC}"
echo -e "  ${WHITE_BOLD}claude plugin list --json | jq '.[] | select(.id == \"$PLUGIN_ID\")'${NC}"
echo -e "  ${GRAY}# Show marketplace info${NC}"
echo -e "  ${WHITE_BOLD}claude plugin marketplace list --json | jq '.[] | select(.name == \"$MARKETPLACE_NAME\")'${NC}"
echo -e "  ${GRAY}# Disable plugin${NC}"
echo -e "  ${WHITE_BOLD}claude plugin disable $PLUGIN_ID --scope $SCOPE${NC}"
echo -e "  ${GRAY}# Remove plugin${NC}"
echo -e "  ${WHITE_BOLD}claude plugin uninstall $PLUGIN_ID --scope $SCOPE${NC}"
