#!/usr/bin/env bash
set -euo pipefail

# MDT Agents Skills Installer
# ===========================
# Installs MDT skills for universal AI coding assistants via symlink or copy.
# Supports: Amp, Codex, Cursor, Gemini CLI, GitHub Copilot, Kimi Code CLI, OpenCode
#
# Usage: ./install-agents-skill.sh [--scope {user|local}] [--copy] [-y] [--mdt PATH] [--help]
#
# Flow:
# 1. Parse arguments and validate source directory
# 2. Check current installation status
# 3. Show installation summary
# 4. Confirm symlink vs copy preference
# 5. Create symlink or copy to target location
# 6. Show completion summary and supported tools

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

# Source directory is the mdt folder within this repo
SOURCE_DIR="$SCRIPT_DIR/mdt"

# Default scope (user = global, local = project)
SCOPE="user"

# Installation mode (symlink or copy)
USE_SYMLINK=true

# Auto-confirm flag
AUTO_YES=false

# Read version from plugin config
PLUGIN_VERSION=$(cat "$SOURCE_DIR/.claude-plugin/plugin.json" 2>/dev/null | jq -r '.version // "0.10.0"')

# Skill name for the target directory
SKILL_NAME="mdt"

# Supported tools list
declare -a SUPPORTED_TOOLS=(
  "Amp"
  "Codex"
  "Cursor"
  "Gemini CLI"
  "GitHub Copilot"
  "Kimi Code CLI"
  "OpenCode"
)

# Print functions
print_log() {
  echo -e "${GRAY}$1${NC}"
}

print_success() {
  echo -e "${GREEN}$1${NC}"
}

print_error() {
  echo -e "${RED}$1${NC}" >&2
}

print_question() {
  echo -e "${YELLOW}$1${NC}"
}

print_highlight() {
  echo -e "${WHITE_BOLD}$1${NC}"
}

# Show help message
show_help() {
  print_highlight "MDT Agents Skills Installer v${PLUGIN_VERSION}"
  echo ""
  echo "Installs MDT skills for universal AI coding assistants."
  echo ""
  echo "Supported tools: ${SUPPORTED_TOOLS[*]}"
  echo ""
  echo "Usage: $0 [--scope {user|local}] [--copy] [-y] [--mdt PATH] [--help]"
  echo ""
  echo "Options:"
  echo "  --scope user   Install globally to ~/.agents/skills/ (default)"
  echo "  --scope local  Install to project's .agents/skills/"
  echo "  --copy         Copy files instead of creating symlink"
  echo "  -y             Auto-confirm all prompts"
  echo "  --mdt PATH     Path to mdt-prompts directory (default: script location)"
  echo "  --help, -h     Show this help message"
  echo ""
  echo "Environment:"
  echo "  MDT_DIR       Path to markdown-ticket folder (for MCP server location)"
  echo ""
  echo "Examples:"
  echo "  $0                          # Global symlink to ~/.agents/skills/mdt"
  echo "  $0 --scope local            # Project symlink to .agents/skills/mdt"
  echo "  $0 --copy                   # Global copy instead of symlink"
  echo "  $0 --scope local --copy -y  # Unattended project copy"
  exit 0
}

# Show error and usage
show_error() {
  print_error "Error: $1"
  echo ""
  echo "Usage: $0 [--scope {user|local}] [--copy] [-y] [--mdt PATH]"
  echo ""
  echo "Run '$0 --help' for more information."
  exit 1
}

