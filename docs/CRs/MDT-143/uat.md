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
