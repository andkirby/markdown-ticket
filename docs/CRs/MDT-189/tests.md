# Test Plan — MDT-189

Related CR: [`MDT-189-dep-graph-foundation.md`](../MDT-189-dep-graph-foundation.md)
BDD: [`MDT-189/bdd.md`](bdd.md) · Architecture: [`MDT-189/architecture.md`](architecture.md)

## Strategy

The acceptance test is **the user running `mdt-cli deps MDT-188 --check` and
seeing the VOC violation row.** Unit tests support it; they do not replace it.

Three layers, bottom-up:

1. Unit (graph module + satisfaction) — Jest in `shared/`.
2. Migration (script + invariant check) — Jest against a fixture repo.
3. CLI end-to-end (command → stdout) — Jest against an in-memory project,
   mirroring how `cli/src/commands/list.ts` is tested.

Manual smoke test (the real acceptance): run against the live repo after
migration, eyeball the output.

## Unit — `shared/services/ticket/DependencyGraph.ts`

Target: `shared/services/ticket/DependencyGraph.test.ts`

| ID | Test | Maps to BDD |
|---|---|---|
| TEST-buildGraph-same-project | Bare number `["053"]` resolves to `{CODE}-053` against active project | — |
| TEST-buildGraph-cross-project | Fully-qualified `["VOC-053"]` stays as-is | S2 |
| TEST-buildGraph-dedup | Duplicate `dependsOn` entries collapse to one edge | — |
| TEST-satisfaction-implemented | `isDependencySatisfied("Implemented")` → true | S5 |
| TEST-satisfaction-rejected | `isDependencySatisfied("Rejected")` → false; `classifyViolation` → `broken-plan` | S3 |
| TEST-satisfaction-unknown | `isDependencySatisfied("Deferred")` → false (safe default) | S7 |
| TEST-violations-waiting | Approved dep → one violation, kind `waiting`, action informational | S1 |
| TEST-violations-broken-rejected | Rejected dep → kind `broken-plan`, action names reject/unlink | S3 |
| TEST-violations-missing | Non-existent target → status `missing`, kind `broken-plan` | S4 |
| TEST-violations-clean | All Implemented → empty array | S5 |
| TEST-detectCycle-two | `A→B, B→A` → returns `["A","B","A"]` | — |
| TEST-detectCycle-three | `A→B, B→C, C→A` → returns path | — |
| TEST-detectCycle-none | DAG → returns null | — |
| TEST-detectCycle-large | 5-node synthetic cycle, performance check | Non-functional |
| TEST-topoSort-deterministic | Same graph twice → same order | — |
| TEST-topoSort-diamond | Diamond dependency → valid topological order | — |
| TEST-inverse-roundtrip | `inverse(buildGraph(t))` produces expected blocks map; round-trips with dependsOn | S13 |

## Unit — `domain-contracts/src/ticket/satisfaction.ts`

Target: `domain-contracts/src/ticket/satisfaction.test.ts`

- Covers every status in `CRStatusSchema` (7 values) — explicit expected result.
- Unknown status → false.
- `classifyViolation` for each of: Implemented, Rejected, missing, unknown.

## Migration — `scripts/migrate-blocks.ts`

Target: `scripts/migrate-blocks.test.ts`

Fixture repo under `scripts/__fixtures__/` with hand-crafted tickets exercising
every case.

| ID | Test | Maps to BDD |
|---|---|---|
| TEST-migration-dry-run | `--dry-run` prints report, writes nothing; fixture files unchanged | S11 |
| TEST-migration-adds-reciprocal | Ticket with dependsOn but no blocks → after run, blocks populated | — |
| TEST-migration-removes-stale | Ticket with blocks but no inbound dependsOn → after run, blocks cleared | — |
| TEST-migration-contradiction-prompt-y | `A dependsOn B, A blocks B` + stdin "y" → blocks dropped, dependsOn kept | S12 |
| TEST-migration-contradiction-abort | Same fixture + stdin "n" or EOF → run aborts, no writes | S12 |
| TEST-migration-invariant | After successful run, `blocks === inverse(dependsOn)` for 100% of fixture tickets | S13 |
| TEST-migration-report-format | Report contains: N changed, M added, K removed, J contradictions resolved | — |

