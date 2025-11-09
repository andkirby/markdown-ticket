#!/usr/bin/env bash

# MCP Container Health Check
# Tests MCP server connectivity from within Docker containers

set -e

TIMEOUT=10
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
MCP_SERVICE="${MCP_SERVICE:-mcp}"
MCP_PORT="${MCP_PORT:-3002}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}✓${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    log_error "docker-compose not found. Please install Docker Compose."
    exit 1
fi

# Check if compose file exists
if [ ! -f "$COMPOSE_FILE" ]; then
    log_error "Docker Compose file not found: $COMPOSE_FILE"
    exit 1
fi

echo "🔍 MCP Container Health Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Get MCP service container name
CONTAINER_NAME=$(docker-compose -f "$COMPOSE_FILE" ps -q "$MCP_SERVICE" 2>/dev/null)

if [ -z "$CONTAINER_NAME" ]; then
    log_error "MCP service '$MCP_SERVICE' is not running"
    echo ""
    echo "Available services:"
    docker-compose -f "$COMPOSE_FILE" ps --services
    exit 1
fi

log_info "Found MCP container: $CONTAINER_NAME"

# Check if container is running
CONTAINER_STATUS=$(docker inspect -f '{{.State.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "not found")

if [ "$CONTAINER_STATUS" != "running" ]; then
    log_error "Container status: $CONTAINER_STATUS"
    exit 1
fi

log_info "Container status: running"

# Get the internal network URL
# In docker-compose, services can access each other by service name
MCP_URL="http://${MCP_SERVICE}:${MCP_PORT}"

echo ""
echo "Testing MCP HTTP endpoint..."
echo "URL: $MCP_URL"
echo ""

# Test 1: Health check endpoint from another container
log_info "Test 1: Health check endpoint"

HEALTH_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
    "wget -q -O - --timeout=$TIMEOUT ${MCP_URL}/health 2>&1" || echo "ERROR")

if echo "$HEALTH_RESPONSE" | grep -q '"status".*"ok"'; then
    log_info "Health endpoint returned: ok"
    echo "$HEALTH_RESPONSE" | head -n 3
else
    log_error "Health check failed or timed out"
    echo "$HEALTH_RESPONSE"
    exit 1
fi

echo ""

# Test 2: MCP JSON-RPC initialize request
log_info "Test 2: MCP initialize request"

INIT_REQUEST='{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"health-check","version":"1.0.0"}}}'

INIT_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
    "wget -q -O - --timeout=$TIMEOUT --header='Content-Type: application/json' --post-data='$INIT_REQUEST' ${MCP_URL}/mcp 2>&1" || echo "ERROR")

if echo "$INIT_RESPONSE" | grep -q '"result"'; then
    log_info "Initialize request successful"

    # Extract server info
    SERVER_NAME=$(echo "$INIT_RESPONSE" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
    SERVER_VERSION=$(echo "$INIT_RESPONSE" | grep -o '"version":"[^"]*"' | head -1 | cut -d'"' -f4)

    if [ -n "$SERVER_NAME" ]; then
        echo "  Server: $SERVER_NAME v$SERVER_VERSION"
    fi
else
    log_error "Initialize request failed"
    echo "$INIT_RESPONSE"
    exit 1
fi

echo ""

# Test 3: List tools
log_info "Test 3: List available tools"

TOOLS_REQUEST='{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'

TOOLS_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
    "wget -q -O - --timeout=$TIMEOUT --header='Content-Type: application/json' --post-data='$TOOLS_REQUEST' ${MCP_URL}/mcp 2>&1" || echo "ERROR")

if echo "$TOOLS_RESPONSE" | grep -q '"tools"'; then
    TOOL_COUNT=$(echo "$TOOLS_RESPONSE" | grep -o '"name":"[^"]*"' | wc -l)
    log_info "Tools endpoint returned $TOOL_COUNT tools"

    # List first 5 tools
    echo ""
    echo "Sample tools:"
    echo "$TOOLS_RESPONSE" | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -5 | while read tool; do
        echo "  • $tool"
    done
else
    log_warning "Tools list request had unexpected response"
    echo "$TOOLS_RESPONSE" | head -n 5
fi

echo ""