# Expand combined short flags
expand_short_flags() {
  local -a expanded=()
  for arg in "$@"; do
    if [[ "$arg" =~ ^-[a-zA-Z]+$ && ! "$arg" =~ ^--[a-zA-Z] ]]; then
      local flags="${arg#-}"
      local i=0
      while [[ $i -lt ${#flags} ]]; do
        expanded+=("-${flags:$i:1}")
        ((i++))
      done
    else
      expanded+=("$arg")
    fi
  done
  echo "${expanded[@]}"
}

# Parse arguments
args=$(expand_short_flags "$@")
eval set -- $args

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)
      show_help
      ;;
    --scope)
      if [[ -z "${2:-}" ]]; then
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
    --copy)
      USE_SYMLINK=false
      shift
      ;;
    -y)
      AUTO_YES=true
      shift
      ;;
    --mdt)
      if [[ -z "${2:-}" ]]; then
        show_error "--mdt requires a path"
      fi
      # Expand ~ to $HOME and resolve path
      local mdt_path
      mdt_path="$(eval echo "$2")"
      SCRIPT_DIR="$(cd "$mdt_path" && pwd)"
      SOURCE_DIR="$SCRIPT_DIR/mdt"
      shift 2
      ;;
    --)
      shift
      break
      ;;
    *)
      show_error "Invalid option: $1

Valid options are: --scope, --copy, -y, --mdt, --help"
      ;;
  esac
done

# Determine target path based on scope
if [[ "$SCOPE" = "user" ]]; then
  TARGET_BASE="$HOME/.agents/skills"
  SCOPE_LABEL="global"
else
  TARGET_BASE=".agents/skills"
  SCOPE_LABEL="project"
fi
TARGET_PATH="$TARGET_BASE/$SKILL_NAME"

# Validate source directory
if [[ ! -d "$SOURCE_DIR" ]]; then
  show_error "Source directory not found: $SOURCE_DIR

Make sure the mdt folder exists in the installation directory."
fi

# Check for required commands
if [[ "$USE_SYMLINK" = false ]]; then
  if ! command -v cp &>/dev/null; then
    print_error "Required command not found: cp"
    exit 1
  fi
fi

# Header
print_highlight "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_highlight "MDT Agents Skills Installer v${PLUGIN_VERSION}"
print_highlight "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check current installation status
CURRENT_STATUS="none"
CURRENT_TARGET=""
CURRENT_SYMLINK=false

if [[ -L "$TARGET_PATH" ]]; then
  CURRENT_STATUS="symlink"
  CURRENT_TARGET="$(readlink "$TARGET_PATH" 2>/dev/null || echo "unknown")"
  CURRENT_SYMLINK=true
elif [[ -d "$TARGET_PATH" ]]; then
  CURRENT_STATUS="directory"
  CURRENT_TARGET="$TARGET_PATH"
elif [[ -f "$TARGET_PATH" ]]; then
  CURRENT_STATUS="file"
  CURRENT_TARGET="$TARGET_PATH"
fi

# Show installation summary
print_highlight "Installation Summary"
echo ""

echo -e "  ${WHITE_BOLD}Source:${NC}     ${CYAN}${SOURCE_DIR}${NC}"
echo -e "  ${WHITE_BOLD}Target:${NC}     ${CYAN}${TARGET_PATH}${NC}"
echo -e "  ${WHITE_BOLD}Scope:${NC}      ${CYAN}${SCOPE}${NC} ${GRAY}(${SCOPE_LABEL})${NC}"
echo -e "  ${WHITE_BOLD}Method:${NC}     ${CYAN}$([ "$USE_SYMLINK" = true ] && echo "symlink" || echo "copy")${NC}"

if [[ "$CURRENT_STATUS" != "none" ]]; then
  echo ""
  echo -e "  ${YELLOW}⚠ Existing installation detected:${NC}"
  case "$CURRENT_STATUS" in
    symlink)
      echo -e "    Type:     Symlink"
      echo -e "    Points to: ${GRAY}${CURRENT_TARGET}${NC}"
      if [[ "$CURRENT_TARGET" = "$SOURCE_DIR" ]]; then
        echo -e "    ${GREEN}✓ Already linked to source${NC}"
      else
        echo -e "    ${YELLOW}⚠ Points to different source${NC}"
      fi
      ;;
    directory)
      echo -e "    Type:     Directory (not symlink)"
      ;;
    file)
      echo -e "    Type:     File (unexpected)"
      ;;
  esac
