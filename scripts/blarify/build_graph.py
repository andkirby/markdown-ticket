#!/usr/bin/env python3
"""Build graph for markdown-ticket project - whitelist specific dirs & filetypes"""
import argparse
from blarify.prebuilt.graph_builder import GraphBuilder
from blarify.repositories.graph_db_manager.neo4j_manager import Neo4jManager
import os

# Parse arguments
parser = argparse.ArgumentParser(description='Build code graph for markdown-ticket')
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

# Get project root (parent of scripts/ directory)
root_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# === WHITELIST ===
# Directories to scan
SCAN_DIRS = ['src', 'tests', 'server', 'mcp-server', 'domain-contracts', 'shared']

# File extensions to INCLUDE (whitelist)
ALLOWED_EXTENSIONS = {
    '.ts',      # TypeScript source
    '.tsx',     # React components
    '.test.ts', # Unit tests
    '.spec.ts', # E2E/integration specs
    # .js - excluded (compiled/generated in TS projects)
    # .cjs - excluded (mostly config/build files)
    # .mjs - excluded (mostly config/build files)
}

# All common extensions to SKIP (except whitelist)
ALL_COMMON_EXTENSIONS = [
    # Generated/compiled JavaScript
    '.js', '.cjs', '.mjs', '.d.ts', '.d.map', '.map', '.js.flow',
    # Non-code
    '.md', '.txt', '.log', '.rst',
    # Config/data
    '.json', '.yaml', '.yml', '.toml', '.ini', '.xml',
    # Styles
    '.css', '.scss', '.sass', '.less', '.styl',
    # Assets
    '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot',
    # Scripts/system
    '.sh', '.bat', '.ps1', '.dockerfile', 'Dockerfile',
    # Config files (no extension)
    '.gitignore', '.dockerignore', '.prettierignore', '.env', '.env.example',
    # Other languages
    '.py', '.rb', '.go', '.rs', '.java', '.cpp', '.c', '.h', '.php', '.kt', '.swift',
]

# Create skip list: everything NOT in whitelist
extensions_to_skip = [ext for ext in ALL_COMMON_EXTENSIONS if ext not in ALLOWED_EXTENSIONS]

# Directories to SKIP (everything except SCAN_DIRS)
ALL_DIRS = set(os.listdir(root_path))
names_to_skip = [d for d in ALL_DIRS if d not in SCAN_DIRS and os.path.isdir(os.path.join(root_path, d))]
names_to_skip.extend(['node_modules', 'dist', '.git', 'coverage', 'test-results', 'playwright-report'])

print("=" * 60)
print("📂 Graph Build Configuration")
print("=" * 60)
print(f"Root: {root_path}")
print(f"Directories: {', '.join(SCAN_DIRS)}")
print(f"File types: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
print(f"Skipping: {len(names_to_skip)} directories, {len(extensions_to_skip)} file types")
print("=" * 60)

builder = GraphBuilder(
    root_path=root_path,
    db_manager=db_manager,
    extensions_to_skip=extensions_to_skip,
    names_to_skip=names_to_skip,
    only_hierarchy=True
)

print("⏳ Building graph...\n")
graph = builder.build(save_to_db=False)
nodes = graph.get_nodes_as_objects()
relationships = graph.get_relationships_as_objects()

print(f"\n✅ Built: {len(nodes):,} nodes, {len(relationships):,} relationships")

# Save to DB
print("💾 Saving to Neo4j...")
db_manager.save_graph(nodes, relationships)
print("✅ Saved to database")

db_manager.close()
print("\n✅ All done!")
