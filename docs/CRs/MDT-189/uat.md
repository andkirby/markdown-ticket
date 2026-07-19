# UAT Refinement Brief

**Ticket:** MDT-189 — Dependency Graph v1
**UAT round:** 2026-07-19
**Trigger:** Operator ran `mdt ticket deps --yaml 189` and observed that the
command shows validation status only — no relationship tree for the selected
ticket.

## Objective

Close the definition-of-done miss exposed by UAT: a ticket that only has
outgoing `blocks` edges (e.g., MDT-189 itself: `dependsOn: []`,
`blocks: [MDT-191]`) renders as a bare "Ready: YES" indistinguishable from a
leaf ticket with no relationships. The default `deps` output must show the
relationship inventory, not just the violations derived from it.

## Approved Changes

1. **Default `deps <KEY>` output gains a relationship-inventory section.**
   - "Depends on" — every `dependsOn` entry with its current status.
   - "Blocks" — every entry in `inverse(graph)` pointing at this ticket (what
     this ticket blocks) with each blocker's current status.
   - Renders independent of whether any violations exist.
2. **`--check` becomes strict mode.** Preserves the pre-UAT violations-only
   contract for scripts. Default output (no flag) is the inventory view.
3. **Structured `--json` / `--yaml` gains a `relations` block.**
   `data.relations = { dependsOn: [{key, status}], blocks: [{key, status}] }`
   alongside existing `violations` and `proseGaps`.
4. **Inventory data sourced from `inverse(graph)`.** Never re-derived from raw
   arrays in the CLI — keeps C-6 (single graph interpreter) intact and avoids
   a second source of truth for the same symmetric fact.

## Changed Requirement IDs

| ID | Change | Rationale |
|---|---|---|
| BR-3.1 | `refine_in_place` — expanded JSON schema to include `relations` block | Same intent (machine-readable deps view); contract expanded, not replaced |
| BR-6.1 | `additive_change` — new | Default output shows relationship inventory |
| BR-6.2 | `additive_change` — new | Outgoing-blocks ticket renders blocking role (the MDT-189 self-case) |
| BR-6.3 | `additive_change` — new | `--check` strict mode stays violations-only |
| BR-6.4 | `additive_change` — new | JSON/YAML carries `relations` block |
| C-11 | `additive_change` — new constraint | Inventory computed via `inverse(graph)`, not re-derived in CLI |

Scenarios S15–S18 added in `bdd.md`; test plans TEST-deps-default-inventory,
TEST-deps-outgoing-blocks, TEST-deps-check-strict, TEST-deps-relations-json
added in `tests.md`; tasks TASK-relations-formatter, TASK-relations-wire added
in `tasks.md`.

## Affected Downstream Trace

| Stage | Changed |
|---|---|
| requirements | BR-3.1 refined; BR-6.1–6.4, C-11 added |
| bdd | S15, S16, S17, S18 added |
| architecture | D6 added; Data Flow updated for default vs strict mode; relations block in structured output |
| tests | 4 new test-plan IDs; TEST-deps-json covers amended S10+S18 |
| tasks | TASK-relations-formatter, TASK-relations-wire added; sequencing rules updated |

## Execution Slices

### Slice 1 — Relationship-inventory formatter + strict mode (`TASK-relations-formatter`)

- **Objective:** Default `deps <KEY>` output renders Depends on + Blocks
  sections above the violations table; `--check` strict mode suppresses the
  inventory to preserve pre-UAT output.
- **Direct artifacts/files:**
  - `cli/src/output/depsFormatter.ts` — extend `DepsReport` with optional
    `relations` field; add `formatRelationshipInventory()`.
  - `cli/src/commands/deps.ts` — pass `--check` flag through to formatter;
    compute `inverse(graph)` and pass to formatter in default mode.
- **Direct GREEN targets:** `deps_default_inventory`,
  `deps_outgoing_blocks_render`, `deps_check_strict_violations_only`,
  `TEST-deps-default-inventory`, `TEST-deps-outgoing-blocks`,
  `TEST-deps-check-strict`.
- **Impacted canonical task IDs:** TASK-relations-formatter.
- **Why the slice exists:** This is the core product fix. Without it, MDT-189
  ships a `deps` command that returns empty for a ticket that has real
  relationships — the definition-of-done miss.

### Slice 2 — Relations block in structured output (`TASK-relations-wire`)

- **Objective:** `--json` and `--yaml` outputs include `data.relations` with
  `dependsOn` and `blocks` arrays, each entry `{ key, status }`. Existing
  `violations` and `proseGaps` fields unchanged.
- **Direct artifacts/files:**
  - `cli/src/commands/deps.ts` — structured-output branch; compute relations
    in the same `depsAction` call.
- **Direct GREEN targets:** `deps_relations_in_json`, `TEST-deps-relations-json`.
- **Impacted canonical task IDs:** TASK-relations-wire.
- **Why the slice exists:** Agents and scripts (MCP v1.1/v1.2, future
  tooling) need machine-readable access to the relationship inventory, not
  just the readiness verdict.

## Validation

```bash
# Per-stage gates (must all pass)
spec-trace validate MDT-189 --stage requirements
spec-trace validate MDT-189 --stage bdd
spec-trace validate MDT-189 --stage architecture
spec-trace validate MDT-189 --stage tests
spec-trace validate MDT-189 --stage tasks

# Bulk
spec-trace validate MDT-189 --stage all    # currently GREEN
spec-trace render all MDT-189              # refreshes *.trace.md

# Test suite (after implementation)
bun run --cwd server jest
bun run validate:ts
```

## Watchlist

- **S16 is the regression test for the original bug.** If a future change
  causes `deps MDT-189` to render as a bare "Ready: YES" again (no Blocks
  section despite `blocks: [MDT-191]`), S16 fails. Do not let this collapse.
- **`--check` backward compatibility.** S17 exists specifically because some
  script or agent may already depend on the violations-only default shape.
  Confirm before merging that no existing usage of `mdt-cli deps <KEY>` in
  the repo, tests, or docs assumes violations-only output without `--check`.
- **`inverse(graph)` performance.** Calling `inverse()` on every default
  `deps` invocation is O(V+E). Fine at 168 tickets; revisit if a project
  crosses ~10k tickets.

## Open Decisions

- **Should `--check` strict mode also drop the prose-gaps section, or only
  the relationship inventory?** Current spec (BR-6.3, S17) says
  "violations-only." If scripts also relied on prose-gaps in the default
  output, we'd need a separate flag. Decision: keep prose-gaps in strict mode
  (they're already informational; not structural). Confirm during
  implementation review.

## Suggested Next Commands

```bash
mdt:implement MDT-189    # implement TASK-relations-formatter + TASK-relations-wire
mdt:reflection MDT-189   # post-implementation review after UAT fixes land
```
