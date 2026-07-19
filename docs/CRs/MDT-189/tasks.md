# Tasks — MDT-189

Related CR: [`MDT-189-dep-graph-foundation.md`](../MDT-189-dep-graph-foundation.md)
Architecture: [`MDT-189/architecture.md`](architecture.md) · Tests: [`MDT-189/tests.md`](tests.md) · BDD: [`MDT-189/bdd.md`](bdd.md)

Tasks are ordered to match the migration-then-enforce sequence. **Commit
boundary per task** — the migration data commit and the write-path removal
commit must be separate so the one-way door is revertible.

## Foundation

- [ ] 1. Add satisfaction function (`TASK-satisfaction`)
  Owns: `domain-contracts/src/ticket/satisfaction.ts`, `.test.ts`
  Makes Green: TEST-satisfaction-*
  Notes: pure function over CRStatusSchema. `classifyViolation` for
  missing/Rejected/etc. No graph dependency.

- [ ] 2. Add graph module (`TASK-graph`)
  Owns: `shared/services/ticket/DependencyGraph.ts`, `.test.ts`
  Makes Green: TEST-buildGraph-*, TEST-violations-*, TEST-detectCycle-*,
  TEST-topoSort-*, TEST-inverse-*
  Notes: pure functions over `Ticket[]`. Key resolution rule (D1 in arch).
  Cross-project keys day-one.

## Migration

- [ ] 3. Add migration script + fixture (`TASK-migration`)
  Owns: `scripts/migrate-blocks.ts`, `scripts/__fixtures__/`, `.test.ts`
  Makes Green: TEST-migration-*
  Notes: dry-run mode, interactive contradiction prompt, invariant check.
  Report written to `docs/CRs/MDT-189/blocks-migration-report.md`.

- [ ] 4. Run dry-run; review report (`TASK-dryrun`)
  Owns: nothing (review only)
  Makes Green: prerequisite for TASK-migrate-real
  Notes: run `bun run scripts/migrate-blocks.ts --dry-run`, read the output,
  decide each contradiction's resolution in advance.

- [ ] 5. Run real migration; commit data + report (`TASK-migrate-real`)
  Owns: every `docs/CRs/MDT-*.md` file with changed `blocks:`,
  `docs/CRs/MDT-189/blocks-migration-report.md`
  Makes Green: TEST-migration-invariant on live repo
  Notes: **Own commit.** This is the one-way door. Title:
  `chore(MDT-189): migrate blocks to derived inverse of dependsOn`.

- [ ] 6. Remove `blocks` write path (`TASK-remove-write`)
  Owns: `shared/services/TicketService.ts:51,108-159`,
  `shared/services/MarkdownService.ts:240-247`,
  `server/tests/unit/TicketService.test.ts` (or shared equivalent)
  Makes Green: TEST-blocks-write-rejected, TEST-blocks-still-derived,
  TEST-relations-still-work
  Notes: **Separate commit** from TASK-migrate-real so the write-path removal
  is revertible independently. `MarkdownService` keeps writing `blocks` from
  the derived value; only the user-facing write path dies.

## CLI

- [ ] 7. Add deps formatter (`TASK-formatter`)
  Owns: `cli/src/output/depsFormatter.ts`
  Makes Green: prerequisite for TASK-deps-command
  Notes: table renderer for violations; prose-gap section. Respects `NO_COLOR`
  via existing `colors.ts`. No graph logic.

- [ ] 8. Add deps command + registration (`TASK-deps-command`)
  Owns: `cli/src/commands/deps.ts`, `cli/src/index.ts` (register),
  `cli/src/commands/deps.test.ts`
  Makes Green: TEST-deps-voc-scenario (the acceptance test), TEST-deps-*
  Notes: `--check` default; `--json`; `--project`. Top-level `deps` alias.
  **If `--tree`/`--mermaid` are trivial here, add them; otherwise defer.**

- [ ] 9. Add prose-gap scanner (`TASK-prose-scan`)
  Owns: `shared/services/ticket/proseScanner.ts` (shared, not cli/ — MCP will
  reuse), `cli/src/commands/deps.ts` (wire-in)
  Makes Green: TEST-deps-prose-gaps, TEST-deps-prose-ignore-casual
  Notes: scan only `## Precondition` / `## Prerequisites` sections. Regex for
  CR-key tokens; diff against `dependsOn`. Informational only in v1 — no write.

