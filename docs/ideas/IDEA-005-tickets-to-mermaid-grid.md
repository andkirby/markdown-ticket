---
id: IDEA-005
status: triage
date: 2026-07-12
resolution-date:
promoted-to:
---

# Tickets List → Mermaid Grid (CLI output format)

## Idea

`mdt-cli` could convert a tickets list into a Mermaid grid. Two stated drivers:
(1) the output can be embedded in interactive `.md` documents; (2) documents
that currently hold a static board view can be "freshened up" by regenerating
the snippet.

## Investigation

### Current state

- **CLI output formats today**: `human`, `--json`, `--yaml` (`cli/src/output/structured.ts`). The `list` command also has `--files` and `--info` mode variants (`cli/src/commands/list.ts`). No diagram/markdown output exists.
- **Mermaid is already first-class in the app**: in-app overlay with pan/zoom (`docs/design/surfaces/mermaid-diagram-viewer.spec.md`, CR MDT-164). Mermaid blocks render inside MDT's own markdown viewer, GitHub, VS Code, Obsidian.
- **No ticket→diagram converter exists** anywhere in the repo. The Kanban board lives only in the React app — it is not portable to `.md`.
- **Kanban is not portable today**: the board is a runtime UI, not an artifact you can drop into a README, a CR, or a milestone doc.

### Design decisions to resolve before/during promotion

1. **Diagram type**: Mermaid has no native "Kanban" diagram. Realistic options:
   - `flowchart LR` with one subgraph per status (columns) containing ticket nodes — conventional, renders as a board. Scales poorly past ~20 nodes/column due to auto-layout.
   - `mindmap` — good for thematic rollup, bad for status columns.
   - `timeline` — good for "what shipped" audits, not for current-state board.
   - `quadrantChart` — only 2 axes, not a fit for ≥4 statuses.
   - Recommendation: ship **flowchart-subgraph-as-column** first; treat timeline/gantt/mindmap/dependency-graph as a follow-up *family*.
2. **Snapshot vs. live contract**: the emitted diagram is a point-in-time snapshot. It will drift the moment a ticket moves. "Interactive" is honest only in the mermaid sense (some viewers collapse/zoom), not in the live-state sense. Must pair the feature with a documented regeneration path (Make target, `docs/status.md` regenerated on commit, or similar) — otherwise it is just a prettier static table.
3. **Layout scaling**: large boards (50+ tickets) produce unreadable diagrams. Needs a `--limit`/`--top` story or per-column caps, reusing the existing `--limit`/`--all` flags.
4. **CLI boundary (AGENTS.md)**: formatting belongs in `cli/` — this is pure presentation over `TicketService.listTickets()`. No shared/backend work required. Correct layer.

### Effort

**S** — one new formatter in `cli/src/output/`, one output flag (`--mermaid` or `--format mermaid`), formatter unit tests. Shared services already return everything needed.

## 360 review — value in working with documents

### Where it clearly earns its keep

- **Refreshable status docs**: `mdt-cli list --mermaid > docs/status.md` replaces a hand-maintained table that drifts with a regenerable artifact. Strongest single value prop — turns the CLI into a *doc-maintenance* tool, not just a query tool.
- **Embed-anywhere board**: same snippet renders in MDT's own viewer (MDT-164), GitHub, VS Code, Obsidian. One source, many surfaces.
- **Filtering becomes visual**: `mdt-cli list status=blocked --mermaid` → instant "what's stuck" board for standups. `type=bug status=done --mermaid` → shipped-bug audit. The existing filter DSL becomes a diagram generator.
- **Onboarding/milestone docs**: a new contributor reads one diagram instead of scrolling 50 tickets. Milestone/retro docs get a faithful snapshot.
- **CI/README freshness**: generate on commit → always-current project overview without a running server.

### Where the value is overstated

- **"Interactive .md documents"** — only as interactive as mermaid itself (zoom/collapse in some viewers). It is **not** live state. If sold as live, it will disappoint. Sell it as *refreshable snapshot* and the contract is honest.
- **Layout ceiling** — mermaid auto-layout fights large boards. Without caps, the diagram degrades past ~20 nodes/column and stops being readable. Not a blocker; a scoping decision.
- **Drift without a regen step** — a snapshot embedded in a doc and never regenerated is worse than a hand-written table, because it *looks* authoritative. The regeneration mechanism is part of the feature, not an afterthought.

### Adjacent value worth noting (but out of scope for v1)

A grid is one shape. The same plumbing unlocks a *family* of doc artifacts: status timeline, dependency graph (from blocker/parent attrs), milestone Gantt, cross-project rollup (`--all` → grid-of-grids). These are genuinely high-value for "working with documents" and are the real 360 — but each is a separate ticket. Promote the grid now; let the family follow if the grid gets used.

## Challenges

- **Fit**: Strong. Mermaid already first-class; CLI is the right layer; presentation-only.
- **Contradiction**: None. Reinforced by MDT-164's mermaid viewer.
- **Duplication**: None — no ticket→diagram path exists; board is UI-only today.
- **Prematurity**: Mild. Demand for embedded board snapshots is plausible but unverified. Low cost makes the bet cheap.
- **Scope**: Fits. Additive output format; no backend churn.
- **Dependency**: None blocking. Mermaid subgraph syntax is stable.
- **Cost**: **S**. One formatter + flag + tests.

## Decision

**Recommendation: Promote (scoped).** Fits the project, fills a real gap (portable board), small cost. Promote as a CLI feature ticket scoped to v1 = flowchart-subgraph Kanban grid + one output flag + documented regenerate-to-refresh contract. Explicitly defer the broader mermaid-output *family* (timeline, gantt, dependency graph, rollup) to follow-up ideas/tickets — that is where the larger document value lives, but it is a different scope and should be justified by actual usage of the grid first.

Open question for the user: is the regeneration mechanism (Make target / git hook / manual) in scope for v1, or follow-up? That decision determines whether this ships as "honest snapshot" or "drift risk".
