---
code: MDT-143
status: Approved
dateCreated: 2026-03-20T20:24:43.278Z
lastModified: 2026-03-23T17:03:06Z
type: Feature Enhancement
priority: Medium
phaseEpic: Phase B (Enhancement)
---

# CLI access to tickets and projects

## 1. Description

### Problem Statement
Users need command-line access to manage tickets and projects without relying on MCP tools or the web UI. This enables:
- Quick ticket lookups from terminal
- Scriptable ticket operations for automation
- LLM integration via STDIN/STDOUT (cat file | mdt-cli create)
- Integration with other CLI tools and workflows

### Current State
- Ticket management requires MCP tools (via LLM clients) or web UI
- No standalone CLI for ticket operations
- Project detection logic exists only in MCP server (`mcp-server/src/tools/utils/projectDetector.ts`)
- Key normalization exists in shared code (`shared/utils/keyNormalizer.ts`)

### Desired State
A standalone `mdt-cli` command providing:
- Ticket viewing (single ticket, list)
- Ticket creation (with STDIN support)
- Ticket attribute updates
- Project inspection and listing
- Project initialization in the current folder
- Cross-project ticket access
- Colored, human-friendly output

### Rationale
- Developers live in the terminal
- Enables shell scripting and automation
- LLMs can use `cat file.md | mdt-cli create` pattern
- Faster than opening web UI for quick lookups
- Works in environments without MCP client

### Impact Areas
- **New package**: `cli/` directory with CLI implementation
- **Shared code**: Extract project detector from MCP to `shared/utils/projectDetector.ts`
- **Configuration**: New `~/.config/mdt/cli.toml` for CLI settings

## 2. Solution Analysis

### Approaches Considered

#### A. Separate CLI Package
- Dedicated `cli/` package with its own `package.json`
- Imports shared services and utilities
- Installed globally via `npm install -g @mdt/cli` or `bun link`

#### B. Single Binary (Bun compile)
- Compile to standalone executable
- No runtime dependencies
- Larger distribution size

#### C. MCP-as-CLI
- Use existing MCP server with CLI-like interface
- Reuses all MCP logic
- Confusing UX (MCP is designed for LLM clients)

### Trade-offs Analysis

| Approach | Pros | Cons |
|----------|------|------|
| Separate Package | Clean separation, standard Node/Bun workflow | Requires Node/Bun runtime |
| Single Binary | No runtime needed, easy distribution | Large binary, Bun compile limitations |
| MCP-as-CLI | No new code | Wrong abstraction, poor UX |

### Chosen Approach
**Option A: Separate CLI Package**

Reasons:
- Standard Node/Bun ecosystem approach
- Can be installed globally or run via `bunx`
- Clean separation of concerns
- Reuses existing shared code
- Easy to test and develop

### Rejected Alternatives
- **Single Binary**: Bun's `compile` has limitations with native modules and dynamic imports
- **MCP-as-CLI**: MCP protocol is designed for JSON-RPC communication with LLM clients, not human CLI interaction

## 3. Implementation Specification

### Command Structure

```text
mdt-cli ticket get <ticket-key>         # Canonical ticket lookup
mdt-cli ticket <ticket-key>             # Ticket lookup shortcut
mdt-cli [ticket-key]                    # Bare ticket lookup shortcut
mdt-cli ticket list                     # Canonical ticket list
mdt-cli list|ls                         # Ticket list shortcuts
mdt-cli project current                 # Canonical current-project info
mdt-cli project                         # Current-project shortcut
mdt-cli project get|info <code>         # Canonical project lookup
mdt-cli project <code>                  # Project lookup shortcut
mdt-cli project ls|list                 # Project listing
mdt-cli project init [code] [name]      # Initialize project in current folder
mdt-cli ticket create <type>[/<priority>] <title> [slug]  # Canonical create
mdt-cli create <type>[/<priority>] <title> [slug]         # Create alias
mdt-cli attr <ticket> <attr>=<value>... # Update ticket attributes
```

### Ticket Key Resolution

| Input | Context | Result |
|-------|---------|--------|
| `12` or `012` | Inside project dir | `MDT-012` (detected from `.mdt-config.toml`) |
| `MDT-12` or `mdt-12` | Any dir | `MDT-012` |
| `API-12` | Any dir | `API-012` (cross-project) |
| `ABC/QWE-12` | Any dir | Project=ABC, Ticket=QWE-012 (explicit) |