## Verification

- [ ] 10. Run full test suite (`TASK-tests`)
  Owns: nothing
  Makes Green: every test ID above
  Notes: `bun run --cwd server jest`; `bun run validate:ts` on changed files.

- [ ] 11. Manual acceptance smoke (`TASK-smoke`)
  Owns: nothing
  Makes Green: the user-visible definition of done
  Notes:
  ```
  mdt-cli deps MDT-188 --check    # see real violation table
  mdt-cli deps MDT-189 --check    # self-check
  mdt-cli attr 189 blocks+=MDT-999  # must fail loudly
  cat docs/CRs/MDT-189/blocks-migration-report.md | grep "Invariant verified"
  ```
  If any of these doesn't behave as described, the ticket is not done.

## Cut lines (defer if they balloon)

- `--tree`, `--mermaid` — defer to follow-up if TASK-formatter or
  TASK-deps-command grows beyond a day's work.
- Prose reconciliation *write* (the y/N prompt that mutates dependsOn) —
  deferred to MDT-191 (needs write-validation path).
- Status-transition guardrail — MDT-191.
- Write-time cycle rejection — MDT-191.

## UAT 2026-07-19 — Relationship inventory amendment

Tasks 1–11 are the original v1 plan and have shipped. UAT 2026-07-19 found
that the shipped `deps <KEY>` output is violations-only — a ticket that only
blocks others renders as a bare "Ready: YES" indistinguishable from a leaf.
These two tasks close that gap. See `uat.md` for the brief.

- [ ] 12. Add relationship-inventory formatter + `--check` strict mode (`TASK-relations-formatter`)
  Owns: `cli/src/output/depsFormatter.ts` (extend), `cli/src/commands/deps.ts`
  (strict-mode flag handling)
  Makes Green: TEST-deps-default-inventory, TEST-deps-outgoing-blocks,
  TEST-deps-check-strict
  Notes: extend `DepsReport` with an optional `relations` field; add
  `formatRelationshipInventory()` that renders "Depends on" and "Blocks"
  sections from `target.dependsOn` and `inverse(graph)` respectively. Default
  output gains the section; `--check` strict suppresses it. The inventory must
  call `inverse(graph)` (C-11) — never re-derive blocking edges from raw
  arrays in the CLI.

- [ ] 13. Wire `relations` block into structured output (`TASK-relations-wire`)
  Owns: `cli/src/commands/deps.ts` (structured-output branch), structured
  output tests
  Makes Green: TEST-deps-relations-json, TEST-deps-json (amended)
  Notes: add `data.relations = { dependsOn: [{key, status}], blocks: [{key,
  status}] }` to both `--json` and `--yaml` outputs. Existing `violations`
  and `proseGaps` fields unchanged. The `relations` block is computed in the
  same `depsAction` call that already builds the graph; no second traversal.

## Sequencing rules

- TASK-graph depends on TASK-satisfaction.
- TASK-migration depends on TASK-graph.
- TASK-migrate-real depends on TASK-dryrun (human review gate).
- TASK-remove-write depends on TASK-migrate-real (and is its own commit).
- TASK-deps-command depends on TASK-graph + TASK-formatter.
- TASK-prose-scan can parallelize with TASK-formatter.
- TASK-relations-wire depends on TASK-relations-formatter.
- TASK-smoke (re-run after UAT amendment) is the gate; nothing else closes
  the ticket.

## Effort estimate

- Foundation (TASK-satisfaction, TASK-graph): ~1 day. ✓ shipped
- Migration (TASK-migration + dryrun + real + remove-write): ~1 day, plus
  review time for the data commit. ✓ shipped (dry-run; real write deferred
  per operator decision)
- CLI (TASK-formatter + deps-command + prose-scan): ~1 day. ✓ shipped
- Verification: ~0.5 day. ✓ shipped
- UAT 2026-07-19 amendment (TASK-relations-formatter + relations-wire):
  ~0.5 day. **In progress.**

**v1 total: ~3.5 days. UAT amendment: +0.5 day.**
The graph module is small; the migration review is the real time sink.
