---
code: MDT-204
status: Implemented
dateCreated: 2026-07-26T00:00:00.000Z
type: Feature Enhancement
priority: Medium
relatedTickets: MDT-174
---

# Add trace graph chain-depth traversal

## 1. Description

### Requirements Scope

`full` - concrete change to one static asset, with behavioral acceptance criteria derivable from the trace graph model.

### Problem

- The trace graph viewer (MDT-174) highlighted only the **direct 1-hop neighborhood** of a selected card. Selecting a requirement lit up its obligations, BDD scenarios, and test plans, but the downstream Artifacts and Tasks columns stayed empty because those nodes are 2-3 hops away.
- The `task.makesGreenIds` back-edge (BDD scenario -> task) and `obligation.derivedFrom` (requirement -> obligation) mean the meaningful pipeline `requirement -> obligation -> artifact -> task` is not visible from a single selection at 1 hop.
- A naive bidirectional multi-hop traversal pulls in unrelated nodes: sibling obligations sharing a constraint, sibling requirements sharing a scenario, and other tasks sharing an artifact. This drowns the active set in transitive noise.
- Splines (edge highlights) only rendered as active when an edge was directly incident to the selected node, so multi-hop chains lit up cards but not the connections between them.

### Affected Artifacts

- `public/spec-trace/trace-dashboard.html` - the single static asset owning all graph-board internals. This CR touches nothing else.
- `dist/spec-trace/trace-dashboard.html` - build copy; refreshed by `bun run build` (currently blocked by unrelated pre-existing TS errors in `shared/services/cloud-sync/*`, tracked separately under MDT-201).

### Scope

- Changes:
  - Add a `chainDepth` view control (1-4 hops, default 2, persisted to `localStorage`).
  - Replace the 1-hop `activeNeighborhood` with a directional hybrid: hop 1 is bidirectional and immutable; hops 2..N are forward-only and seed only from forward-reached hop-1 nodes.
  - Add a `forward` adjacency map to `buildGraph` alongside the existing bidirectional `related` map.
  - Fix `drawEdges` so an edge renders active when both endpoints are in the active neighborhood, without requiring incidence to the selected node.
- Unchanged:
  - The viewer shell, iframe, `#trace` hash, API endpoints, and path resolution (all MDT-174, untouched).
  - Search (`visibleNodeIds`) and the detail panel continue to use the bidirectional `related` map; those paths are intentionally bidirectional.
  - The store schema and the `spec-trace` CLI writer.
  - The graph board remains a static HTML reader; no React port.

## 2. Decision

### Chosen Approach

Hybrid directional traversal: **hop 1 is always bidirectional; hops 2..N are forward-only and seed only from forward-reached hop-1 nodes (backward-reached hop-1 nodes are leaves).**

### Rationale

The directional rule encodes two distinct questions a user asks of a selected card:

- "Where did this come from?" - answered by backward edges. Terminal: show the direct source, do not chase its other descendants.
- "What does this flow to downstream?" - answered by forward edges. Continues: follow the pipeline.

Making hop 1 bidirectional restores the original pre-chain behavior (selecting an artifact shows its parent obligation; selecting a task shows its owned artifacts). Making hops 2+ forward-only prevents transitive noise (a shared upstream constraint does not pull in sibling obligations). Making only forward-reached hop-1 nodes seed hop 2 is the precise rule that excludes sibling obligations reached through a shared requirement while still letting a requirement flow all the way to tasks.

### Worked example

Selecting `OBL-provisioning-authority` (derives from `BR-1.2` and `C5`; maps to three artifacts):

- Hop 1 (bidirectional): `{BR-1.2, C5}` (sources, backward-reached, leaves) + three artifacts (forward-reached, propagate).
- Hop 2 (forward-only from forward-reached hop-1): artifacts propagate to their tasks.
- Result: `{BR-1.2, C5, three artifacts, their tasks}`. `OBL-trusted-service-profile`, which also derives from `C5`, is **not** activated because `C5` is a backward leaf and does not propagate.

