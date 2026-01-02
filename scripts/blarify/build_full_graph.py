#!/usr/bin/env python3
"""Build FULL graph (with imports/usage) for markdown-ticket project"""
import argparse
from blarify.prebuilt.graph_builder import GraphBuilder
from blarify.repositories.graph_db_manager.neo4j_manager import Neo4jManager
import os

# Parse arguments
parser = argparse.ArgumentParser(description='Build FULL code graph with imports & usage')
parser.add_argument('--rebuild', action='store_true', help='Clear database before building')
args = parser.parse_args()

# Database config
db_manager = Neo4jManager(
    repo_id='markdown-ticket',
    entity_id='kirby'
)

# Clear database if --rebuild flag
if args.rebuild:
    print("🗑️ Clearing existing graph...")
    db_manager.query('MATCH (n) DETACH DELETE n')
    print("✅ Cleared\n")

# Get project root
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# === WHITELIST ===
SCAN_DIRS = ['src', 'tests', 'server', 'mcp-server', 'domain-contracts', 'shared']
ALLOWED_EXTENSIONS = {'.ts', '.tsx', '.test.ts', '.spec.ts'}
ALL_COMMON_EXTENSIONS = ['.js', '.cjs', '.mjs', '.d.ts', '.d.map', '.map', '.md', '.txt', '.json', '.yaml', '.yml', '.css', '.scss', '.svg', '.png', '.sh', '.py', '.go', '.rs']
extensions_to_skip = [ext for ext in ALL_COMMON_EXTENSIONS if ext not in ALLOWED_EXTENSIONS]
ALL_DIRS = set(os.listdir(root_path))
names_to_skip = [d for d in ALL_DIRS if d not in SCAN_DIRS and os.path.isdir(os.path.join(root_path, d))]
names_to_skip.extend(['node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report'])

print("=" * 60)
print("📂 FULL GRAPH BUILD (with imports & usage)")
print("=" * 60)
print(f"Root: {root_path}")
print(f"Directories: {', '.join(SCAN_DIRS)}")
print(f"File types: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
print("⚠️  Building with only_hierarchy=False")
print("    This will include: IMPORTS, REFERENCES, USAGE relationships")
print("=" * 60)

builder = GraphBuilder(
    root_path=root_path,
    db_manager=db_manager,
    extensions_to_skip=extensions_to_skip,
    names_to_skip=names_to_skip,
    only_hierarchy=False  # ← KEY CHANGE: FALSE for full graph
)

print("⏳ Building FULL graph...\n")
graph = builder.build(save_to_db=False)
nodes = graph.get_nodes_as_objects()
relationships = graph.get_relationships_as_objects()

print(f"\n✅ Built: {len(nodes):,} nodes, {len(relationships):,} relationships")

# Show relationship types
rel_types = {}
for r in relationships:
    rel_type = r.get('type_name') if isinstance(r, dict) else r.type_name
    if rel_type:
        rel_types[rel_type] = rel_types.get(rel_type, 0) + 1

print("\n📊 Relationship types:")
for rel_type, count in sorted(rel_types.items(), key=lambda x: -x[1]):
    print(f"  {rel_type}: {count:,}")

# Save to DB
print("\n💾 Saving to Neo4j...")
db_manager.save_graph(nodes, relationships)
print("✅ Saved to database")

db_manager.close()
print("\n✅ All done!")
print("\n🔍 You can now query for:")
print("  • Files importing Ticket: MATCH (f:FILE)-[:IMPORTS]->(t {name: 'Ticket'})")
print("  • Usage of Ticket: MATCH (u)-[:USES]->(t {name: 'Ticket'})")
