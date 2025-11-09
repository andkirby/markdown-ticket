#!/bin/bash
# scripts/init-config.sh
# Initialize markdown-ticket global configuration
# Runs once before backend and MCP server start

set -e  # Exit on any error

CONFIG_DIR="${MDT_CONFIG_DIR:-/config/markdown-ticket}"
INITIALIZED_MARKER="$CONFIG_DIR/.initialized"

echo "🔧 Checking markdown-ticket configuration..."

# Simple existence check - no locking needed with init container
if [ -f "$INITIALIZED_MARKER" ]; then
    echo "ℹ️  Configuration already exists - skipping initialization"
    echo "   Config dir: $CONFIG_DIR"
    exit 0
fi

echo "📁 Creating configuration directories..."
mkdir -p "$CONFIG_DIR"/{projects,templates}

# Copy default global config
if [ ! -f "$CONFIG_DIR/config.toml" ]; then
    echo "📝 Creating global config..."
    if [ -f "/app/config-templates/global-config.toml" ]; then
        cp /app/config-templates/global-config.toml "$CONFIG_DIR/config.toml"
        echo "   ✅ Global config created from template"
    else
        # Fallback minimal config
        cat > "$CONFIG_DIR/config.toml" << 'EOF'
# Markdown Ticket Global Configuration
# Auto-generated fallback config

[dashboard]
port = 3002
autoRefresh = true
refreshInterval = 5000

[discovery]
autoDiscover = true
searchPaths = []

[server]
logLevel = "info"
EOF
        echo "   ✅ Global config created (fallback)"
    fi
else
    echo "   ℹ️  Global config already exists"
fi

# Copy default templates
TEMPLATES_CREATED=false
if [ -d "/app/config-templates/templates" ] && [ "$(ls -A /app/config-templates/templates 2>/dev/null)" ]; then
    if [ ! -d "$CONFIG_DIR/templates" ] || [ -z "$(ls -A "$CONFIG_DIR/templates" 2>/dev/null)" ]; then
        echo "📋 Creating default templates..."
        mkdir -p "$CONFIG_DIR/templates"
        cp /app/config-templates/templates/* "$CONFIG_DIR/templates/" 2>/dev/null && TEMPLATES_CREATED=true
    fi
fi

if [ "$TEMPLATES_CREATED" = true ]; then
    TEMPLATE_COUNT=$(ls -1 "$CONFIG_DIR/templates" 2>/dev/null | wc -l)
    echo "   ✅ Created $TEMPLATE_COUNT template(s)"
else
    echo "   ℹ️  Templates already exist or no templates to copy"
fi

# Mark as initialized with timestamp
echo "$(date -Iseconds)" > "$INITIALIZED_MARKER"
echo "✅ Configuration initialized successfully"
echo "   Location: $CONFIG_DIR"
echo "   Timestamp: $(date)"