### Commands

#### View Ticket
```bash
mdt-cli ticket get 12   # canonical form
mdt-cli ticket 12       # namespace shortcut
mdt-cli t 12            # alias shortcut
mdt-cli 12              # bare shortcut from detected project
mdt-cli MDT-012         # explicit key
mdt-cli API-12          # cross-project access
mdt-cli ABC/QWE-12      # explicit project/ticket
```

**Output format**:
```
MDT-012 Add CLI access to tickets and projects
─────────────────────────────────────────────
  status:    [In Progress]     # blue badge
  type:      [Feature Enhancement]
  priority:  [High]            # coral badge
  phase:     Phase B (Enhancement)
  assignee:  kirby
  created:   2026-03-15
  modified:  2026-03-20
─────────────────────────────────────────────
  path: docs/CRs/MDT-012-add-cli-access.md
```

#### List Tickets
```bash
mdt-cli ticket list     # canonical form
mdt-cli list            # shortcut
mdt-cli ls              # alias
```

**Output format** (compact):
```
MDT-012 Add CLI access to tickets [In Progress] [Feature] [High]  Phase B
  docs/CRs/MDT-012-add-cli-access.md

MDT-011 MCP HTTP transport     [Implemented] [Feature] [Medium]
  docs/CRs/MDT-011-mcp-http.md

3 tickets in MDT project
```

#### Project Commands
```bash
mdt-cli project current
mdt-cli project         # shortcut for current project
mdt-cli project ls
mdt-cli project list
mdt-cli project get MDT
mdt-cli project info MDT
mdt-cli project MDT     # shortcut project lookup
mdt-cli project mdt     # case-insensitive project code lookup
mdt-cli project LS      # project code "LS", not the list subcommand
```

**Output format**:
```
MDT (markdown-ticket)  Markdown Ticket System
  Kanban board with markdown-based tickets and MCP integration
  ~/Projects/markdown-ticket

API (api-gateway)       API Gateway Service
  Central API gateway for microservices
  ~/Projects/api-gateway
```

**Dispatch rules**:
- `project current`, `project get|info <code>`, and `project ls|list` are the canonical `commander` subcommands
- `project` and `project <code>` remain supported shortcuts
- Project code lookup is case-insensitive (`abc` = `ABC`)
- Exact lowercase `ls` and `list` remain reserved list aliases, while other tokens such as `LS` or `LIST` resolve through project-code lookup

#### Project Init
```bash
mdt-cli project init
mdt-cli project init MDT 'Markdown Ticket Board'
```

Creates project configuration in the current folder, similar to `bun run project:create`, including `.mdt-config.toml` and any required bootstrap metadata.

#### Create Ticket
```bash
mdt-cli ticket create bug 'Fix login timeout'
mdt-cli create bug 'Fix login timeout'                     # alias
mdt-cli ticket create bug/high 'Fix login timeout'
mdt-cli ticket create feature 'Add dark mode' add-dark-mode
mdt-cli ticket create architecture/critical 'Redesign auth'

# STDIN support (no template, content from pipe)
cat spec.md | mdt-cli create feature 'CLI tool'
```

`mdt-cli ticket create ...` is the canonical create form. `mdt-cli create ...` remains a supported top-level alias for the same behavior.

**Argument detection** (any order):
- `bug|feature|architecture|tech-debt|documentation|research` → type (case-insensitive)
- `critical|high|medium|low|p1|p2|p3|p4` → priority
- `'Text in quotes'` → title
- `text-with-dashes-no-spaces` → slug (optional, converts to title if no title provided)

**Output**:
```
Created MDT-013: Fix login timeout
  docs/CRs/MDT-013-fix-login-timeout.md
```

#### Update Attributes
```bash
mdt-cli attr MDT-012 status=Implemented
mdt-cli attr MDT-012 status=in_progress              # snake_case accepted
mdt-cli attr MDT-012 priority=high phase='Phase C'
mdt-cli attr MDT-012 assignee='alice' related='ABC-001,DEF-002'
mdt-cli attr MDT-012 related+=ABC-003 depends-=MDT-001
```