fi

# Ask for symlink preference (if not already decided via --copy)
if [[ "$USE_SYMLINK" = true && "$AUTO_YES" = false ]]; then
  echo ""
  echo -e "  ${GRAY}(symlink is recommended - updates automatically)${NC}"
  print_question "Use symlink? [Y/n]"
  read -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    USE_SYMLINK=false
    print_log "Will copy files instead."
  fi
fi

# Confirm installation if target exists
if [[ "$CURRENT_STATUS" != "none" && "$AUTO_YES" = false ]]; then
  echo ""
  if [[ "$CURRENT_STATUS" = "symlink" && "$CURRENT_TARGET" = "$SOURCE_DIR" && "$USE_SYMLINK" = true ]]; then
    print_question "Re-link existing symlink? [y/N]"
  else
    print_question "Replace existing installation? [y/N]"
  fi
  read -n 1 -r
  echo ""
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Installation cancelled."
    exit 0
  fi
fi

# Create target base directory if needed
if [[ ! -d "$TARGET_BASE" ]]; then
  print_log "Creating directory: $TARGET_BASE"
  mkdir -p "$TARGET_BASE"
fi

# Remove existing installation
if [[ "$CURRENT_STATUS" != "none" ]]; then
  print_log "Removing existing installation..."
  rm -rf "$TARGET_PATH"
fi

# Install (symlink or copy)
echo ""
print_highlight "Installation"

if [[ "$USE_SYMLINK" = true ]]; then
  print_log "Creating symlink..."
  ln -s "$SOURCE_DIR" "$TARGET_PATH"
  print_success "✓ Symlink created"
else
  print_log "Copying files..."
  cp -R "$SOURCE_DIR" "$TARGET_PATH"
  print_success "✓ Files copied"
fi

# Verify installation
if [[ ! -e "$TARGET_PATH" ]]; then
  print_error "Installation verification failed!"
  echo "Target path does not exist: $TARGET_PATH"
  exit 1
fi

# Show supported tools
echo ""
print_highlight "Supported Tools"
echo ""
for tool in "${SUPPORTED_TOOLS[@]}"; do
  echo -e "  ${GREEN}✓${NC} ${tool}"
done

# Show completion summary
echo ""
print_success "Installation complete!"
echo ""

if [[ "$USE_SYMLINK" = true ]]; then
  echo -e "  ${GREEN}✓${NC} ${CYAN}${SKILL_NAME}${NC} ${WHITE_BOLD}v${PLUGIN_VERSION}${NC} symlinked to ${CYAN}${SCOPE}${NC} ${GRAY}(${SCOPE_LABEL})${NC}"
  echo ""
  echo -e "  ${GRAY}Symlink:${NC} ${TARGET_PATH}"
  echo -e "  ${GRAY}Source:${NC}  ${SOURCE_DIR}"
  echo ""
  echo -e "  ${GRAY}Note: Updates to source will be immediately available.${NC}"
else
  echo -e "  ${GREEN}✓${NC} ${CYAN}${SKILL_NAME}${NC} ${WHITE_BOLD}v${PLUGIN_VERSION}${NC} copied to ${CYAN}${SCOPE}${NC} ${GRAY}(${SCOPE_LABEL})${NC}"
  echo ""
  echo -e "  ${GRAY}Location:${NC} ${TARGET_PATH}"
  echo ""
  echo -e "  ${GRAY}Note: Run installer again to update copied files.${NC}"
fi

# Calculate MCP server path
# Use MDT_DIR env var if set, otherwise relative to script
if [[ -n "${MDT_DIR:-}" ]]; then
  MCP_SERVER_PATH="$MDT_DIR/mcp-server/dist/index.js"
