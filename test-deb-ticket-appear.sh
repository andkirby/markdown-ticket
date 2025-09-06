#!/bin/bash

# Test script for DEB ticket realtime sync
# Tests file creation, modification, and deletion

TICKET_FILE="debug-tasks/DEB-999-test.md"

# Cleanup function
cleanup() {
    echo
    echo "🧹 Cleaning up..."
    if [[ -f "$TICKET_FILE" ]]; then
        rm -f "$TICKET_FILE"
        echo "✅ Deleted $TICKET_FILE"
    fi
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM EXIT

test_cycle() {
    echo "=== Starting test cycle ==="
    
    # Step 1: Create ticket file
    echo "Step 1: Creating ticket file..."
    cat > "$TICKET_FILE" << 'EOF'
---
code: DEB-999
title: Test ticket for realtime sync
status: Proposed
dateCreated: $(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ")
type: Bug Fix
priority: Medium
---

# Test ticket for realtime sync

## 1. Description

### Problem Statement
This is a test ticket to verify realtime sync functionality.

### Current State
Testing file creation detection

### Desired State
Ticket should appear automatically in frontend

### Rationale
Verify realtime file watching works correctly

## 2. Solution Analysis
*To be filled during implementation*

## 3. Implementation Specification
*To be filled during implementation*

## 4. Acceptance Criteria
*To be filled during implementation*

## 5. Implementation Notes
*To be filled during/after implementation*

## 6. References
*To be filled during implementation*
EOF
    
    echo "✅ Created $TICKET_FILE"
    echo "👀 Check if DEB-999 appears in frontend..."
    read -p "Press any key to continue..." -n1 -s
    echo
    
    # Step 2: Modify ticket status
    echo "Step 2: Changing status to 'In Progress'..."
    sed -i '' 's/status: Proposed/status: In Progress/' "$TICKET_FILE"
    echo "✅ Changed status to 'In Progress'"
    echo "👀 Check if DEB-999 status updates in frontend..."
    read -p "Press any key to continue..." -n1 -s
    echo
    
    # Step 3: Delete ticket file
    echo "Step 3: Deleting ticket file..."
    rm -f "$TICKET_FILE"
    echo "✅ Deleted $TICKET_FILE"
    echo "👀 Check if DEB-999 disappears from frontend..."
    echo
}

# Main loop
while true; do
    test_cycle
    
    echo -n "Run again? (y/N): "
    read answer
    
    if [[ "$answer" != "y" && "$answer" != "Y" ]]; then
        echo "Test completed."
        break
    fi
    
    echo
done

# Disable cleanup trap since we're exiting normally
trap - EXIT