`mdt-cli attr <ticket> <attr>=<value>...` is the only supported attribute-mutation form in v1. Shortcut forms such as `mdt-cli 12 attr ...` or `mdt-cli 12 status=...` are not part of this ticket.

**Operator rules**:
- Scalar attributes (`status`, `priority`, `phase`, `assignee`, `impl-date`, `impl-notes`) use `=`
- Relation attributes (`related`, `depends`, `blocks`) support:
  - `=` to replace the full list
  - `+=` to append values with duplicate suppression
  - `-=` to remove values from the current list

**Allowed attributes**:

| CLI key | Frontmatter | Values |
|---------|-------------|--------|
| `status` | status | `proposed`, `approved`, `in_progress`, `implemented`, `rejected`, `on_hold`, `partial` |
| `priority` | priority | `critical`/`p1`, `high`/`p2`, `medium`/`p3`, `low`/`p4` |
| `phase` | phaseEpic | any string |
| `assignee` | assignee | any string |
| `related` | relatedTickets | comma-separated keys |
| `depends` | dependsOn | comma-separated keys |
| `blocks` | blocks | comma-separated keys |
| `impl-date` | implementationDate | ISO date (YYYY-MM-DD) |
| `impl-notes` | implementationNotes | any string |

**Output**:
```
Updated MDT-012: status → Implemented
```

### Color Mapping

Uses existing badge colors from `src/components/Badge/badge.css`:

#### Status Colors
| Status | Color | Tailwind Classes |
|--------|-------|------------------|
| Proposed | Gray | `from-gray-50 to-gray-300` |
| Approved | Blue | `from-blue-50 to-blue-200` |
| In Progress | Yellow | `from-yellow-50 to-yellow-200` |
| Implemented | Green | `from-green-50 to-green-200` |
| Rejected | Red | `from-red-50 to-red-200` |
| On Hold | Orange | `from-orange-50 to-orange-200` |
| Partially Implemented | Purple | `from-purple-50 to-purple-200` |

#### Priority Colors
| Priority | Color | Tailwind Classes |
|----------|-------|------------------|
| Critical | Rose (intense) | `from-rose-200 to-rose-300` |
| High | Rose (light) | `from-rose-50 to-rose-100` |
| Medium | Amber | `from-amber-50 to-amber-100` |
| Low | Emerald | `from-emerald-50 to-emerald-100` |

#### Type Colors
| Type | Color | Tailwind Classes |
|------|-------|------------------|
| Feature Enhancement | Blue-Indigo | `from-blue-50 to-indigo-100` |
| Bug Fix | Red-Orange | `from-red-50 to-orange-100` |
| Architecture | Purple-Violet | `from-purple-50 to-violet-100` |
| Technical Debt | Slate-Gray | `from-slate-50 to-gray-100` |
| Documentation | Cyan-Teal | `from-cyan-50 to-teal-100` |
| Research | Pink | `from-pink-50 to-pink-200` |

### Configuration

**File**: `~/.config/mdt/cli.toml`

```toml
[cli.ticket]
absolutePath = false    # false = relative paths (default), true = absolute paths

[cli.display]
color = true            # --no-color to disable
```

### Project Detection

Extract existing detector from MCP to shared:

**Source**: `mcp-server/src/tools/utils/projectDetector.ts`
**Target**: `shared/utils/projectDetector.ts`

Logic:
1. Search upward from CWD for `.mdt-config.toml`
2. Parse `code` field from config
3. Return project code or null (multi-project mode)

### STDIN Handling

When STDIN is detected (piped input):
1. Generate YAML frontmatter with required fields
2. Add H1 header with title
3. Append STDIN content as body
4. Skip template generation

```bash
cat spec.md | mdt-cli create feature 'CLI tool'
```

Resulting file:
```markdown
---
code: MDT-015
status: Proposed
dateCreated: 2026-03-20T21:00:00.000Z
type: Feature Enhancement
priority: Medium
---

# CLI tool

[Content from spec.md here]
```

### Package Structure

```
cli/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts           # Entry point
│   ├── commands/
│   │   ├── view.ts        # Ticket view command
│   │   ├── list.ts        # List tickets command
│   │   ├── project.ts     # Project info/list/init commands
│   │   ├── create.ts      # Create ticket command
│   │   └── attr.ts        # Update attributes command
│   ├── output/
│   │   ├── formatter.ts   # Output formatting
│   │   └── colors.ts      # Color definitions (from badge.css)
│   └── utils/
│       ├── args.ts        # Shortcut normalization before commander parse
│       └── detection.ts   # Project detection wrapper
└── README.md
```