## 3. Alternatives Considered

| Approach | Key Difference | Why Rejected |
|----------|----------------|--------------|
| **Chosen Approach** | Hop-1 bidirectional + forward-only hops 2+ seeded from forward-reached nodes | **ACCEPTED** - Restores original lineage behavior, kills transitive noise, preserves requirement->task chain |
| Pure forward-only BFS | All hops directional from the seed | Rejected: regresses the original behavior. Selecting a task showed only itself (no owned artifacts); selecting an artifact showed no parent obligation. Non-requirement seeds lost their lineage. |
| Pure bidirectional BFS | All hops use the symmetrized `related` map | Rejected: drowns the active set. Selecting a requirement at depth 2 dragged in 8 sibling requirements through shared scenarios. Unusable. |
| "Auto-expand until all columns non-empty" heuristic | Walk until every downstream column has content | Rejected: unpredictable, unmaintainable, hides the traversal decision from the user. |
| Apply chain depth to search (`visibleNodeIds`) too | Search expands N hops from matches | Rejected: typing a query would flood the board. Search stays 1-hop bidirectional; chain depth is a selection-only concept. |

## 4. Artifact Specifications

### Modified Artifacts

| Artifact | Change Type | Modification |
|----------|-------------|--------------|
| `public/spec-trace/trace-dashboard.html` | Behavioral change | Add `chainDepth` state + control + persistence; add `forward` adjacency map; rewrite `activeNeighborhood` with the directional hybrid; fix `drawEdges` active classification; default depth 2 with versioned storage key |

No new artifacts. No backend, frontend React, shared, or test changes.

### Integration Points

| From | To | Interface |
|------|----|-----------|
| Chain depth `<select>` | `state.chainDepth` | `change` event; clamped to `[1, 4]`; persisted to `specTrace.traceDashboard.chainDepth.v2` |
| `buildGraph` | `activeNeighborhood`, `drawEdges` | returns `{ nodes, edges, nodeById, related, forward }` - `forward` is new, `related` unchanged |
| `activeNeighborhood` | `renderColumns`, `drawEdges` | returns the active `Set<id>`; both consumers use it unchanged |

### Key Patterns

- View-preference persistence (same class as `fullCards`, `asideCollapsed`): survives page reload, not reset by Clear Focus.
- Versioned storage key (`chainDepth.v2`): the prior unversioned key is intentionally orphaned so users with the old silent default of 1 fall through to the new default of 2.
- Two adjacency maps with distinct roles: `related` (bidirectional) for search and detail panel; `forward` (directional) for the selection chain. Keeps each consumer's semantics explicit.

## 5. UX Source of Truth

### Boundary

- This CR does **not** create a trace graph board UX spec. MDT-174 established that graph-board internals are owned by `trace-dashboard.html`.
- The chain depth control follows existing dashboard control conventions (matches `stageSelect` styling and event wiring).
- Layout, copy, and visual treatment of the control are dashboard-internal and not governed by `docs/design/surfaces/`.

## 6. Acceptance Criteria

### Functional

- [x] A "Chain depth" control is present in the dashboard controls bar with options 1, 2, 3, 4 hops.
- [x] Default chain depth is 2; the default is applied when no persisted preference exists.
- [x] Chain depth persists to `localStorage` across page reloads and is not reset by "Clear Focus".
- [x] At depth 1, the active set equals the original bidirectional 1-hop neighborhood (no regression).
- [x] At depth >=2, hop 1 is bidirectional and hops 2..N are forward-only.
- [x] Selecting a requirement at depth >=2 flows downstream through obligations to artifacts and tasks without activating sibling requirements reached through shared scenarios.
- [x] Selecting an obligation at depth >=2 activates its source requirements as leaves and its downstream artifacts/tasks as a chain, without activating sibling obligations reached through a shared source requirement.
- [x] Selecting a task at any depth shows its owned artifacts (backward lineage preserved).
- [x] Backward-reached hop-1 nodes are leaves: they appear in the active set but do not propagate at hops 2+.
- [x] Edge splines render active when both endpoints are in the active neighborhood, including multi-hop edges not incident to the selected node.
- [x] Search (`visibleNodeIds`) remains 1-hop bidirectional and is unaffected by chain depth.

