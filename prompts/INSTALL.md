# MDT Installation

Choose your AI assistant:

| Assistant | Installer | Scope |
|-----------|-----------|-------|
| **Claude Code** | `install-plugin.sh` | Plugin system |
| **Others** | `install-agents-skill.sh` | `.agents/skills/` |

---

## Claude Code

```bash
cd ~/home/mdt-prompts

# First time
./install-plugin.sh --local

# Update
./install-plugin.sh -uy
```

**Options:** `--local` (Node.js) | `--docker` (HTTP) | `-u` (update) | `-y` (auto-confirm)

---

## Universal (Cursor, Copilot, etc.)

**Supported:**
- Amp
- Codex
- Cursor
- Gemini CLI
- GitHub Copilot
- Kimi Code CLI
- OpenCode

### Global

```bash
cd ~/home/mdt-prompts
./install-agents-skill.sh
```
Creates: `~/.agents/skills/mdt` → symlink to source

### Per-Project

```bash
cd /path/to/my-project
bash ~/home/mdt-prompts/install-agents-skill.sh --scope local
```
Creates: `my-project/.agents/skills/mdt` → symlink to source

**Options:** `--copy` | `-y`

---

## MCP Server Setup

The MCP server enables tool calls (create CR, manage sections, etc.).

**Server name:** `mdt-all`

| Tool | Command |
|------|---------|
| **Codex** | `codex mcp add mdt-all node /path/to/mcp-server/dist/index.js` |
| **OpenCode** | `opencode mcp add` (interactive) |
| **Cursor** | Add to `.cursor/mcp.json` |
| **Claude Code** | Use `install-plugin.sh --local` (includes MCP) |

**JSON config (for tools that need it):**

```json
{
  "mcpServers": {
    "mdt-all": {
      "command": "node",
      "args": ["/path/to/markdown-ticket/mcp-server/dist/index.js"]
    }
  }
}
```

---

## Verify & Remove

```bash
# Claude Code
claude plugin list | grep mdt

# Universal (global)
ls -la ~/.agents/skills/mdt
rm ~/.agents/skills/mdt

# Universal (local)
ls -la .agents/skills/mdt
rm .agents/skills/mdt
```
