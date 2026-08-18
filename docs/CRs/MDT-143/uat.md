# UAT Refinement Brief

## Objective

Make every ticket-addressing surface of MDT-143 work for non-interactive
consumers that run with a cwd that is not a project root. Consumers that know
the project code (`mcp-server`, `dsh-plugin/mdt.js`) must be able to address a
ticket explicitly; `ticket get` and `ticket attr` are the last CLI subcommands
that reject `-p/--project`.

## Approved Changes

| Change | Detail |
|--------|--------|
| `-p` on `ticket get` / `ticket attr` | Same `-p, --project <code>` option as `list`/`create`/`deps`; explicit project wins over cwd detection; unknown project → `Project <code> not found`, exit 1; identical behavior when omitted. `cli/mdt-cli/SKILL.md` updated (canonical agent-facing reference, per `cli/AGENTS.md`). |
| MCP project contract | Verified and locked as C8: the MCP server is in-process (not a CLI wrapper); every CR tool already accepts `project`, falls back to detected cwd context only when absent, and `resolveProject` throws a structured actionable error naming the missing `project` parameter. No premise-matching rewrite needed; e2e coverage confirmed. |
| DSH plugin alignment | `mdt_ticket_get` and `mdt_ticket_attr` gain the optional `project` parameter via the existing `projectArgs()` pattern; cwd caveats removed from descriptions; tool names and all other schema fields unchanged. |

## Changed Requirement IDs

- `BR-1` — refined in place (`ticket get -p`)
- `BR-10` — refined in place (`ticket attr -p`)
- `Edge-11` — added (unknown `-p` project rejection on get/attr)
- `C8` — added (MCP explicit-project contract, verified as already satisfied)
- `C9` — added (DSH plugin schema mirrors CLI flag surface, names stable)

## Affected Downstream Trace

- requirements: BR-1, BR-10 refined; Edge-11, C8, C9 added → rendered
- bdd: `ticket_get_attr_in_explicit_project` added (covers BR-1, BR-10) → rendered
- architecture: `ART-dsh-plugin-mdt`, `ART-mcp-project-handlers` added; `OBL-explicit-project-targeting` added → rendered
- tests: `TEST-cli-get-attr-project`, `TEST-mcp-explicit-project`, `TEST-dsh-plugin-project-flag` added → rendered
- tasks: `TASK-uat-project-context` added → rendered

## Execution Slices

### Slice 1 — `-p/--project` on `ticket get` and `ticket attr` (CLI)

- **Objective**: resolve a ticket within an explicitly given project from any cwd.
- **Direct artifacts**: `cli/src/index.ts`, `cli/src/commands/view.ts`, `cli/src/commands/attr.ts`, `cli/mdt-cli/SKILL.md`, `cli/tests/e2e/ticket/`.
- **Direct GREEN targets**: `TEST-cli-get-attr-project`, `ticket_get_attr_in_explicit_project`.
- **Impacted canonical tasks**: `TASK-uat-project-context`.
- **Why**: consumers that know the project code cannot address a ticket without cwd context today.

### Slice 2 — MCP project contract verification (no code change expected)

- **Objective**: prove `create_cr` with explicit `project` succeeds from a non-project cwd and the no-context error is actionable.
- **Direct artifacts**: `mcp-server/src/tools/handlers/projectHandlers.ts` (read-only), `mcp-server/tests/e2e/tools/create-cr.spec.ts`.
- **Direct GREEN targets**: `TEST-mcp-explicit-project`.
- **Impacted canonical tasks**: `TASK-uat-project-context`.
- **Why**: the request assumed the MCP server wraps `mdt-cli`; it is in-process and already threads `project` — verify and lock the contract instead of rewriting.

### Slice 3 — DSH plugin alignment

