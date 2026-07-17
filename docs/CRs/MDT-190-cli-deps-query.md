---
code: MDT-190
status: Proposed
dateCreated: 2026-07-17T15:35:08.636Z
type: Feature Enhancement
priority: High
phaseEpic: MDT-188
dependsOn: MDT-189
blocks: MDT-191
---

# CLI `mdt-cli deps`: check, tree, and mermaid output

**Epic:** MDT-188 (Ticket Dependency Graph: Implementation-Order Planning)
**Slice:** CLI query (IDEA-008 slices 4 + 5)

## 1. Description

### Problem Statement

The dependency data is invisible. After MDT-189 ships the graph module, nothing
surfaces it to the human or agent. The VOC lying-ticket scenario — a ticket
claiming `dependsOn: VOC-053` while VOC-053 is `Approved` — has no command that
detects and reports it. There is no way to see what blocks a ticket, what order
to implement in, or what's lying about its own readiness.

### Current State

- `mdt-cli list` supports status/phase/epic filters (`cli/src/commands/list.ts:35-42`)
  but **no relationship-based filter** and no dependency view.
- CLI output formats: `human`, `--json`, `--yaml`, `--files`, `--info`
  (`cli/src/output/structured.ts`). No `--mermaid`, no tree.
- Relationships render in structured output (`cli/src/output/structured.ts:132-136`)
  and reverse-mapped for display (`cli/src/output/formatter.ts:402-404`); no
  graph traversal.

### Desired State

A `mdt-cli deps` command that is the primary user-facing surface for the
planning tool. It answers three questions:
1. **Is this ticket actually ready?** (`--check`)
2. **What's the implementation order around it?** (`--tree`)
3. **Can I render/export the graph?** (`--mermaid`)

This ticket is the demand probe for the entire epic. If nobody runs `deps
--check`, MDT-191 (enforcement) does not ship.

### Scope

**In scope:**
- `mdt-cli deps <KEY>` subcommand with `--check`, `--tree`, `--mermaid`.
- `--depth=N`, `--direction=up|down|both` for tree/mermaid.
- Prose-precondition reconciliation prompt in `--check`.
- Structured JSON output (`--json`) exposing the same projection the UI/MCP
  will later consume.

**Out of scope:**
- Graph module itself (MDT-189).
- Write/transition enforcement (MDT-191).
- UI rendering (v1.1).
- MCP wrappers (v1.1/v1.2).

## 2. Solution Analysis

### Architecture Overview

Pure presentation over the `DependencyGraph` module from MDT-189. The CLI
boundary (AGENTS.md "CLI Business Logic Boundary") says: formatting belongs in
`cli/`, logic belongs in `shared/`. This ticket adds zero graph logic — it
calls `DependencyGraph` and formats the result.

### Key Components

- `cli/src/commands/deps.ts` — new command; parses flags, calls shared, formats.
- `cli/src/output/depsFormatter.ts` — human-readable table (the VOC format),
  tree, mermaid. Mirrors existing formatter patterns in
  `cli/src/output/formatter.ts`.
- Reuses `DependencyGraph.violations()`, `.topoSort()`, `.buildGraph()`.

### Design Decisions

- **`--check` is the headline subcommand.** It is what makes the tool a planning
  tool, not a query tool. Output mirrors the user's real-world format:

  ```
  Precondition                       | Status    | Evidence
  VOC-049–VOC-052 implemented        | ❌        | VOC-052 still "Approved"
  VOC-053 release evidence green     | ⚠️        | Unverifiable prose — link a ticket
  dependsOn: VOC-053                 | ❌        | Not Implemented (waiting)
  ```

- **DAG, not tree.** `--tree` uses reference markers for repeated nodes
  (`MDT-030 (see above)`) rather than recursive duplication. Recursive
  duplication explodes on diamond dependencies.
- **Mermaid reuses what exists.** Emit `flowchart` text; users paste into the
  MDT-164 overlay or any markdown viewer. No CLI-side rendering.
- **Default view:** depth-2, both directions, isolated nodes hidden. Per
  MDT-188's "Decisions Made Now".

### Trade-offs

- A text-tree is less pretty than a rendered graph but it's scriptable,
  diffable, and zero-risk. Mermaid is the upgrade for those who want it.
- The prose-precondition parser is lossy (regex for CR-key-shaped tokens). It
  will miss preconditions phrased without a CR key ("release evidence green").
  Those are surfaced as `⚠️ Unverifiable prose` — honest, not magic.

## 3. Implementation Specification

### Command surface

```
mdt-cli deps <KEY> [--check] [--tree] [--mermaid]
                       [--depth=N] [--direction=up|down|both]
                       [--json] [--force-prompt]
```

Default (no flag): show summary (direct deps, direct dependents, readiness).

### `--check` output

Reads the ticket, runs `DependencyGraph.violations()`, prints the table. Also
scans ticket body for CR-key tokens not present in `dependsOn` and prompts:

