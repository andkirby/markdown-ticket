#!/bin/bash
# Rebuild graph with clean database
set -e

NEO4J_CONTAINER="neo4j-blarify"
NEO4J_USER="neo4j"
NEO4J_PASS="qweqwe123"
PYTHON_BIN="$HOME/.config/blarify/bin/python"
BUILD_SCRIPT="$HOME/home/markdown-ticket/scripts/blarify/build_graph.py"

echo "================================================"
echo "🔄 Clean Graph Rebuild"
echo "================================================"

# Run build with --rebuild flag
echo ""
$PYTHON_BIN $BUILD_SCRIPT --rebuild

# Verify
echo ""
echo "📊 Verifying..."
RESULT=$(docker exec ${NEO4J_CONTAINER} cypher-shell -u ${NEO4J_USER} -p ${NEO4J_PASS} "MATCH (n) RETURN count(n)" 2>/dev/null | tail -1)
echo "✅ Database now has ${RESULT} nodes"

echo ""
echo "================================================"
echo "✅ Rebuild complete!"
echo "================================================"