## CLI — `cli/src/commands/deps.ts`

Target: `cli/src/commands/deps.test.ts`

Pattern mirrors `cli/src/commands/list.test.ts` (in-memory project, capture
stdout). Each BDD scenario S1–S18 gets a test. S15–S18 added in UAT
2026-07-19 for the relationship-inventory amendment.

| ID | Test | Maps to BDD |
|---|---|---|
| TEST-deps-voc-scenario | S1 end-to-end against fixture | **S1 (acceptance)** |
| TEST-deps-cross-project | S2 — VOC-053 row, fully-qualified | S2 |
| TEST-deps-broken-rejected | S3 — broken-plan action text | S3 |
| TEST-deps-broken-missing | S4 — status "missing" | S4 |
| TEST-deps-clean | S5 — "Ready: YES" | S5 |
| TEST-deps-no-deps | S6 — leaf ticket | S6 |
| TEST-deps-unknown-status | S7 — legacy Deferred → waiting | S7 |
| TEST-deps-prose-gaps | S8 — precondition section scan, missing structured deps | S8 |
| TEST-deps-prose-ignore-casual | S9 — "see also MDT-030" not flagged | S9 |
| TEST-deps-json | S10 — JSON shape, parseable; now includes `relations` block per UAT | S10, S18 |
| TEST-deps-not-found | Bad key → `CliCommandError`, exit non-zero | — |
| TEST-deps-write-path-rejected | S14 — `attr blocks+=` rejected | S14 |
| TEST-deps-default-inventory | S15 — default output includes relationship-inventory section with Depends on + Blocks | S15 |
| TEST-deps-outgoing-blocks | S16 — empty dependsOn + non-empty blocks renders the blocking role (the MDT-189 self-case) | S16 |
| TEST-deps-check-strict | S17 — `--check` strict mode stays violations-only; pre-UAT output contract preserved | S17 |
| TEST-deps-relations-json | S18 — JSON/YAML carries `data.relations { dependsOn, blocks }` with `{ key, status }` entries | S18 |

## Write-path removal — `shared/services/TicketService.ts`

Target: extend existing `server/tests/unit/TicketService.test.ts` (or
`shared/services/ticket/__tests__/`).

| ID | Test | Maps to BDD |
|---|---|---|
| TEST-blocks-write-rejected | `updateTicketAttributes({blocks: [...]})` throws with actionable error | S14 |
| TEST-blocks-still-derived | After dependsOn change, MarkdownService writes derived blocks | — |
| TEST-relations-still-work | `dependsOn`, `relatedTickets` writes unaffected | Regression |

## Manual acceptance (the real test)

After migration lands, before merging:

```bash
# Should print violation table naming real unfinished deps in the live repo
mdt-cli deps MDT-188 --check
mdt-cli deps MDT-189 --check

# Should print the migration report's invariant line
cat docs/CRs/MDT-189/blocks-migration-report.md | grep "Invariant verified"

# Should fail loudly
mdt-cli attr 189 blocks+=MDT-999
```

If any of these doesn't behave as described, the ticket is not done.

## Coverage bar

- Every `DependencyGraph` exported function: 100% line, every branch hit.
- Migration: every branch of the diff classification (added/removed/contradiction).
- CLI: every BDD scenario S1–S10 has a corresponding test.
- No proxy signals accepted as completion. The manual smoke test is part of
  "done," not optional.

## Out of scope

- Write-time cycle rejection (MDT-191).
- Status-transition guardrails (MDT-191).
- `--tree` / `--mermaid` tests (deferred unless those flags ship here).
- UI tests (v1.1).