```
You mention VOC-049, VOC-050, VOC-051, VOC-052 in your Precondition section
but they are not in dependsOn. Add? [y/N]
```

On `y`, writes `dependsOn` additions via `TicketService.updateTicketAttributes`
(reuses the existing attribute mutation path; MDT-191's write validation will
later reject cycles/targets — for MDT-190, the existing path applies).

For prose claims with no CR key ("release evidence green"), prints:

```
⚠️ Unverifiable precondition: "VOC-053 release evidence green"
   Link a ticket, or mark satisfied-with-evidence.
```

### `--tree` output

```
MDT-188 (this ticket)
├── dependsOn (up):
│   ├── MDT-189 ✅ Implemented
│   └── MDT-054 ✅ Implemented
└── blocks (down):
    └── MDT-190 ⏳ In Progress
```

Reference markers for repeated nodes: `MDT-030 (see above)`.

### `--mermaid` output

```mermaid
flowchart LR
  MDT-189([MDT-189 Implemented]) --> MDT-188([MDT-188])
  MDT-188 --> MDT-190([MDT-190 In Progress])
```

### `--json` output

Exposes the same projection the UI/MCP will consume — the structured
`violations` and `DepGraph` from MDT-189, plus the parsed prose tokens.

### CLI boundary check

This ticket is pure presentation. If any of these end up in `cli/`, they're in
the wrong place and belong in `shared/`:
- Cycle detection, traversal, satisfaction logic.
- Prose token extraction (if reusable by MCP/UI — recommend `shared/services/ticket/proseScanner.ts`).
- Mutation rules.

## 4. Acceptance Criteria

- [ ] `mdt-cli deps <KEY>` exists and runs against any ticket in any registered
  project.
- [ ] `--check` prints the violation table in the format shown above, naming
  each dep, its status, kind (`waiting`/`broken-plan`), and action.
- [ ] **VOC scenario passes end-to-end.** Given a fixture ticket with
  `dependsOn: VOC-053` (Approved) and prose mentioning VOC-049..VOC-052,
  `--check` prints: (a) the waiting violation for VOC-053, (b) the
  reconciliation prompt for the missing structured deps.
- [ ] `--tree` renders a DAG with reference markers for repeated nodes
  (synthetic diamond fixture).
- [ ] `--mermaid` emits valid Mermaid `flowchart` that renders in MDT-164's
  overlay (manual verify).
- [ ] `--depth` and `--direction` flags work; default is depth-2, both
  directions, isolated nodes hidden.
- [ ] `--json` exposes `violations`, `depGraph`, and `proseTokens` fields.
- [ ] Cross-project keys render fully qualified (`VOC-053`), same-project keys
  bare (`053` or `MDT-053` per existing elision rules in MDT-187).
- [ ] Snapshot tests on a known-broken fixture for `--check`, `--tree`, and
  `--mermaid`.
- [ ] No graph logic added to `cli/` — cycle/traversal/satisfaction all imported
  from `shared/services/ticket/DependencyGraph`.

## 5. Verification

- `cli/src/commands/deps.ts` unit tests with a fixture project (in-memory
  `Ticket[]`, no file I/O).
- Snapshot tests for `--check`, `--tree`, `--mermaid` outputs against a fixture
  reproducing the VOC scenario.
- Manual: `mdt-cli deps MDT-188 --mermaid` → paste into MDT-164 overlay → renders.
- `bun run --cwd server jest` and `bun run validate:ts` on changed files.

## 6. Open Questions

- Prose token extraction — does it live in `cli/` (presentation) or
  `shared/services/ticket/proseScanner.ts` (reusable by MCP/UI later)? Recommend
  `shared/` since MCP v1.1/v1.2 will need it. Confirm at architecture.
- `--check` reconciliation prompt default — y/N with N as default (don't
  surprise-write). Confirm.

## 7. Risks

- **Demand risk is the whole point.** If this ticket ships and gets no use, the
  epic stops: MDT-191 does not ship. That's the design, not a failure.
- **Prose parser false positives.** Mentioning `MDT-030` in a "see also"
  sentence will trigger the reconciliation prompt. Mitigation: only scan
  `## Precondition` / `## Prerequisites` sections, not the whole body. Confirm
  section allowlist at architecture.

## 8. References

- **Epic:** MDT-188
- **Design:** `docs/ideas/IDEA-008-ticket-dependency-graph.md` (slices 4 + 5)
- **Depends on:** MDT-189 (graph module + migration)
- `cli/src/commands/list.ts:35-42` — existing filter DSL (no relationship filter today)
- `cli/src/output/{structured,formatter}.ts` — existing output patterns
- `docs/design/surfaces/mermaid-diagram-viewer.spec.md` — MDT-164 overlay (manual verify target)
- `docs/ideas/IDEA-005-tickets-to-mermaid-grid.md` — adjacent CLI Mermaid output
- **Blocks:** MDT-191 (enforcement is gated on this ticket proving demand)
