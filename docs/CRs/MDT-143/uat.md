# UAT Refinement Brief

## Objective

Complete the CLI alias-system rebuild and help-parity work on MDT-143. The attr
enum-value resolution had been half-migrated: `attr` delegated to a new shared
resolver while `list` still used a stale CLI-local map, so the same token meant
two things. A refactor also left relation-value comma-splitting unreachable.
This round finishes the migration, removes the duplicate map, fixes both
regressions, and makes `ticket attr --help` and the accepted-field list derive
from one metadata source.

## Approved Changes

| Change | Detail |
|--------|--------|
| Shared input gate | `shared/services/ticket/attrResolver.ts` is the single resolver for status + priority tokens; CLI `attr` and `list` both route through it. Added non-throwing `lookupStatusToken` for the read/filter path. |
| Single-source help | `cli/src/commands/attrMeta.ts` owns the field list + help text; `index.ts` (`--help`) and `attr.ts` (parser validation) both import it, so documented and validated fields cannot drift. |
| Alias drift fix | `status=open` now means Approved everywhere (was Proposed in `list`, Approved in `attr`). `backlog`→Proposed, `deferred`→On Hold added consistently. |
| Duplicate map removed | Stale `STATUS_ALIASES` deleted from `cli/src/utils/aliases.ts`; status tokens no longer have a second source of truth. |
| Relation regression fix | `related`/`depends`/`blocks` values split on commas again (branch moved ahead of the early `return` in `attr.ts`). |
| Doc sync | `cli/mdt-cli/SKILL.md` alias reference corrected (`open`→Approved, `backlog`/`deferred` added). |

## Changed Requirement IDs

- `BR-4` — refined in place (list status filter uses shared gate)
- `BR-10` — refined in place (shared gate, unknown rejection, relation split, single-source help)
- `C2` — refined in place (single metadata module owns the field list)
- `Edge-2` — refined in place (unknown enum values rejected with valid set + alias map)

## Affected Downstream Trace

- requirements: BR-4, BR-10, C2, Edge-2 refined → rendered
- bdd: validated (existing scenarios cover alias normalization + rejection)
- architecture: `OBL-shared-attr-gate` added (owns `ART-shared-attr-resolver`, `ART-shared-attr-resolver-test`, `ART-cli-attr-meta`, `ART-cli-attr`, `ART-cli-list`) → rendered
- tests: `TEST-shared-attr-resolver` (unit) added, covers BR-4/BR-10/Edge-2 → rendered
- tasks: `TASK-cli-attr-shared-gate` added (makes `TEST-shared-attr-resolver`, `TEST-cli-ticket-attr` green) → rendered

## Execution Slices

### Slice 1 — Finish the shared-gate migration (DONE)

- **Objective**: one alias meaning across `list` and `attr`; no duplicate map.
- **Direct artifacts**: `shared/services/ticket/attrResolver.ts` (+ `.test.ts`), `cli/src/commands/list.ts`, `cli/src/utils/aliases.ts`, `cli/src/commands/attr.ts`.
- **Direct GREEN targets**: `TEST-shared-attr-resolver`, `TEST-cli-ticket-attr` (relation + alias e2e).
- **Impacted tasks**: `TASK-cli-attr-shared-gate`.
- **Why**: the half-migration was the root cause of the `open` drift and the relation regression.

### Slice 2 — Single-source help + doc parity (DONE)

- **Objective**: `--help` and accepted fields derive from one module; SKILL.md matches the canonical resolver.
- **Direct artifacts**: `cli/src/commands/attrMeta.ts`, `cli/src/index.ts`, `cli/mdt-cli/SKILL.md`.
- **Direct GREEN targets**: `TEST-shared-attr-resolver`.
- **Impacted tasks**: `TASK-cli-attr-shared-gate`.
- **Why**: prevents the help-vs-validation drift that re-appears whenever two maps exist.

## Validation

- `bun run build:shared` — clean
- `bun test shared/services/ticket/attrResolver.test.ts` — 5/5 pass
- `bun test` (cli) — 107/107 pass (incl. relation `+=`/`-=` dedupe + alias normalization)
- `eslint` (cli) — clean
- `spec-trace validate MDT-143` — all five stages pass; all rendered

## Watchlist

- `attrResolver` status map is hand-mirrored from board column labels (`column.statuses[0]` convention). If columns are reconfigured, re-align `backlog`/`open`/`done`/`deferred` there — it is the one source now.
- `STATUS_ALIASES` was deleted; do not re-introduce a CLI-local status map. New status token needs go in the shared resolver.

## Open Decisions

None. All changes are in-place refinements on the same CR.

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

**Evidence**: `docs/CRs/MDT-143/` currently holds 13 files (architecture.md,
bdd.md, tasks.md, uat.md, …) plus a `poc/` subdir. A `delete 143` call would
leave all of them parented to a "deleted" ticket.

**Question**: should `delete` (a) recursively remove the entire `{KEY}/` folder,
(b) refuse unless `--purge-subdocuments` is passed, or (c) stay as-is and treat
subdocuments as independent artifacts? (a) matches user mental model of
"deleting the ticket"; (b) is safer; (c) is current behavior.

### UC-2: `delete` never touches `{ticketsPath}/.trace/{KEY}/`

**Repro**: `mdt-cli delete 143` leaves `docs/CRs/.trace/MDT-143/` (with
`baselines/` and `store.json`) intact on disk forever.

**Current behavior**: `grep -rn "\.trace" shared/services/TicketService.ts
cli/src/commands/delete.ts` returns zero hits. The spec-trace store is invisible
to the delete path. Orphans accumulate per deleted ticket.

**Evidence**: `docs/CRs/.trace/MDT-143/` exists with `baselines/` + `store.json`.
No code path removes it.

**Question**: should `delete` cascade to `.trace/{KEY}/`? If yes, `delete.ts`
needs to resolve the trace root (likely `path.join(ticketsPath, '.trace', key)`)
and remove it. If no, this should be documented as an intentional separation of
concerns (trace = separate subsystem, garbage-collected elsewhere).

### Scope note

Both concerns are independent of MDT-209's agent-write-governance work. MDT-209
will **block** direct agent deletes of `ticketsPath/**` (Rule C, in-progress),
forcing deletes through `mdt-cli` — which makes the gaps above the *only* path
to delete. Closing UC-1/UC-2 becomes more urgent once MDT-209 ships, but is
out of scope for that ticket.