# Test 4: List available projects
log_info "Test 4: Listing available projects"

LIST_PROJECTS_REQUEST='{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"list_projects","arguments":{}}}'

PROJECTS_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
    "wget -q -O - --timeout=$TIMEOUT --header='Content-Type: application/json' --post-data='$LIST_PROJECTS_REQUEST' ${MCP_URL}/mcp 2>&1" || echo "ERROR")

if echo "$PROJECTS_RESPONSE" | grep -q '"result"'; then
    # Extract and display projects
    PROJECT_COUNT=$(echo "$PROJECTS_RESPONSE" | grep -o '"code":"[^"]*"' | wc -l)
    log_info "Found $PROJECT_COUNT project(s)"

    if [ "$PROJECT_COUNT" -gt 0 ]; then
        echo ""
        echo "Available projects:"
        echo "$PROJECTS_RESPONSE" | grep -o '"code":"[^"]*"' | cut -d'"' -f4 | while read project_code; do
            # Try to get project name too
            PROJECT_NAME=$(echo "$PROJECTS_RESPONSE" | grep -A2 "\"code\":\"$project_code\"" | grep -o '"name":"[^"]*"' | head -1 | cut -d'"' -f4)
            if [ -n "$PROJECT_NAME" ]; then
                echo "  • $project_code - $PROJECT_NAME"
            else
                echo "  • $project_code"
            fi
        done
    fi
else
    log_warning "Failed to list projects"
    echo "$PROJECTS_RESPONSE" | head -n 3
fi

echo ""

# Test 5: Check for DEB project and test CRUD operations
log_info "Test 5: Checking for DEB project"

if echo "$PROJECTS_RESPONSE" | grep -q '"code":"DEB"'; then
    log_info "Found DEB project - testing CRUD operations"

    echo ""
    echo "  → Creating test ticket..."

    # Create a test ticket
    CREATE_CR_REQUEST='{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"create_cr","arguments":{"project":"DEB","type":"Bug Fix","data":{"title":"Health Check Test Ticket","priority":"Low","content":"This is a test ticket created by the health check script. It will be deleted automatically."}}}}'

    CREATE_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
        "wget -q -O - --timeout=$TIMEOUT --header='Content-Type: application/json' --post-data='$CREATE_CR_REQUEST' ${MCP_URL}/mcp 2>&1" || echo "ERROR")

    if echo "$CREATE_RESPONSE" | grep -q '"result"'; then
        # Extract CR key from response
        CR_KEY=$(echo "$CREATE_RESPONSE" | grep -o '"code":"DEB-[0-9]*"' | head -1 | cut -d'"' -f4)

        if [ -n "$CR_KEY" ]; then
            log_info "Created ticket: $CR_KEY"

            echo "  → Deleting test ticket..."

            # Delete the test ticket
            DELETE_CR_REQUEST="{\"jsonrpc\":\"2.0\",\"id\":5,\"method\":\"tools/call\",\"params\":{\"name\":\"delete_cr\",\"arguments\":{\"project\":\"DEB\",\"key\":\"$CR_KEY\"}}}"

            DELETE_RESPONSE=$(docker-compose -f "$COMPOSE_FILE" exec -T frontend sh -c \
                "wget -q -O - --timeout=$TIMEOUT --header='Content-Type: application/json' --post-data='$DELETE_CR_REQUEST' ${MCP_URL}/mcp 2>&1" || echo "ERROR")

            if echo "$DELETE_RESPONSE" | grep -q '"result"'; then
                log_info "Deleted ticket: $CR_KEY"
                log_info "CRUD operations test passed!"
            else
                log_warning "Failed to delete test ticket: $CR_KEY"
                echo "$DELETE_RESPONSE" | head -n 3
            fi
        else
            log_warning "Could not extract CR key from create response"
            echo "$CREATE_RESPONSE" | head -n 3
        fi
    else
        log_warning "Failed to create test ticket"
        echo "$CREATE_RESPONSE" | head -n 3
    fi
else
    log_info "DEB project not found - skipping CRUD test"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
log_info "All health checks passed!"
echo ""
echo "MCP server is accessible at: $MCP_URL"
echo "Container: $CONTAINER_NAME"
echo ""

exit 0