else
  MCP_SERVER_PATH="$SCRIPT_DIR/../mcp-server/dist/index.js"
fi

# Verify MCP server exists
if [[ ! -f "$MCP_SERVER_PATH" ]]; then
  MCP_SERVER_PATH=""
fi

# Show usage hint
echo ""
print_highlight "Next Steps"
echo ""
echo -e "  ${GRAY}1. Restart your AI coding assistant if running${NC}"
echo -e "  ${GRAY}2. The ${CYAN}/mdt${NC} skill should be available${NC}"
echo ""
echo "  Examples:"
echo -e "    ${WHITE_BOLD}/mdt architecture${NC}"
echo -e "    ${WHITE_BOLD}/mdt ticket-creation${NC}"
echo -e "    ${GRAY}Alternative: \"create a ticket\" (natural language)${NC}"
echo ""

# MCP Server Setup
if [[ -z "$MCP_SERVER_PATH" ]]; then
  echo ""
  print_highlight "MCP Server"
  echo ""
  echo -e "  ${YELLOW}⚠ MCP server not found${NC}"
  echo ""
  echo "  Expected: \$SCRIPT_DIR/../mcp-server/dist/index.js"
  echo ""
  echo "  Set MDT_DIR to specify markdown-ticket location:"
  echo -e "    ${WHITE_BOLD}MDT_DIR=/path/to/markdown-ticket $0${NC}"
  echo ""
  echo -e "  ${GRAY}See INSTALL.md for MCP setup instructions.${NC}"
  echo ""
elif [[ -n "$MCP_SERVER_PATH" && -f "$MCP_SERVER_PATH" ]]; then
  print_highlight "MCP Server Setup"
  echo ""
  echo -e "  ${WHITE_BOLD}Server:${NC}   ${CYAN}${MCP_SERVER_PATH}${NC}"
  echo ""
  echo "  Codex:"
  echo -e "    ${WHITE_BOLD}codex mcp add mdt-all node ${MCP_SERVER_PATH}${NC}"
  echo ""
  echo "  OpenCode:"
  echo -e "    ${WHITE_BOLD}opencode mcp add${NC} ${GRAY}(interactive mode)${NC}"
  echo ""
  echo "  Cursor:"
  echo -e "    ${WHITE_BOLD}# Add to .cursor/mcp.json or settings${NC}"
  echo ""
  echo "  Claude Code:"
  echo -e "    ${WHITE_BOLD}./install-plugin.sh --local${NC} ${GRAY}(includes MCP setup)${NC}"
  echo ""
  echo -e "  ${GRAY}See INSTALL.md for full MCP documentation.${NC}"
  echo ""
  print_highlight "MCP Config (JSON)"
  echo ""
  echo -e "  ${GRAY}# For tools that use JSON config:${NC}"
  echo ""
  echo '  {'
  echo '    "mcpServers": {'
  echo '      "mdt-all": {'
  echo '        "command": "node",'
  echo "        \"args\": [\"${MCP_SERVER_PATH}\"]"
  echo '      }'
  echo '    }'
  echo '  }'
  echo ""
fi

echo "Management commands:"
echo -e "  ${GRAY}# Verify installation${NC}"
echo -e "  ${WHITE_BOLD}ls -la ${TARGET_PATH}${NC}"
if [[ "$USE_SYMLINK" = true ]]; then
  echo -e "  ${GRAY}# Remove symlink${NC}"
  echo -e "  ${WHITE_BOLD}rm ${TARGET_PATH}${NC}"
else
  echo -e "  ${GRAY}# Remove installation${NC}"
  echo -e "  ${WHITE_BOLD}rm -rf ${TARGET_PATH}${NC}"
fi
echo -e "  ${GRAY}# Update (copy mode only)${NC}"
echo -e "  ${WHITE_BOLD}$0 --scope ${SCOPE}$([ "$USE_SYMLINK" = false ] && echo " --copy")${NC}"
