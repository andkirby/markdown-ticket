# Blarify Setup Summary

## Project: markdown-ticket

**Date:** 2025-12-29
**Goal:** Set up Blarify code graph + MCP server for code analysis

---

## What Was Built

### Code Graph
- **1,547 nodes** (files + folders + functions + classes)
- **1,549 relationships**
- Scanned directories: `src/`, `tests/`, `server/`, `mcp-server/`, `domain-contracts/`
- Whitelist file types: `.ts`, `.tsx`, `.test.ts`, `.spec.ts`

### Database
- **Neo4j** running in Docker (`neo4j-blarify`)
- Port: `bolt://localhost:7687`
- Credentials: `neo4j` / `qweqwe123`
- Data isolation: `repo_id=markdown-ticket`, `entity_id=kirby`

---

## Scripts Created

All scripts in: `~/home/markdown-ticket/scripts/blarify/`

| Script | Purpose | Usage |
|--------|---------|-------|
| `build_graph.py` | Build code graph | `python scripts/blarify/build_graph.py [--rebuild]` |
| `build.sh` | Wrapper for build_graph | `./scripts/blarify/build.sh [--rebuild]` |
| `rebuild.sh` | Clean rebuild | `./scripts/blarify/rebuild.sh` |
| `watch_and_update.py` | Watch for file changes | `python scripts/blarify/watch_and_update.py` |
| `watch.sh` | Wrapper for watcher | `./scripts/blarify/watch.sh` |

---

## Configuration Files

### 1. `~/.blarify/projects.json`
```json
{
  "/Users/kirby/home/markdown-ticket": {
    "repo_id": "markdown-ticket",
    "entity_id": "kirby",
    "neo4j_uri": "bolt://localhost:7687",
    "created_at": "2025-12-29T21:00:00Z",
    "updated_at": "2025-12-29T21:00:00Z"
  }
}
```

**Important:**
- **Key** = full path (for auto-detection)
- **repo_id** value = `markdown-ticket` (matches Neo4j data)

### 2. `~/.blarify/neo4j_credentials.json`
```json
{
  "username": "neo4j",
  "password": "qweqwe123"
}
```

### 3. `.mcp.json` (project-local)
```json
{
  "mcpServers": {
    "blarify": {
      "command": "/Users/kirby/.config/blarify/bin/python",
      "args": ["-m", "blarify.mcp_server"],
      "cwd": "/Users/kirby/home/markdown-ticket"
    }
  }
}
```

---

## Build Graph

### Quick build (fast, keeps stale data)
```bash
cd ~/home/markdown-ticket
~/.config/blarify/bin/python scripts/blarify/build_graph.py
# or
./scripts/blarify/build.sh
```

### Clean rebuild (removes stale data)
```bash
~/.config/blarify/bin/python scripts/blarify/build_graph.py --rebuild
# or
./scripts/blarify/build.sh --rebuild
# or
./scripts/blarify/rebuild.sh
```

**Performance:** Both take ~17-18 seconds (only ~1s difference!)

---

## Watch for Changes

```bash
# Install watchdog first (if not installed)
uv pip install watchdog --python ~/.config/blarify/bin/python

# Start watcher
~/home/markdown-ticket/scripts/blarify/watch.sh
```

The watcher handles:
- ✅ File modifications → Updates graph
- ✅ File creation → Adds to graph
- ✅ **File deletion → Removes from graph**

---

## MCP Tools Available

Once MCP is connected, these tools are available:

| Tool | Description |
|------|-------------|
| `find_symbols` | Find classes/functions by name |
| `grep_code` | Search code by text |
| `vector_search` | Semantic code search |
| `get_code_analysis` | Detailed code analysis |
| `get_expanded_context` | Context around code |
| `get_blame_info` | Git blame information |
| `get_dependency_graph` | Dependency relationships |
| `get_commit_by_id` | Commit information |
| `see_node_in_file_context` | View node in file context |
| `get_node_workflows` | Workflow information |

---

## Test Prompts

Try these to verify MCP works:

```
1. Find all classes containing "Ticket" or "CR"

2. What directories exist in src/?

3. Search for code containing "markdown"

4. Show me the dependencies of mcp-server

5. Find all functions with "handle" in the name
```

---

## Neo4j Management

### Check database size
```bash
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 "MATCH (n) RETURN count(n)"
```

### Check node types
```bash
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 "
MATCH (n)
RETURN labels(n) as type, count(n) as count
"
```

### Clear database
```bash
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 'MATCH (n) DETACH DELETE n'
```

### Neo4j Browser
```
http://localhost:7474
Login: neo4j / qweqwe123
```

---

## Troubleshooting

### MCP returns empty results
**Problem:** Searches return no data

**Solution:** Check repo_id matches between config and Neo4j:
```bash
# Check Neo4j
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 "
MATCH (n:FILE)
RETURN n.repoId as repo, n.entityId as entity
LIMIT 1
"

# Check config
cat ~/.blarify/projects.json
```

### MCP server won't start
**Problem:** `Project not found` error

**Solution:** Ensure `~/.blarify/projects.json` key is the **full path**:
```json
{
  "/Users/kirby/home/markdown-ticket": {  ← full path
    "repo_id": "markdown-ticket"          ← short name
  }
}
```

### Graph build hangs
**Problem:** Build takes forever

**Solution:** Database might have old data. Clear first:
```bash
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 'MATCH (n) DETACH DELETE n'
```

---

## File Locations Summary

| What | Where |
|------|-------|
| **Project** | `/Users/kirby/home/markdown-ticket` |
| **Scripts** | `~/home/markdown-ticket/scripts/blarify/` |
| **Blarify config** | `~/.blarify/` |
| **Python venv** | `~/.config/blarify/` |
| **Neo4j container** | `neo4j-blarify` |

---

## Next Steps

1. **Optional:** Configure Claude Desktop (global MCP)
   - Edit: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Use same config as `.mcp.json`

2. **Development:** Run watcher while coding
   ```bash
   ~/home/markdown-ticket/scripts/blarify/watch.sh
   ```

3. **Maintenance:** Rebuild after big changes
   ```bash
   ~/home/markdown-ticket/scripts/blarify/rebuild.sh
   ```

---

## Key Insights

### Whitelist Approach
- Better than blacklist for large projects
- Only scan what you need
- `.ts`, `.tsx`, `.test.ts`, `.spec.ts` = core source code
- Skip `.js`, `.d.ts`, `.md`, `.json`, etc.

### repo_id vs Path
- **repo_id** in Neo4j = short identifier (`markdown-ticket`)
- **Key** in projects.json = full path (for auto-detection)
- This mismatch caused initial MCP failures!

### Performance
- Clean rebuild = Fast build (~1s difference)
- No need to worry about stale data
- `--rebuild` flag is your friend

### File Deletions
- MERGE doesn't delete old nodes
- Use `--rebuild` or watcher with `on_deleted` handler
- Watcher now handles deletions properly!

---

## Commands Reference

```bash
# Build graph
~/.config/blarify/bin/python ~/home/markdown-ticket/scripts/blarify/build_graph.py [--rebuild]

# Watch changes
~/.config/blarify/bin/python ~/home/markdown-ticket/scripts/blarify/watch_and_update.py

# Query Neo4j
docker exec neo4j-blarify cypher-shell -u neo4j -p qweqwe123 "MATCH (n) RETURN count(n)"

# Start/stop Neo4j
docker start neo4j-blarify
docker stop neo4j-blarify

# Test MCP server
cd ~/home/markdown-ticket && ~/.config/blarify/bin/python -m blarify.mcp_server
```

---

**End of Summary**