### Non-Functional

- [x] The active set grows monotonically with depth (no cycles, no regressions for a fixed selection).
- [x] Chain depth is clamped to `[1, 4]` so a dense store cannot explode the active set.
- [x] Dashboard renders BR-1.2 at depth 3 in under 50ms on the MDT-201 store (measured: ~14ms render, ~23ms including click).
- [x] No new network requests; all computation is in-memory from the already-fetched store.

### Testing

- Manual (executed via `agent-browser` against the live MDT-201 trace store, fresh page loads, click-landing verified in-eval):
  - Requirement seed (`BR-1.2`): depth 1 = self only; depth 2 = +artifacts+tasks; depth 3 = +more tasks. Requirements column stays at the selected card at every depth.
  - Obligation seed (`OBL-provisioning-authority`): depth 2 activates `{BR-1.2, C5, 3 artifacts, 3 tasks}`; `OBL-trusted-service-profile` (sibling via shared `C5`) is **not** activated.
  - Task seed (`TASK-1`): depth 1 shows owned artifacts (backward lineage).
  - Spline counts scale with depth: 4 active at depth 1, 10 active at depth 2-3 for `BR-1.2`.
- Algorithm proven in isolation against a reconstructed MDT-201 subgraph before browser testing (forward-only assertions, leaf-rule assertions, bidirectional hop-1 parity).
- Static: dashboard `<script>` parses via `new Function()` after each edit.

### Out of Scope for Verification

- E2E (Playwright): not added. The dashboard is a static HTML reader loaded in an iframe; MDT-174's boundary left its internals untested by the MDT E2E suite. Adding E2E here would cross that boundary. Manual verification via `agent-browser` is the evidence of record.
- Unit tests on `activeNeighborhood`: the function is a closure inside the dashboard IIFE and not exported. Extracting it for testability would be a separate refactor.

## 7. Verification

### Feature Verification

- All Functional and Non-Functional criteria above are checked.
- `public/spec-trace/trace-dashboard.html` parses cleanly.
- Dev server at :3075 serves the updated file (verified via `curl` marker checks).
- Browser verification reproduces the worked example exactly.

### Known Limitations

- `bun run build` currently fails on pre-existing TypeScript errors in `shared/services/cloud-sync/*` (MDT-201 work-in-progress, untracked files). This blocks `dist/spec-trace/trace-dashboard.html` refresh but does not affect the dev server, which serves `public/` directly. Resolving those TS errors is out of scope for this CR.
- The viewport-clipping behavior in `drawEdges` (`isNodeVisibleInColumn`) is pre-existing and intentional: splines only render between cards currently scrolled into their column viewport. Active cards scrolled out of view highlight correctly; their splines appear when scrolled into view. This is unchanged by this CR.

### Metrics

- No performance metric is claimed beyond the render-time observation above.
- Verification is based on manual browser exercise against a real trace store, isolated algorithm proof, and static parse checks.

## 8. Deployment

### Simple Changes

- Deploy the updated `public/spec-trace/trace-dashboard.html` with the normal web build (once the unrelated MDT-201 TS errors are resolved and `bun run build` succeeds).
- No backend, config, or data migration.
- Rollback by reverting `public/spec-trace/trace-dashboard.html`. Users with a persisted `chainDepth.v2` preference will keep their choice; the orphaned prior key (`specTrace.traceDashboard.chainDepth`) is harmless dead storage.

## 9. Documentation Boundary

- This CR captures the chain-depth feature design and acceptance evidence.
- Graph-board internals remain owned by `trace-dashboard.html` per the MDT-174 boundary.
- No durable UX surface doc is created or updated by this CR.
