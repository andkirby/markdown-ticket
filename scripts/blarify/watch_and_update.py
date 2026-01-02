#!/usr/bin/env python3
"""Watch for file changes and update graph incrementally"""
import os
import time
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from blarify.prebuilt.graph_builder import GraphBuilder
from blarify.project_graph_updater import UpdatedFile
from blarify.repositories.graph_db_manager.neo4j_manager import Neo4jManager

# Setup - same config as build_graph.py
DB_MANAGER = Neo4jManager(repo_id='markdown-ticket', entity_id='kirby')
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Whitelist config (same as build_graph.py)
SCAN_DIRS = ['src', 'tests', 'server', 'mcp-server', 'domain-contracts']
ALLOWED_EXTENSIONS = {'.ts', '.tsx', '.test.ts', '.spec.ts'}

BUILDER = GraphBuilder(
    root_path=PROJECT_ROOT,
    db_manager=DB_MANAGER,
    extensions_to_skip=['.node_modules', '.md', '.js', '.json', '.txt', '.log'],
    names_to_skip=['node_modules', 'dist', '.git', 'coverage', 'test-results'],
    only_hierarchy=True
)

# Debounce: wait 2 seconds after last change before updating
UPDATED_FILES = []
DELETED_FILES = []
LAST_UPDATE_TIME = 0


class GraphUpdateHandler(FileSystemEventHandler):
    def _should_process(self, path):
        """Check if file should be processed based on whitelist"""
        if 'node_modules' in path:
            return False
        return any(path.endswith(ext) for ext in ALLOWED_EXTENSIONS)

    def on_modified(self, event):
        if event.is_directory or not self._should_process(event.src_path):
            return
        print(f"📝 Changed: {event.src_path}")
        UPDATED_FILES.append(UpdatedFile(path=event.src_path))

    def on_created(self, event):
        if event.is_directory or not self._should_process(event.src_path):
            return
        print(f"➕ Created: {event.src_path}")
        UPDATED_FILES.append(UpdatedFile(path=event.src_path))

    def on_deleted(self, event):
        """Handle file deletions - remove from graph"""
        if event.is_directory or not self._should_process(event.src_path):
            return
        print(f"🗑️ Deleted: {event.src_path}")
        # Delete nodes for this file from Neo4j
        try:
            DB_MANAGER.query(
                'MATCH (n:NODE {path: $path, entityId: $entity_id, repoId: $repo_id}) DETACH DELETE n',
                parameters={'path': event.src_path, 'entity_id': 'kirby', 'repo_id': 'markdown-ticket'}
            )
            print(f"   ✅ Removed from graph")
        except Exception as e:
            print(f"   ❌ Failed to remove: {e}")

    def schedule_update(self):
        global LAST_UPDATE_TIME
        now = time.time()

        if UPDATED_FILES and now - LAST_UPDATE_TIME > 2:
            print(f"\n🔄 Updating {len(UPDATED_FILES)} files...")
            try:
                BUILDER.incremental_update(
                    updated_files=UPDATED_FILES.copy(),
                    save_to_db=True
                )
                print("✅ Graph updated!")
                UPDATED_FILES.clear()
                LAST_UPDATE_TIME = now
            except Exception as e:
                print(f"❌ Update failed: {e}")


if __name__ == "__main__":
    print("=" * 60)
    print("👀 Graph Watcher")
    print("=" * 60)
    print(f"Project: {PROJECT_ROOT}")
    print(f"Watching: {', '.join(SCAN_DIRS)}")
    print(f"File types: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    print("Press Ctrl+C to stop\n")
    print("=" * 60)

    event_handler = GraphUpdateHandler()
    observer = Observer()
    observer.schedule(event_handler, PROJECT_ROOT, recursive=True)
    observer.start()

    try:
        while True:
            time.sleep(0.5)
            event_handler.schedule_update()
    except KeyboardInterrupt:
        observer.stop()
        print("\n👋 Stopped watching")
        DB_MANAGER.close()

    observer.join()