- **Objective**: `mdt_ticket_get`/`mdt_ticket_attr` accept optional `project`; descriptions drop the cwd caveat.
- **Direct artifacts**: `dsh-plugin/mdt.js`, `dsh-plugin/AGENTS.md` (tool list wording only if needed).
- **Direct GREEN targets**: `TEST-dsh-plugin-project-flag` (import + schema check).
- **Impacted canonical tasks**: `TASK-uat-project-context`.
- **Why**: the plugin omitted `project` only because the CLI rejected it; item 1 removes that blocker.

## Validation (results)

- `./cli/bin/mdt-cli ticket get -p MDT MDT-143 --json` from `/tmp` — ✅ returns the ticket
- `./cli/bin/mdt-cli ticket attr -p MDT 143 status=Implemented --json` from `/tmp` — ✅ applies (no-op) update, exit 0
- Unknown `-p` code — ✅ `PROJECT_NOT_FOUND` / `Project <code> not found`, exit 1 (structured envelope)
- MCP e2e: `create-cr.spec.ts` + `optional-project-param.spec.ts` — ✅ 26/26 (incl. new explicit-project-from-non-project-cwd and actionable-error tests)
- `node -e "import('.../dsh-plugin/mdt.js')"` — ✅ loads; all 6 tool names unchanged; `project` present on get/list/create/attr/deps
- `bun test` (cli) — ✅ 218/218 (new `ticket/project-flag.spec.ts` 6/6); `eslint` clean
- MCP jest unit/integration — ✅ 159/159
- `spec-trace validate MDT-143 --stage all` — ✅ all five stages pass; all rendered
- Extra fix surfaced by verification: `import * as fs from 'fs-extra'` broke Node-ESM consumers (`fs.stat is not a function`) — switched to default import in `TicketService` and `mcp-server/config`; this had silently broken all node-run create e2e tests

## Watchlist

- Explicit-project precedence is now "flag wins" across list/create/deps/get/attr — keep MCP `resolveProject` (explicit > key-embedded > detected > single-registry-project) consistent if precedence is ever revisited.
- `dsh-plugin` tool names and non-`project` schema fields are preset contracts; do not rename.
- Deferred concerns UC-1 (orphan `{KEY}/` subdocument folder on delete) and UC-2 (`.trace/{KEY}/` never cleaned on delete), raised 2026-07-26 below, remain open for a separate session.

## Open Decisions

None. Item 2's premise (MCP wrapping `mdt-cli`) did not match the repo; the in-process contract was verified instead of rewritten.

---

## UAT Concerns (2026-07-26)

Raised during MDT-209 planning (ticket write governance / agent deletion
protection). Logged here for a **separate session** — do not address in MDT-209.

### UC-1: `delete` leaves orphan `{KEY}/` subdocument folder when non-empty

**Repro**: `mdt-cli delete 143` on a project where `docs/CRs/MDT-143/` contains
sibling subdocuments (architecture.md, bdd.md, tasks.md, …).

**Current behavior**: `cli/src/commands/delete.ts:59 cleanupEmptyCRDir` removes
the folder **only if empty** after the `.md` file is gone. With subdocuments
present, the `.md` is removed but the folder — and its 13 sibling files —
survives as an orphan.

**Question**: should `delete` (a) recursively remove the entire `{KEY}/` folder,
(b) refuse unless `--purge-subdocuments` is passed, or (c) stay as-is and treat
subdocuments as independent artifacts? (a) matches user mental model of
"deleting the ticket"; (b) is safer; (c) is current behavior.

### UC-2: `delete` never touches `{ticketsPath}/.trace/{KEY}/`

**Repro**: `mdt-cli delete 143` leaves `docs/CRs/.trace/MDT-143/` (with
`baselines/` and `store.json`) intact on disk forever.

**Question**: should `delete` cascade to `.trace/{KEY}/`? If yes, `delete.ts`
needs to resolve the trace root and remove it. If no, document it as an
intentional separation of concerns.

### Scope note

Closing UC-1/UC-2 becomes more urgent once MDT-209 ships (it forces deletes
through `mdt-cli`), but is out of scope for that ticket and for this round.