### Dependencies

- `@mdt/shared` - Shared services (ProjectService, CRService, TemplateService)
- `@mdt/domain-contracts` - Types and enums
- `chalk` or `picocolors` - Terminal colors
- `commander` - CLI framework
- `toml` - Config file parsing

## 4. Acceptance Criteria

### AC-1: View Ticket
- [ ] `mdt-cli 12` displays ticket MDT-012 with colored output
- [ ] `mdt-cli ticket get 12` and `mdt-cli ticket 12` resolve to the same ticket view as the bare shortcut
- [ ] Works from any subdirectory within project
- [ ] Cross-project access via `MDT-012` or `API-12` works from any directory
- [ ] Path shown is relative by default, absolute with config option

### AC-2: List Tickets
- [ ] `mdt-cli list` shows all tickets in compact format
- [ ] `mdt-cli ticket list` shows the same ticket list as `mdt-cli list|ls`
- [ ] Badges display with correct colors matching web UI
- [ ] Shows count of tickets at end

### AC-3: Project Commands
- [ ] `mdt-cli project` shows the current project code, name, description, path, and relevant config values
- [ ] `mdt-cli project current` shows the same current-project information as `mdt-cli project`
- [ ] `mdt-cli project ls` and `mdt-cli project list` list all discovered projects
- [ ] `mdt-cli project get MDT`, `mdt-cli project info MDT`, and `mdt-cli project MDT` resolve the same project lookup
- [ ] `mdt-cli project MDT` resolves project lookup case-insensitively
- [ ] `mdt-cli project LS` is treated as project code `LS`, not as the `ls` subcommand

### AC-4: Project Init
- [ ] `mdt-cli project init` creates project configuration for the current folder
- [ ] `mdt-cli project init MDT 'Markdown Ticket Board'` initializes the project with explicit code and name values
- [ ] Generated configuration matches the project bootstrap expected from `bun run project:create`

### AC-5: Create Ticket
- [ ] `mdt-cli ticket create bug 'Title'` creates ticket with defaults
- [ ] `mdt-cli create bug 'Title'` resolves to the same create behavior as `mdt-cli ticket create`
- [ ] Type and priority can be in any order
- [ ] Slug argument converts to title if no quoted title provided
- [ ] STDIN content becomes ticket body (no template)
- [ ] Returns created ticket key and path

### AC-6: Update Attributes
- [ ] `mdt-cli attr MDT-012 status=implemented` updates status
- [ ] Snake_case values accepted and normalized
- [ ] Multiple attributes can be updated in one command
- [ ] Returns confirmation with changed values

### AC-7: Project Detection
- [ ] Detects project from current working directory
- [ ] Works from any subdirectory within project
- [ ] Clear error when not in a project and no explicit project given

### AC-8: Color Output
- [ ] Colors match web UI badge colors exactly
- [ ] `--no-color` flag disables colors
- [ ] Colors disabled when not TTY (pipe/redirection)

### AC-9: Error Handling
- [ ] Clear error messages for invalid keys
- [ ] Clear error for missing required arguments
- [ ] Helpful suggestions for typos (e.g., "Did you mean 'feature'?")

## 5. Implementation Notes
*To be filled during/after implementation*

> Requirements trace projection: [requirements.trace.md](./MDT-143/requirements.trace.md)

> Requirements notes: [requirements.md](./MDT-143/requirements.md)

> BDD trace projection: [bdd.trace.md](./MDT-143/bdd.trace.md)

> BDD notes: [bdd.md](./MDT-143/bdd.md)

> Architecture trace projection: [architecture.trace.md](./MDT-143/architecture.trace.md)

> Architecture notes: [architecture.md](./MDT-143/architecture.md)

## 6. References

- `src/components/Badge/badge.css` - Color definitions (single source of truth)
- `src/config/statusConfig.ts` - Status configuration and colors
- `shared/utils/keyNormalizer.ts` - Key normalization logic
- `mcp-server/src/tools/utils/projectDetector.ts` - Project detection (to be extracted)
- `docs/create_ticket.md` - Ticket attribute reference
