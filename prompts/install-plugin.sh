#!/bin/bash
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root is one level up from the script (prompts/ -> markdown-ticket/)
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

MCP_SERVER_LOCAL="$PROJECT_ROOT/mcp-server/dist/index.js"
MCP_SERVER_DOCKER_URL="http://localhost:3012/mcp"

MODE=""
MCP_JSON_FILE="$SCRIPT_DIR/mdt/.mcp.json"

show_error() {
  echo "Error: $1" >&2
  echo ""
  echo "Usage: $0 --local|--docker" >&2
  echo "" >&2
  echo "Options:" >&2
  echo "  --local    Use local Node.js MCP server at: \$PROJECT_ROOT/mcp-server/dist/index.js" >&2
  echo "  --docker   Use Docker MCP server via HTTP at: $MCP_SERVER_DOCKER_URL" >&2
  echo "" >&2
  echo "Generated file: $MCP_JSON_FILE" >&2
  exit 1
}

# Parse arguments
if [[ $# -ne 1 ]]; then
  show_error "Missing required argument. Specify --local or --docker."
fi

case "$1" in
  --local)
    MODE="local"
    if [[ ! -f "$MCP_SERVER_LOCAL" ]]; then
      show_error "MCP server not found at: $MCP_SERVER_LOCAL

Run 'npm run build' in the mcp-server directory first."
    fi
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
    echo "Generated .mcp.json for LOCAL mode (Node.js: $MCP_SERVER_LOCAL)"
    ;;
  --docker)
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
    echo "Generated .mcp.json for DOCKER mode (HTTP: $MCP_SERVER_DOCKER_URL)"
    ;;
  *)
    show_error "Invalid option: $1

Valid options are: --local, --docker"
    ;;
esac

# Remove existing marketplace if present
echo ""
echo "Removing existing marketplace (if any)..."
claude plugin marketplace remove markdown-ticket 2>/dev/null || true

# Run the marketplace add command
echo "Installing plugin from marketplace..."
claude plugin marketplace add "$SCRIPT_DIR/mdt"
