# Markdown Ticket (MDT)

**Spec-Driven Development framework with AI-powered workflow commands**

Transform how you build software with AI: write specifications first, generate tests, then implement with automated verification. The Kanban board keeps everything organized and version-controlled.

---

## Quick Start

### 1. Install SDD Commands

```bash
# Clone and install workflow commands
git clone https://github.com/andkirby/markdown-ticket.git
cd markdown-ticket

# Claude Code (recommended)
./prompts/install-plugin.sh --local

# Other AI assistants (Cursor, Copilot, etc.)
./prompts/install-agents-skill.sh
```

See **[prompts/README.md](prompts/README.md)** for detailed installation options.

### 2. Start the Application

```bash
# Docker (production)
bin/dc up -d

# Local development
npm run build:all && ./start.sh
```

### 3. Connect MCP (Required for AI)

```bash
# Docker MCP
claude mcp add --scope user --transport http mdt-all http://localhost:3012/mcp

# Local MCP
claude mcp add --scope user mdt-all node $PWD/mcp-server/dist/index.js
```

### Access Points

| Service | Docker | Local |
|---------|--------|-------|
| Web UI | http://localhost:5174 | http://localhost:4173 |
| MCP | http://localhost:3012/mcp | stdio |

---

## What You Get

### SDD Workflow Commands

AI-powered commands for the entire development lifecycle:

```
/mdt:ticket-creation → /mdt:requirements → /mdt:bdd → /mdt:architecture
    → /mdt:tests → /mdt:tasks → /mdt:implement → /mdt:tech-debt → /mdt:reflection
```

| Command | Purpose |
|---------|---------|
| `/mdt:ticket-creation` | Create CR with flexible depth |
| `/mdt:requirements` | Generate EARS behavioral specs |
| `/mdt:bdd` | E2E acceptance tests (Playwright/Cypress) |
| `/mdt:architecture` | Design with scope boundaries |
| `/mdt:tests` | Module tests (Jest/Vitest/Pytest) |
| `/mdt:tasks` | Constrained task breakdown |
| `/mdt:implement` | Execute with TDD verification |
| `/mdt:tech-debt` | Detect debt patterns |
| `/mdt:assess` | Evaluate code fitness |
| `/mdt:poc` | Validate uncertain decisions |

**Full reference**: [prompts/QUICKREF.md](prompts/QUICKREF.md)

### Visual Kanban Board

- Drag-drop ticket management
- Markdown rendering with Mermaid diagrams
- Multi-project support
- Real-time updates
- Git-based storage (no database)

### MCP Integration

AI assistants can directly:
- Read and create tickets
- Update sections and status
- Query project information

---

## How SDD Works

### 1. Specification First

```
Requirements (WHAT) → Architecture (HOW) → Tests (verify) → Implementation
```

- `/mdt:requirements` writes EARS-format specs
- `/mdt:architecture` defines modules and scope boundaries
- `/mdt:bdd` + `/mdt:tests` generate tests before code

### 2. Test-Driven Implementation

```
Tests (RED) → Write Code → Tests (GREEN) → Refactor
```

- `/mdt:tests` creates failing tests
- `/mdt:implement` writes minimal code
- Verification after each task

### 3. Debt Prevention Chain

```
Architecture → defines scope boundaries
    ↓
Tasks → inherits constraints
    ↓
Implement → verifies OK/FLAG/STOP
    ↓
Tech-Debt → catches violations
```

See **[prompts/CONCEPTS.md](prompts/CONCEPTS.md)** for design principles.

---

## Installation Options

### Claude Code Plugin

```bash
# Install plugin
./prompts/install-plugin.sh --local

# Update
./prompts/install-plugin.sh -uy
```

### Universal (Cursor, Copilot, etc.)

```bash
# Global installation
./prompts/install-agents-skill.sh

# Per-project
cd /path/to/my-project
bash /path/to/install-agents-skill.sh --scope local
```

### MCP Configuration

Required for AI assistants to read/write tickets:

```bash
# HTTP transport (Docker)
claude mcp add --scope user --transport http mdt-all http://localhost:3012/mcp

# Stdio transport (Local)
claude mcp add --scope user mdt-all node /path/to/mcp-server/dist/index.js
```

---

## Docker Deployment

```bash
# Production
bin/dc up -d

# Development
MDT_DOCKER_MODE=dev bin/dc up -d
```

Features: auto-discovery, volume mounting, secure defaults.

See **[docs/DOCKER_GUIDE.md](docs/DOCKER_GUIDE.md)** for configuration.

---

## Development

```bash
npm install                # Install dependencies
npm run dev:full           # Start dev servers (frontend + backend)
npm run test:e2e           # Run Playwright tests
npm run lint               # Code quality
```

### Architecture

```
markdown-ticket/
├── prompts/          # SDD workflow commands (install this!)
├── src/              # React frontend
├── server/           # Express backend + SSE
├── mcp-server/       # MCP server for AI
├── shared/           # TypeScript types
└── docs/CRs/         # Tickets directory
```

---

## Who This Is For

- Developers using AI assistants for coding
- Teams wanting specification-driven development
- Projects requiring persistent AI context
- Anyone tired of AI forgetting decisions

---

## What's New

- **v0.11.0** (2026-02-22): Git worktree support, universal AI assistant support, SDD-first README
- **v0.10.0** (2026-02-15): Single-project MCP mode, Research ticket type
- **v0.9.0** (2026-01-17): Modern UI, E2E testing, code metrics
- **v0.8.0** (2025-12-29): API documentation, status buttons

See **[RELEASE_NOTES.md](RELEASE_NOTES.md)** for full history.

---

## Resources

| Resource | Purpose |
|----------|---------|
| [prompts/README.md](prompts/README.md) | SDD installation guide |
| [prompts/QUICKREF.md](prompts/QUICKREF.md) | Command reference |
| [prompts/WORKFLOWS.md](prompts/WORKFLOWS.md) | Workflow decision trees |
| [prompts/CONCEPTS.md](prompts/CONCEPTS.md) | TDD, prep, debt prevention |
| [docs/MCP_SERVER_GUIDE.md](docs/MCP_SERVER_GUIDE.md) | MCP setup details |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System architecture |

---

**Star this repo if you find it useful!**

**Issues?** [Report here](https://github.com/andkirby/markdown-ticket/issues)
